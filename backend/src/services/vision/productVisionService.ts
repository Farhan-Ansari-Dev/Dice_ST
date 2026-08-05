/**
 * Vision stage — turns a product photograph into structured OBSERVATIONS.
 *
 * This stage is deliberately not allowed to reason about compliance. It reports
 * what is visible; complianceEngine.ts decides what that implies. Keeping the
 * two apart is what stops the model from inventing "RoHS compliant" from a
 * photograph, which is the defect this feature is replacing.
 *
 * Uses the NVIDIA vision model over the existing OpenAI-compatible client.
 */
import { getAIClientAndModel } from '../aiService';
import { logger } from '../../utils/logger';
import type { VisionObservations } from './types';

// Model now resolves through the provider registry so switching provider in
// Remote Config switches vision too. Kept exported for reference/tests.
export const VISION_MODEL = 'meta/llama-3.2-90b-vision-instruct';

/** Hard cap on what we send upstream — NVIDIA rejects oversized payloads. */
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const SYSTEM_PROMPT = `You are a product-packaging inspector for a compliance consultancy.

You are shown ONE photograph of a product or its packaging. Report ONLY what is
visually present in that photograph.

ABSOLUTE RULES — violating these makes the output dangerous and unusable:
1. NEVER state or imply that a product IS certified, compliant, approved, tested,
   or conformant. You cannot see certification status in a photograph.
2. A certification logo on packaging means "this mark is PRINTED on the artwork" —
   nothing more. Marks are frequently applied incorrectly or fraudulently.
3. NEVER infer material composition, chemical content, electrical safety, heavy
   metals, RoHS status, or any laboratory-determined property. These are
   invisible to a camera.
4. If something is unreadable, blurred, cropped, or absent, say so. Do not guess.
5. Transcribe text EXACTLY as printed. Do not translate, correct, or complete it.

For every item you report, provide:
  - confidence: a number from 0 to 1
  - evidence: what in the image supports it (quote text, name the logo, give its position)
  - reasoning: why that evidence supports your statement

Respond with ONLY a JSON object matching this schema, and no other text:
{
  "productCategory": "one of: electronics, food, cosmetics, toys, apparel, medical, automotive, footwear, packaging, furniture, chemical, other",
  "productType": "specific product name, e.g. 'wireless optical mouse'",
  "brand": "brand name if legible, else omit",
  "detectedText": [{ "text": "...", "location": "...", "confidence": 0.0, "evidence": "...", "reasoning": "..." }],
  "visibleCertifications": [{ "mark": "CE", "observation": "A CE mark is printed on the rear label", "confidence": 0.0, "evidence": "...", "reasoning": "..." }],
  "codes": [{ "type": "barcode"|"qr", "value": "...", "symbology": "...", "confidence": 0.0, "evidence": "...", "reasoning": "..." }],
  "packagingLanguages": ["English", "Hindi"],
  "warningLabels": [{ "text": "...", "location": "...", "confidence": 0.0, "evidence": "...", "reasoning": "..." }],
  "countryOfOrigin": { "text": "Made in India", "confidence": 0.0, "evidence": "...", "reasoning": "..." },
  "imageQualityNotes": "note blur, glare, cropping, or angles that limited reading"
}

Use an empty array when you observe nothing for a field. Omit optional fields you
cannot determine. Return valid JSON only.`;

/** Pulls the first JSON object out of a model response that may be fenced. */
function extractJson(raw: string): any {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : raw).trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('vision model returned no JSON object');
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

const clamp01 = (n: unknown): number => {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return 0.5;
  return Math.min(1, Math.max(0, v));
};

/** Coerces model output into the declared shape; never throws on bad members. */
function normalise(parsed: any): VisionObservations {
  const conf = (o: any) => ({
    confidence: clamp01(o?.confidence),
    evidence: String(o?.evidence ?? 'not stated'),
    reasoning: String(o?.reasoning ?? 'not stated'),
  });

  const textList = (arr: any): any[] =>
    (Array.isArray(arr) ? arr : [])
      .filter((o) => o && (o.text ?? '').toString().trim())
      .map((o) => ({ text: String(o.text).trim(), location: o.location ? String(o.location) : undefined, ...conf(o) }));

  return {
    productCategory: String(parsed?.productCategory ?? 'other').toLowerCase().trim(),
    productType: String(parsed?.productType ?? 'unidentified product').trim(),
    brand: parsed?.brand ? String(parsed.brand).trim() : undefined,
    detectedText: textList(parsed?.detectedText),
    visibleCertifications: (Array.isArray(parsed?.visibleCertifications) ? parsed.visibleCertifications : [])
      .filter((o: any) => o && (o.mark ?? '').toString().trim())
      .map((o: any) => ({
        mark: String(o.mark).trim().toUpperCase(),
        observation: String(o.observation ?? `A ${o.mark} mark appears on the packaging`),
        ...conf(o),
      })),
    codes: (Array.isArray(parsed?.codes) ? parsed.codes : [])
      .filter((o: any) => o)
      .map((o: any) => ({
        type: o.type === 'qr' ? 'qr' : 'barcode',
        value: o.value ? String(o.value) : undefined,
        symbology: o.symbology ? String(o.symbology) : undefined,
        ...conf(o),
      })),
    packagingLanguages: (Array.isArray(parsed?.packagingLanguages) ? parsed.packagingLanguages : [])
      .map((l: any) => String(l).trim())
      .filter(Boolean),
    warningLabels: textList(parsed?.warningLabels),
    countryOfOrigin: parsed?.countryOfOrigin?.text
      ? { text: String(parsed.countryOfOrigin.text).trim(), ...conf(parsed.countryOfOrigin) }
      : undefined,
    imageQualityNotes: parsed?.imageQualityNotes ? String(parsed.imageQualityNotes) : undefined,
  };
}

export class VisionUnavailableError extends Error {}

/**
 * Analyses a product image and returns raw observations.
 *
 * @throws VisionUnavailableError when no AI key is configured — the caller must
 *         surface that as a real failure rather than substituting fake data.
 */
export async function analyseProductImage(
  image: Buffer,
  mimeType: string,
  userHint?: string,
  customerContext?: string,
): Promise<VisionObservations> {
  if (image.byteLength > MAX_IMAGE_BYTES) {
    throw new Error(`image exceeds ${MAX_IMAGE_BYTES} bytes`);
  }

  const { openai, model } = await getAIClientAndModel(undefined, 'vision');
  if (!openai) {
    throw new VisionUnavailableError('No AI API key configured. Set it in the admin panel or NVIDIA_API_KEY.');
  }

  const dataUri = `data:${mimeType};base64,${image.toString('base64')}`;
  const userText = userHint?.trim()
    ? `Additional context supplied by the user (may be wrong — trust the image over this): ${userHint.trim()}`
    : 'Inspect this product image.';

  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.1,       // near-deterministic: this is extraction, not creativity
    max_tokens: 2048,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT + (customerContext ?? '') },
      {
        role: 'user',
        content: [
          { type: 'text', text: userText },
          { type: 'image_url', image_url: { url: dataUri } },
        ] as any,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? '';
  try {
    return normalise(extractJson(raw));
  } catch (e) {
    logger.error(`[vision] failed to parse model output: ${String(e)} | raw: ${raw.slice(0, 400)}`);
    throw new Error('The vision model returned an unreadable response. Please retry with a clearer photo.');
  }
}

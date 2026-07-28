import OpenAI from 'openai'
import { AIConversation } from '../models/AIConversation'
import { Application, Certification, Insight } from '../models'
import redis from '../config/redis'
import { logger } from '../utils/logger'

import { RemoteConfig } from '../models/RemoteConfig'
import { getProviderKey } from './ai/credentialService'
import type { ProviderName } from '../models/AIProviderCredential'
import { PROVIDERS, isKnownProvider, isProviderAllowedHere } from './ai/providerRegistry'
import { MarketAccessService } from './marketAccessService'

/**
 * Resolves the configured OpenAI-compatible client.
 *
 * `modelOverride` lets a caller reuse this client with a different model on the
 * same provider/key — the vision analyser needs a vision-capable model while
 * chat stays on the configured text model. Exported so there is exactly one
 * place that knows how to build the client.
 */
export async function getAIClientAndModel(
  modelOverride?: string,
  capability: 'chat' | 'vision' = 'chat',
): Promise<{ openai: OpenAI | null; model: string; provider: ProviderName }> {
  const config = await RemoteConfig.getGlobalConfig()
  const aiSettings: any = config.aiSettings ?? {}

  const rawProvider = String(aiSettings.provider ?? 'nvidia')
  const provider: ProviderName = isKnownProvider(rawProvider) ? rawProvider : 'nvidia'
  const spec = PROVIDERS[provider]

  if (!isKnownProvider(rawProvider)) {
    logger.warn(`[ai] unknown provider "${rawProvider}" in Remote Config — falling back to nvidia`)
  }

  // Model precedence: explicit override → Remote Config → provider default.
  // Vision uses its own configured model, since the chat model is usually not
  // vision-capable and silently sending an image to it fails at the provider.
  const configured = capability === 'vision' ? aiSettings.visionModel : aiSettings.model
  const fallbackModel = capability === 'vision' ? spec.defaultVisionModel : spec.defaultChatModel
  const model = modelOverride || configured || fallbackModel || spec.defaultChatModel

  if (!isProviderAllowedHere(provider)) {
    logger.error(`[ai] provider "${provider}" is development-only and cannot serve production traffic`)
    return { openai: null, model, provider }
  }

  if (capability === 'vision' && !spec.defaultVisionModel && !configured && !modelOverride) {
    logger.error(`[ai] provider "${provider}" has no vision model configured`)
    return { openai: null, model, provider }
  }

  // Keys come only from Remote Config (encrypted credential store) in
  // production; see credentialService for the resolution order.
  const key = await getProviderKey(provider)
  if (!key && spec.requiresKey) return { openai: null, model, provider }

  // baseUrl override exists for Azure (per-resource endpoint) and for a
  // self-hosted Ollama on a non-default host.
  const baseURL = (aiSettings.baseUrl && String(aiSettings.baseUrl).trim()) || spec.baseUrl

  const openai = new OpenAI({
    apiKey: key ?? 'not-required',
    baseURL,
    timeout: 60_000,
    maxRetries: 1,
  })
  return { openai, model, provider }
}

/**
 * Raised when no AI provider is usable — no key configured, or the provider
 * call failed.
 *
 * Every AI function throws this rather than returning invented data. The
 * previous fallbacks fabricated compliance output: analyzeHsCode returned a
 * fixed "High / 10%-15% / USA, EU" trade analysis, analyzeCertifications
 * invented certification codes like COMP_IN, and analyzeRisks returned two
 * canned risks. A customer cannot tell fabricated compliance advice from real
 * advice, which makes it worse than a visible outage.
 */
export class AIUnavailableError extends Error {
  readonly code = 'ai_unavailable';
  constructor(message = 'AI is not configured. Add a provider API key in the Admin Panel to enable AI features.') {
    super(message);
    this.name = 'AIUnavailableError';
  }
}

/**
 * Raised when the provider replied but the payload could not be understood.
 * Distinct from AIUnavailableError: the provider is reachable, so this is
 * retryable and usually indicates a model/prompt mismatch.
 */
export class AIResponseError extends Error {
  readonly code = 'ai_response_invalid';
  constructor(message = 'The AI provider returned an unreadable response. Please retry.') {
    super(message);
    this.name = 'AIResponseError';
  }
}

/**
 * Parses a JSON payload from a completion.
 *
 * `response_format: json_object` is honoured by OpenAI but not reliably by
 * NVIDIA NIM's Llama models, which frequently wrap the object in ```json
 * fences or add a sentence before it. Stripping fences and taking the outermost
 * object makes the same prompt work on both supported providers.
 */
export function parseJsonCompletion<T = any>(raw: string | null | undefined): T {
  const text = (raw ?? '').trim();
  if (!text) throw new AIResponseError();

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();

  // Take the outermost object or array, ignoring any prose around it.
  const firstObj = candidate.indexOf('{');
  const firstArr = candidate.indexOf('[');
  const start =
    firstObj === -1 ? firstArr : firstArr === -1 ? firstObj : Math.min(firstObj, firstArr);
  const end = Math.max(candidate.lastIndexOf('}'), candidate.lastIndexOf(']'));

  if (start === -1 || end <= start) throw new AIResponseError();

  try {
    return JSON.parse(candidate.slice(start, end + 1)) as T;
  } catch {
    throw new AIResponseError();
  }
}

/** Normalises provider SDK errors, which frequently have an empty `.message`. */
function describeProviderError(err: any): string {
  return (
    err?.error?.message ??
    err?.response?.data?.error?.message ??
    err?.message ??
    (err?.status ? `provider returned HTTP ${err.status}` : null) ??
    String(err)
  );
}

const SYSTEM_PROMPT = `You are an expert AI compliance assistant for Sanyog Conformity Solutions, a leading certification and compliance consultancy in India. You have deep knowledge of:

- BIS (Bureau of Indian Standards) certification processes and IS standards
- FSSAI food safety regulations and licensing
- CE marking requirements for EU market
- ISO 9001, ISO 14001, ISO 45001 certification
- NABL laboratory accreditation
- Indian customs and export/import regulations (DGFT, CBIC)
- SCOMET policy for dual-use goods
- Product testing and inspection requirements
- EPR (Extended Producer Responsibility) compliance

Always provide accurate, actionable compliance advice. Reference specific standards and regulations when possible. If you're unsure, say so.`

export const aiService = {
  async chat(userId: string, message: string, conversationId?: string): Promise<{ response: string; conversationId: string }> {
    const { openai, model } = await getAIClientAndModel()
    const cacheKey = `ai_conv:${conversationId ?? userId}`

    // Get or create conversation
    let messages: OpenAI.ChatCompletionMessageParam[] = []
    if (conversationId) {
      const cached = await redis.get(cacheKey)
      if (cached) {
        messages = JSON.parse(cached)
      } else {
        const conv = await AIConversation.findOne({ _id: conversationId, user_id: userId })
        if (conv) messages = conv.messages
      }
    }

    // Add extra context if the user asks general questions
    let contextStr = ""
    try {
      const recentInsights = await Insight.find({}).sort({ published_at: -1 }).limit(3).lean()
      if (recentInsights.length > 0) {
        contextStr = "\n\nRecent Regulatory Insights Context:\n" + recentInsights.map((i: any) => `- ${i.title}: ${i.ai_summary || i.summary}`).join('\n')
      }
    } catch(e) {}

    const fullMessage = message + contextStr
    messages.push({ role: 'user', content: fullMessage })

    // No silent fallback. Writing a canned "AI is unavailable" line into the
    // conversation renders it as a normal assistant bubble, which reads like an
    // answer and pollutes the stored history. The client shows an explicit
    // unavailable state instead.
    if (!openai) throw new AIUnavailableError()

    let completion
    try {
      completion = await openai.chat.completions.create({
        model: model,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        max_tokens: 1024,
        temperature: 0.6,
      })
    } catch (err: any) {
      const detail = describeProviderError(err)
      logger.error(`[aiService.chat] provider call failed: ${detail}`)
      throw new AIUnavailableError(`The AI provider could not be reached: ${detail}`)
    }

    const response = completion.choices[0].message.content ?? ''
    
    // Remove the context we appended invisibly before saving to history
    messages[messages.length - 1].content = message
    messages.push({ role: 'assistant', content: response })

    // Save conversation
    let convId = conversationId
    if (!convId) {
      const newConv = await AIConversation.create({ user_id: userId, messages })
      convId = newConv._id.toString()
    } else {
      await AIConversation.updateOne({ _id: convId }, { messages, updated_at: new Date() })
    }

    // Cache for 30 minutes
    await redis.setex(`ai_conv:${convId}`, 1800, JSON.stringify(messages))

    return { response, conversationId: convId! }
  },

  async generateInsightSummary(content: string): Promise<string> {
    const { openai, model } = await getAIClientAndModel()
    const cacheKey = `insight_summary:${Buffer.from(content.slice(0, 100)).toString('base64')}`
    const cached = await redis.get(cacheKey)
    if (cached) return cached

    if (!openai) throw new AIUnavailableError()

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: 'You are a compliance expert. Summarize regulatory updates in 2-3 concise sentences highlighting impact on businesses seeking certifications in India.' },
        { role: 'user', content: `Summarize this regulatory update:\n\n${content}` },
      ],
      max_tokens: 200,
      temperature: 0.3,
    })

    const summary = completion.choices[0].message.content ?? ''
    await redis.setex(cacheKey, 3600, summary)
    return summary
  },

  async analyzeDocument(text: string): Promise<{ issues: string[]; recommendations: string[]; complianceScore: number }> {
    const { openai, model } = await getAIClientAndModel()
    if (!openai) throw new AIUnavailableError()

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: 'Analyze this compliance document and identify potential issues, missing information, and recommendations. Return a JSON object with: issues (array), recommendations (array), complianceScore (0-100).' },
        { role: 'user', content: text.slice(0, 4000) },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 500,
      temperature: 0.2,
    })

    // A parse failure must not become a fabricated complianceScore of 75.
    const parsed = parseJsonCompletion<any>(completion.choices[0].message.content)
    return {
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      complianceScore: typeof parsed.complianceScore === 'number' ? parsed.complianceScore : 0,
    }
  },

  async analyzeHsCode(hsCode: string): Promise<{ demand: string; profitMargin: string; topMarkets: string }> {
    const { openai, model } = await getAIClientAndModel()
    const cacheKey = `hs_code_analysis:${hsCode}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    if (!openai) throw new AIUnavailableError();

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: 'You are a global trade analyst. Given an HS code or product name, provide a JSON response with exactly three keys: "demand" (e.g. "Very High", "Medium"), "profitMargin" (e.g. "15% - 20%"), and "topMarkets" (e.g. "USA, Germany, UAE"). Keep values very concise.' },
        { role: 'user', content: `Analyze HS Code / Product: ${hsCode}` },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 150,
      temperature: 0.3,
    });

    const parsed = parseJsonCompletion<any>(completion.choices[0].message.content);
    if (!parsed.demand && !parsed.profitMargin && !parsed.topMarkets) {
      throw new AIResponseError('The trade analysis response was missing every expected field.');
    }
    const result = {
      demand: String(parsed.demand ?? 'Not determined'),
      profitMargin: String(parsed.profitMargin ?? 'Not determined'),
      topMarkets: String(parsed.topMarkets ?? 'Not determined'),
    };
    await redis.setex(cacheKey, 86400, JSON.stringify(result)); // Cache for 1 day
    return result;
  },

  async analyzeRisks(context: string): Promise<Array<{ title: string; level: string; desc: string }>> {
    const { openai, model } = await getAIClientAndModel()
    const cacheKey = `risk_analysis:${context}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    if (!openai) throw new AIUnavailableError();

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: 'You are a global trade risk analyst. Given a trade context (e.g., country or product), return a JSON object with a single key "risks", which is an array of exactly 3 risk objects. Each risk object must have "title" (string), "level" ("High", "Medium", or "Low"), and "desc" (short 1-sentence string).' },
        { role: 'user', content: `Analyze Trade Risks for: ${context}` },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 250,
      temperature: 0.3,
    });

    const parsed = parseJsonCompletion<any>(completion.choices[0].message.content);
    const risks = Array.isArray(parsed.risks) ? parsed.risks : Array.isArray(parsed) ? parsed : null;
    if (!risks) throw new AIResponseError('The risk analysis response contained no risks array.');
    await redis.setex(cacheKey, 86400, JSON.stringify(risks)); // Cache for 1 day
    return risks;
  },

  /**
   * Certification analysis is DATA-driven, never LLM-driven. It delegates to the
   * single canonical resolver (MarketAccessService), which reads only the
   * compliance database. The LLM is not involved in deciding certifications.
   *
   * Backward-compatible: keeps `{ isValid, certifications:[{code,name,market}] }`
   * and adds the richer `intelligence` payload plus `productValidationRequired`.
   */
  async analyzeCertifications(productName: string, markets: string[]): Promise<any> {
    const intelligence = await MarketAccessService.resolveCertifications(productName, markets);

    const certifications: Array<{ code: string; name: string; market: string }> = [];
    for (const m of intelligence.markets) {
      for (const c of m.requiredCertifications) {
        certifications.push({ code: c.code, name: c.name, market: m.marketCode });
      }
    }

    const hasVerified = intelligence.markets.some(
      (m) => m.verified && m.requiredCertifications.length > 0,
    );

    return {
      // Never block draft creation on analysis — unknown products proceed and
      // are flagged for a specialist to validate.
      isValid: true,
      productValidationRequired: intelligence.productValidationRequired || !hasVerified,
      message: hasVerified
        ? undefined
        : "We don't currently have a verified compliance mapping for this product and market. A certification specialist will review it.",
      certifications,
      intelligence,
    };
  },

  async getComplianceRecommendations(userId: string): Promise<string[]> {
    const { openai, model } = await getAIClientAndModel()
    const cacheKey = `recommendations:${userId}`
    const cached = await redis.get(cacheKey)
    if (cached) return JSON.parse(cached)

    // Get user's certification data
    const certs = await Certification.find({ org_id: userId }).sort({ expiry_date: 1 }).limit(10).lean()
    const context = certs.map((c: any) => `${c.cert_type}: expires ${c.expiry_date}, status: ${c.status}`).join('; ')

    if (!openai) throw new AIUnavailableError()

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: 'Generate 3-5 personalized compliance recommendations based on the user\'s certification portfolio. Return a JSON array of recommendation strings.' },
        { role: 'user', content: `User certifications: ${context || 'No certifications yet'}` },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 300,
      temperature: 0.5,
    })

    const parsed = parseJsonCompletion<any>(completion.choices[0].message.content)
    const recommendations = Array.isArray(parsed.recommendations)
      ? parsed.recommendations
      : Array.isArray(parsed) ? parsed : null
    if (!recommendations) throw new AIResponseError('The recommendations response was not a list.')
    await redis.setex(cacheKey, 3600, JSON.stringify(recommendations))
    return recommendations
  },
}

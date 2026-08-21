/**
 * Product → HS classification intelligence (Product Analyzer).
 *
 * A thin orchestration layer over the Phase-1 HS core (hsValidationService).
 * It NEVER classifies on its own authority: recommendations are always
 * dataset-backed HS codes, AI is only used to compare a product against an
 * official description and to rank dataset candidates, and anything uncertain is
 * routed to expert review. It also validates a user-supplied code against the
 * product ("wrong HS code" detection) instead of trusting it.
 *
 * Domain boundary: this resolves WHAT a product is (HS classification). It does
 * not compute tariffs, duties or certifications. 6-digit HS is internationally
 * harmonized; national tariff lines can differ — surfaced via `marketNote`.
 */
import {
  validateHsCode,
  suggestHsCodes,
  normalizeHsCode,
  defaultAiPort,
  HsAiPort,
  HsCandidate,
  HsValidationResult,
  COVERAGE_NOTE,
} from './hsValidationService';

export type AnalysisStatus =
  | 'RESOLVED'            // confident, dataset-backed recommendation
  | 'PROVIDED_MISMATCH'  // user's code doesn't fit the product; alternative offered
  | 'INVALID_FORMAT'     // user's code is malformed
  | 'AMBIGUOUS'          // several plausible candidates; needs a human/alternatives
  | 'NEEDS_MORE_INFO'    // not enough product information to classify
  | 'NO_VERIFIED_MATCH'; // nothing in verified coverage; expert review

export interface RecommendedHs {
  code: string;
  displayCode: string;
  description: string;
  confidence: number | null; // null when AI comparison was unavailable
  reason: string;
  source: string;
  sourceVersion: string;
}

export interface ProductAnalysisInput {
  productName?: string;
  productDescription?: string;
  category?: string;
  brand?: string;
  model?: string;
  /** Optional user-supplied HS code to validate against the product. */
  code?: string;
  /** Optional target market (ISO code). Affects only the market note. */
  market?: string;
}

export interface ProductAnalysisResult {
  product: string;
  status: AnalysisStatus;
  /** Validation of the user-supplied code, when one was given. */
  providedCode: HsValidationResult | null;
  /** The single best dataset-backed recommendation, when confident enough. */
  recommended: RecommendedHs | null;
  /** Dataset-backed alternatives (always real codes). */
  candidates: HsCandidate[];
  /** Clarifying questions when information is insufficient. */
  clarification: string[] | null;
  requiresManualReview: boolean;
  marketNote: string | null;
  coverageNote: string;
  message: string;
}

/** Confidence at/above which a single recommendation is treated as resolved. */
const RESOLVE_THRESHOLD = 0.75;
/** The one market with verified national-level compliance data in DICE. */
const VERIFIED_NATIONAL_MARKET = 'IN';

function composeProduct(input: ProductAnalysisInput): string {
  return [input.productName, input.brand, input.model, input.category, input.productDescription]
    .map((s) => (s ? String(s).trim() : ''))
    .filter(Boolean)
    .join(' ')
    .trim();
}

function marketNoteFor(market?: string): string | null {
  if (!market) return null;
  const m = market.trim().toUpperCase();
  if (m === VERIFIED_NATIONAL_MARKET) {
    return 'HS classification shown is the internationally harmonized 6-digit level. India national tariff lines (ITC-HS 8-digit) are handled during expert review.';
  }
  return `HS classification shown is the internationally harmonized 6-digit level. National tariff lines for ${m} can differ and are not part of DICE's verified coverage yet — confirm via expert review.`;
}

function toRecommended(c: HsCandidate, confidence: number | null, reason: string): RecommendedHs {
  return {
    code: c.code,
    displayCode: c.displayCode,
    description: c.description,
    confidence,
    reason,
    source: c.source,
    sourceVersion: c.sourceVersion,
  };
}

/**
 * Analyze a product and (optionally) a user-supplied HS code. `ai` is injectable
 * for tests / outage simulation.
 */
export async function analyzeProductHs(
  input: ProductAnalysisInput,
  ai: HsAiPort = defaultAiPort,
): Promise<ProductAnalysisResult> {
  const product = composeProduct(input);
  const marketNote = marketNoteFor(input.market);
  const hasCode = !!(input.code && String(input.code).trim());

  const base: ProductAnalysisResult = {
    product,
    status: 'NEEDS_MORE_INFO',
    providedCode: null,
    recommended: null,
    candidates: [],
    clarification: null,
    requiresManualReview: false,
    marketNote,
    coverageNote: COVERAGE_NOTE,
    message: '',
  };

  // ── Insufficient information ────────────────────────────────────────────
  if (!product && !hasCode) {
    return {
      ...base,
      status: 'NEEDS_MORE_INFO',
      requiresManualReview: false,
      clarification: [
        'What is the product’s name?',
        'What is its primary function or use?',
        'What technology or material does it use (e.g. lithium-ion, LED, wireless)?',
      ],
      message: 'Add a product name or description so we can classify it.',
    };
  }

  // ── Validate a user-supplied code against the product ────────────────────
  let providedCode: HsValidationResult | null = null;
  if (hasCode) {
    providedCode = await validateHsCode({ code: input.code, productDescription: product }, ai);

    if (providedCode.status === 'INVALID_FORMAT') {
      return {
        ...base,
        providedCode,
        status: 'INVALID_FORMAT',
        message: 'That HS code isn’t a valid format. Enter 4, 6 or 8 digits (e.g. 8517.13).',
      };
    }

    if (providedCode.status === 'VERIFIED_MATCH') {
      const rec = toRecommended(
        {
          code: providedCode.code!,
          displayCode: providedCode.displayCode!,
          description: providedCode.description!,
          source: providedCode.source!,
          sourceVersion: providedCode.sourceVersion!,
        },
        providedCode.confidence,
        `The product matches the official description “${providedCode.description}”.`,
      );
      return {
        ...base,
        providedCode,
        recommended: rec,
        candidates: providedCode.candidates,
        status: 'RESOLVED',
        message: 'The HS code you entered matches this product.',
      };
    }

    // VERIFIED (code valid, no comparison) or VERIFIED under AI outage.
    if (providedCode.status === 'VERIFIED') {
      const rec = toRecommended(
        {
          code: providedCode.code!,
          displayCode: providedCode.displayCode!,
          description: providedCode.description!,
          source: providedCode.source!,
          sourceVersion: providedCode.sourceVersion!,
        },
        null,
        'The HS code is verified in our dataset. We couldn’t automatically confirm it matches your product.',
      );
      return {
        ...base,
        providedCode,
        recommended: rec,
        candidates: providedCode.candidates,
        status: 'RESOLVED',
        requiresManualReview: providedCode.requiresManualReview,
        message: providedCode.mismatchReason || 'The HS code is verified. Confirm it fits your product.',
      };
    }

    // VERIFIED_MISMATCH → the "wrong HS code" case. Offer a dataset-backed
    // alternative but NEVER silently replace the user's code.
    if (providedCode.status === 'VERIFIED_MISMATCH') {
      const alt = providedCode.candidates[0] || null;
      return {
        ...base,
        providedCode,
        candidates: providedCode.candidates,
        recommended: alt ? toRecommended(alt, null, 'A better-matching verified code for the product you described.') : null,
        status: 'PROVIDED_MISMATCH',
        requiresManualReview: true,
        message: 'HS Code may not match this product. Review the recommended alternative or request expert review.',
      };
    }

    // NOT_IN_VERIFIED_DATASET → fall through to product-based suggestion below,
    // keeping providedCode attached for context.
  }

  // ── Classify from the product description ────────────────────────────────
  const suggestion = await suggestHsCodes(product, ai);
  const candidates = suggestion.candidates;

  if (!candidates.length) {
    return {
      ...base,
      providedCode,
      status: 'NO_VERIFIED_MATCH',
      requiresManualReview: true,
      message:
        'No verified HS classification is available for this product in DICE’s current coverage. Expert review recommended.',
    };
  }

  // Score the top candidate against the product (AI comparator; degrades to
  // null confidence under outage, which routes to ambiguous/manual review).
  const top = candidates[0];
  let confidence: number | null = null;
  let reason = 'Best match from verified HS coverage based on the product description.';
  try {
    const cmp = await ai.compare(product, top.description);
    confidence = cmp.confidence;
    if (cmp.reason) reason = cmp.reason;
  } catch {
    confidence = null;
  }

  const decisive =
    confidence != null && confidence >= RESOLVE_THRESHOLD && candidates.length === 1;
  const confidentTop =
    confidence != null && confidence >= RESOLVE_THRESHOLD;

  if (decisive || confidentTop) {
    return {
      ...base,
      providedCode,
      recommended: toRecommended(top, confidence, reason),
      candidates,
      status: 'RESOLVED',
      requiresManualReview: false,
      message: 'We found a confident HS classification for this product.',
    };
  }

  // Multiple plausible options, or low/unknown confidence → ambiguous.
  return {
    ...base,
    providedCode,
    recommended: toRecommended(top, confidence, reason),
    candidates,
    status: 'AMBIGUOUS',
    requiresManualReview: true,
    message:
      confidence == null
        ? 'We identified possible HS codes but couldn’t confirm a match automatically. Review the alternatives or request expert review.'
        : 'Several HS codes could apply to this product. Review the alternatives or request expert review.',
  };
}

export function isValidHsFormat(code: string): boolean {
  return normalizeHsCode(code) != null;
}

export default { analyzeProductHs, isValidHsFormat };

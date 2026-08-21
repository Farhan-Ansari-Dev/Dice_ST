/**
 * HS Validation Service — the trustworthy classification foundation that
 * Product Analyzer, Trade Traffic, Market Access and Certification Analysis all
 * consume.
 *
 * Design principles (non-negotiable):
 *   1. A code is "verified" ONLY because a row exists in the HsCode dataset.
 *   2. AI never introduces, invents, or authorizes an HS code. It may only
 *      compare a product to an official description, or reorder dataset-backed
 *      candidates. AI is injected behind a port so it is fully mockable and so
 *      an AI outage degrades gracefully instead of breaking code validation.
 *   3. Malformed input is rejected, never silently coerced into a valid code.
 *   4. A product/code mismatch is surfaced, never silently accepted.
 *   5. Coverage is a curated subset — anything outside it is honestly reported
 *      as NOT_IN_VERIFIED_DATASET and routed to expert review, never faked.
 *
 * Domain boundary: this service answers WHAT a product is (HS classification).
 * It does not compute tariffs, duties, taxes, certifications or trade volumes —
 * those are separate Market Access domains that merely link by code.
 */
import HsCode, { IHsCode } from '../models/HsCode';
import { aiService, AIUnavailableError } from './aiService';

export type HsStatus =
  | 'VERIFIED'                 // code recognized; product not supplied for comparison
  | 'VERIFIED_MATCH'          // code recognized AND product fits it
  | 'VERIFIED_MISMATCH'       // code recognized BUT product does not fit it
  | 'INVALID_FORMAT'          // input is not a well-formed HS code
  | 'NOT_IN_VERIFIED_DATASET' // well-formed but not in DICE's verified coverage
  | 'MANUAL_REVIEW_REQUIRED'; // no confident verified classification

export interface HsCandidate {
  code: string;
  displayCode: string;
  description: string;
  source: string;
  sourceVersion: string;
}

export interface HsValidationResult {
  code: string | null;
  displayCode: string | null;
  status: HsStatus;
  verified: boolean;
  description: string | null;
  productMatch: boolean | null;
  confidence: number | null;
  mismatchReason: string | null;
  candidates: HsCandidate[];
  source: string | null;
  sourceVersion: string | null;
  requiresManualReview: boolean;
  coverageNote: string;
}

/** AI port — injectable so tests can stub it and outages degrade cleanly. */
export interface HsAiPort {
  compare(product: string, officialDescription: string): Promise<{ match: boolean; confidence: number; reason: string }>;
  rank(product: string, poolCodes: string[]): Promise<string[]>;
}

export const defaultAiPort: HsAiPort = {
  compare: (p, d) => aiService.compareProductToHs(p, d),
  rank: (p, codes) => aiService.rankHsCandidates(p, codes),
};

export const COVERAGE_NOTE =
  'Verified HS coverage currently available in DICE (12 electronics categories). This is a curated subset, not a complete global HS database.';

/** Confidence at/above which an AI comparison counts as a match. */
const MATCH_THRESHOLD = 0.6;
/** How many dataset-backed candidates to surface at most. */
const MAX_CANDIDATES = 5;

export interface NormalizedCode {
  normalized: string; // digits only, length 4 | 6 | 8
  display: string;    // dotted form
}

/**
 * Normalize an HS code string SAFELY. Accepts dotted / undotted / space-grouped
 * forms of 4, 6 or 8 digits. Rejects (returns null) anything ambiguous or
 * malformed — letters, wrong length, doubled/edge separators — so junk is never
 * coerced into a real code.
 *
 * Accepted:  "8517" · "851713" · "8517.13" · "85171310" · "8517.13.10" · "85 17 13"
 * Rejected:  "abcd" · "12" · "85..17" · ".8517" · "8517." · "851"  (→ null)
 */
export function normalizeHsCode(raw: string | null | undefined): NormalizedCode | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;

  // Only digits and single separators (dot or space) between digit groups.
  // Disallows letters, symbols, doubled separators and leading/trailing ones.
  if (!/^\d+([ .]\d+)*$/.test(trimmed)) return null;

  const digits = trimmed.replace(/[ .]/g, '');
  if (!/^\d+$/.test(digits)) return null;
  if (digits.length !== 4 && digits.length !== 6 && digits.length !== 8) return null;

  return { normalized: digits, display: toDisplay(digits) };
}

function toDisplay(code: string): string {
  if (code.length <= 4) return code;
  if (code.length === 6) return `${code.slice(0, 4)}.${code.slice(4)}`;
  return `${code.slice(0, 4)}.${code.slice(4, 6)}.${code.slice(6)}`; // 8-digit
}

function toCandidate(doc: Pick<IHsCode, 'code' | 'displayCode' | 'description' | 'source' | 'sourceVersion'>): HsCandidate {
  return {
    code: doc.code,
    displayCode: doc.displayCode,
    description: doc.description,
    source: doc.source,
    sourceVersion: doc.sourceVersion,
  };
}

function baseResult(overrides: Partial<HsValidationResult>): HsValidationResult {
  return {
    code: null,
    displayCode: null,
    status: 'INVALID_FORMAT',
    verified: false,
    description: null,
    productMatch: null,
    confidence: null,
    mismatchReason: null,
    candidates: [],
    source: null,
    sourceVersion: null,
    requiresManualReview: false,
    coverageNote: COVERAGE_NOTE,
    ...overrides,
  };
}

/**
 * Look a normalized code up in the verified dataset. For an 8-digit national
 * input with no exact row, fall back to its 6-digit international parent (the
 * harmonized level we actually verify), so national extensions still resolve
 * without us fabricating national rows.
 */
async function lookup(normalized: string): Promise<IHsCode | null> {
  let doc = await HsCode.findOne({ code: normalized, active: true });
  if (!doc && normalized.length === 8) {
    doc = await HsCode.findOne({ code: normalized.slice(0, 6), active: true });
  }
  return doc;
}

/**
 * Derive dataset-backed candidate codes for a product description, ranked by AI
 * where available. Candidates ALWAYS come from the dataset (keyword match) — AI
 * only reorders — so a candidate can never be an invented code.
 */
async function suggestCandidates(
  productDescription: string,
  ai: HsAiPort,
): Promise<HsCandidate[]> {
  const term = String(productDescription || '').trim().toLowerCase();
  if (!term) return [];

  const tokens = Array.from(new Set(term.split(/[^a-z0-9]+/).filter((t) => t.length > 2)));
  if (!tokens.length) return [];

  // Keyword match against the verified dataset. Prefer 6-digit subheadings
  // (more specific) over bare headings.
  const matches = await HsCode.find({
    active: true,
    $or: [
      { keywords: { $in: tokens } },
      ...tokens.map((t) => ({ keywords: new RegExp(`\\b${escapeRegex(t)}\\b`, 'i') })),
    ],
  })
    .sort({ level: -1 })
    .limit(MAX_CANDIDATES * 2)
    .lean();

  if (!matches.length) return [];

  const byCode = new Map<string, HsCandidate>();
  for (const m of matches as any[]) byCode.set(m.code, toCandidate(m));

  let orderedCodes = [...byCode.keys()];
  // AI ranking is best-effort and strictly re-orders dataset codes.
  try {
    orderedCodes = await ai.rank(productDescription, orderedCodes);
  } catch {
    /* AI unavailable → keep dataset order (specificity-first). */
  }

  return orderedCodes
    .map((c) => byCode.get(c))
    .filter((c): c is HsCandidate => !!c)
    .slice(0, MAX_CANDIDATES);
}

export interface ValidateInput {
  code?: string | null;
  productDescription?: string | null;
}

/**
 * THE HS validation entry point. Implements the approved state machine exactly.
 * `ai` is injectable for tests / outage simulation.
 */
export async function validateHsCode(
  input: ValidateInput,
  ai: HsAiPort = defaultAiPort,
): Promise<HsValidationResult> {
  const rawCode = input.code;
  const product = String(input.productDescription ?? '').trim();
  const hasCode = rawCode != null && String(rawCode).trim() !== '';

  // ── No code supplied ──────────────────────────────────────────────────────
  if (!hasCode) {
    if (!product) {
      // Nothing to act on.
      return baseResult({ status: 'INVALID_FORMAT' });
    }
    // Attempt dataset-backed suggestions from the product description.
    const candidates = await suggestCandidates(product, ai);
    return baseResult({
      status: 'MANUAL_REVIEW_REQUIRED',
      candidates,
      requiresManualReview: true,
    });
  }

  // ── Code supplied → normalize ────────────────────────────────────────────
  const norm = normalizeHsCode(rawCode);
  if (!norm) {
    return baseResult({ status: 'INVALID_FORMAT' });
  }

  // ── Look up in verified dataset ──────────────────────────────────────────
  const doc = await lookup(norm.normalized);
  if (!doc) {
    // Well-formed but outside verified coverage. Offer candidates if we can.
    const candidates = product ? await suggestCandidates(product, ai) : [];
    return baseResult({
      code: norm.normalized,
      displayCode: norm.display,
      status: 'NOT_IN_VERIFIED_DATASET',
      candidates,
      requiresManualReview: true,
    });
  }

  // Code is verified. Resolve display/provenance from the matched row (which may
  // be the 6-digit parent of an 8-digit input).
  const resolved = baseResult({
    code: doc.code,
    displayCode: doc.displayCode,
    description: doc.description,
    source: doc.source,
    sourceVersion: doc.sourceVersion,
    verified: true,
  });

  // ── Code found, no product → VERIFIED (match not evaluated) ──────────────
  if (!product) {
    return { ...resolved, status: 'VERIFIED', productMatch: null };
  }

  // ── Code found + product → compare via AI (dataset stays the authority) ──
  try {
    const cmp = await ai.compare(product, doc.description);
    const isMatch = cmp.match && cmp.confidence >= MATCH_THRESHOLD;
    if (isMatch) {
      return {
        ...resolved,
        status: 'VERIFIED_MATCH',
        productMatch: true,
        confidence: cmp.confidence,
      };
    }
    // Mismatch (or low confidence) — never silently accepted. Offer better,
    // dataset-backed candidates for the described product.
    const candidates = await suggestCandidates(product, ai);
    return {
      ...resolved,
      status: 'VERIFIED_MISMATCH',
      verified: false,
      productMatch: false,
      confidence: cmp.confidence,
      mismatchReason:
        cmp.reason ||
        `The described product does not match the official HS description "${doc.description}".`,
      candidates,
      requiresManualReview: true,
    };
  } catch (err) {
    if (err instanceof AIUnavailableError) {
      // Deterministic code validation still holds: the code IS verified. We just
      // cannot judge the product↔code fit right now, so we flag it for a human
      // rather than silently claiming a match.
      return {
        ...resolved,
        status: 'VERIFIED',
        productMatch: null,
        requiresManualReview: true,
        mismatchReason:
          'The HS code is verified, but the product/code match could not be evaluated (AI comparison unavailable).',
      };
    }
    throw err;
  }
}

/** Suggest-only entry point (POST /hs/suggest). */
export async function suggestHsCodes(
  productDescription: string,
  ai: HsAiPort = defaultAiPort,
): Promise<{ candidates: HsCandidate[]; status: HsStatus; requiresManualReview: boolean; coverageNote: string }> {
  const candidates = await suggestCandidates(productDescription, ai);
  return {
    candidates,
    // Suggestions always require human confirmation — a suggestion is never a
    // verified classification on its own.
    status: candidates.length ? 'MANUAL_REVIEW_REQUIRED' : 'NOT_IN_VERIFIED_DATASET',
    requiresManualReview: true,
    coverageNote: COVERAGE_NOTE,
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const hsValidationService = {
  normalizeHsCode,
  validateHsCode,
  suggestHsCodes,
  COVERAGE_NOTE,
};

export default hsValidationService;

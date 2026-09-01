/**
 * cbMatchingService — the single, centralized, deterministic matching engine for
 * "Find Your CB". Given a normalized requirement it:
 *   1. HARD-FILTERS certification bodies (Organization type='cb') — an ineligible
 *      CB is EXCLUDED, never merely ranked lower.
 *   2. Scores the survivors with a transparent weighted rubric.
 *   3. Emits structured, human-readable match_reasons.
 *
 * Matching is driven by structured CertificationBodyScope rows; a legacy CB with
 * no structured scope falls back to its cb_profile so existing data still works,
 * but scores lower and its reasons say so. No free-text-only matching, no
 * fabricated metrics, no scores computed on the client.
 *
 * Reuses existing DICE representations: cert_type strings, ISO-alpha2 market
 * codes, Product.category strings. Reads only; no writes, no side effects.
 */
import { Organization } from '../models/Organization';
import { CertificationBodyScope } from '../models/CertificationBodyScope';
import { Accreditation } from '../models/Accreditation';

export interface CBRequirement {
  cert_type: string;                 // required — the certification/scheme
  product_category?: string;
  industries?: string[];
  market?: string;                   // DEPRECATED single market — kept for back-compat
  markets?: string[];                // ISO alpha-2 destination markets (authoritative)
  service_type?: string;
  require_accreditation?: boolean;   // when the market/cert makes accreditation mandatory
}

/** Backend-computed, per-CB coverage of the customer's requested markets. */
export interface MarketCoverage {
  requested: string[];               // normalized requested ISO codes
  covered: string[];                 // requested codes this CB serves
  missing: string[];                 // requested codes this CB does not serve
  percent: number;                   // 0–100, round(covered/requested * 100)
}

export interface CBMatchReason {
  key: string;
  label: string;
  satisfied: boolean;                // false reasons are shown honestly, not hidden
}

export interface CBMatch {
  id: string;
  name: string;
  legal_name?: string;
  logo_url?: string;
  website?: string;
  location?: { city?: string; country_code?: string };
  verified: boolean;                 // true only when cb_verification.status === 'verified'
  verified_at?: Date;
  match_score: number;               // 0–100, deterministic
  match_reasons: CBMatchReason[];
  // Public, non-sensitive coverage summary (never internal scope evidence):
  cert_types: string[];
  markets: string[];
  product_categories: string[];
  service_types: string[];
  accreditations: string[];          // accreditation codes/names (public catalog data)
  scope_backed: boolean;             // true when matched on structured scope, not profile
  market_coverage?: MarketCoverage;  // present only when markets were requested
}

// Transparent weights. A criterion contributes to the denominator only when it is
// "applicable" (requested or supported), so scores stay intuitive.
const WEIGHTS = {
  certification: 30,   // always applicable + awarded for survivors (hard-required)
  product_scope: 20,
  market: 20,
  accreditation: 15,
  industry: 7,
  service_type: 3,
  verified: 5,         // always applicable — rewards Sanyog-verified CBs
};

const norm = (v?: string) => (v || '').trim().toLowerCase();
const up = (v?: string) => (v || '').trim().toUpperCase();

/**
 * Normalize a market input (string | csv string | string[]) into unique, upper-
 * cased ISO alpha-2 codes. Validates the ISO alpha-2 shape (2 letters, e.g. IN,
 * US, DE, and the EU special region) — arbitrary/garbage tokens are dropped, not
 * silently accepted. Deterministic order (first occurrence preserved).
 */
export function normalizeMarkets(input?: string | string[] | null): string[] {
  const raw = Array.isArray(input) ? input : typeof input === 'string' ? input.split(',') : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    const code = String(r ?? '').trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(code) && !seen.has(code)) { seen.add(code); out.push(code); }
  }
  return out;
}

/** Union coverage for a CB, derived from its active (non-expired) structured scopes. */
interface Coverage {
  cert_types: Set<string>;
  markets: Set<string>;
  categories: Set<string>;
  industries: Set<string>;
  service_types: Set<string>;
  accreditationIds: Set<string>;
  hasScope: boolean;
}

function emptyCoverage(): Coverage {
  return {
    cert_types: new Set(), markets: new Set(), categories: new Set(),
    industries: new Set(), service_types: new Set(), accreditationIds: new Set(), hasScope: false,
  };
}

/**
 * Rank eligible certification bodies for a requirement.
 * `opts.publicOnly` (default true) restricts to CBs safe to show a customer:
 * not suspended/archived. Staff previews can pass false.
 */
export async function matchCertificationBodies(
  req: CBRequirement,
  opts: { publicOnly?: boolean; limit?: number } = {},
): Promise<CBMatch[]> {
  const publicOnly = opts.publicOnly !== false;
  const certType = (req.cert_type || '').trim();
  if (!certType) return [];

  // Multi-market: `markets` is authoritative; a legacy single `market` is folded in.
  const requestedMarkets = normalizeMarkets(req.markets && req.markets.length ? req.markets : req.market);
  const category = norm(req.product_category);
  const wantIndustries = (req.industries || []).map(norm).filter(Boolean);
  const service = norm(req.service_type);

  // Candidate CBs: type='cb', eligible for this cert (explicitly listed OR empty=all).
  // settings.allowed_cert_types is the existing authoritative hard cert filter.
  const orgFilter: any = {
    type: 'cb',
    $or: [{ 'settings.allowed_cert_types': certType }, { 'settings.allowed_cert_types': { $size: 0 } }],
  };
  if (publicOnly) {
    // Exclude suspended/archived; legacy CBs with no verification block are allowed.
    orgFilter['cb_verification.status'] = { $nin: ['suspended', 'archived'] };
  }
  const cbs: any[] = await Organization.find(orgFilter).lean();
  if (cbs.length === 0) return [];

  const cbIds = cbs.map((c) => c._id);
  const now = new Date();

  // One query for all active, in-window scopes of these CBs for this cert (no N+1).
  const scopes: any[] = await CertificationBodyScope.find({
    certification_body_id: { $in: cbIds },
    cert_type: certType,
    status: 'active',
    $and: [
      { $or: [{ valid_from: { $exists: false } }, { valid_from: null }, { valid_from: { $lte: now } }] },
      { $or: [{ valid_until: { $exists: false } }, { valid_until: null }, { valid_until: { $gte: now } }] },
    ],
  }).lean();

  const coverageByCb = new Map<string, Coverage>();
  const accIdSet = new Set<string>();
  for (const sc of scopes) {
    const key = String(sc.certification_body_id);
    const cov = coverageByCb.get(key) || emptyCoverage();
    cov.hasScope = true;
    cov.cert_types.add(certType);
    (sc.markets || []).forEach((m: string) => cov.markets.add(up(m)));
    (sc.product_categories || []).forEach((c: string) => cov.categories.add(norm(c)));
    (sc.industries || []).forEach((i: string) => cov.industries.add(norm(i)));
    if (sc.service_type) cov.service_types.add(norm(sc.service_type));
    if (sc.accreditation_id) { cov.accreditationIds.add(String(sc.accreditation_id)); accIdSet.add(String(sc.accreditation_id)); }
    coverageByCb.set(key, cov);
  }

  // Resolve accreditation display + validity in one query.
  const accDocs: any[] = accIdSet.size
    ? await Accreditation.find({ _id: { $in: [...accIdSet] } }).lean()
    : [];
  const accById = new Map(accDocs.map((a) => [String(a._id), a]));

  const results: CBMatch[] = [];

  for (const cb of cbs) {
    const key = String(cb._id);
    const cov = coverageByCb.get(key) || emptyCoverage();
    const profile = cb.cb_profile || {};
    const verified = cb.cb_verification?.status === 'verified';

    // Effective coverage: structured scope preferred, else legacy profile fallback.
    const markets = cov.hasScope
      ? [...cov.markets]
      : (profile.countries || []).map((c: string) => up(c));
    const categories = cov.hasScope
      ? [...cov.categories]
      : (profile.product_categories || []).map((c: string) => norm(c));
    const accreditationNames = cov.hasScope
      ? [...cov.accreditationIds].map((id) => accById.get(id)).filter(Boolean)
          .filter((a: any) => a.status === 'active').map((a: any) => a.code || a.name)
      : (profile.accreditations || []);

    // ---- HARD FILTERS (exclude, do not down-rank) ----
    // Market: exclude only when the CB has explicit market data AND covers NONE of
    // the requested markets. A CB covering *some* requested markets stays eligible
    // (it is a partial match, scored by coverage below).
    if (requestedMarkets.length > 0 && markets.length > 0 && !requestedMarkets.some((m) => markets.includes(m))) continue;
    // Accreditation mandatory: exclude when the CB has none.
    if (req.require_accreditation && accreditationNames.length === 0) continue;

    // ---- SCORING ----
    let applicable = WEIGHTS.certification + WEIGHTS.verified; // always applicable
    let awarded = WEIGHTS.certification;                       // survivors support the cert
    const reasons: CBMatchReason[] = [];

    reasons.push({ key: 'certification', label: `Certification ${certType} supported`, satisfied: true });

    // Verified
    if (verified) awarded += WEIGHTS.verified;
    reasons.push({ key: 'verified', label: verified ? 'Verified by Sanyog' : 'Not yet verified by Sanyog', satisfied: verified });

    // Product scope
    if (category) {
      applicable += WEIGHTS.product_scope;
      const ok = categories.length === 0 ? false : categories.includes(category);
      if (ok) awarded += WEIGHTS.product_scope;
      reasons.push({ key: 'product_scope', label: ok ? 'Product category covered' : 'Product category not listed', satisfied: ok });
    }
    // Market — fractional coverage across the full requested set.
    // An all-markets CB (no explicit markets) covers everything → fraction 1.
    let market_coverage: MarketCoverage | undefined;
    if (requestedMarkets.length > 0) {
      applicable += WEIGHTS.market;
      const servesAll = markets.length === 0;
      const covered = servesAll ? [...requestedMarkets] : requestedMarkets.filter((m) => markets.includes(m));
      const missing = servesAll ? [] : requestedMarkets.filter((m) => !markets.includes(m));
      const fraction = covered.length / requestedMarkets.length;
      awarded += WEIGHTS.market * fraction;
      const percent = Math.round(fraction * 100);
      const full = missing.length === 0;
      reasons.push({
        key: 'market',
        label: full
          ? `Covers all ${requestedMarkets.length} target market${requestedMarkets.length > 1 ? 's' : ''} (${covered.join(', ')})`
          : `Covers ${covered.length} of ${requestedMarkets.length} target markets${covered.length ? ` (${covered.join(', ')})` : ''}`,
        satisfied: full,
      });
      market_coverage = { requested: [...requestedMarkets], covered, missing, percent };
    }
    // Accreditation (applicable when required OR the CB advertises any)
    if (req.require_accreditation || accreditationNames.length > 0) {
      applicable += WEIGHTS.accreditation;
      const ok = accreditationNames.length > 0;
      if (ok) awarded += WEIGHTS.accreditation;
      reasons.push({ key: 'accreditation', label: ok ? 'Accreditation on record' : 'Accreditation not on record', satisfied: ok });
    }
    // Industry
    if (wantIndustries.length > 0 && cov.industries.size > 0) {
      applicable += WEIGHTS.industry;
      const ok = wantIndustries.some((i) => cov.industries.has(i));
      if (ok) awarded += WEIGHTS.industry;
      reasons.push({ key: 'industry', label: ok ? 'Industry match' : 'Industry not listed', satisfied: ok });
    }
    // Service type
    if (service && cov.service_types.size > 0) {
      applicable += WEIGHTS.service_type;
      const ok = cov.service_types.has(service);
      if (ok) awarded += WEIGHTS.service_type;
      reasons.push({ key: 'service_type', label: ok ? 'Service type available' : 'Service type not listed', satisfied: ok });
    }

    const match_score = Math.round((awarded / applicable) * 100);

    results.push({
      id: key,
      name: cb.name,
      legal_name: cb.legal_name,
      logo_url: cb.branding?.logo_url,
      website: cb.contact?.website,
      location: { city: cb.address?.city, country_code: cb.address?.country_code },
      verified,
      verified_at: cb.cb_verification?.verified_at,
      match_score,
      match_reasons: reasons,
      cert_types: cb.settings?.allowed_cert_types?.length ? cb.settings.allowed_cert_types : [certType],
      markets,
      product_categories: cov.hasScope ? [...cov.categories] : (profile.product_categories || []),
      service_types: [...cov.service_types],
      accreditations: accreditationNames,
      scope_backed: cov.hasScope,
      market_coverage,
    });
  }

  // Deterministic ordering: score desc, then verified, then scope-backed, then name.
  results.sort((a, b) =>
    b.match_score - a.match_score ||
    Number(b.verified) - Number(a.verified) ||
    Number(b.scope_backed) - Number(a.scope_backed) ||
    a.name.localeCompare(b.name),
  );

  return typeof opts.limit === 'number' ? results.slice(0, opts.limit) : results;
}

/** Lightweight count for "N certification bodies found" previews (e.g. on an Application). */
export async function countMatchingCertificationBodies(req: CBRequirement): Promise<number> {
  const matches = await matchCertificationBodies(req);
  return matches.length;
}

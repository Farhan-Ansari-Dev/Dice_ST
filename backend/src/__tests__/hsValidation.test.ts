/**
 * HS Validation foundation — the trustworthy classification core.
 *
 * Verifies the approved state machine against the curated, VERIFIED HS dataset
 * (WCO HS-2022 subset) and locks in the non-negotiable data-integrity rules:
 *   - a code is verified ONLY because it exists in the dataset;
 *   - AI can never introduce a code (candidates are dataset-backed + filtered);
 *   - malformed input is rejected, never coerced;
 *   - a product/code mismatch is surfaced, never silently accepted;
 *   - an AI outage does NOT break deterministic code validation.
 */
import { setupTestDB, teardownTestDB } from './setup';
import { seedHsCodes } from '../db/seed-hs-codes';
import { seedMarketAccessData } from '../db/seed-market-access';
import { HsCode } from '../models/HsCode';
import {
  validateHsCode,
  suggestHsCodes,
  normalizeHsCode,
  HsAiPort,
} from '../services/hsValidationService';
import { AIUnavailableError } from '../services/aiService';

// ── Injectable AI stubs (no real provider calls) ───────────────────────────
const matchAi: HsAiPort = {
  compare: async () => ({ match: true, confidence: 0.95, reason: 'fits the heading' }),
  rank: async (_p, codes) => codes,
};
const mismatchAi: HsAiPort = {
  compare: async () => ({ match: false, confidence: 0.9, reason: 'A pointing device is not an automatic data processing machine.' }),
  rank: async (_p, codes) => codes,
};
const outageAi: HsAiPort = {
  compare: async () => { throw new AIUnavailableError(); },
  rank: async () => { throw new AIUnavailableError(); },
};
// Ranker that tries to inject a code NOT in the dataset — must be filtered out.
const inventAi: HsAiPort = {
  compare: async () => ({ match: true, confidence: 0.9, reason: '' }),
  rank: async (_p, codes) => ['999999', ...codes],
};

beforeAll(async () => {
  await setupTestDB();
  await seedMarketAccessData(); // seeds the 12 ProductCategory records first
  await seedHsCodes();          // reference data; not cleared between tests
});

afterAll(async () => {
  await teardownTestDB();
});

describe('normalizeHsCode — safe normalization', () => {
  it('14 & 15: dotted and undotted 6-digit normalize identically', () => {
    expect(normalizeHsCode('8517.13')).toEqual({ normalized: '851713', display: '8517.13' });
    expect(normalizeHsCode('851713')).toEqual({ normalized: '851713', display: '8517.13' });
  });

  it('11/12/13: accepts 4-, 6- and 8-digit forms', () => {
    expect(normalizeHsCode('8517')?.normalized).toBe('8517');
    expect(normalizeHsCode('851713')?.normalized).toBe('851713');
    expect(normalizeHsCode('85171310')?.normalized).toBe('85171310');
    expect(normalizeHsCode('8517.13.10')?.normalized).toBe('85171310');
    expect(normalizeHsCode('85 17 13')?.normalized).toBe('851713');
  });

  it('10: rejects malformed / ambiguous input rather than coercing', () => {
    for (const bad of ['85..17', '.8517', '8517.', '85...', '851', '85171', 'abcd', '12', '', '  ']) {
      expect(normalizeHsCode(bad)).toBeNull();
    }
  });
});

describe('validateHsCode — state machine', () => {
  it('1: verified code + matching product → VERIFIED_MATCH', async () => {
    const r = await validateHsCode({ code: '851713', productDescription: 'a 5G smartphone' }, matchAi);
    expect(r.status).toBe('VERIFIED_MATCH');
    expect(r.verified).toBe(true);
    expect(r.productMatch).toBe(true);
    expect(r.code).toBe('851713');
    expect(r.source).toBe('WCO HS-2022');
    expect(r.requiresManualReview).toBe(false);
  });

  it('2: verified code + wrong product → VERIFIED_MISMATCH (never silently accepted)', async () => {
    const r = await validateHsCode({ code: '847130', productDescription: 'wireless bluetooth mouse' }, mismatchAi);
    expect(r.status).toBe('VERIFIED_MISMATCH');
    expect(r.verified).toBe(false);
    expect(r.productMatch).toBe(false);
    expect(r.mismatchReason).toBeTruthy();
    expect(r.requiresManualReview).toBe(true);
    expect(Array.isArray(r.candidates)).toBe(true);
  });

  it('3: invalid code → INVALID_FORMAT', async () => {
    for (const bad of ['abcd', '12', '85..17']) {
      const r = await validateHsCode({ code: bad }, matchAi);
      expect(r.status).toBe('INVALID_FORMAT');
      expect(r.verified).toBe(false);
    }
  });

  it('4: correct-format but uncovered code → NOT_IN_VERIFIED_DATASET + manual review', async () => {
    const r = await validateHsCode({ code: '010121' }, matchAi); // live horses — well-formed, not covered
    expect(r.status).toBe('NOT_IN_VERIFIED_DATASET');
    expect(r.verified).toBe(false);
    expect(r.requiresManualReview).toBe(true);
    expect(r.code).toBe('010121');
  });

  it('4b: covered code alone with no product → VERIFIED (match not evaluated)', async () => {
    const r = await validateHsCode({ code: '851713' }, matchAi);
    expect(r.status).toBe('VERIFIED');
    expect(r.verified).toBe(true);
    expect(r.productMatch).toBeNull();
  });

  it('6: no confident classification (no code + nonsense product) → MANUAL_REVIEW_REQUIRED', async () => {
    const r = await validateHsCode({ productDescription: 'zxqw qwzx blorptron' }, matchAi);
    expect(r.status).toBe('MANUAL_REVIEW_REQUIRED');
    expect(r.requiresManualReview).toBe(true);
    expect(r.candidates).toHaveLength(0);
  });

  it('7: ambiguous / misleading terminology is compared, not blindly accepted', async () => {
    // "apple" (fruit) against an electronics heading — comparator flags mismatch.
    const r = await validateHsCode({ code: '847130', productDescription: 'apple' }, mismatchAi);
    expect(r.status).toBe('VERIFIED_MISMATCH');
    expect(r.verified).toBe(false);
  });

  it('8: empty product with a covered code → VERIFIED', async () => {
    const r = await validateHsCode({ code: '851713', productDescription: '' }, matchAi);
    expect(r.status).toBe('VERIFIED');
    expect(r.productMatch).toBeNull();
  });

  it('9: empty HS code and empty product → INVALID_FORMAT', async () => {
    expect((await validateHsCode({ code: '' }, matchAi)).status).toBe('INVALID_FORMAT');
    expect((await validateHsCode({ code: '', productDescription: '' }, matchAi)).status).toBe('INVALID_FORMAT');
  });

  it('11: 4-digit heading resolves → VERIFIED', async () => {
    const r = await validateHsCode({ code: '8517' }, matchAi);
    expect(r.status).toBe('VERIFIED');
    expect(r.code).toBe('8517');
  });

  it('12: 6-digit subheading resolves → VERIFIED', async () => {
    const r = await validateHsCode({ code: '850760' }, matchAi);
    expect(r.status).toBe('VERIFIED');
    expect(r.description).toMatch(/Lithium-ion/i);
  });

  it('13: 8-digit national code rolls up to its verified 6-digit parent', async () => {
    const r = await validateHsCode({ code: '85171300' }, matchAi);
    expect(r.status).toBe('VERIFIED');
    expect(r.code).toBe('851713'); // resolved to the harmonized parent, not fabricated
  });

  it('14/15: dotted and undotted inputs give the same verified result', async () => {
    const a = await validateHsCode({ code: '8517.13' }, matchAi);
    const b = await validateHsCode({ code: '851713' }, matchAi);
    expect(a.status).toBe('VERIFIED');
    expect(a.code).toBe(b.code);
  });

  it('17: VERIFIED (code only) is never reported as VERIFIED_MATCH', async () => {
    const r = await validateHsCode({ code: '851713' }, matchAi);
    expect(r.status).toBe('VERIFIED');
    expect(r.status).not.toBe('VERIFIED_MATCH');
    expect(r.productMatch).toBeNull();
  });
});

describe('AI guardrails', () => {
  it('5 & 16: AI-suggested codes not in the dataset are filtered out', async () => {
    const r = await suggestHsCodes('a 5G smartphone', inventAi);
    expect(r.candidates.length).toBeGreaterThan(0);
    expect(r.candidates.every((c) => c.code !== '999999')).toBe(true);
    // Every surfaced candidate is dataset-backed (has provenance).
    for (const c of r.candidates) {
      expect(c.source).toBe('WCO HS-2022');
      expect(c.sourceVersion).toBe('2022');
    }
  });

  it('16b: even in VERIFIED_MISMATCH, candidate list contains only dataset codes', async () => {
    const r = await validateHsCode({ code: '847130', productDescription: 'led bulb' }, {
      compare: async () => ({ match: false, confidence: 0.9, reason: 'A lamp is not an ADP machine.' }),
      rank: async (_p, codes) => ['000000', ...codes],
    });
    expect(r.status).toBe('VERIFIED_MISMATCH');
    expect(r.candidates.every((c) => c.code !== '000000')).toBe(true);
  });
});

describe('AI outage resilience', () => {
  it('deterministic code lookup works with no AI (code only)', async () => {
    const r = await validateHsCode({ code: '851713' }, outageAi);
    expect(r.status).toBe('VERIFIED');
    expect(r.verified).toBe(true);
  });

  it('code + product under AI outage → VERIFIED but flagged for manual match review (never a silent match)', async () => {
    const r = await validateHsCode({ code: '851713', productDescription: 'smartphone' }, outageAi);
    expect(r.status).toBe('VERIFIED');
    expect(r.productMatch).toBeNull();
    expect(r.requiresManualReview).toBe(true);
    expect(r.status).not.toBe('VERIFIED_MATCH');
  });

  it('suggestions degrade to dataset order under AI outage (no crash)', async () => {
    const r = await suggestHsCodes('smartphone', outageAi);
    expect(r.candidates.length).toBeGreaterThan(0);
  });
});

describe('coverage honesty', () => {
  it('every result carries the curated-coverage disclaimer (not a complete DB)', async () => {
    const r = await validateHsCode({ code: '851713' }, matchAi);
    expect(r.coverageNote).toMatch(/curated subset/i);
    expect(r.coverageNote).toMatch(/not a complete global HS database/i);
  });

  it('seeded codes link to existing ProductCategory records (reuse, not duplication)', async () => {
    const smartphone = await HsCode.findOne({ code: '851713' }).lean();
    expect(smartphone?.productCategoryId).toBeTruthy(); // linked to "Mobile Phone"
    // Every seeded row carries provenance.
    const all = await HsCode.find({}).lean();
    expect(all.length).toBe(18);
    for (const c of all as any[]) {
      expect(c.source).toBe('WCO HS-2022');
      expect(c.verifiedAt).toBeTruthy();
    }
  });
});

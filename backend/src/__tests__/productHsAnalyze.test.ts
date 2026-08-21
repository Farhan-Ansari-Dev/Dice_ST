/**
 * Product Analyzer — HS classification intelligence (Phase 2D).
 *
 * Verifies the analyzer builds on the verified HS dataset and the integrity
 * rules hold: user codes are validated (not trusted), semantic mismatches are
 * surfaced (never silently replaced), AI never introduces a code, and anything
 * uncertain routes to expert review. AI is injected/stubbed — no provider calls.
 */
import { setupTestDB, teardownTestDB } from './setup';
import { seedMarketAccessData } from '../db/seed-market-access';
import { seedHsCodes } from '../db/seed-hs-codes';
import { analyzeProductHs } from '../services/productHsService';
import { HsAiPort } from '../services/hsValidationService';
import { AIUnavailableError } from '../services/aiService';

// Comparator that "matches" only when the official description shares a keyword
// with the product — a deterministic stand-in for the AI semantic check.
const smartAi: HsAiPort = {
  compare: async (product, official) => {
    const p = product.toLowerCase();
    const o = official.toLowerCase();
    const overlap = ['smartphone', 'laptop', 'led', 'lamp', 'speaker', 'earphone', 'headphone', 'charger', 'converter', 'camera', 'battery', 'lithium']
      .some((w) => p.includes(w) && o.includes(w));
    return { match: overlap, confidence: overlap ? 0.9 : 0.2, reason: overlap ? 'shared characteristics' : 'different kind of good' };
  },
  rank: async (_p, codes) => codes,
};

const outageAi: HsAiPort = {
  compare: async () => { throw new AIUnavailableError(); },
  rank: async () => { throw new AIUnavailableError(); },
};

// Ranker that injects a non-dataset code — must be filtered by the HS core.
const inventAi: HsAiPort = {
  compare: async () => ({ match: true, confidence: 0.9, reason: '' }),
  rank: async (_p, codes) => ['999999', ...codes],
};

beforeAll(async () => {
  await setupTestDB();
  await seedMarketAccessData();
  await seedHsCodes();
});

afterAll(async () => {
  await teardownTestDB();
});

describe('analyzeProductHs', () => {
  it('1: valid user HS code that matches the product → RESOLVED', async () => {
    const r = await analyzeProductHs({ productName: 'Android smartphone', code: '851713' }, smartAi);
    expect(r.status).toBe('RESOLVED');
    expect(r.recommended?.code).toBe('851713');
    expect(r.providedCode?.status).toBe('VERIFIED_MATCH');
  });

  it('2: invalid HS format → INVALID_FORMAT (not accepted)', async () => {
    const r = await analyzeProductHs({ productName: 'smartphone', code: '85..17' }, smartAi);
    expect(r.status).toBe('INVALID_FORMAT');
    expect(r.recommended).toBeNull();
  });

  it('3: semantically incompatible user code → PROVIDED_MISMATCH, not silently replaced', async () => {
    // 8471.30 = portable computers; product is a mouse → mismatch.
    const r = await analyzeProductHs({ productName: 'wireless computer mouse', code: '847130' }, smartAi);
    expect(r.status).toBe('PROVIDED_MISMATCH');
    expect(r.providedCode?.code).toBe('847130'); // user code preserved, not overwritten
    expect(r.requiresManualReview).toBe(true);
    expect(r.message).toMatch(/may not match/i);
  });

  it('4: correct classification from description (no code) → RESOLVED with dataset code', async () => {
    const r = await analyzeProductHs({ productName: 'LED bulb', productDescription: 'E27 LED lamp 9W' }, smartAi);
    expect(['RESOLVED', 'AMBIGUOUS']).toContain(r.status);
    expect(r.recommended?.code).toBe('853952');
    expect(r.recommended?.source).toBe('WCO HS-2022');
  });

  it('5: ambiguous product (low confidence) → AMBIGUOUS + alternatives + review', async () => {
    const lowAi: HsAiPort = { compare: async () => ({ match: false, confidence: 0.3, reason: 'unclear' }), rank: async (_p, c) => c };
    const r = await analyzeProductHs({ productName: 'speaker' }, lowAi);
    expect(r.status).toBe('AMBIGUOUS');
    expect(r.candidates.length).toBeGreaterThan(0);
    expect(r.requiresManualReview).toBe(true);
  });

  it('6: missing product information → NEEDS_MORE_INFO with clarification questions', async () => {
    const r = await analyzeProductHs({}, smartAi);
    expect(r.status).toBe('NEEDS_MORE_INFO');
    expect(r.clarification && r.clarification.length).toBeGreaterThan(0);
    expect(r.recommended).toBeNull();
  });

  it('7: unsupported market → market note clarifies national tariff differs', async () => {
    const r = await analyzeProductHs({ productName: 'smartphone', code: '851713', market: 'US' }, smartAi);
    expect(r.marketNote).toMatch(/national tariff/i);
    expect(r.marketNote).toMatch(/US/);
  });

  it('7b: India market → note points national lines to expert review', async () => {
    const r = await analyzeProductHs({ productName: 'smartphone', code: '851713', market: 'IN' }, smartAi);
    expect(r.marketNote).toMatch(/India/i);
  });

  it('8: AI unavailable → deterministic parts still work; no silent match', async () => {
    // Code-only path: still verified, routed to review rather than a fake match.
    const withCode = await analyzeProductHs({ productName: 'smartphone', code: '851713' }, outageAi);
    expect(withCode.recommended?.code).toBe('851713');
    expect(withCode.recommended?.confidence).toBeNull();

    // Description path: candidates still surface, but confidence unknown → ambiguous.
    const noCode = await analyzeProductHs({ productName: 'LED bulb' }, outageAi);
    expect(noCode.candidates.length).toBeGreaterThan(0);
    expect(noCode.status).toBe('AMBIGUOUS');
    expect(noCode.recommended?.confidence).toBeNull();
  });

  it('9: AI returns a non-dataset code → filtered; recommendations stay dataset-backed', async () => {
    const r = await analyzeProductHs({ productName: 'Android smartphone' }, inventAi);
    expect(r.candidates.every((c) => c.code !== '999999')).toBe(true);
    if (r.recommended) expect(r.recommended.code).not.toBe('999999');
  });

  it('unknown/uncovered product → NO_VERIFIED_MATCH + expert review', async () => {
    const r = await analyzeProductHs({ productName: 'live horse breeding stock' }, smartAi);
    expect(r.status).toBe('NO_VERIFIED_MATCH');
    expect(r.requiresManualReview).toBe(true);
    expect(r.recommended).toBeNull();
  });
});

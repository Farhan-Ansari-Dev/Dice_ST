/**
 * Phase 2D.1 — HS classification hardening regression.
 *
 * The production bug: "Wireless Mouse" with no HS code was recommended 851830
 * (headphones/earphones) — an unrelated code surfaced only because the generic
 * token "wireless" appears inside 851830's keyword "wireless earbuds", and the
 * decision logic recommended the closest candidate without an affirmative,
 * high-confidence semantic match.
 *
 * These tests lock the hardened contract: the analyzer NEVER recommends a code
 * unless the AI affirmatively matches the product to that code's official
 * description above the confidence threshold; otherwise → NO_VERIFIED_MATCH with
 * recommendedCode = null and manual review. AI never introduces codes. Uses
 * injected AI stubs — no provider calls.
 */
import { setupTestDB, teardownTestDB } from './setup';
import { seedMarketAccessData } from '../db/seed-market-access';
import { seedHsCodes } from '../db/seed-hs-codes';
import { analyzeProductHs } from '../services/productHsService';
import { HsAiPort } from '../services/hsValidationService';
import { AIUnavailableError } from '../services/aiService';

const matchAi: HsAiPort = { compare: async () => ({ match: true, confidence: 0.9, reason: 'affirmative' }), rank: async (_p, c) => c };
const noMatchAi: HsAiPort = { compare: async () => ({ match: false, confidence: 0.2, reason: 'different good' }), rank: async (_p, c) => c };
const highConfButNoMatch: HsAiPort = { compare: async () => ({ match: false, confidence: 0.95, reason: 'confident it is NOT this' }), rank: async (_p, c) => c };
const lowConfMatch: HsAiPort = { compare: async () => ({ match: true, confidence: 0.5, reason: 'weak' }), rank: async (_p, c) => c };
const outageAi: HsAiPort = { compare: async () => { throw new AIUnavailableError(); }, rank: async () => { throw new AIUnavailableError(); } };
const inventAi: HsAiPort = { compare: async () => ({ match: true, confidence: 0.9, reason: 'ok' }), rank: async (_p, codes) => ['999999', ...codes] };

beforeAll(async () => {
  await setupTestDB();
  await seedMarketAccessData();
  await seedHsCodes();
});
afterAll(async () => {
  await teardownTestDB();
});

describe('HS classification hardening', () => {
  it('1: mobile phone + 851713 → RESOLVED', async () => {
    const r = await analyzeProductHs({ productName: 'mobile phone', code: '851713' }, matchAi);
    expect(r.status).toBe('RESOLVED');
    expect(r.recommended?.code).toBe('851713');
  });

  it('2 (THE BUG): wireless mouse + no HS → NO_VERIFIED_MATCH, never recommends 851830', async () => {
    // Even with an AI that would say "match", there must be NO candidate to
    // recommend — "wireless" must not pull in 851830 (headphones).
    const r = await analyzeProductHs({ productName: 'Wireless Mouse' }, matchAi);
    expect(r.status).toBe('NO_VERIFIED_MATCH');
    expect(r.recommended).toBeNull();
    expect(r.requiresManualReview).toBe(true);
    expect(r.candidates.every((c) => c.code !== '851830')).toBe(true);
    expect(r.message).toMatch(/expert review/i);
  });

  it('3: wireless mouse + 847130 → PROVIDED_MISMATCH, code preserved, no bogus alternative', async () => {
    const r = await analyzeProductHs({ productName: 'wireless mouse', code: '847130' }, noMatchAi);
    expect(r.status).toBe('PROVIDED_MISMATCH');
    expect(r.providedCode?.code).toBe('847130'); // never silently replaced
    expect(r.requiresManualReview).toBe(true);
    // No unrelated dataset-backed alternative for a mouse.
    expect(r.recommended).toBeNull();
    expect(r.candidates.every((c) => c.code !== '851830')).toBe(true);
  });

  it('4: keyboard + no HS → NO_VERIFIED_MATCH (no verified evidence)', async () => {
    const r = await analyzeProductHs({ productName: 'mechanical keyboard' }, matchAi);
    expect(r.status).toBe('NO_VERIFIED_MATCH');
    expect(r.recommended).toBeNull();
  });

  it('5: USB cable + no HS → NO_VERIFIED_MATCH', async () => {
    const r = await analyzeProductHs({ productName: 'USB cable' }, matchAi);
    expect(r.status).toBe('NO_VERIFIED_MATCH');
    expect(r.recommended).toBeNull();
  });

  it('6: laptop + no HS → RESOLVED (strong verified evidence)', async () => {
    const r = await analyzeProductHs({ productName: 'laptop' }, matchAi);
    expect(r.status).toBe('RESOLVED');
    expect(r.recommended?.code).toBe('847130');
  });

  it('7: headphones + no HS → RESOLVED to 851830 (its OWN category, never mouse/mobile)', async () => {
    const r = await analyzeProductHs({ productName: 'headphones' }, matchAi);
    expect(r.status).toBe('RESOLVED');
    expect(r.recommended?.code).toBe('851830');
  });

  it('8: speaker + no HS → RESOLVED to a loudspeaker code, never an unrelated category', async () => {
    const r = await analyzeProductHs({ productName: 'speaker' }, matchAi);
    expect(r.status).toBe('RESOLVED');
    expect(['851821', '851822']).toContain(r.recommended?.code);
  });

  it('9: power bank + no HS → RESOLVED (existing verified mapping keeps working)', async () => {
    // "power bank" matches both 850760 (Li-ion accumulator) and 850440 (adapter)
    // via the shared token "power"; disambiguation is the AI ranker's job. This
    // stub reflects the real AI ranking the power-bank code first.
    const rankPreferring850760: HsAiPort = {
      compare: async () => ({ match: true, confidence: 0.9, reason: 'ok' }),
      rank: async (_p, codes) => ['850760', ...codes.filter((c) => c !== '850760')],
    };
    const r = await analyzeProductHs({ productName: 'power bank' }, rankPreferring850760);
    expect(r.status).toBe('RESOLVED');
    expect(r.recommended?.code).toBe('850760');
  });

  it('10: random uncovered electronics → NO_VERIFIED_MATCH', async () => {
    const r = await analyzeProductHs({ productName: 'plasma flux inducer 9000' }, matchAi);
    expect(r.status).toBe('NO_VERIFIED_MATCH');
    expect(r.recommended).toBeNull();
  });

  it('11: malformed HS → INVALID_FORMAT', async () => {
    const r = await analyzeProductHs({ productName: 'smartphone', code: '85..17' }, matchAi);
    expect(r.status).toBe('INVALID_FORMAT');
    expect(r.recommended).toBeNull();
  });

  it('12: AI returns a non-dataset code → discarded; recommendation stays dataset-backed', async () => {
    const r = await analyzeProductHs({ productName: 'headphones' }, inventAi);
    expect(r.candidates.every((c) => c.code !== '999999')).toBe(true);
    if (r.recommended) expect(r.recommended.code).not.toBe('999999');
  });

  it('13a: AI outage + provided code → deterministic VERIFIED still works', async () => {
    const r = await analyzeProductHs({ productName: 'smartphone', code: '851713' }, outageAi);
    expect(r.recommended?.code).toBe('851713');
    expect(r.recommended?.confidence).toBeNull();
  });

  it('13b: AI outage + no code → NO_VERIFIED_MATCH, no fabricated recommendation', async () => {
    const r = await analyzeProductHs({ productName: 'headphones' }, outageAi);
    expect(r.status).toBe('NO_VERIFIED_MATCH');
    expect(r.recommended).toBeNull();
  });

  it('strict: high confidence but NON-affirmative match → NO_VERIFIED_MATCH', async () => {
    const r = await analyzeProductHs({ productName: 'headphones' }, highConfButNoMatch);
    expect(r.status).toBe('NO_VERIFIED_MATCH');
    expect(r.recommended).toBeNull();
  });

  it('strict: affirmative match BELOW threshold → NO_VERIFIED_MATCH', async () => {
    const r = await analyzeProductHs({ productName: 'headphones' }, lowConfMatch);
    expect(r.status).toBe('NO_VERIFIED_MATCH');
    expect(r.recommended).toBeNull();
  });
});

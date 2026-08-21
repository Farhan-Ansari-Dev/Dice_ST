/**
 * Trade Traffic — HS-validated, never-fabricated (Phase 2E).
 *
 * Confirms: wrong/invalid HS never yields traffic; verified data is shown only
 * from a real provider; no provider (or a failing provider) → honest
 * "unavailable" state, never invented numbers.
 */
import { setupTestDB, teardownTestDB } from './setup';
import { seedMarketAccessData } from '../db/seed-market-access';
import { seedHsCodes } from '../db/seed-hs-codes';
import { getTradeTraffic, TradeDataProvider } from '../services/tradeDataService';
import { HsAiPort } from '../services/hsValidationService';

const smartAi: HsAiPort = {
  compare: async (product, official) => {
    const p = product.toLowerCase(), o = official.toLowerCase();
    const hit = ['smartphone', 'led', 'lamp', 'laptop', 'charger', 'converter', 'speaker', 'earphone', 'headphone', 'camera', 'lithium', 'battery']
      .some((w) => p.includes(w) && o.includes(w));
    return { match: hit, confidence: hit ? 0.9 : 0.2, reason: hit ? 'match' : 'different good' };
  },
  rank: async (_p, c) => c,
};

const dataProvider: TradeDataProvider = {
  name: 'test-feed',
  async getTraffic(hsCode, market) {
    return { source: 'Test Feed', period: '2023', market, hsCode, records: [{ period: '2023', direction: 'import', valueUsd: 1000000 }] };
  },
};
const emptyProvider: TradeDataProvider = { name: 'empty', async getTraffic() { return null; } };
const failingProvider: TradeDataProvider = { name: 'boom', async getTraffic() { throw new Error('feed down'); } };

beforeAll(async () => {
  await setupTestDB();
  await seedMarketAccessData();
  await seedHsCodes();
});
afterAll(async () => {
  await teardownTestDB();
});

describe('getTradeTraffic', () => {
  it('valid HS + market + real provider → OK with verified, sourced data', async () => {
    const r = await getTradeTraffic({ productName: 'smartphone', code: '851713', market: 'IN' }, { provider: dataProvider, ai: smartAi });
    expect(r.status).toBe('OK');
    expect(r.dataAvailable).toBe(true);
    expect(r.data?.source).toBe('Test Feed');
    expect(r.data?.records.length).toBeGreaterThan(0);
  });

  it('wrong HS for the product → HS_MISMATCH, no traffic shown', async () => {
    const r = await getTradeTraffic({ productName: 'wireless computer mouse', code: '847130', market: 'IN' }, { provider: dataProvider, ai: smartAi });
    expect(r.status).toBe('HS_MISMATCH');
    expect(r.data).toBeNull();
    expect(r.requiresManualReview).toBe(true);
  });

  it('invalid HS format → INVALID_HS, no traffic', async () => {
    const r = await getTradeTraffic({ productName: 'smartphone', code: '85..17', market: 'IN' }, { provider: dataProvider, ai: smartAi });
    expect(r.status).toBe('INVALID_HS');
    expect(r.data).toBeNull();
  });

  it('unsupported/uncovered product → NO_HS, expert review', async () => {
    const r = await getTradeTraffic({ productName: 'live horse', market: 'IN' }, { provider: dataProvider, ai: smartAi });
    expect(r.status).toBe('NO_HS');
    expect(r.requiresManualReview).toBe(true);
  });

  it('no market supplied → NEEDS_MARKET', async () => {
    const r = await getTradeTraffic({ productName: 'smartphone', code: '851713' }, { provider: dataProvider, ai: smartAi });
    expect(r.status).toBe('NEEDS_MARKET');
    expect(r.hsCode).toBe('851713');
  });

  it('empty provider (no verified data) → UNAVAILABLE, never fabricated', async () => {
    const r = await getTradeTraffic({ productName: 'smartphone', code: '851713', market: 'IN' }, { provider: emptyProvider, ai: smartAi });
    expect(r.status).toBe('UNAVAILABLE');
    expect(r.dataAvailable).toBe(false);
    expect(r.data).toBeNull();
    expect(r.message).toMatch(/No verified trade traffic/i);
  });

  it('provider failure → degrades to UNAVAILABLE, does not crash or invent data', async () => {
    const r = await getTradeTraffic({ productName: 'smartphone', code: '851713', market: 'IN' }, { provider: failingProvider, ai: smartAi });
    expect(r.status).toBe('UNAVAILABLE');
    expect(r.data).toBeNull();
  });

  it('default provider (no live feed) → UNAVAILABLE', async () => {
    const r = await getTradeTraffic({ productName: 'smartphone', code: '851713', market: 'IN' }, { ai: smartAi });
    expect(r.status).toBe('UNAVAILABLE');
  });
});

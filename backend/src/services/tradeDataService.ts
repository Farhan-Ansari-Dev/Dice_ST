/**
 * Trade Traffic — import/export activity for a product/HS code and market.
 *
 * Two hard rules:
 *   1. Never show traffic for a wrong HS code. The product/code pairing is
 *      validated through the Phase-2D analyzer first; a mismatch stops here.
 *   2. Never fabricate trade numbers. Trade volume/value only ever comes from a
 *      real TradeDataProvider. DICE currently has NO live trade-data provider,
 *      so the default provider returns null and the API honestly reports
 *      "no verified trade traffic data available" — the feature stays useful via
 *      HS validation + market context, but invents nothing.
 *
 * When a real provider (UN Comtrade, DGFT, customs feed, …) is integrated later,
 * it implements TradeDataProvider and plugs in here with no UI change.
 */
import { analyzeProductHs, ProductAnalysisResult } from './productHsService';
import { HsAiPort } from './hsValidationService';

export type TradeDirection = 'import' | 'export';

export interface TradeRecord {
  period: string;            // e.g. "2023" or "2023-Q4"
  direction: TradeDirection;
  partner?: string;          // partner country/market
  valueUsd?: number;
  quantity?: number;
  unit?: string;
}

export interface TradeTraffic {
  source: string;            // provenance — required for any real data
  sourceUrl?: string;
  period: string;            // coverage period, e.g. "2019–2023"
  market: string;
  hsCode: string;
  records: TradeRecord[];
}

/** A pluggable source of VERIFIED trade data. Returns null when it has none. */
export interface TradeDataProvider {
  name: string;
  getTraffic(hsCode: string, market: string): Promise<TradeTraffic | null>;
}

/** Default: DICE has no live trade-data feed, so it never invents numbers. */
export const nullTradeDataProvider: TradeDataProvider = {
  name: 'none',
  async getTraffic() {
    return null;
  },
};

let activeProvider: TradeDataProvider = nullTradeDataProvider;
export function getTradeProvider(): TradeDataProvider {
  return activeProvider;
}
export function setTradeProvider(p: TradeDataProvider): void {
  activeProvider = p;
}

export type TradeTrafficStatus =
  | 'OK'            // verified trade data returned
  | 'INVALID_HS'   // provided HS code malformed
  | 'HS_MISMATCH'  // provided HS code doesn't fit the product
  | 'NO_HS'        // couldn't resolve an HS code to look up
  | 'NEEDS_MARKET' // no target market supplied
  | 'UNAVAILABLE'; // HS ok, but no verified trade data for this HS/market

export interface TradeTrafficResult {
  status: TradeTrafficStatus;
  /** HS classification / wrong-HS analysis (Phase 2D). Always present. */
  hs: ProductAnalysisResult;
  market: string | null;
  hsCode: string | null;
  data: TradeTraffic | null;
  dataAvailable: boolean;
  requiresManualReview: boolean;
  message: string;
  coverageNote: string;
}

export interface TradeTrafficInput {
  productName?: string;
  productDescription?: string;
  code?: string;
  market?: string;
}

const COVERAGE_NOTE =
  'Trade traffic is shown only from verified sources. DICE has no live trade-volume feed yet, so figures are not estimated or fabricated.';

/** Resolve the HS code to look traffic up under, from the analyzer result. */
function resolvedHsCode(hs: ProductAnalysisResult): string | null {
  if (hs.status === 'RESOLVED' && hs.recommended) return hs.recommended.code;
  // For a verified provided code with no product comparison.
  if (hs.providedCode?.verified && hs.providedCode.code) return hs.providedCode.code;
  return null;
}

export async function getTradeTraffic(
  input: TradeTrafficInput,
  opts: { provider?: TradeDataProvider; ai?: HsAiPort } = {},
): Promise<TradeTrafficResult> {
  const provider = opts.provider ?? getTradeProvider();
  const market = input.market?.trim().toUpperCase() || null;

  const hs = await analyzeProductHs(
    { productName: input.productName, productDescription: input.productDescription, code: input.code, market: market ?? undefined },
    opts.ai,
  );

  const base = {
    hs,
    market,
    hsCode: null as string | null,
    data: null as TradeTraffic | null,
    dataAvailable: false,
    requiresManualReview: hs.requiresManualReview,
    coverageNote: COVERAGE_NOTE,
  };

  // Wrong / invalid HS → never show traffic for it.
  if (hs.status === 'INVALID_FORMAT') {
    return { ...base, status: 'INVALID_HS', message: 'Enter a valid HS code, or describe the product so we can classify it.' };
  }
  if (hs.status === 'PROVIDED_MISMATCH') {
    return { ...base, status: 'HS_MISMATCH', requiresManualReview: true, message: 'HS Code may not match this product. Resolve the classification before viewing trade traffic.' };
  }

  const hsCode = resolvedHsCode(hs);
  if (!hsCode) {
    return { ...base, status: 'NO_HS', requiresManualReview: true, message: 'We couldn’t confidently determine an HS code for this product. Expert review recommended.' };
  }

  if (!market) {
    return { ...base, hsCode, status: 'NEEDS_MARKET', message: 'Select a target market to view its trade traffic.' };
  }

  // Fetch from the verified provider. A provider failure must NEVER fabricate
  // data — it degrades to the same honest "unavailable" state.
  let data: TradeTraffic | null = null;
  try {
    data = await provider.getTraffic(hsCode, market);
  } catch {
    data = null;
  }

  if (data && data.records.length > 0) {
    return { ...base, hsCode, status: 'OK', data, dataAvailable: true, message: `Verified trade traffic from ${data.source}.` };
  }

  return {
    ...base,
    hsCode,
    status: 'UNAVAILABLE',
    message: `No verified trade traffic data is currently available for HS ${hsCode} in ${market}.`,
  };
}

export default { getTradeTraffic, getTradeProvider, setTradeProvider, nullTradeDataProvider };

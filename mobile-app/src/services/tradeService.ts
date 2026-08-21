/**
 * Trade Traffic client. Validates the product↔HS pairing and returns verified
 * trade data only — never fabricated numbers (see backend tradeDataService).
 */
import api from './api';
import { ProductAnalysis } from './hsService';

export type TradeTrafficStatus =
  | 'OK'
  | 'INVALID_HS'
  | 'HS_MISMATCH'
  | 'NO_HS'
  | 'NEEDS_MARKET'
  | 'UNAVAILABLE';

export interface TradeRecord {
  period: string;
  direction: 'import' | 'export';
  partner?: string;
  valueUsd?: number;
  quantity?: number;
  unit?: string;
}

export interface TradeTraffic {
  source: string;
  sourceUrl?: string;
  period: string;
  market: string;
  hsCode: string;
  records: TradeRecord[];
}

export interface TradeTrafficResult {
  status: TradeTrafficStatus;
  hs: ProductAnalysis;
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

const tradeService = {
  traffic: async (input: TradeTrafficInput): Promise<TradeTrafficResult> => {
    const res = await api.post<{ success: boolean; data: TradeTrafficResult }>('/trade/traffic', input);
    return res.data;
  },
};

export default tradeService;

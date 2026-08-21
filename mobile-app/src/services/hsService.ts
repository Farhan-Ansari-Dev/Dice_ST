/**
 * HS classification client — talks to the verified HS core (Phase 1) and the
 * Product Analyzer orchestration (Phase 2D). A code is only ever "verified"
 * because it exists in the dataset; AI assists but never authorizes a code.
 */
import api from './api';

export type AnalysisStatus =
  | 'RESOLVED'
  | 'PROVIDED_MISMATCH'
  | 'INVALID_FORMAT'
  | 'AMBIGUOUS'
  | 'NEEDS_MORE_INFO'
  | 'NO_VERIFIED_MATCH';

export interface HsCandidate {
  code: string;
  displayCode: string;
  description: string;
  source: string;
  sourceVersion: string;
}

export interface RecommendedHs {
  code: string;
  displayCode: string;
  description: string;
  confidence: number | null;
  reason: string;
  source: string;
  sourceVersion: string;
}

export interface ProductAnalysis {
  product: string;
  status: AnalysisStatus;
  providedCode: any | null;
  recommended: RecommendedHs | null;
  candidates: HsCandidate[];
  clarification: string[] | null;
  requiresManualReview: boolean;
  marketNote: string | null;
  coverageNote: string;
  message: string;
}

export interface AnalyzeInput {
  productName?: string;
  productDescription?: string;
  category?: string;
  brand?: string;
  model?: string;
  code?: string;
  market?: string;
}

const hsService = {
  analyze: async (input: AnalyzeInput): Promise<ProductAnalysis> => {
    const res = await api.post<{ success: boolean; data: ProductAnalysis }>('/hs/analyze', input);
    return res.data;
  },
};

export default hsService;

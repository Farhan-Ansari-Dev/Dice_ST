/**
 * Market Access domain search client. Returns typed, grouped results over
 * verified global reference data (never fabricated).
 */
import api from './api';

export interface SearchResults {
  hsCodes: { code: string; displayCode: string; description: string; source: string }[];
  certifications: { code: string; name: string; authority: string; country: string }[];
  opportunities: { _id: string; title: string; industry?: string; country?: string; investment?: number; demand?: string; requiredCertifications?: string[] }[];
  markets: { code: string; name: string; flag?: string }[];
  categories: { id: string; name: string }[];
}

export interface SearchResponse {
  query: string;
  results: SearchResults;
}

const marketSearchService = {
  search: async (q: string): Promise<SearchResponse> => {
    const res = await api.get<SearchResponse>('/market-access/search', { params: { q } });
    return res;
  },
};

export default marketSearchService;

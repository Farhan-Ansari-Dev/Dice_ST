/**
 * Market Access opportunities / business guides client.
 *
 * Reads verified BusinessOpportunity / BusinessGuide data. Never fabricates —
 * a missing guide resolves to null so the UI can show an honest unavailable
 * state instead of inventing content.
 */
import api from './api';

export interface BusinessGuide {
  _id: string;
  title: string;
  banner?: string;
  content: string;
  images?: string[];
  downloads?: { name: string; url: string }[];
  faqs?: { question: string; answer: string }[];
}

const opportunitiesService = {
  /** Fetch a business guide by id, or null if it doesn't exist. */
  getGuide: async (id: string): Promise<BusinessGuide | null> => {
    try {
      const res = await api.get<{ success: boolean; data: BusinessGuide | null }>(`/bi/guides/${id}`);
      return res.data ?? null;
    } catch {
      return null;
    }
  },

  /** Fetch a single opportunity by id (full object), or null. */
  getOpportunity: async (id: string): Promise<any | null> => {
    try {
      const res = await api.get<{ success: boolean; data: any }>(`/bi/opportunities/${id}`);
      return res.data ?? null;
    } catch {
      return null;
    }
  },
};

export default opportunitiesService;

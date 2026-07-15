import api from './api';

// Text-based insight — mirrors the backend Insight schema (no image fields).
export interface Insight {
  _id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  country?: string;
  source: string;        // Source Name
  link: string;          // Source URL — "Visit Official Source"
  tags: string[];
  published: boolean;
  featured: boolean;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIInsight {
  id: string;
  question: string;
  answer: string;
  context?: string;
  confidence: number;
  sources: string[];
  createdAt: string;
}

const insightsService = {
  getInsights: (params?: {
    category?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) =>
    api.get<{ data: Insight[]; total: number }>('/insights', { params }),

  getInsightById: (id: string) =>
    api.get<Insight>(`/insights/${id}`),

  bookmarkInsight: (id: string) =>
    api.post<{ message: string }>(`/insights/${id}/bookmark`),

  unbookmarkInsight: (id: string) =>
    api.delete<{ message: string }>(`/insights/${id}/bookmark`),

  getBookmarkedInsights: () =>
    api.get<Insight[]>('/insights/bookmarked'),

  askAI: (question: string, context?: string) =>
    api.post<AIInsight>('/ai/ask', { question, context }),

};

export default insightsService;

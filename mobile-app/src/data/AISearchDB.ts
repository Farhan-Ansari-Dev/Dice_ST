import { api } from '../services/api';

export type SearchActionType = 'navigate' | 'qa';

export interface AppRouteAction {
  route: string;
  screen?: string;
  params?: any;
}

export interface AISearchResult {
  id: string;
  type: SearchActionType;
  keywords: string[];
  title: string;
  content: string; // The RAG answer or the description of the action
  action?: AppRouteAction;
  source?: string;
  confidence: number;
}

export const performAISearch = async (query: string): Promise<AISearchResult[]> => {
  try {
    // Call the actual backend AI endpoint
    const response = await api.post<any>('/ai/chat', { message: query });
    const data = response.data as any;

    if (data && data.response) {
      return [
        {
          id: Date.now().toString(),
          type: 'qa',
          keywords: [],
          title: 'Dice AI Response',
          content: data.response,
          source: 'Sanyog Conformity AI Engine',
          confidence: 0.95
        }
      ];
    }

    throw new Error('Invalid response format');
  } catch (error) {
    console.error('AI Search Error:', error);
    
    // Polite Fallback Logic in case of API failure
    return [
      {
        id: 'out_of_scope',
        type: 'qa',
        keywords: [],
        title: 'System Error',
        content: `I am currently experiencing connectivity issues with my knowledge base. Please try asking again in a few moments.`,
        source: 'Dice AI Guardrails',
        confidence: 1.0
      }
    ];
  }
};

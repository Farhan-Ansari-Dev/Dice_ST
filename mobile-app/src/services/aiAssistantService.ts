/**
 * DICE AI assistant client.
 *
 * Replaces data/AISearchDB.ts, which lived in a `data/` folder as if it were a
 * fixture and attached a hardcoded `confidence: 0.95` to every answer — a
 * number the model never produced.
 *
 * There is no local fallback: when AI is unavailable the caller renders an
 * explicit unavailable state. Fabricated compliance answers are worse than a
 * visible outage because a customer cannot tell them apart from real ones.
 */
import api from './api';

export class AIUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIUnavailableError';
  }
}

export interface AIAnswer {
  /** Model-generated answer text. */
  content: string;
  /** Server-assigned conversation id, for follow-up turns. */
  conversationId: string;
}

/** Maps a transport error to a typed one the UI can branch on. */
function toAIError(err: any): Error {
  const status = err?.response?.status;
  const message =
    err?.response?.data?.message ??
    'The AI assistant is temporarily unavailable. Please try again shortly.';

  if (status === 503 || err?.response?.data?.error === 'ai_unavailable') {
    return new AIUnavailableError(message);
  }
  return new Error(message);
}

const aiAssistantService = {
  /**
   * Sends a message to the compliance assistant.
   * Pass `conversationId` to continue an existing thread.
   */
  ask: async (message: string, conversationId?: string): Promise<AIAnswer> => {
    try {
      const res = await api.post<{
        success: boolean;
        data: { response: string; conversationId: string };
      }>('/ai/chat', { message, conversationId });

      return {
        content: res.data.response,
        conversationId: res.data.conversationId,
      };
    } catch (err) {
      throw toAIError(err);
    }
  },

  /** Personalised compliance recommendations for the signed-in user. */
  recommendations: async (): Promise<string[]> => {
    try {
      const res = await api.get<{ success: boolean; data: string[] }>('/ai/recommendations');
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      throw toAIError(err);
    }
  },
};

export default aiAssistantService;

/**
 * AI consent client — the mobile side of the Phase-1 backend consent gate.
 *
 * The BACKEND is authoritative: it stores the consent record and returns
 * `is_current` (true only when the user has accepted the current terms version).
 * This client never decides consent on its own — it reads/writes the backend and
 * relies on the server's 403 `ai_consent_required` as the real enforcement point.
 *
 * Endpoints (Phase 1):
 *   GET  /users/me/ai-consent            → AiConsentStatus
 *   POST /users/me/ai-consent {accepted} → AiConsentStatus
 */
import api from './api';
import type { AiConsentStatus } from './aiConsentShared';

export type { AiConsentStatus } from './aiConsentShared';
export { isAiConsentError } from './aiConsentShared';

const aiConsentService = {
  /** Current consent status for the signed-in user (backend is authoritative). */
  getStatus: async (): Promise<AiConsentStatus> => {
    const res = await api.get<{ success: boolean; data: AiConsentStatus }>('/users/me/ai-consent');
    return res.data;
  },

  /** Record acceptance of the current terms. Resolves only on a successful write. */
  accept: async (): Promise<AiConsentStatus> => {
    const res = await api.post<{ success: boolean; data: AiConsentStatus }>('/users/me/ai-consent', {
      accepted: true,
    });
    return res.data;
  },

  /** Withdraw consent. Future AI operations will require consent again. */
  withdraw: async (): Promise<AiConsentStatus> => {
    const res = await api.post<{ success: boolean; data: AiConsentStatus }>('/users/me/ai-consent', {
      accepted: false,
    });
    return res.data;
  },
};

export default aiConsentService;

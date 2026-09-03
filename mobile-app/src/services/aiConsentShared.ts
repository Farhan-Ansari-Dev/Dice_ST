/**
 * Dependency-free AI-consent primitives shared by the client service and the
 * consent gate. Kept import-free (no `api`, no native modules) so the gate and
 * its unit tests can use them without pulling the network/storage stack.
 */

export interface AiConsentStatus {
  consented: boolean;
  version: string | null;
  consented_at: string | null;
  declined_at: string | null;
  current_version: string;
  /** true only when consented AND at the current terms version. The gate trusts this. */
  is_current: boolean;
}

/**
 * True when an error is the backend's "consent required" 403. Lets the AI gate
 * surface the disclosure instead of a generic failure — without the client ever
 * guessing about consent itself.
 */
export function isAiConsentError(err: any): boolean {
  return err?.response?.status === 403 && err?.response?.data?.error === 'ai_consent_required';
}

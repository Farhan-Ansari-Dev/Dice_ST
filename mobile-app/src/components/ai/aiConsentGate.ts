/**
 * The AI consent gate — pure orchestration, no React, no network of its own.
 *
 * It is deliberately dependency-injected so the whole first-use / decline /
 * retry flow can be unit-tested with stubs, and so the React provider can supply
 * the real modal + API calls. The rules it enforces (from the Phase-2 spec):
 *
 *   • Never send the AI payload before consent is recorded.
 *   • First use with no current consent → show disclosure → on accept, record
 *     consent on the backend, THEN run the operation.
 *   • Decline → do not call the AI operation.
 *   • Already-current consent → run immediately, no modal.
 *   • Backend 403 `ai_consent_required` mid-flight (stale/withdrawn) → show the
 *     disclosure once and retry the operation exactly once. Never loop.
 *   • Any status/record failure (offline, server error) → do NOT run the AI
 *     operation; the error propagates so the caller can show a retry message.
 */
import { AiConsentStatus, isAiConsentError } from '../../services/aiConsentShared';

/** What the user chose in the disclosure UI. */
export type ConsentChoice = 'allow' | 'decline';

export interface ConsentGateDeps {
  /** Read the authoritative status from the backend (may throw when offline). */
  getStatus: () => Promise<AiConsentStatus>;
  /** Record acceptance on the backend (may throw). Resolve only on success. */
  recordAccept: () => Promise<void>;
  /** Present the disclosure and resolve with the user's choice. */
  prompt: () => Promise<ConsentChoice>;
}

/** Outcome of an attempt to run an AI operation behind the gate. */
export type GateResult<T> =
  | { status: 'ok'; value: T }
  | { status: 'declined' };

/**
 * Ensure the user has current consent, prompting if needed.
 * Returns 'allowed' or 'declined'. Throws if the backend status read or the
 * accept write fails (caller must then NOT run the AI operation).
 */
export async function ensureConsent(deps: ConsentGateDeps): Promise<'allowed' | 'declined'> {
  const status = await deps.getStatus(); // authoritative; throws offline → caller shows error
  if (status.is_current) return 'allowed';
  return promptAndRecord(deps);
}

/** Show the disclosure and, on accept, record consent on the backend. */
async function promptAndRecord(deps: ConsentGateDeps): Promise<'allowed' | 'declined'> {
  const choice = await deps.prompt();
  if (choice !== 'allow') return 'declined';
  await deps.recordAccept(); // throws → caller shows error, AI op never runs
  return 'allowed';
}

/**
 * Run `operation` only when consent is (or becomes) current.
 *
 * The payload is never sent before consent is recorded. If the backend still
 * rejects with `ai_consent_required` (e.g. the terms version changed or consent
 * was withdrawn on another device between our check and the call), the user is
 * re-prompted once and the operation is retried exactly once — no infinite loop.
 */
export async function runWithConsent<T>(
  deps: ConsentGateDeps,
  operation: () => Promise<T>,
): Promise<GateResult<T>> {
  const first = await ensureConsent(deps);
  if (first === 'declined') return { status: 'declined' };

  try {
    return { status: 'ok', value: await operation() };
  } catch (err) {
    if (!isAiConsentError(err)) throw err;

    // Backend disagreed with our pre-check. Re-prompt once, then retry once.
    const second = await promptAndRecord(deps);
    if (second === 'declined') return { status: 'declined' };
    return { status: 'ok', value: await operation() }; // exactly one retry; its result stands
  }
}

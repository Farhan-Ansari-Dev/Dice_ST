/**
 * Global AI-consent host + hook.
 *
 * Mount once near the app root. It renders the single shared disclosure sheet
 * and exposes `useAiConsent().run(operation)`, which every AI entry point uses
 * so that no AI request is ever sent before consent is recorded. Enforcement
 * still lives on the backend (403 `ai_consent_required`); this only ensures the
 * disclosure is shown and consent is captured at the right moments.
 *
 * A small in-memory cache avoids re-checking status on every AI tap once current
 * consent is confirmed. It is a UX optimization ONLY — it can never grant access
 * the backend would deny, because the server still gates every AI call and the
 * gate re-prompts on a 403.
 */
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { navigationRef } from '../../services/notificationRouter';
import aiConsentService, { AiConsentStatus } from '../../services/aiConsentService';
import { ConsentChoice, GateResult, runWithConsent } from './aiConsentGate';
import AiConsentSheet from './AiConsentSheet';

interface AiConsentContextValue {
  /** Run an AI operation behind the consent gate. Returns {status:'ok',value} or {status:'declined'}. */
  run: <T>(operation: () => Promise<T>) => Promise<GateResult<T>>;
  /** Drop the cached status (call after a withdrawal so the next AI use re-prompts). */
  invalidateConsentCache: () => void;
}

const AiConsentContext = createContext<AiConsentContextValue | null>(null);

export const AiConsentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const resolverRef = useRef<((choice: ConsentChoice) => void) | null>(null);
  const statusRef = useRef<AiConsentStatus | null>(null);

  const settle = useCallback((choice: ConsentChoice) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.(choice);
  }, []);

  // ── Gate dependencies ────────────────────────────────────────────────────
  const getStatus = useCallback(async (): Promise<AiConsentStatus> => {
    // Fast path: trust a cached "current" result. The backend still gates the
    // actual AI call, so this can never bypass the requirement.
    if (statusRef.current?.is_current) return statusRef.current;
    const status = await aiConsentService.getStatus();
    statusRef.current = status;
    return status;
  }, []);

  const recordAccept = useCallback(async (): Promise<void> => {
    try {
      statusRef.current = await aiConsentService.accept();
    } finally {
      // Whether the write succeeded or threw, the sheet is done being shown.
      setVisible(false);
      setSubmitting(false);
    }
  }, []);

  const prompt = useCallback(
    () =>
      new Promise<ConsentChoice>((resolve) => {
        resolverRef.current = resolve;
        setSubmitting(false);
        setVisible(true);
      }),
    [],
  );

  const deps = useMemo(() => ({ getStatus, recordAccept, prompt }), [getStatus, recordAccept, prompt]);

  const run = useCallback(
    <T,>(operation: () => Promise<T>) => runWithConsent<T>(deps, operation),
    [deps],
  );

  const invalidateConsentCache = useCallback(() => {
    statusRef.current = null;
  }, []);

  // ── Sheet handlers ───────────────────────────────────────────────────────
  const onAllow = useCallback(() => {
    // Keep the sheet up with a spinner while recordAccept (the POST) runs.
    setSubmitting(true);
    settle('allow');
  }, [settle]);

  const onDecline = useCallback(() => {
    setVisible(false);
    setSubmitting(false);
    settle('decline');
  }, [settle]);

  const onOpenPrivacyPolicy = useCallback(() => {
    if (navigationRef.isReady()) {
      // AiPrivacy hosts the full disclosure + a link to the Privacy Policy.
      (navigationRef as any).navigate('Profile', { screen: 'AiPrivacy' });
    }
  }, []);

  const value = useMemo(() => ({ run, invalidateConsentCache }), [run, invalidateConsentCache]);

  return (
    <AiConsentContext.Provider value={value}>
      {children}
      <AiConsentSheet
        visible={visible}
        submitting={submitting}
        onAllow={onAllow}
        onDecline={onDecline}
        onOpenPrivacyPolicy={onOpenPrivacyPolicy}
      />
    </AiConsentContext.Provider>
  );
};

/**
 * Access the AI consent gate. Wrap every AI operation:
 *   const { run } = useAiConsent();
 *   const result = await run(() => aiAssistantService.ask(text));
 *   if (result.status === 'declined') return;   // user declined — do nothing
 *   useAnswer(result.value);
 */
export function useAiConsent(): AiConsentContextValue {
  const ctx = useContext(AiConsentContext);
  if (!ctx) throw new Error('useAiConsent must be used within an AiConsentProvider');
  return ctx;
}

export default AiConsentProvider;

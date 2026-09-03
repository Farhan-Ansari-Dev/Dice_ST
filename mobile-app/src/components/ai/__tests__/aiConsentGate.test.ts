/**
 * AI consent gate — first-use / decline / retry behavior.
 *
 * Pure logic: the gate is exercised with stubbed deps (getStatus / recordAccept
 * / prompt) and a stubbed AI operation, so no network, native module, or React
 * is involved. Maps to the Phase-2 test matrix A–G plus offline/error handling.
 */
import { runWithConsent, ensureConsent, ConsentGateDeps } from '../aiConsentGate';
import { AiConsentStatus } from '../../../services/aiConsentShared';

const CONSENT_403 = { response: { status: 403, data: { error: 'ai_consent_required' } } };

function makeStatus(over: Partial<AiConsentStatus> = {}): AiConsentStatus {
  return {
    consented: false,
    version: null,
    consented_at: null,
    declined_at: null,
    current_version: '1.0',
    is_current: false,
    ...over,
  };
}

function makeDeps(over: Partial<ConsentGateDeps> = {}): ConsentGateDeps {
  return {
    getStatus: jest.fn(async () => makeStatus()),
    recordAccept: jest.fn(async () => {}),
    prompt: jest.fn(async () => 'allow' as const),
    ...over,
  };
}

describe('runWithConsent', () => {
  it('A/C. blocks and sends nothing when the user declines', async () => {
    const deps = makeDeps({ prompt: jest.fn(async () => 'decline' as const) });
    const op = jest.fn(async () => 'RESULT');

    const res = await runWithConsent(deps, op);

    expect(res).toEqual({ status: 'declined' });
    expect(op).not.toHaveBeenCalled();          // AI payload never sent
    expect(deps.recordAccept).not.toHaveBeenCalled();
  });

  it('B. after accept, records consent THEN runs the operation', async () => {
    const calls: string[] = [];
    const deps = makeDeps({
      prompt: jest.fn(async () => 'allow' as const),
      recordAccept: jest.fn(async () => { calls.push('record'); }),
    });
    const op = jest.fn(async () => { calls.push('op'); return 'RESULT'; });

    const res = await runWithConsent(deps, op);

    expect(res).toEqual({ status: 'ok', value: 'RESULT' });
    expect(calls).toEqual(['record', 'op']);    // consent recorded before the call
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('D. runs immediately without a prompt when consent is already current', async () => {
    const deps = makeDeps({ getStatus: jest.fn(async () => makeStatus({ consented: true, version: '1.0', is_current: true })) });
    const op = jest.fn(async () => 'RESULT');

    const res = await runWithConsent(deps, op);

    expect(res).toEqual({ status: 'ok', value: 'RESULT' });
    expect(deps.prompt).not.toHaveBeenCalled(); // no over-prompting
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('E. re-shows the disclosure when consent is stale (older terms version)', async () => {
    const deps = makeDeps({
      // consented, but to an older version ⇒ not current
      getStatus: jest.fn(async () => makeStatus({ consented: true, version: '0.9', is_current: false })),
      prompt: jest.fn(async () => 'allow' as const),
    });
    const op = jest.fn(async () => 'RESULT');

    const res = await runWithConsent(deps, op);

    expect(deps.prompt).toHaveBeenCalledTimes(1);
    expect(res).toEqual({ status: 'ok', value: 'RESULT' });
  });

  it('F. on a backend 403 it re-prompts once and retries the operation exactly once', async () => {
    const deps = makeDeps({
      getStatus: jest.fn(async () => makeStatus({ consented: true, version: '1.0', is_current: true })),
      prompt: jest.fn(async () => 'allow' as const),
    });
    let n = 0;
    const op = jest.fn(async () => {
      n += 1;
      if (n === 1) throw CONSENT_403; // server disagrees on the first call
      return 'RESULT';
    });

    const res = await runWithConsent(deps, op);

    expect(res).toEqual({ status: 'ok', value: 'RESULT' });
    expect(op).toHaveBeenCalledTimes(2);        // original + exactly one retry
    expect(deps.prompt).toHaveBeenCalledTimes(1);
  });

  it('F. a persistent 403 does NOT loop — the operation runs at most twice', async () => {
    const deps = makeDeps({
      getStatus: jest.fn(async () => makeStatus({ consented: true, version: '1.0', is_current: true })),
      prompt: jest.fn(async () => 'allow' as const),
    });
    const op = jest.fn(async () => { throw CONSENT_403; });

    await expect(runWithConsent(deps, op)).rejects.toBe(CONSENT_403);
    expect(op).toHaveBeenCalledTimes(2);        // no infinite retry
  });

  it('F. declining the re-prompt after a 403 stops without a second call', async () => {
    const deps = makeDeps({
      getStatus: jest.fn(async () => makeStatus({ is_current: true })),
      prompt: jest.fn(async () => 'decline' as const),
    });
    const op = jest.fn(async () => { throw CONSENT_403; });

    const res = await runWithConsent(deps, op);

    expect(res).toEqual({ status: 'declined' });
    expect(op).toHaveBeenCalledTimes(1);        // not retried after decline
  });

  it('G. after withdrawal (status no longer current) the disclosure is shown again', async () => {
    // Simulates the post-withdrawal state: getStatus reports not-current.
    const deps = makeDeps({
      getStatus: jest.fn(async () => makeStatus({ consented: false, declined_at: 'x', is_current: false })),
      prompt: jest.fn(async () => 'allow' as const),
    });
    const op = jest.fn(async () => 'RESULT');

    await runWithConsent(deps, op);

    expect(deps.prompt).toHaveBeenCalledTimes(1); // consent required again
  });

  it('re-throws non-consent errors without prompting or retrying', async () => {
    const deps = makeDeps({ getStatus: jest.fn(async () => makeStatus({ is_current: true })) });
    const boom = new Error('network 500');
    const op = jest.fn(async () => { throw boom; });

    await expect(runWithConsent(deps, op)).rejects.toBe(boom);
    expect(op).toHaveBeenCalledTimes(1);
    expect(deps.prompt).not.toHaveBeenCalled();
  });

  it('offline: a status read failure propagates and the operation never runs', async () => {
    const netErr = new Error('offline');
    const deps = makeDeps({ getStatus: jest.fn(async () => { throw netErr; }) });
    const op = jest.fn(async () => 'RESULT');

    await expect(runWithConsent(deps, op)).rejects.toBe(netErr);
    expect(op).not.toHaveBeenCalled();          // nothing sent when we can't confirm consent
  });

  it('a failed accept write stops the flow and does not send the AI payload', async () => {
    const writeErr = new Error('save failed');
    const deps = makeDeps({
      getStatus: jest.fn(async () => makeStatus({ is_current: false })),
      prompt: jest.fn(async () => 'allow' as const),
      recordAccept: jest.fn(async () => { throw writeErr; }),
    });
    const op = jest.fn(async () => 'RESULT');

    await expect(runWithConsent(deps, op)).rejects.toBe(writeErr);
    expect(op).not.toHaveBeenCalled();
  });
});

describe('ensureConsent', () => {
  it('returns "allowed" without prompting when already current', async () => {
    const deps = makeDeps({ getStatus: jest.fn(async () => makeStatus({ is_current: true })) });
    await expect(ensureConsent(deps)).resolves.toBe('allowed');
    expect(deps.prompt).not.toHaveBeenCalled();
  });

  it('returns "declined" when the user declines', async () => {
    const deps = makeDeps({ prompt: jest.fn(async () => 'decline' as const) });
    await expect(ensureConsent(deps)).resolves.toBe('declined');
    expect(deps.recordAccept).not.toHaveBeenCalled();
  });
});

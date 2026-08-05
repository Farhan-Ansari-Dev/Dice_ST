/**
 * WorkflowEngine + Role Matrix — pure unit tests (no DB, no I/O).
 *
 * These lock in the state-machine validity checks and, critically, the security
 * fix: a client can never perform a staff-only transition (approve / issue).
 */
import { evaluate } from '../services/workflow/workflowEngine';
import { isRoleAllowed, rolesForTransition } from '../services/workflow/roleMatrix';

describe('WorkflowEngine — decision purity & validity', () => {
  it('allows a valid transition by a permitted role', () => {
    const d = evaluate({ fromStatus: 'draft', toStatus: 'submitted', actorRole: 'client' });
    expect(d.allowed).toBe(true);
    expect(d.nextStage).toBe('submitted');
    expect(d.reasons).toHaveLength(0);
    expect(d.requiredActions).toEqual([]); // gates are a later sprint
    expect(d.sla).toBeNull();
  });

  it('is deterministic — same input, same output', () => {
    const a = evaluate({ fromStatus: 'draft', toStatus: 'submitted', actorRole: 'client' });
    const b = evaluate({ fromStatus: 'draft', toStatus: 'submitted', actorRole: 'client' });
    expect(a).toEqual(b);
  });

  it('denies a transition not in the state machine', () => {
    const d = evaluate({ fromStatus: 'draft', toStatus: 'approved', actorRole: 'admin' });
    expect(d.allowed).toBe(false);
    expect(d.reasons[0].code).toBe('invalid_transition');
    expect(d.nextStage).toBeUndefined();
  });
});

describe('Role Matrix — the critical security fix', () => {
  it('a client CANNOT issue a certificate (approved → cert_issued)', () => {
    const d = evaluate({ fromStatus: 'approved', toStatus: 'cert_issued', actorRole: 'client' });
    expect(d.allowed).toBe(false);
    expect(d.reasons[0].code).toBe('forbidden_role');
  });

  it('a client CANNOT approve (approval_pending → approved)', () => {
    const d = evaluate({ fromStatus: 'approval_pending', toStatus: 'approved', actorRole: 'client' });
    expect(d.allowed).toBe(false);
    expect(d.reasons[0].code).toBe('forbidden_role');
  });

  it('a client CANNOT push into staff review (submitted → docs_review)', () => {
    expect(isRoleAllowed('client', 'submitted', 'docs_review')).toBe(false);
  });

  it('an employee CANNOT approve or issue (managers only)', () => {
    expect(isRoleAllowed('employee', 'approval_pending', 'approved')).toBe(false);
    expect(isRoleAllowed('employee', 'approved', 'cert_issued')).toBe(false);
  });

  it('an admin CAN approve and issue', () => {
    expect(evaluate({ fromStatus: 'approval_pending', toStatus: 'approved', actorRole: 'admin' }).allowed).toBe(true);
    expect(evaluate({ fromStatus: 'approved', toStatus: 'cert_issued', actorRole: 'super_admin' }).allowed).toBe(true);
  });

  it('a client CAN submit and re-submit their own work', () => {
    expect(isRoleAllowed('client', 'draft', 'submitted')).toBe(true);
    expect(isRoleAllowed('client', 'docs_required', 'docs_review')).toBe(true);
    expect(isRoleAllowed('client', 'draft', 'cancelled')).toBe(true);
  });

  it('unknown edges are denied to everyone (deny-by-default)', () => {
    expect(rolesForTransition('cert_issued', 'draft')).toEqual([]);
    expect(isRoleAllowed('admin', 'cert_issued', 'draft')).toBe(false);
  });
});

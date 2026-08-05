/**
 * WorkflowEngine — the PURE decision function of the workflow.
 *
 *   Input (from/to/role)  →  Decision (allow/deny + reasons + next stage)
 *
 * No database, no notifications, no audit, no assignments, no time. Deterministic
 * and fully unit-testable. It answers one question: "may this transition happen?"
 *
 * It validates (a) the transition exists in the state machine and (b) the
 * actor's role is permitted (Role Matrix). It ALSO computes the advisory gate
 * state (missing documents / payment due) and the SLA for the target stage when
 * a `gate` input is supplied — `allowed` still reflects only transition
 * validity + role; gates are surfaced via `requiredActions` and are enforced
 * (blocking) by TransitionService only when the `workflow_gates_enforced` flag
 * is ON.
 */
import { ALLOWED_TRANSITIONS, type ApplicationStatus } from '../../models/Application';
import { isRoleAllowed, rolesForTransition } from './roleMatrix';

export type DenyCode = 'invalid_transition' | 'forbidden_role';

export interface DenyReason {
  code: DenyCode;
  message: string;
}

/** Gate/SLA facts for the target stage (built by services/workflow/gates.ts). */
export interface GateInput {
  /** Labels of mandatory documents not yet provided for the target stage. */
  missingMandatoryDocs: string[];
  /** A non-zero application fee is owed for this transition (e.g. issuance). */
  paymentDue: boolean;
  /** SLA budget in days for the target stage, or null when unknown. */
  slaDays: number | null;
}

export interface TransitionRequest {
  fromStatus: ApplicationStatus;
  toStatus: ApplicationStatus;
  actorRole: string;
  /** Optional gate/SLA context — when omitted, requiredActions is [] and sla null. */
  gate?: GateInput;
}

export interface Decision {
  allowed: boolean;
  fromStatus: ApplicationStatus;
  toStatus: ApplicationStatus;
  reasons: DenyReason[];
  /** Present only when allowed — the stage the application would enter. */
  nextStage?: ApplicationStatus;
  /** Gate-required actions (Document/Payment gates) — always empty in Sprint 1. */
  requiredActions: string[];
  /** SLA for the next stage — always null in Sprint 1 (SLA Engine is later). */
  sla: { dueInDays: number } | null;
}

/**
 * Evaluate a requested transition. Pure: same input always yields same output.
 */
export function evaluate(req: TransitionRequest): Decision {
  const reasons: DenyReason[] = [];

  const validTargets = ALLOWED_TRANSITIONS[req.fromStatus] ?? [];
  if (!validTargets.includes(req.toStatus)) {
    reasons.push({
      code: 'invalid_transition',
      message: `Cannot move from "${req.fromStatus}" to "${req.toStatus}".`,
    });
  } else if (!isRoleAllowed(req.actorRole, req.fromStatus, req.toStatus)) {
    const allowed = rolesForTransition(req.fromStatus, req.toStatus);
    reasons.push({
      code: 'forbidden_role',
      message:
        `Role "${req.actorRole}" is not permitted to perform ` +
        `${req.fromStatus} → ${req.toStatus}. Allowed roles: ${allowed.join(', ') || 'none'}.`,
    });
  }

  const allowed = reasons.length === 0;

  // Advisory gate actions + SLA (only when gate context is supplied).
  const requiredActions: string[] = [];
  if (req.gate) {
    for (const label of req.gate.missingMandatoryDocs) requiredActions.push(`upload:${label}`);
    if (req.gate.paymentDue) requiredActions.push('pay:application_fee');
  }
  const sla = req.gate?.slaDays != null ? { dueInDays: req.gate.slaDays } : null;

  return {
    allowed,
    fromStatus: req.fromStatus,
    toStatus: req.toStatus,
    reasons,
    nextStage: allowed ? req.toStatus : undefined,
    requiredActions,
    sla,
  };
}

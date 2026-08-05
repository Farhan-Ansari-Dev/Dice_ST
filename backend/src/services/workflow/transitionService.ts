/**
 * TransitionService — the single, authoritative place that changes an
 * application's workflow state.
 *
 * Flow:
 *   load (done by caller, ownership-scoped) → evaluate (pure WorkflowEngine)
 *   → apply state + append immutable history → run side effects → return.
 *
 * Sprint 1 keeps the existing side effects (audit, notify, certificate issuance)
 * inline and unchanged — the goal here is consolidation and the security fix,
 * not new subsystems. A later sprint moves these behind a transactional outbox;
 * this contract will not change when that happens.
 *
 * The state change itself is a single-document `app.save()`, which MongoDB
 * commits atomically — no multi-document transaction is required until the
 * outbox (multiple collections) is introduced.
 */
import { Types } from 'mongoose';
import { Workflow, Certification, audit } from '../../models';
import type { IApplication, ApplicationStatus } from '../../models/Application';
import { notify } from '../notifications';
import { evaluate, type Decision } from './workflowEngine';
import { computeGateInput } from './gates';
import { isFeatureEnabled } from '../featureFlags';
import { autoAssignOnStageEntry } from '../assignment';

const DAY_MS = 24 * 3600 * 1000;

/** Thrown when the WorkflowEngine denies a transition. Carries the full decision. */
export class TransitionDeniedError extends Error {
  constructor(public readonly decision: Decision) {
    super(decision.reasons[0]?.message ?? 'Transition denied');
    this.name = 'TransitionDeniedError';
  }
}

/**
 * Thrown when document/payment gates are unsatisfied AND enforcement is ON
 * (`workflow_gates_enforced`). Carries the outstanding required actions so the
 * client can tell the user exactly what to upload / pay.
 */
export class GateDeniedError extends Error {
  constructor(public readonly requiredActions: string[]) {
    super(`Transition blocked — required first: ${requiredActions.join(', ')}`);
    this.name = 'GateDeniedError';
  }
}

export interface TransitionCommand {
  /** The already-loaded, ownership-scoped application (loaded by the route). */
  application: IApplication;
  toStatus: ApplicationStatus;
  actor: Types.ObjectId;
  actorRole: string;
  reason?: string;
  comment?: string;
  ip?: string;
  orgId?: Types.ObjectId;
}

/**
 * Perform a workflow transition. Throws {@link TransitionDeniedError} when the
 * engine denies it (invalid transition or forbidden role).
 */
export async function transition(cmd: TransitionCommand): Promise<IApplication> {
  const app = cmd.application;
  const fromStatus = app.status;

  // 1. Build the advisory gate/SLA context for the target stage, then take the
  //    pure decision (transition validity + Role Matrix + gate actions + SLA).
  const gate = await computeGateInput(app, cmd.toStatus);
  const decision = evaluate({ fromStatus, toStatus: cmd.toStatus, actorRole: cmd.actorRole, gate });
  if (!decision.allowed) throw new TransitionDeniedError(decision);

  // 1b. Gate ENFORCEMENT — only when the flag is ON. Otherwise gates are purely
  //     advisory (surfaced in the decision but never blocking).
  if (decision.requiredActions.length > 0 && (await isFeatureEnabled('workflow_gates_enforced'))) {
    throw new GateDeniedError(decision.requiredActions);
  }

  // 2. Apply the state change + append the immutable history entry. Set the SLA
  //    deadline for the stage just entered, then persist (single atomic write).
  (app as any).transitionTo(cmd.toStatus, cmd.actor, { reason: cmd.reason, comment: cmd.comment });
  if (decision.sla) {
    app.due_at = new Date(Date.now() + decision.sla.dueInDays * DAY_MS);
    app.days_in_current_stage = 0;
    app.is_overdue = false;
  }
  await app.save();

  // 3. Side effects (unchanged from the previous inline handlers).
  await audit({
    actor: cmd.actor as any,
    org_id: cmd.orgId as any,
    resource_type: 'application',
    resource_id: app._id as any,
    action: 'status_changed',
    before: { status: fromStatus },
    after: { status: cmd.toStatus, reason: cmd.reason, comment: cmd.comment },
    ip: cmd.ip,
  });

  // Notify assignees + creator (never the actor).
  const targets = Array.from(
    new Set([...app.assignees.map((a) => a.toString()), app.created_by.toString()]),
  ).filter((uid) => uid !== cmd.actor.toString());

  await Promise.all(
    targets.map((uid) =>
      notify({
        user_id: uid,
        type: 'app_status_changed',
        title: `📋 ${app.application_number} → ${cmd.toStatus.replace(/_/g, ' ')}`,
        body: cmd.comment ?? `Status changed from ${fromStatus} to ${cmd.toStatus}`,
        data: { application_id: app._id, deep_link: `dice://applications/${app._id}` },
        resource_type: 'application',
        resource_id: app._id as any,
      }),
    ),
  );

  // Auto-route work for the stage just entered (flag-gated, best-effort — never
  // blocks the transition).
  await autoAssignOnStageEntry({ application: app, actor: cmd.actor, orgId: cmd.orgId });

  // Terminal issuance.
  if (cmd.toStatus === 'cert_issued') {
    await issueCertification(app, cmd.actor);
  }

  return app;
}

/**
 * Auto-issue a Certification when an application reaches `cert_issued`.
 * Moved verbatim from routes/v2/applications.ts, where it was duplicated across
 * the two (now consolidated) transition handlers.
 */
export async function issueCertification(app: any, by: Types.ObjectId): Promise<void> {
  const workflow = await Workflow.findById(app.workflow_id);
  const validity = workflow?.validity_period_months ?? 24;
  const issueDate = new Date();
  const expiryDate = new Date(issueDate);
  expiryDate.setMonth(expiryDate.getMonth() + validity);

  // Cert number — placeholder; in production, fetch from issuing body's portal.
  const certNumber = `${app.cert_type}/${Date.now()}-${(app._id as any).toString().slice(-6)}`;

  const cert = await Certification.create({
    cert_number: certNumber,
    cert_type: app.cert_type,
    org_id: app.org_id ?? app.created_by,
    product_id: app.product_id,
    application_id: app._id,
    issuing_body: workflow?.issuing_body ?? 'TBD',
    scheme: workflow?.cert_type || app.cert_type,
    issue_date: issueDate,
    expiry_date: expiryDate,
    validity_period_months: validity,
    status: 'active',
    renewal_due_at: new Date(expiryDate.getTime() - 60 * 24 * 3600 * 1000),
    predecessor_cert_id: app.renewal_of_cert_id ?? undefined,
  });

  // Renewal chain: if this application renewed a prior certificate, link the two
  // and retire the predecessor (superseded by the freshly issued cert).
  if (app.renewal_of_cert_id) {
    await Certification.updateOne(
      { _id: app.renewal_of_cert_id },
      { $set: { successor_cert_id: cert._id, status: 'renewed', status_changed_at: new Date() } },
    );
  }

  await audit({
    actor: by,
    org_id: app.org_id,
    resource_type: 'certification',
    resource_id: cert._id as any,
    action: 'cert_issued',
    after: { cert_number: certNumber, expiry_date: expiryDate, renewal_of: app.renewal_of_cert_id ? String(app.renewal_of_cert_id) : undefined },
  });

  const targets = new Set([app.created_by.toString(), ...app.assignees.map((a: any) => a.toString())]);
  await Promise.all(
    [...targets].map((uid) =>
      notify({
        user_id: uid,
        type: 'cert_issued',
        title: `🎉 Certificate Issued: ${cert.cert_number}`,
        body: `Your ${app.cert_type} certificate is now active. Valid until ${expiryDate.toLocaleDateString()}.`,
        data: { certification_id: cert._id, deep_link: `dice://certifications/${cert._id}` },
        resource_type: 'certification',
        resource_id: cert._id as any,
        priority: 'high',
      }),
    ),
  );
}

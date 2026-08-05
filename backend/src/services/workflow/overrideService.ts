/**
 * OverrideService — the deliberate escape hatch from the state machine.
 *
 * A normal transition must satisfy ALLOWED_TRANSITIONS + the Role Matrix
 * (TransitionService). An override intentionally BYPASSES those guards so an
 * admin can correct a stuck or mis-routed application. To keep it safe and
 * accountable, an override ALWAYS:
 *   • requires a reason (callers/routes must enforce non-empty),
 *   • appends an immutable status_history entry marked `override: true`,
 *   • writes an immutable audit record (`status_overridden`),
 *   • appends to the timeline (via the same status_history + audit sources),
 *   • notifies assignees + creator.
 *
 * It is a separate service from TransitionService by design — the normal path
 * stays deny-by-default. Route-level authorization restricts this to admins.
 */
import { Types } from 'mongoose';
import { audit } from '../../models';
import type { IApplication, ApplicationStatus } from '../../models/Application';
import { notify } from '../notifications';
import { issueCertification } from './transitionService';

const TERMINAL: ApplicationStatus[] = ['cert_issued', 'rejected', 'cancelled'];

export interface OverrideCommand {
  application: IApplication;
  toStatus: ApplicationStatus;
  actor: Types.ObjectId;
  reason: string;
  ip?: string;
  orgId?: Types.ObjectId;
}

/** Force an application into `toStatus`, bypassing the state machine. */
export async function overrideStatus(cmd: OverrideCommand): Promise<IApplication> {
  const reason = cmd.reason?.trim();
  if (!reason) throw new Error('override reason is required');

  const app = cmd.application;
  const fromStatus = app.status;

  // Manual, unguarded state set (mirrors transitionTo but skips canTransitionTo).
  app.status_history.push({
    from: fromStatus,
    to: cmd.toStatus,
    by: cmd.actor,
    at: new Date(),
    reason,
    override: true,
  } as any);
  app.status = cmd.toStatus;
  if (cmd.toStatus === 'submitted' && !app.submitted_at) app.submitted_at = new Date();
  if (TERMINAL.includes(cmd.toStatus)) app.completed_at = new Date();
  await app.save();

  await audit({
    actor: cmd.actor as any,
    org_id: cmd.orgId as any,
    resource_type: 'application',
    resource_id: app._id as any,
    action: 'status_overridden',
    before: { status: fromStatus },
    after: { status: cmd.toStatus },
    notes: `override: ${reason}`,
    ip: cmd.ip,
  });

  const targets = Array.from(
    new Set([...app.assignees.map((a) => a.toString()), app.created_by.toString()]),
  ).filter((uid) => uid !== cmd.actor.toString());

  await Promise.all(
    targets.map((uid) =>
      notify({
        user_id: uid,
        type: 'app_status_overridden',
        title: `🛠️ ${app.application_number} overridden → ${cmd.toStatus.replace(/_/g, ' ')}`,
        body: `An administrator overrode the status (${fromStatus} → ${cmd.toStatus}). Reason: ${reason}`,
        data: { application_id: app._id, deep_link: `dice://applications/${app._id}` },
        resource_type: 'application',
        resource_id: app._id as any,
        priority: 'high',
      }),
    ),
  );

  // An override into the terminal issuance state still mints the certificate.
  if (cmd.toStatus === 'cert_issued') {
    await issueCertification(app, cmd.actor);
  }

  return app;
}

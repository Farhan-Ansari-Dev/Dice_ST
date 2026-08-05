/**
 * AssignmentEngine — the single, authoritative place that changes who works an
 * Application. It replaces the ad-hoc assignment logic that previously lived
 * inline in the two /assign route handlers (now thin callers of this engine).
 *
 * Responsibilities:
 *   • assign / reassign  — set the assignee set + typed staff axes (dual-write)
 *   • unassign           — clear the assignee set + typed axes
 *   • escalate           — route to a manager, raise priority
 *   • autoAssignOnStageEntry — route work when a stage is entered (flag-gated)
 *
 * Every mutation writes an immutable audit entry and notifies the affected
 * users, exactly like the transition pipeline. Legacy `assignees` /
 * `primary_assignee` remain authoritative; the typed axes are dual-written so a
 * later cutover can switch to them without a second migration.
 */
import { Types } from 'mongoose';
import { Application, User, Workflow, audit } from '../../models';
import { ALLOWED_TRANSITIONS, type IApplication, type ApplicationStatus } from '../../models/Application';
import { notify } from '../notifications';
import { deriveStaffAxesForUserIds } from '../ownership/dualWrite';
import { isFeatureEnabled } from '../featureFlags';
import { logger } from '../../utils/logger';

/** Terminal statuses (no outgoing transitions) — derived from the state machine. */
const TERMINAL: ApplicationStatus[] = (Object.keys(ALLOWED_TRANSITIONS) as ApplicationStatus[])
  .filter((s) => ALLOWED_TRANSITIONS[s].length === 0);

const toId = (v: Types.ObjectId | string) => new Types.ObjectId(String(v));

/** Apply the dual-written typed staff axes for a set of assignee ids. */
async function applyTypedAxes(app: IApplication, userIds: (Types.ObjectId | string)[], primaryId?: Types.ObjectId | string) {
  const axes = await deriveStaffAxesForUserIds(userIds, primaryId);
  if (axes.consultant_id) app.consultant_id = axes.consultant_id;
  if (axes.employee_id) app.employee_id = axes.employee_id;
  if (axes.manager_id) app.manager_id = axes.manager_id;
}

async function notifyAdded(app: IApplication, addedIds: string[]) {
  await Promise.all(
    addedIds.map((uid) =>
      notify({
        user_id: uid,
        type: 'app_assigned',
        title: '👤 Assigned to an application',
        body: `You've been assigned to ${app.application_number} (${app.cert_type}).`,
        data: { application_id: app._id, deep_link: `dice://applications/${app._id}` },
        resource_type: 'application',
        resource_id: app._id as any,
      }),
    ),
  );
}

export interface AssignCommand {
  application: IApplication;
  userIds: (Types.ObjectId | string)[];
  primaryId?: Types.ObjectId | string;
  actor: Types.ObjectId;
  orgId?: Types.ObjectId;
  /** actor_type for the audit record (auto-assignment uses 'system'). */
  via?: 'user' | 'system';
}

/**
 * Assign (or reassign) an application to a set of users. Replaces the current
 * assignee set. Idempotent-friendly: only newly added users are notified.
 */
export async function assignApplication(cmd: AssignCommand): Promise<IApplication> {
  const app = cmd.application;
  const before = app.assignees.map((a) => a.toString());

  app.assignees = cmd.userIds.map(toId);
  if (cmd.primaryId) app.primary_assignee = toId(cmd.primaryId);
  await applyTypedAxes(app, cmd.userIds, cmd.primaryId);
  await app.save();

  await audit({
    actor: cmd.actor as any,
    actor_type: cmd.via === 'system' ? 'system' : 'user',
    org_id: cmd.orgId as any,
    resource_type: 'application',
    resource_id: app._id as any,
    action: 'assigned',
    before: { assignees: before },
    after: { assignees: app.assignees, primary: app.primary_assignee },
  });

  const added = cmd.userIds.map((id) => String(id)).filter((id) => !before.includes(id));
  await notifyAdded(app, added);
  return app;
}

/** Remove all assignees + typed staff axes from an application. */
export async function unassignApplication(cmd: { application: IApplication; actor: Types.ObjectId; orgId?: Types.ObjectId }): Promise<IApplication> {
  const app = cmd.application;
  const before = app.assignees.map((a) => a.toString());

  app.assignees = [];
  app.set('primary_assignee', undefined);
  app.set('consultant_id', undefined);
  app.set('employee_id', undefined);
  app.set('manager_id', undefined);
  await app.save();

  await audit({
    actor: cmd.actor as any,
    org_id: cmd.orgId as any,
    resource_type: 'application',
    resource_id: app._id as any,
    action: 'unassigned',
    before: { assignees: before },
    after: { assignees: [] },
  });
  return app;
}

/**
 * Escalate an application to a manager: set manager_id, add them to assignees,
 * raise priority, audit and notify. `reason` is required for the audit trail.
 */
export async function escalateApplication(cmd: {
  application: IApplication;
  managerId: Types.ObjectId | string;
  actor: Types.ObjectId;
  reason: string;
  orgId?: Types.ObjectId;
}): Promise<IApplication> {
  const app = cmd.application;
  const managerOid = toId(cmd.managerId);
  const before = { manager_id: app.manager_id, priority: app.priority };

  app.manager_id = managerOid;
  if (!app.assignees.some((a) => a.equals(managerOid))) app.assignees.push(managerOid);
  if (app.priority !== 'urgent') app.priority = app.priority === 'high' ? 'urgent' : 'high';
  await app.save();

  await audit({
    actor: cmd.actor as any,
    org_id: cmd.orgId as any,
    resource_type: 'application',
    resource_id: app._id as any,
    action: 'assigned',
    before,
    after: { manager_id: app.manager_id, priority: app.priority },
    notes: `escalation: ${cmd.reason}`,
  });

  await notify({
    user_id: String(managerOid),
    type: 'app_escalated',
    title: `⏫ Escalation: ${app.application_number}`,
    body: cmd.reason,
    data: { application_id: app._id, deep_link: `dice://applications/${app._id}` },
    resource_type: 'application',
    resource_id: app._id as any,
    priority: 'high',
  });
  return app;
}

/** Pick the least-loaded active user for a role (fewest open assignments). */
async function pickLeastLoaded(role: string): Promise<Types.ObjectId | null> {
  const candidates = await User.find({ role: role as any, deleted_at: null }).select('_id').lean();
  if (candidates.length === 0) return null;

  let best: { id: Types.ObjectId; load: number } | null = null;
  for (const c of candidates) {
    const load = await Application.countDocuments({ assignees: c._id, status: { $nin: TERMINAL } });
    if (!best || load < best.load) best = { id: c._id as Types.ObjectId, load };
  }
  return best?.id ?? null;
}

/**
 * Auto-assign the application when it enters a stage, using the workflow's
 * `stages[].assignee_role`. Flag-gated (`auto_assignment_enabled`, default OFF)
 * and best-effort — a failure here never blocks a transition.
 */
export async function autoAssignOnStageEntry(cmd: { application: IApplication; actor: Types.ObjectId; orgId?: Types.ObjectId }): Promise<void> {
  try {
    if (!(await isFeatureEnabled('auto_assignment_enabled'))) return;
    const app = cmd.application;
    if (!app.workflow_id) return;

    const workflow = await Workflow.findById(app.workflow_id).lean() as any;
    const stage = (workflow?.stages as any[] | undefined)?.find((s) => s.id === app.status);
    const role: string | undefined = stage?.assignee_role;
    if (!role) return;

    const pick = await pickLeastLoaded(role);
    if (!pick) return;
    if (app.assignees.some((a) => a.equals(pick))) return; // already on it

    const next = [...app.assignees.map((a) => a.toString()), pick.toString()];
    await assignApplication({
      application: app,
      userIds: next,
      primaryId: app.primary_assignee ?? pick,
      actor: cmd.actor,
      orgId: cmd.orgId,
      via: 'system',
    });
  } catch (err) {
    logger.warn('[assignment] autoAssignOnStageEntry failed', (err as Error)?.message);
  }
}

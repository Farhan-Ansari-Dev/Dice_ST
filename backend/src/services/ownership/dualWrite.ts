/**
 * dualWrite — Sprint 3 (Backfill + Dual-write).
 *
 * Small, best-effort helpers used by the create and assign write paths to
 * populate the NEW typed ownership axes alongside the legacy fields. Legacy
 * ownership (created_by / assignees / primary_assignee) remains authoritative;
 * these helpers are additive and must NEVER break the legacy write, so callers
 * wrap them defensively and they degrade to "legacy only" on any failure.
 *
 * No reads are affected; nothing here is used for authorization.
 */
import { Types } from 'mongoose';
import { User, type IUser } from '../../models';
import { resolveCustomerOrganization, type PersonalOrgUser } from './personalOrganization';
import { deriveStaffAxes, type AssigneeRoleRef, type StaffAxes } from './ownershipDerivation';

/**
 * Resolve the customer Organization id for a user creating an Application.
 * Provisions a Personal Organization when the user is org-less (create=true).
 * Returns undefined when it cannot be resolved, so the create can proceed with
 * legacy ownership only.
 */
export async function resolveCustomerIdForCreate(user: IUser): Promise<Types.ObjectId | undefined> {
  const { orgId } = await resolveCustomerOrganization(user as unknown as PersonalOrgUser, { dryRun: false });
  return orgId ?? undefined;
}

/**
 * Given the assignee user ids of an assign action, derive the unambiguous typed
 * staff axes (by each user's role). Only non-null slots are returned, so the
 * caller sets what is known and never clobbers a slot with a guess.
 */
export async function deriveStaffAxesForUserIds(
  userIds: (Types.ObjectId | string)[],
  primaryId?: Types.ObjectId | string,
): Promise<Partial<StaffAxes>> {
  const users = await User.find({ _id: { $in: userIds } }).select('_id role');
  const refs: AssigneeRoleRef[] = users.map((u) => ({ id: u._id as Types.ObjectId, role: u.role }));
  const { axes } = deriveStaffAxes(refs, primaryId);

  const out: Partial<StaffAxes> = {};
  if (axes.consultant_id) out.consultant_id = axes.consultant_id;
  if (axes.employee_id) out.employee_id = axes.employee_id;
  if (axes.manager_id) out.manager_id = axes.manager_id;
  return out;
}

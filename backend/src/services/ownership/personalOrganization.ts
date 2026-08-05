/**
 * personalOrganization — Sprint 3 (Backfill + Dual-write).
 *
 * The locked ownership decision is `customer_id -> Organization`, and single-user
 * customers get a "Personal Organization". This module is the ONE place that
 * resolves the owning Organization for a customer user, find-or-create and
 * idempotent (a partial-unique index on {owner_user_id, is_personal} guarantees
 * at most one personal org per user, so re-runs and concurrent runs converge).
 *
 * It writes only Organizations; it never touches Applications or legacy
 * ownership. In dry-run it writes nothing and reports what it WOULD do.
 */
import { Types } from 'mongoose';
import { Organization, User, type IUser } from '../../models';
import { logger } from '../../utils/logger';

export interface ResolveOrgResult {
  /** The resolved Organization id, or null when it could not be resolved. */
  orgId: Types.ObjectId | null;
  /** How it was resolved. */
  source: 'existing_org' | 'existing_personal' | 'created_personal' | 'would_create_personal' | 'unresolved';
  /** True when a new personal Organization was actually written. */
  created: boolean;
}

/** Minimal user shape needed to name/scope a personal organization. */
export interface PersonalOrgUser {
  _id: Types.ObjectId | string;
  name?: string;
  company_name?: string;
  country_code?: string;
  org_id?: Types.ObjectId | string | null;
}

function personalOrgName(user: PersonalOrgUser): string {
  return (user.company_name?.trim() || user.name?.trim() || 'Personal Organization');
}

/** Find an existing personal Organization for this owner (read-only). */
export async function findPersonalOrganization(ownerUserId: Types.ObjectId | string) {
  return Organization.findOne({ owner_user_id: ownerUserId, is_personal: true });
}

/**
 * Resolve the owning Organization for a customer user.
 *
 *   1. If the user already belongs to an Organization (`org_id`) → use it.
 *   2. Else if a personal Organization already exists → use it.
 *   3. Else create one (unless `dryRun`, which only reports the intent).
 *
 * Never throws for the caller: on unexpected error it logs and returns
 * `{ orgId: null, source: 'unresolved' }` so a dual-write can degrade to
 * "legacy only" without breaking the request.
 */
export async function resolveCustomerOrganization(
  user: PersonalOrgUser,
  opts: { dryRun: boolean },
): Promise<ResolveOrgResult> {
  try {
    if (user.org_id) {
      return { orgId: new Types.ObjectId(String(user.org_id)), source: 'existing_org', created: false };
    }

    const existing = await findPersonalOrganization(user._id);
    if (existing) {
      return { orgId: existing._id as Types.ObjectId, source: 'existing_personal', created: false };
    }

    if (opts.dryRun) {
      return { orgId: null, source: 'would_create_personal', created: false };
    }

    try {
      const org = await Organization.create({
        name: personalOrgName(user),
        type: 'manufacturer',
        owner_user_id: user._id,
        is_personal: true,
        address: { country_code: (user.country_code || 'IN').toUpperCase() },
      });
      return { orgId: org._id as Types.ObjectId, source: 'created_personal', created: true };
    } catch (err: any) {
      // Lost a race to a concurrent/duplicate run — the unique index rejected the
      // second insert. Re-read the winner so the result is still correct.
      if (err?.code === 11000) {
        const winner = await findPersonalOrganization(user._id);
        if (winner) return { orgId: winner._id as Types.ObjectId, source: 'existing_personal', created: false };
      }
      throw err;
    }
  } catch (err) {
    logger.warn('[ownership] resolveCustomerOrganization failed', { user: String(user._id), err: (err as Error)?.message });
    return { orgId: null, source: 'unresolved', created: false };
  }
}

/** Convenience: resolve for a created_by user id (loads the user first). */
export async function resolveCustomerOrganizationForUserId(
  userId: Types.ObjectId | string,
  opts: { dryRun: boolean },
): Promise<{ result: ResolveOrgResult; user: IUser | null }> {
  const user = await User.findById(userId);
  if (!user) return { result: { orgId: null, source: 'unresolved', created: false }, user: null };
  return { result: await resolveCustomerOrganization(user as unknown as PersonalOrgUser, opts), user };
}

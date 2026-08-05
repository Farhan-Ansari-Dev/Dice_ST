/**
 * ownershipDerivation — Sprint 3 (Backfill + Dual-write).
 *
 * PURE inference of the typed staff ownership axes from the legacy assignment
 * fields. No DB, no mutation — the caller resolves assignee roles and passes
 * them in, so this stays trivially unit-testable and is shared by both the
 * Backfill Service and the Dual-write helpers (one derivation rule, never two).
 *
 * Rule (deny-ambiguity): a slot is filled ONLY when exactly one candidate maps
 * to it, OR when `primary_assignee` breaks a tie by being one of the candidates.
 * Anything else is reported as ambiguous and left null — never guessed.
 */
import { Types } from 'mongoose';
import { toObjectId, idEquals, type IdLike } from './ownershipService';

/** An assignee paired with the role we looked up for them. */
export interface AssigneeRoleRef {
  id: IdLike;
  role: string;
}

export type StaffSlot = 'consultant_id' | 'employee_id' | 'manager_id';

/** The three typed staff axes (null when unknown/ambiguous). */
export interface StaffAxes {
  consultant_id: Types.ObjectId | null;
  employee_id: Types.ObjectId | null;
  manager_id: Types.ObjectId | null;
}

export interface StaffAxisAmbiguity {
  slot: StaffSlot;
  candidateCount: number;
  reason: string;
}

export interface DeriveStaffAxesResult {
  axes: StaffAxes;
  ambiguities: StaffAxisAmbiguity[];
}

/** Which typed slot a User.role backfills. Roles absent here are ignored. */
const ROLE_TO_SLOT: Readonly<Record<string, StaffSlot>> = {
  consultant: 'consultant_id',
  employee: 'employee_id',
  admin: 'manager_id',
  super_admin: 'manager_id',
};

const SLOTS: readonly StaffSlot[] = ['consultant_id', 'employee_id', 'manager_id'];

/**
 * Derive the typed staff axes from assignee (id, role) pairs.
 * `primaryId` (the legacy primary_assignee) is used only as a tie-breaker.
 */
export function deriveStaffAxes(
  assignees: AssigneeRoleRef[],
  primaryId?: IdLike,
): DeriveStaffAxesResult {
  const primary = toObjectId(primaryId);

  // Bucket unique candidate ids per slot.
  const buckets: Record<StaffSlot, Types.ObjectId[]> = {
    consultant_id: [],
    employee_id: [],
    manager_id: [],
  };

  for (const a of assignees) {
    const slot = ROLE_TO_SLOT[a.role];
    if (!slot) continue; // client/viewer/cb/lab/ib — not a staff-ownership role
    const oid = toObjectId(a.id);
    if (!oid) continue;
    if (!buckets[slot].some((existing) => existing.equals(oid))) {
      buckets[slot].push(oid);
    }
  }

  const axes: StaffAxes = { consultant_id: null, employee_id: null, manager_id: null };
  const ambiguities: StaffAxisAmbiguity[] = [];

  for (const slot of SLOTS) {
    const cands = buckets[slot];
    if (cands.length === 0) continue;
    if (cands.length === 1) {
      axes[slot] = cands[0];
      continue;
    }
    // Multiple candidates — a primary_assignee among them resolves it.
    const tieBreak = cands.find((c) => idEquals(c, primary));
    if (tieBreak) {
      axes[slot] = tieBreak;
    } else {
      ambiguities.push({
        slot,
        candidateCount: cands.length,
        reason: `${cands.length} candidates for ${slot} and no primary_assignee tie-breaker`,
      });
    }
  }

  return { axes, ambiguities };
}

/**
 * ownershipValidation — Sprint 3 (Backfill + Dual-write).
 *
 * Read-only consistency checks between legacy ownership and the new typed axes.
 * These NEVER mutate anything — they only describe drift so an operator (or a
 * later reconciliation job) can decide what to do. Pure functions over plain
 * objects; safe to run anywhere.
 */
import { idEquals, getAssignmentIds, type OwnershipSource } from './ownershipService';

export type OwnershipInconsistencyCode =
  | 'customer_missing'          // no customer_id yet (not yet backfilled)
  | 'staff_axis_not_in_assignees' // a typed staff id is not among legacy assignees
  | 'primary_not_in_assignees';   // legacy sanity: primary_assignee not in assignees

export interface OwnershipInconsistency {
  code: OwnershipInconsistencyCode;
  detail: string;
}

export interface OwnershipConsistencyResult {
  consistent: boolean;
  inconsistencies: OwnershipInconsistency[];
}

/**
 * Verify that the new typed ownership is consistent with the legacy assignment.
 * "Consistent" means: every typed staff axis (if set) also appears in the legacy
 * assignees, and legacy primary_assignee (if set) appears in assignees. A
 * missing customer_id is reported as informational drift (pre-backfill), not a
 * hard error. Nothing is changed.
 */
export function checkOwnershipConsistency(app: OwnershipSource): OwnershipConsistencyResult {
  const inconsistencies: OwnershipInconsistency[] = [];
  const assignmentIds = getAssignmentIds(app);
  const inAssignees = (id: unknown) => assignmentIds.some((a) => idEquals(a, id as any));

  if (!app.customer_id) {
    inconsistencies.push({ code: 'customer_missing', detail: 'customer_id is not set (application not yet backfilled)' });
  }

  for (const slot of ['consultant_id', 'employee_id', 'manager_id'] as const) {
    const val = (app as any)[slot];
    if (val && !inAssignees(val)) {
      inconsistencies.push({
        code: 'staff_axis_not_in_assignees',
        detail: `${slot} is set but is not present in legacy assignees`,
      });
    }
  }

  if (app.primary_assignee && !inAssignees(app.primary_assignee)) {
    inconsistencies.push({
      code: 'primary_not_in_assignees',
      detail: 'primary_assignee is not present in assignees',
    });
  }

  // Only the "hard" drift (typed axis / primary not in assignees) marks it
  // inconsistent; a missing customer_id alone is expected pre-backfill.
  const hard = inconsistencies.some((i) => i.code !== 'customer_missing');
  return { consistent: !hard, inconsistencies };
}

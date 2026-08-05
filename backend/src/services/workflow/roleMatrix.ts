/**
 * Role Matrix — who may perform each workflow transition.
 *
 * Edge-based (from → to) and DENY-BY-DEFAULT: a transition granted to no role
 * here is permitted to nobody. This is the fix for the audit's critical finding
 * (an unguarded /transition let a client walk their own application all the way
 * to `cert_issued`). Approvals and issuance are restricted to admins; a client
 * may only submit, re-submit after a docs request, or cancel their own draft.
 *
 * Uses the roles that exist in the User model today. When dedicated
 * Certification/Testing/Inspection Manager roles are introduced (a later
 * decision), only this file changes — the engine and service are untouched.
 */
import type { ApplicationStatus } from '../../models/Application';

export type Role =
  | 'super_admin' | 'admin' | 'consultant' | 'employee'
  | 'client' | 'viewer' | 'cb' | 'lab' | 'ib';

/** Routine forward/back movement through the pipeline. */
const STAFF: Role[] = ['admin', 'super_admin', 'employee', 'consultant'];
/** Approvals, rejections and issuance — manager-level, restricted to admins. */
const MANAGERS: Role[] = ['admin', 'super_admin'];

/**
 * EDGE[from][to] = roles allowed to perform that transition.
 * Any edge not listed is denied to everyone (and must also exist in the model's
 * ALLOWED_TRANSITIONS — the engine checks both independently).
 */
const EDGE: Partial<Record<ApplicationStatus, Partial<Record<ApplicationStatus, Role[]>>>> = {
  draft: {
    submitted: ['client', ...STAFF],
    cancelled: ['client', ...STAFF],
  },
  submitted: {
    docs_review: STAFF,
    cancelled: STAFF,
  },
  docs_review: {
    tech_review: STAFF,
    docs_required: STAFF,
    rejected: MANAGERS,
    on_hold: STAFF,
  },
  docs_required: {
    docs_review: ['client', ...STAFF], // customer re-submits after providing docs
    cancelled: ['client', ...STAFF],
  },
  tech_review: {
    testing: STAFF,
    approval_pending: MANAGERS,
    docs_required: STAFF,
    rejected: MANAGERS,
  },
  testing: {
    approval_pending: MANAGERS,
    docs_required: STAFF,
    rejected: MANAGERS,
  },
  approval_pending: {
    approved: MANAGERS,
    rejected: MANAGERS,
    on_hold: STAFF,
  },
  approved: {
    cert_issued: MANAGERS, // issuing a real certificate — admins only
  },
  on_hold: {
    docs_review: STAFF,
    tech_review: STAFF,
    cancelled: STAFF,
  },
  // draft/rejected/cert_issued/cancelled have no outgoing edges here.
};

/** Roles permitted to perform a given transition (empty = nobody). */
export function rolesForTransition(from: ApplicationStatus, to: ApplicationStatus): Role[] {
  return EDGE[from]?.[to] ?? [];
}

/** True only when `role` may perform the `from → to` transition. */
export function isRoleAllowed(role: string, from: ApplicationStatus, to: ApplicationStatus): boolean {
  return rolesForTransition(from, to).includes(role as Role);
}

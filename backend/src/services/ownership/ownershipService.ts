/**
 * OwnershipService — Sprint 2 (Ownership Foundation).
 *
 * The single, pure place that READS and NORMALIZES an application's ownership.
 * It separates three concerns that `created_by` currently conflates:
 *
 *   - ownership   → customer_id / consultant_id / employee_id / manager_id
 *   - assignment  → assignees[] / primary_assignee   (legacy, read here for compat)
 *   - audit       → created_by                        (immutable creator only)
 *
 * SCOPE GUARDRAILS (do not cross in this sprint):
 *   • No database access — every function is pure and operates on plain objects,
 *     so it is trivially unit-testable and has zero runtime coupling.
 *   • No assignment logic (no writes, no auto-routing) — that is the Assignment
 *     Engine, a later sprint.
 *   • No workflow / transition logic.
 *   • `canAccessApplication()` is introduced here but is intentionally NOT wired
 *     into any production route yet (a later cutover sprint does that).
 *
 * Until the cutover, `created_by` is still honoured as a backward-compatible
 * ownership signal (see `canAccessApplication`). After the cutover it is
 * audit-only and must never influence authorization or visibility again.
 */
import { Types } from 'mongoose';

/** Anything that can denote an id: a raw ObjectId, its string, or a populated doc. */
export type IdLike = Types.ObjectId | string | { _id?: unknown } | null | undefined;

/** The normalized, typed ownership of an application (missing values are null). */
export interface OwnershipFields {
  customer_id: Types.ObjectId | null;
  consultant_id: Types.ObjectId | null;
  employee_id: Types.ObjectId | null;
  manager_id: Types.ObjectId | null;
  created_by: Types.ObjectId | null;
}

/**
 * The minimal shape OwnershipService needs from an application. Deliberately
 * loose so a full Mongoose `IApplication`, a `.lean()` object, or a test fixture
 * all satisfy it. Legacy assignment fields are included for compat reads only.
 */
export interface OwnershipSource {
  customer_id?: IdLike;
  consultant_id?: IdLike;
  employee_id?: IdLike;
  manager_id?: IdLike;
  created_by?: IdLike;
  org_id?: IdLike;
  assignees?: IdLike[];
  primary_assignee?: IdLike;
}

/** The minimal shape of the actor whose access we evaluate. */
export interface AccessActor {
  _id: IdLike;
  role: string;
  /** For `client` actors, the Organization they belong to (matched to customer_id). */
  org_id?: IdLike;
}

/** Roles that see every application platform-wide (unchanged from today). */
const GLOBAL_ROLES = ['super_admin', 'admin'] as const;

/**
 * Coerce any {@link IdLike} to an ObjectId, or null when absent/invalid.
 * Handles populated documents by reading their `_id`.
 */
export function toObjectId(value: IdLike): Types.ObjectId | null {
  if (value == null) return null;
  if (value instanceof Types.ObjectId) return value;
  if (typeof value === 'object') {
    if ('_id' in value && (value as { _id?: unknown })._id != null) {
      return toObjectId((value as { _id?: unknown })._id as IdLike);
    }
    // Fall through: some ObjectId-like objects stringify to a valid hex id.
  }
  const str = String(value);
  return Types.ObjectId.isValid(str) ? new Types.ObjectId(str) : null;
}

/** True when two id-like values reference the same id (null never matches). */
export function idEquals(a: IdLike, b: IdLike): boolean {
  const oa = toObjectId(a);
  const ob = toObjectId(b);
  return oa != null && ob != null && oa.equals(ob);
}

/**
 * NORMALIZE — coerce the raw ownership fields of a source into typed ObjectIds.
 * Pure; never throws; unknown/invalid values become null.
 */
export function normalizeOwnership(src: OwnershipSource): OwnershipFields {
  return {
    customer_id: toObjectId(src.customer_id),
    consultant_id: toObjectId(src.consultant_id),
    employee_id: toObjectId(src.employee_id),
    manager_id: toObjectId(src.manager_id),
    created_by: toObjectId(src.created_by),
  };
}

/**
 * READ — return the normalized ownership of an application. Alias of
 * {@link normalizeOwnership}, named for the "read ownership" responsibility.
 */
export function getOwnership(app: OwnershipSource): OwnershipFields {
  return normalizeOwnership(app);
}

/** Legacy assignment ids (assignees[] ∪ primary_assignee), normalized + deduped. */
export function getAssignmentIds(app: OwnershipSource): Types.ObjectId[] {
  const raw = [...(app.assignees ?? []), app.primary_assignee];
  const seen = new Set<string>();
  const out: Types.ObjectId[] = [];
  for (const v of raw) {
    const oid = toObjectId(v);
    if (oid && !seen.has(oid.toHexString())) {
      seen.add(oid.toHexString());
      out.push(oid);
    }
  }
  return out;
}

// ─── Relationship helpers (pure predicates) ──────────────────────────────────

/** Actor is the owning customer — matched via the actor's Organization (org_id). */
export function isCustomer(app: OwnershipSource, actor: AccessActor): boolean {
  return idEquals(app.customer_id, actor.org_id);
}

/** Actor is the servicing consultant. */
export function isConsultant(app: OwnershipSource, actor: AccessActor): boolean {
  return idEquals(app.consultant_id, actor._id);
}

/** Actor is the reviewing employee. */
export function isEmployee(app: OwnershipSource, actor: AccessActor): boolean {
  return idEquals(app.employee_id, actor._id);
}

/** Actor is the oversight / escalation manager. */
export function isManager(app: OwnershipSource, actor: AccessActor): boolean {
  return idEquals(app.manager_id, actor._id);
}

/** Actor appears in the legacy assignment fields (assignees[] / primary_assignee). */
export function isAssignee(app: OwnershipSource, actor: AccessActor): boolean {
  return getAssignmentIds(app).some((id) => idEquals(id, actor._id));
}

/**
 * Actor is the creator. Backward-compatibility signal ONLY — used while the
 * cutover has not yet backfilled customer_id. Do not treat as ownership once
 * created_by is audit-only.
 */
export function isCreator(app: OwnershipSource, actor: AccessActor): boolean {
  return idEquals(app.created_by, actor._id);
}

/**
 * canAccessApplication — TARGET-model visibility check.
 *
 * Introduced in Sprint 2 but INTENTIONALLY NOT WIRED into production routes.
 * It encodes the ownership model the future cutover will enforce:
 *
 *   • super_admin / admin : global access (unchanged).
 *   • employee            : applications assigned to them (employee_id / assignee)
 *                           or that they manage.
 *   • consultant          : applications they service (consultant_id / assignee).
 *   • client              : applications owned by their customer (customer_id),
 *                           with `created_by` as a temporary compatibility
 *                           fallback until backfill completes.
 *   • viewer / cb / lab / ib : no default access here (granted explicitly later).
 *
 * Pure and side-effect free.
 */
export function canAccessApplication(app: OwnershipSource, actor: AccessActor | null | undefined): boolean {
  if (!actor || !actor.role) return false;
  if ((GLOBAL_ROLES as readonly string[]).includes(actor.role)) return true;

  switch (actor.role) {
    case 'employee':
      return isEmployee(app, actor) || isManager(app, actor) || isAssignee(app, actor);
    case 'consultant':
      return isConsultant(app, actor) || isAssignee(app, actor);
    case 'client':
      // customer_id is the real owner; created_by is a temporary compat fallback.
      return isCustomer(app, actor) || isCreator(app, actor);
    default:
      return false;
  }
}

/**
 * backfillService — Sprint 3 (Backfill + Dual-write).
 *
 * Populates the typed ownership axes on existing Applications WITHOUT touching
 * legacy ownership (created_by / assignees / primary_assignee), status, or any
 * read path. Designed to be:
 *
 *   • idempotent      — writes are guarded so a field is only set when null;
 *                       a re-run classifies everything as "skipped".
 *   • dry-run capable — computes and classifies without writing anything.
 *   • non-destructive — never overwrites a value that already exists.
 *   • honest          — every Application is classified and counted; ambiguous
 *                       ownership is flagged for manual review, never guessed.
 *
 * It is invoked manually (script / test), never automatically at boot.
 */
import { Types } from 'mongoose';
import { Application, Organization, User } from '../../models';
import { deriveStaffAxes, type AssigneeRoleRef, type StaffSlot } from './ownershipDerivation';
import { resolveCustomerOrganization, type PersonalOrgUser } from './personalOrganization';

export type MigrationClass = 'migrated' | 'skipped' | 'needs_manual_review' | 'invalid';

export interface MigrationRecord {
  application_id: string;
  application_number?: string;
  classification: MigrationClass;
  /** Fields that were (or would be) set, e.g. "customer_id", "consultant_id". */
  fields_set: string[];
  /** Human-readable reasons — always populated for manual_review / invalid. */
  issues: string[];
}

export interface MigrationReport {
  dry_run: boolean;
  started_at: Date;
  finished_at: Date;
  duration_ms: number;
  total: number;
  totals: Record<MigrationClass, number>;
  organizations_created: number;      // 0 in dry-run
  organizations_would_create: number; // populated in dry-run
  records: MigrationRecord[];
}

export interface BackfillOptions {
  dryRun: boolean;
  /** Optional: restrict to specific applications (used by tests). */
  applicationIds?: (Types.ObjectId | string)[];
  /** Cap on per-record detail retained in the report (counts are always exact). */
  maxRecords?: number;
}

const STAFF_SLOTS: readonly StaffSlot[] = ['consultant_id', 'employee_id', 'manager_id'];

/**
 * Run the ownership backfill. Returns a full {@link MigrationReport}.
 * Reads applications with `includeDeleted` so soft-deleted rows are also
 * classified (they still need consistent ownership for audit/history).
 */
export async function runOwnershipBackfill(opts: BackfillOptions): Promise<MigrationReport> {
  const started = new Date();
  const filter: any = {};
  if (opts.applicationIds?.length) filter._id = { $in: opts.applicationIds.map((id) => new Types.ObjectId(String(id))) };

  const apps = await Application.find(filter).setOptions({ includeDeleted: true } as any);

  const totals: Record<MigrationClass, number> = { migrated: 0, skipped: 0, needs_manual_review: 0, invalid: 0 };
  const records: MigrationRecord[] = [];
  let orgsCreated = 0;
  let orgsWouldCreate = 0;
  const maxRecords = opts.maxRecords ?? Number.POSITIVE_INFINITY;

  for (const app of apps) {
    const rec: MigrationRecord = {
      application_id: String(app._id),
      application_number: (app as any).application_number,
      classification: 'skipped',
      fields_set: [],
      issues: [],
    };
    const set: Record<string, Types.ObjectId> = {};
    let ambiguous = false;
    let invalid = false;

    // ── created_by must exist — it is the audit anchor and the customer source ──
    const creator = app.created_by ? await User.findById(app.created_by) : null;
    if (!creator) {
      invalid = true;
      rec.issues.push('created_by references a missing user');
    }

    // ── customer_id (never overwrite an existing value) ──
    if (!app.customer_id && !invalid) {
      if (app.org_id) {
        const org = await Organization.findById(app.org_id).setOptions({ includeDeleted: true } as any);
        if (org) {
          set.customer_id = app.org_id as Types.ObjectId;
          rec.fields_set.push('customer_id');
        } else {
          ambiguous = true;
          rec.issues.push('org_id references a missing organization — needs manual review');
        }
      } else {
        const resolved = await resolveCustomerOrganization(creator as unknown as PersonalOrgUser, { dryRun: opts.dryRun });
        if (resolved.source === 'would_create_personal') {
          orgsWouldCreate++;
          rec.fields_set.push('customer_id');
        } else if (resolved.orgId) {
          if (resolved.created) orgsCreated++;
          set.customer_id = resolved.orgId;
          rec.fields_set.push('customer_id');
        } else {
          ambiguous = true;
          rec.issues.push('could not resolve a customer organization');
        }
      }
    }

    // ── staff axes (only unambiguous, only when currently null) ──
    if (!invalid && (app.assignees?.length || app.primary_assignee)) {
      const assigneeUsers = await User.find({ _id: { $in: app.assignees ?? [] } }).select('_id role');
      const refs: AssigneeRoleRef[] = assigneeUsers.map((u) => ({ id: u._id as Types.ObjectId, role: u.role }));
      const { axes, ambiguities } = deriveStaffAxes(refs, app.primary_assignee);

      for (const slot of STAFF_SLOTS) {
        if (!app[slot] && axes[slot]) {
          set[slot] = axes[slot] as Types.ObjectId;
          rec.fields_set.push(slot);
        }
      }
      if (ambiguities.length) {
        ambiguous = true;
        for (const a of ambiguities) rec.issues.push(a.reason);
      }
    }

    // ── classify ──
    if (invalid) {
      rec.classification = 'invalid';
    } else if (ambiguous) {
      rec.classification = 'needs_manual_review';
    } else if (rec.fields_set.length === 0) {
      rec.classification = 'skipped';
    } else {
      rec.classification = 'migrated';
    }

    // ── write (guarded; never overwrites, never runs in dry-run) ──
    // Only the unambiguous, currently-null fields in `set` are written. Fields
    // left for manual review are intentionally NOT written.
    if (!opts.dryRun && Object.keys(set).length > 0) {
      const nullGuard: any = { _id: app._id };
      for (const key of Object.keys(set)) nullGuard[key] = null; // matches absent-or-null
      await Application.updateOne(nullGuard, { $set: set }).setOptions({ includeDeleted: true } as any);
    }

    totals[rec.classification]++;
    if (records.length < maxRecords) records.push(rec);
  }

  const finished = new Date();
  return {
    dry_run: opts.dryRun,
    started_at: started,
    finished_at: finished,
    duration_ms: finished.getTime() - started.getTime(),
    total: apps.length,
    totals,
    organizations_created: orgsCreated,
    organizations_would_create: orgsWouldCreate,
    records,
  };
}

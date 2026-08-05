/**
 * Customer 360 data reconciliation (READ-ONLY by default).
 *
 *   npx ts-node src/scripts/reconcileCustomer360.ts            (dry run — report only)
 *   npx ts-node src/scripts/reconcileCustomer360.ts --apply    (repair relationships)
 *   npx ts-node src/scripts/reconcileCustomer360.ts --json     (print full JSON report)
 *
 * WHY: Customer 360 (GET /users/:id/overview) aggregates a customer's data by
 * created_by / user_id / uploaded_by = the viewed User._id. When duplicate User
 * records exist for one email, records get spread across the duplicates and the
 * overview shows zeros. This tool consolidates ownership onto a single canonical
 * user per email, and reports orphaned records that cannot be safely repaired.
 *
 * SAFETY:
 *   • Idempotent — safe to run repeatedly; a second run repoints nothing.
 *   • Non-destructive — only REPOINTS references (created_by, user_id,
 *     uploaded_by, assignees, primary/consultant/employee/manager). It NEVER
 *     deletes users or records, and never changes application/API logic.
 *   • Orphans with no valid target are REPORTED, never guessed/deleted.
 *   • customer_id (Organization) is only reported, never auto-changed (choosing
 *     the right org needs human judgement).
 */
import mongoose, { Types } from 'mongoose';
import { User, Application, Payment, Document, Certification, Organization } from '../models';

export interface DuplicateGroup {
  email: string;
  canonical: string;
  duplicates: string[];
}
export interface ReconciliationReport {
  dry_run: boolean;
  duplicate_emails: DuplicateGroup[];
  repointed: { applications_created_by: number; assignees: number; payments: number; documents: number };
  orphans: {
    applications_missing_creator: string[];
    applications_orphan_customer_id: string[];
    payments: string[];
    documents: string[];
    certifications: string[];
  };
}

const s = (id: any) => String(id);

/** Choose the canonical user for a set of same-email users: verified first, then oldest. */
function pickCanonical(users: any[]): any {
  const active = users.filter((u) => !u.deleted_at);
  const pool = active.length ? active : users;
  return [...pool].sort((a, b) => {
    const av = a.email_verified_at ? 0 : 1;
    const bv = b.email_verified_at ? 0 : 1;
    if (av !== bv) return av - bv;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  })[0];
}

export async function runReconciliation(opts: { dryRun: boolean }): Promise<ReconciliationReport> {
  const report: ReconciliationReport = {
    dry_run: opts.dryRun,
    duplicate_emails: [],
    repointed: { applications_created_by: 0, assignees: 0, payments: 0, documents: 0 },
    orphans: {
      applications_missing_creator: [],
      applications_orphan_customer_id: [],
      payments: [],
      documents: [],
      certifications: [],
    },
  };

  // Valid id sets (include soft-deleted so we don't false-flag as orphans).
  const userIds = new Set((await User.find({}).setOptions({ includeDeleted: true } as any).distinct('_id')).map(s));
  const appIds = new Set((await Application.find({}).setOptions({ includeDeleted: true } as any).distinct('_id')).map(s));
  const orgIds = new Set((await Organization.find({}).setOptions({ includeDeleted: true } as any).distinct('_id')).map(s));

  // ── 1. Duplicate users by email → consolidate ownership onto canonical ──
  // aggregate() ignores the soft-delete find hook, so duplicates that include a
  // soft-deleted record are still detected.
  const groups = await User.aggregate([
    { $match: { email: { $ne: null } } },
    { $group: { _id: '$email', ids: { $addToSet: '$_id' }, n: { $sum: 1 } } },
    { $match: { n: { $gt: 1 } } },
  ]);

  for (const g of groups as any[]) {
    const users = await User.find({ _id: { $in: g.ids } }).setOptions({ includeDeleted: true } as any).lean();
    const canonical = pickCanonical(users);
    const canonicalId = canonical._id as Types.ObjectId;
    const dupIds = users.map((u: any) => u._id).filter((id: any) => s(id) !== s(canonicalId));
    report.duplicate_emails.push({ email: g._id, canonical: s(canonicalId), duplicates: dupIds.map(s) });

    if (!opts.dryRun) {
      // Repoint scalar user references on Application.
      for (const field of ['created_by', 'primary_assignee', 'consultant_id', 'employee_id', 'manager_id']) {
        const res = await Application.updateMany(
          { [field]: { $in: dupIds } } as any,
          { $set: { [field]: canonicalId } } as any,
        ).setOptions({ includeDeleted: true } as any);
        if (field === 'created_by') report.repointed.applications_created_by += res.modifiedCount ?? 0;
      }
      // Repoint assignees array membership (add canonical, remove duplicates).
      const add = await Application.updateMany({ assignees: { $in: dupIds } } as any, { $addToSet: { assignees: canonicalId } } as any).setOptions({ includeDeleted: true } as any);
      await Application.updateMany({ assignees: { $in: dupIds } } as any, { $pull: { assignees: { $in: dupIds } } } as any).setOptions({ includeDeleted: true } as any);
      report.repointed.assignees += add.modifiedCount ?? 0;
      // Repoint Payment + Document ownership.
      const pay = await Payment.updateMany({ user_id: { $in: dupIds } } as any, { $set: { user_id: canonicalId } } as any);
      report.repointed.payments += pay.modifiedCount ?? 0;
      const doc = await Document.updateMany({ uploaded_by: { $in: dupIds } } as any, { $set: { uploaded_by: canonicalId } } as any).setOptions({ includeDeleted: true } as any);
      report.repointed.documents += doc.modifiedCount ?? 0;
    } else {
      // Dry run — count what WOULD be repointed.
      report.repointed.applications_created_by += await Application.countDocuments({ created_by: { $in: dupIds } } as any).setOptions({ includeDeleted: true } as any);
      report.repointed.assignees += await Application.countDocuments({ assignees: { $in: dupIds } } as any).setOptions({ includeDeleted: true } as any);
      report.repointed.payments += await Payment.countDocuments({ user_id: { $in: dupIds } } as any);
      report.repointed.documents += await Document.countDocuments({ uploaded_by: { $in: dupIds } } as any).setOptions({ includeDeleted: true } as any);
    }
  }

  // ── 2. Orphan detection (report only — never auto-repaired) ──
  for (const a of await Application.find({}).setOptions({ includeDeleted: true } as any).select('_id application_number created_by customer_id').lean() as any[]) {
    if (!a.created_by || !userIds.has(s(a.created_by))) report.orphans.applications_missing_creator.push(a.application_number || s(a._id));
    if (a.customer_id && !orgIds.has(s(a.customer_id))) report.orphans.applications_orphan_customer_id.push(a.application_number || s(a._id));
  }
  for (const p of await Payment.find({}).select('_id user_id application_id').lean() as any[]) {
    const badUser = !p.user_id || !userIds.has(s(p.user_id));
    const badApp = p.application_id && !appIds.has(s(p.application_id));
    if (badUser || badApp) report.orphans.payments.push(s(p._id));
  }
  for (const d of await Document.find({}).setOptions({ includeDeleted: true } as any).select('_id uploaded_by application_ids').lean() as any[]) {
    const badUser = !d.uploaded_by || !userIds.has(s(d.uploaded_by));
    const badApp = (d.application_ids || []).some((x: any) => !appIds.has(s(x)));
    if (badUser || badApp) report.orphans.documents.push(s(d._id));
  }
  for (const c of await Certification.find({}).setOptions({ includeDeleted: true } as any).select('_id cert_number application_id org_id').lean() as any[]) {
    const badApp = !c.application_id || !appIds.has(s(c.application_id));
    const badOrg = c.org_id && !orgIds.has(s(c.org_id));
    if (badApp || badOrg) report.orphans.certifications.push(c.cert_number || s(c._id));
  }

  return report;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const printJson = process.argv.includes('--json');
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) { console.error('✗ MONGODB_URI is not set.'); process.exit(1); }
  await mongoose.connect(uri);
  console.log(`Connected. Mode: ${apply ? 'APPLY' : 'DRY RUN'}\n`);

  const r = await runReconciliation({ dryRun: !apply });
  console.log('── Customer 360 Reconciliation ───────────────────────────');
  console.log(`  duplicate emails:              ${r.duplicate_emails.length}`);
  console.log(`  apps repointed (created_by):   ${r.repointed.applications_created_by}`);
  console.log(`  apps repointed (assignees):    ${r.repointed.assignees}`);
  console.log(`  payments repointed:            ${r.repointed.payments}`);
  console.log(`  documents repointed:           ${r.repointed.documents}`);
  console.log(`  orphan apps (missing creator): ${r.orphans.applications_missing_creator.length}`);
  console.log(`  orphan customer_id:            ${r.orphans.applications_orphan_customer_id.length}`);
  console.log(`  orphan payments:               ${r.orphans.payments.length}`);
  console.log(`  orphan documents:              ${r.orphans.documents.length}`);
  console.log(`  orphan certificates:           ${r.orphans.certifications.length}`);
  console.log('──────────────────────────────────────────────────────────');
  if (r.duplicate_emails.length) {
    console.log('\nDuplicate emails (canonical ← duplicates):');
    for (const g of r.duplicate_emails.slice(0, 50)) console.log(`  ${g.email}: ${g.canonical} ← ${g.duplicates.join(', ')}`);
  }
  if (printJson) console.log('\n' + JSON.stringify(r, null, 2));
  if (!apply) console.log('\n(dry run — no changes written. Re-run with --apply to repair.)');

  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch(async (e) => { console.error('Reconciliation failed:', e); await mongoose.disconnect().catch(() => {}); process.exit(1); });
}

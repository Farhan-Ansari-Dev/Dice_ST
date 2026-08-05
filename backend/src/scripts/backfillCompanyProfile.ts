/**
 * Company Profile backfill (READ-ONLY by default).
 *
 *   npx ts-node src/scripts/backfillCompanyProfile.ts            (dry run — report only)
 *   npx ts-node src/scripts/backfillCompanyProfile.ts --apply    (write)
 *   npx ts-node src/scripts/backfillCompanyProfile.ts --json     (full JSON report)
 *
 * WHY: existing users show empty Company Profile fields (company_name, gst_number,
 * cin, iec, address) because they completed onboarding (business fields) but never
 * filled the separate Company Profile screen. The read/write/serialize path is
 * correct (verified) — the User documents genuinely lack these values. This tool
 * populates them ONLY WHERE THE DATA EXISTS ELSEWHERE:
 *
 *   • Primary source — a real (non-personal) Organization the user belongs to or
 *     owns: company_name ← legal_name|name, gst_number, iec ← iec_code, cin,
 *     address.
 *   • Fallback for company_name only — the user's most recent Lead (enquiry
 *     intake captures company_name).
 *
 * SAFETY:
 *   • Idempotent — a second run changes nothing.
 *   • Non-destructive — only fills fields that are EMPTY on the user; never
 *     overwrites user-entered data.
 *   • Personal Organizations (is_personal) are skipped as a source so a personal
 *     org's fallback name can never pollute company_name.
 *   • No application/API logic is changed. Users with no source are reported as
 *     "data does not exist" — no action, which is correct.
 */
import mongoose from 'mongoose';
import { User, Organization } from '../models';
import { Lead } from '../models/Lead';

export interface CompanyBackfillReport {
  dry_run: boolean;
  users_scanned: number;
  users_with_empty_company: number;
  filled_from_org: number;
  filled_from_lead: number;
  fields_set: { company_name: number; gst_number: number; cin: number; iec: number; address: number };
  no_source: number;
}

const empty = (v: any) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

export async function runCompanyProfileBackfill(opts: { dryRun: boolean }): Promise<CompanyBackfillReport> {
  const report: CompanyBackfillReport = {
    dry_run: opts.dryRun,
    users_scanned: 0,
    users_with_empty_company: 0,
    filled_from_org: 0,
    filled_from_lead: 0,
    fields_set: { company_name: 0, gst_number: 0, cin: 0, iec: 0, address: 0 },
    no_source: 0,
  };

  const users = await User.find({}).lean();
  report.users_scanned = users.length;

  for (const u of users as any[]) {
    const missingCompanyName = empty(u.company_name);
    const missingGst = empty(u.gst_number);
    const missingCin = empty(u.cin);
    const missingIec = empty(u.iec);
    const missingAddr = empty(u.address?.line1);

    if (!(missingCompanyName || missingGst || missingCin || missingIec || missingAddr)) continue;
    report.users_with_empty_company++;

    const set: any = {};

    // ── Source A: a real (non-personal) Organization the user belongs to / owns ──
    const org = await Organization.findOne({
      is_personal: { $ne: true },
      $or: [
        ...(u.org_id ? [{ _id: u.org_id }] : []),
        { owner_user_id: u._id },
      ],
    }).lean() as any;

    if (org) {
      const orgCompany = org.legal_name || org.name;
      if (missingCompanyName && !empty(orgCompany)) set.company_name = orgCompany;
      if (missingGst && !empty(org.gst_number)) set.gst_number = org.gst_number;
      if (missingCin && !empty(org.cin)) set.cin = org.cin;
      if (missingIec && !empty(org.iec_code)) set.iec = org.iec_code;
      if (missingAddr && org.address && !empty(org.address.line1)) {
        set.address = {
          line1: org.address.line1, line2: org.address.line2,
          city: org.address.city, state: org.address.state, pincode: org.address.pincode,
        };
      }
      if (Object.keys(set).length) report.filled_from_org++;
    }

    // ── Source B (company_name only): the user's most recent Lead ──
    if (empty(set.company_name) && missingCompanyName) {
      const lead = await Lead.findOne({ user_id: u._id, company_name: { $exists: true, $ne: '' } })
        .sort({ created_at: -1 }).lean() as any;
      if (lead && !empty(lead.company_name)) {
        set.company_name = lead.company_name;
        report.filled_from_lead++;
      }
    }

    if (Object.keys(set).length === 0) { report.no_source++; continue; }

    for (const k of ['company_name', 'gst_number', 'cin', 'iec', 'address'] as const) {
      if (set[k] !== undefined) report.fields_set[k]++;
    }

    if (!opts.dryRun) {
      // Null-guarded per field so a concurrent write is never overwritten.
      const guard: any = { _id: u._id };
      for (const k of Object.keys(set)) {
        guard[k === 'address' ? 'address.line1' : k] = { $in: [null, undefined, ''] };
      }
      await User.updateOne(guard, { $set: set });
    }
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

  const r = await runCompanyProfileBackfill({ dryRun: !apply });
  console.log('── Company Profile Backfill ──────────────────────────────');
  console.log(`  users scanned:                 ${r.users_scanned}`);
  console.log(`  users with empty company data: ${r.users_with_empty_company}`);
  console.log(`  filled from Organization:      ${r.filled_from_org}`);
  console.log(`  filled company_name from Lead: ${r.filled_from_lead}`);
  console.log(`  fields set:                    ${JSON.stringify(r.fields_set)}`);
  console.log(`  no source (data absent):       ${r.no_source}`);
  console.log('──────────────────────────────────────────────────────────');
  if (printJson) console.log('\n' + JSON.stringify(r, null, 2));
  if (r.filled_from_org === 0 && r.filled_from_lead === 0) {
    console.log('\nNo external source found — this company data does not exist anywhere.');
    console.log('No code change is required; users must complete Company Profile in-app.');
  }
  if (!apply) console.log('\n(dry run — no changes written. Re-run with --apply to backfill.)');

  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch(async (e) => { console.error('Backfill failed:', e); await mongoose.disconnect().catch(() => {}); process.exit(1); });
}

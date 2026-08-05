/**
 * Sprint 3 migration — backfill the typed ownership axes on Applications.
 *
 *   npx ts-node src/scripts/backfillOwnership.ts            (dry run — writes nothing)
 *   npx ts-node src/scripts/backfillOwnership.ts --apply    (write)
 *   npx ts-node src/scripts/backfillOwnership.ts --json     (print full report JSON)
 *
 * Idempotent and non-destructive: never overwrites existing ownership, never
 * touches created_by / assignees / status, and classifies every Application
 * (migrated / skipped / needs_manual_review / invalid) with totals. Run the
 * dry run first and review the report before applying.
 *
 * This is a MANUAL script — it is never invoked automatically at boot.
 */
import mongoose from 'mongoose';
import { runOwnershipBackfill } from '../services/ownership/backfillService';

async function main() {
  const apply = process.argv.includes('--apply');
  const printJson = process.argv.includes('--json');

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('✗ MONGODB_URI is not set.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log(`Connected. Mode: ${apply ? 'APPLY' : 'DRY RUN'}\n`);

  const report = await runOwnershipBackfill({ dryRun: !apply });

  console.log('── Ownership Backfill Report ─────────────────────────────');
  console.log(`  mode:                    ${report.dry_run ? 'DRY RUN' : 'APPLY'}`);
  console.log(`  total applications:      ${report.total}`);
  console.log(`  migrated:                ${report.totals.migrated}`);
  console.log(`  skipped:                 ${report.totals.skipped}`);
  console.log(`  needs manual review:     ${report.totals.needs_manual_review}`);
  console.log(`  invalid:                 ${report.totals.invalid}`);
  console.log(`  personal orgs created:   ${report.organizations_created}`);
  console.log(`  personal orgs (dry-run): ${report.organizations_would_create}`);
  console.log(`  duration:                ${report.duration_ms} ms`);
  console.log('──────────────────────────────────────────────────────────');

  const flagged = report.records.filter(
    (r) => r.classification === 'needs_manual_review' || r.classification === 'invalid',
  );
  if (flagged.length) {
    console.log(`\n! ${flagged.length} application(s) need attention:`);
    for (const r of flagged.slice(0, 100)) {
      console.log(`  - ${r.application_number ?? r.application_id} [${r.classification}] ${r.issues.join('; ')}`);
    }
    if (flagged.length > 100) console.log(`  … and ${flagged.length - 100} more (use --json for the full list).`);
  }

  if (printJson) console.log('\n' + JSON.stringify(report, null, 2));

  if (!apply) console.log('\n(dry run — no changes written. Re-run with --apply to write.)');

  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error('Backfill failed:', e);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});

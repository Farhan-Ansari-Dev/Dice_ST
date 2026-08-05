/**
 * Ownership reconciliation report (READ-ONLY).
 *
 *   npx ts-node src/scripts/reconcileOwnership.ts
 *
 * Runs checkOwnershipConsistency across all applications and reports drift
 * between the legacy assignment (assignees / primary_assignee) and the new typed
 * ownership axes, plus how many are not yet backfilled (customer_id missing).
 * Writes nothing — this is the gate you review before enabling the ownership
 * read-cutover feature flag.
 */
import mongoose from 'mongoose';
import { Application } from '../models';
import { checkOwnershipConsistency } from '../services/ownership/ownershipValidation';

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('✗ MONGODB_URI is not set.');
    process.exit(1);
  }
  await mongoose.connect(uri);

  const apps = await Application.find({}).setOptions({ includeDeleted: true } as any).lean();

  let consistent = 0;
  let customerMissing = 0;
  let hardDrift = 0;
  const drifted: Array<{ id: string; number?: string; issues: string[] }> = [];

  for (const app of apps as any[]) {
    const r = checkOwnershipConsistency(app);
    if (r.inconsistencies.some((i) => i.code === 'customer_missing')) customerMissing++;
    if (r.consistent) {
      consistent++;
    } else {
      hardDrift++;
      drifted.push({ id: String(app._id), number: app.application_number, issues: r.inconsistencies.map((i) => i.detail) });
    }
  }

  console.log('── Ownership Reconciliation ──────────────────────────────');
  console.log(`  total applications:        ${apps.length}`);
  console.log(`  consistent:                ${consistent}`);
  console.log(`  customer_id not backfilled:${customerMissing}`);
  console.log(`  hard drift (needs review): ${hardDrift}`);
  console.log('──────────────────────────────────────────────────────────');
  if (drifted.length) {
    console.log(`\n! ${drifted.length} application(s) with drift:`);
    for (const d of drifted.slice(0, 100)) console.log(`  - ${d.number ?? d.id}: ${d.issues.join('; ')}`);
    if (drifted.length > 100) console.log(`  … and ${drifted.length - 100} more.`);
  }
  console.log(`\nCutover readiness: ${hardDrift === 0 ? 'OK (no hard drift)' : 'BLOCKED — resolve drift first'}`);

  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error('reconcileOwnership failed:', e);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});

/**
 * Backfill CBRequest.markets from the legacy scalar CBRequest.market.
 *
 *   npx ts-node src/scripts/backfillCbRequestMarkets.ts        (dry run — report only)
 *   npx ts-node src/scripts/backfillCbRequestMarkets.ts --apply
 *
 * Idempotent and NON-destructive: it only fills `markets` for documents that have
 * a `market` but no `markets` yet, and never deletes `market`. Safe to re-run.
 */
import mongoose from 'mongoose';
import { CBRequest } from '../models/CBRequest';
import { normalizeMarkets } from '../services/cbMatchingService';

async function main() {
  const apply = process.argv.includes('--apply');
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) { console.error('✗ MONGODB_URI is not set.'); process.exit(1); }
  await mongoose.connect(uri);
  console.log(`Connected. Backfilling CBRequest.markets (${apply ? 'APPLY' : 'DRY RUN'})…\n`);

  // Candidates: a legacy market present, and markets empty/missing.
  const candidates = await CBRequest.find({
    market: { $exists: true, $nin: [null, ''] },
    $or: [{ markets: { $exists: false } }, { markets: { $size: 0 } }],
  }).select('_id request_number market markets').lean();

  console.log(`Found ${candidates.length} request(s) to backfill.`);
  let updated = 0;
  for (const doc of candidates) {
    const markets = normalizeMarkets((doc as any).market);
    if (markets.length === 0) continue;
    console.log(`  ${(doc as any).request_number}: market=${(doc as any).market} → markets=[${markets.join(', ')}]`);
    if (apply) {
      await CBRequest.updateOne({ _id: doc._id }, { $set: { markets } });
      updated++;
    }
  }

  console.log(`\n${apply ? `✓ Updated ${updated} request(s).` : 'Dry run complete — re-run with --apply to write.'}`);
  await mongoose.disconnect();
}

main().catch((err) => { console.error('✗ Backfill failed:', err); process.exit(1); });

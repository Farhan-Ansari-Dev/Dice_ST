/**
 * Build/verify MongoDB indexes to match the Mongoose schemas.
 *
 *   npx ts-node src/scripts/syncIndexes.ts
 *
 * autoIndex is disabled in production (see db/mongo.ts), so newly declared
 * indexes — the ownership axes (customer_id / consultant_id / employee_id /
 * manager_id), Organization.is_personal, Application.renewal_of_cert_id, and the
 * Testing/Inspection application_id links — must be built explicitly. syncIndexes
 * creates missing indexes and drops ones no longer in the schema. Safe to re-run.
 */
import mongoose from 'mongoose';
import { Application, Organization, Certification, Testing, Inspection, User, Payment, Document } from '../models';

const MODELS: Array<{ name: string; model: mongoose.Model<any> }> = [
  { name: 'Application', model: Application as any },
  { name: 'Organization', model: Organization as any },
  { name: 'Certification', model: Certification as any },
  { name: 'Testing', model: Testing as any },
  { name: 'Inspection', model: Inspection as any },
  { name: 'User', model: User as any },
  { name: 'Payment', model: Payment as any },
  { name: 'Document', model: Document as any },
];

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('✗ MONGODB_URI is not set.');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log('Connected. Synchronising indexes…\n');

  for (const { name, model } of MODELS) {
    try {
      await model.syncIndexes();
      console.log(`  ✓ ${name}`);
    } catch (err) {
      console.error(`  ✗ ${name}: ${(err as Error).message}`);
    }
  }

  console.log('\nDone.');
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error('syncIndexes failed:', e);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});

/**
 * Phase 0 migration — move the plaintext provider key out of RemoteConfig.
 *
 *   npx ts-node src/scripts/migrateProviderKeys.ts          (dry run)
 *   npx ts-node src/scripts/migrateProviderKeys.ts --apply  (write)
 *
 * Idempotent: safe to run repeatedly. Verifies the encrypted value decrypts
 * back to the original before clearing the plaintext, so a failed encryption
 * can never destroy the only copy of the key.
 *
 * IMPORTANT: this key has been stored in plaintext in MongoDB and returned by
 * GET /config/admin. Treat it as compromised and rotate it at the provider
 * after migrating.
 */
import mongoose from 'mongoose';
import { RemoteConfig } from '../models/RemoteConfig';
import { AIProviderCredential, PROVIDER_NAMES, ProviderName } from '../models/AIProviderCredential';
import { setProviderKey } from '../services/ai/credentialService';
import { getProviderKey } from '../services/ai/credentialService';
import { isEncryptionConfigured, last4 } from '../utils/crypto/secretBox';

async function main() {
  const apply = process.argv.includes('--apply');

  if (!isEncryptionConfigured()) {
    console.error('✗ CONFIG_ENCRYPTION_KEY is not set (or is not 32 bytes).');
    console.error('  Generate one with:');
    console.error('    node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('✗ MONGODB_URI is not set.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log(`Connected. Mode: ${apply ? 'APPLY' : 'DRY RUN'}\n`);

  const config = await RemoteConfig.getGlobalConfig();
  const plaintext = config.aiSettings?.apiKey?.trim();
  const provider = (config.aiSettings?.provider ?? 'nvidia') as ProviderName;

  if (!plaintext) {
    console.log('✓ No plaintext key in RemoteConfig.aiSettings.apiKey — nothing to migrate.');
  } else if (!PROVIDER_NAMES.includes(provider)) {
    console.error(`✗ RemoteConfig names an unknown provider "${provider}". Fix it before migrating.`);
    process.exit(1);
  } else {
    const existing = await AIProviderCredential.findOne({ provider }).lean();
    console.log(`Found plaintext key for "${provider}" (…${last4(plaintext)})`);
    if (existing) {
      console.log(`  An encrypted credential for "${provider}" already exists (…${existing.last4}).`);
      console.log('  It will be overwritten with the RemoteConfig value.');
    }

    if (apply) {
      await setProviderKey(provider, plaintext);

      // Verify the round trip BEFORE destroying the only copy.
      const readBack = await getProviderKey(provider);
      if (readBack !== plaintext) {
        console.error('✗ Verification failed — decrypted value does not match. Plaintext left intact.');
        process.exit(1);
      }
      console.log('  ✓ Encrypted and verified.');

      config.aiSettings.apiKey = '';
      await config.save();
      console.log('  ✓ Plaintext cleared from RemoteConfig.');
    } else {
      console.log('  (dry run — no changes written)');
    }
  }

  // Report anything still holding plaintext elsewhere in the document.
  const raw = config.toObject() as any;
  if (raw.aiSettings?.apiKey) {
    console.log(`\n! RemoteConfig.aiSettings.apiKey still populated${apply ? '' : ' (expected in dry run)'}`);
  }

  console.log('\nNext steps:');
  console.log('  1. Rotate the key at the provider — it has been stored in plaintext and served over an API.');
  console.log('  2. Set the new key via PUT /api/v2/config/admin/ai/credentials/:provider');
  console.log('  3. Confirm GET /api/v2/config/admin no longer contains key material.');

  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error('Migration failed:', e);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});

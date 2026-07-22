/**
 * The only place a provider API key is decrypted.
 *
 * Resolution order (most specific first):
 *   1. AIProviderCredential  — encrypted at rest, admin-managed
 *   2. RemoteConfig.aiSettings.apiKey — LEGACY plaintext, read-only during
 *      migration so an un-migrated deployment keeps working
 *   3. Environment variables — fallback defaults
 *
 * Step 2 is removed once Phase 0 migration has run everywhere.
 */
import { Types } from 'mongoose';
import { AIProviderCredential, ProviderName } from '../../models/AIProviderCredential';
import { RemoteConfig } from '../../models/RemoteConfig';
import { seal, open, last4, isEncryptionConfigured } from '../../utils/crypto/secretBox';
import { logger } from '../../utils/logger';

/**
 * Values that look configured but are not. backend/.env ships
 * OPENAI_API_KEY=sk-your-api-key-here, which produced an opaque 401 at the
 * provider rather than a clear "not configured" state.
 */
const PLACEHOLDER_KEYS = new Set([
  'sk-your-api-key-here',
  'your-api-key-here',
  'changeme',
  'REPLACE_ME',
]);

/** Environment fallbacks, by provider (development only). */
const ENV_KEYS: Record<ProviderName, string[]> = {
  nvidia: ['NVIDIA_API_KEY'],
  openai: ['OPENAI_API_KEY'],
  claude: ['ANTHROPIC_API_KEY', 'CLAUDE_API_KEY'],
  gemini: ['GEMINI_API_KEY', 'GOOGLE_AI_API_KEY'],
  ollama: [],                       // local, typically unauthenticated
  azure:  ['AZURE_OPENAI_API_KEY'],
};

/**
 * Normalises whatever the driver hands back (Buffer, BSON Binary, or a
 * serialised { type:'Buffer', data:[…] }) into a real Buffer. Getting this
 * wrong corrupts the bytes and fails decryption in a way that looks like a
 * wrong key.
 */
function toBuffer(value: any): Buffer {
  if (Buffer.isBuffer(value)) return value;
  if (value?.buffer) return Buffer.from(value.buffer);      // BSON Binary
  if (Array.isArray(value?.data)) return Buffer.from(value.data);
  return Buffer.from(value);
}

export interface CredentialStatus {
  provider: ProviderName;
  present: boolean;
  last4: string | null;
  rotatedAt: Date | null;
  /** Where the key came from — helps operators verify migration completed. */
  source: 'encrypted' | 'legacy_plaintext' | 'environment' | 'none';
}

/**
 * Returns the plaintext key for a provider, or null.
 * Callers must not log, cache, or return the result.
 */
export async function getProviderKey(provider: ProviderName): Promise<string | null> {
  if (isEncryptionConfigured()) {
    // Not .lean(): BSON returns Binary rather than a Node Buffer for lean
    // reads, and Buffer.from(Binary) silently produces the wrong bytes, which
    // then fails the GCM auth tag. Reading the hydrated document gives real
    // Buffers. (The schema's toObject/toJSON transforms strip these fields, so
    // the document can still never be serialised into a response.)
    const record = await AIProviderCredential.findOne({ provider });

    if (record) {
      try {
        return open({
          ciphertext: toBuffer(record.ciphertext),
          iv: toBuffer(record.iv),
          authTag: toBuffer(record.auth_tag),
          keyVersion: record.key_version,
        });
      } catch (e) {
        // Wrong master key, or tampered ciphertext. Fall through rather than
        // hard-failing, but make it loud — this is an operational incident.
        logger.error(`[credentials] failed to decrypt key for ${provider}`, { error: String(e) });
      }
    }
  }

  // Legacy: plaintext key still in RemoteConfig from before Phase 0.
  const config = await RemoteConfig.getGlobalConfig();
  const legacy = config.aiSettings?.apiKey;
  if (legacy && config.aiSettings?.provider === provider) {
    return legacy;
  }

  // Environment keys are a DEVELOPMENT convenience only. Production reads
  // provider keys exclusively from Remote Config (the encrypted credential
  // store), so rotating a key is an admin action and never a redeploy.
  if (process.env.NODE_ENV !== 'production') {
    for (const name of ENV_KEYS[provider] ?? []) {
      const value = process.env[name];
      // Reject the placeholder shipped in .env.example, which otherwise looks
      // like a configured key and fails opaquely at the provider.
      if (value && !PLACEHOLDER_KEYS.has(value.trim())) return value;
    }
  }

  return null;
}

/** Non-secret status for the admin UI. Never includes key material. */
export async function getCredentialStatus(provider: ProviderName): Promise<CredentialStatus> {
  const record = await AIProviderCredential.findOne({ provider }).lean();
  if (record) {
    return {
      provider,
      present: true,
      last4: record.last4,
      rotatedAt: record.rotated_at ?? null,
      source: 'encrypted',
    };
  }

  const config = await RemoteConfig.getGlobalConfig();
  if (config.aiSettings?.apiKey && config.aiSettings?.provider === provider) {
    return {
      provider,
      present: true,
      last4: last4(config.aiSettings.apiKey),
      rotatedAt: null,
      source: 'legacy_plaintext',
    };
  }

  const fromEnv =
    process.env.NODE_ENV !== 'production' &&
    (ENV_KEYS[provider] ?? []).some((n) => {
      const v = process.env[n];
      return !!v && !PLACEHOLDER_KEYS.has(v.trim());
    });
  return {
    provider,
    present: fromEnv,
    last4: null,
    rotatedAt: null,
    source: fromEnv ? 'environment' : 'none',
  };
}

export async function getAllCredentialStatuses(providers: ProviderName[]): Promise<CredentialStatus[]> {
  return Promise.all(providers.map(getCredentialStatus));
}

/** Stores or replaces a provider key. Set-only: there is no read counterpart. */
export async function setProviderKey(
  provider: ProviderName,
  plaintext: string,
  actor?: Types.ObjectId,
): Promise<CredentialStatus> {
  if (!isEncryptionConfigured()) {
    throw new Error('CONFIG_ENCRYPTION_KEY is not configured — refusing to store a provider key.');
  }

  const trimmed = plaintext.trim();
  if (!trimmed) throw new Error('API key must not be empty');

  const sealed = seal(trimmed);

  await AIProviderCredential.findOneAndUpdate(
    { provider },
    {
      $set: {
        ciphertext: sealed.ciphertext,
        iv: sealed.iv,
        auth_tag: sealed.authTag,
        key_version: sealed.keyVersion,
        last4: last4(trimmed),
        rotated_at: new Date(),
        rotated_by: actor,
      },
    },
    { upsert: true, new: true },
  );

  return {
    provider,
    present: true,
    last4: last4(trimmed),
    rotatedAt: new Date(),
    source: 'encrypted',
  };
}

export async function deleteProviderKey(provider: ProviderName): Promise<boolean> {
  const res = await AIProviderCredential.deleteOne({ provider });
  return res.deletedCount > 0;
}

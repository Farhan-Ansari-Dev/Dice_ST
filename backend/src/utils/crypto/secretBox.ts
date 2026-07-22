/**
 * Authenticated encryption for secrets held at rest.
 *
 * AES-256-GCM: tampering with the ciphertext fails the auth tag and throws,
 * rather than silently decrypting to garbage that then gets sent to a provider.
 *
 * The master key lives only in CONFIG_ENCRYPTION_KEY (environment). It is never
 * written to the database, never logged, and never returned by any API.
 */
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;          // 96-bit nonce — the GCM standard
const KEY_BYTES = 32;         // AES-256

/** Current envelope-key version. Bump when the master key is rotated. */
export const CURRENT_KEY_VERSION = 1;

export interface SealedSecret {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
  keyVersion: number;
}

export class MissingEncryptionKeyError extends Error {
  constructor() {
    super(
      'CONFIG_ENCRYPTION_KEY is not set. Generate one with:\n' +
      '  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"',
    );
  }
}

/**
 * Resolves the master key. Accepts base64 (preferred) or hex, and requires
 * exactly 32 bytes — a short key would silently weaken every secret.
 */
function masterKey(): Buffer {
  const raw = process.env.CONFIG_ENCRYPTION_KEY;
  if (!raw) throw new MissingEncryptionKeyError();

  let key: Buffer;
  if (/^[0-9a-f]{64}$/i.test(raw)) {
    key = Buffer.from(raw, 'hex');
  } else {
    key = Buffer.from(raw, 'base64');
  }

  if (key.length !== KEY_BYTES) {
    throw new Error(
      `CONFIG_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (got ${key.length}). ` +
      'Provide a base64 or hex encoded 256-bit key.',
    );
  }
  return key;
}

/** True when a usable master key is configured. Never throws. */
export function isEncryptionConfigured(): boolean {
  try {
    masterKey();
    return true;
  } catch {
    return false;
  }
}

export function seal(plaintext: string): SealedSecret {
  if (!plaintext) throw new Error('Refusing to encrypt an empty secret');

  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, masterKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

  return { ciphertext, iv, authTag: cipher.getAuthTag(), keyVersion: CURRENT_KEY_VERSION };
}

export function open(sealed: SealedSecret): string {
  const decipher = crypto.createDecipheriv(ALGORITHM, masterKey(), sealed.iv);
  decipher.setAuthTag(sealed.authTag);
  return Buffer.concat([decipher.update(sealed.ciphertext), decipher.final()]).toString('utf8');
}

/** Display suffix for admin UIs. Never reveals enough to reconstruct the key. */
export function last4(secret: string): string {
  return secret.length <= 4 ? '••••' : secret.slice(-4);
}

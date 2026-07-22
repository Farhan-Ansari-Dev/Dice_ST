/**
 * Secret redaction and a last-line guard against leaking key material.
 *
 * Motivating defect: GET /config/admin returned the raw RemoteConfig document
 * including aiSettings.apiKey in plaintext, while the public GET /config
 * correctly stripped it. One route remembered, one forgot. This module makes
 * "remembering" structural.
 */

/** Field names whose values are always replaced, at any depth. */
const SECRET_FIELDS = new Set([
  'apikey', 'api_key', 'secret', 'password', 'token', 'accesskey',
  'access_key', 'secretaccesskey', 'secret_access_key', 'privatekey',
  'private_key', 'ciphertext', 'authtag', 'auth_tag', 'iv',
  'client_secret', 'clientsecret', 'webhook_secret',
]);

/**
 * Shapes that look like live provider credentials. Deliberately conservative —
 * a false positive fails a response in tests, which is cheap; a false negative
 * leaks a key, which is not.
 */
const KEY_PATTERNS: RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{16,}/,          // OpenAI
  /\bnvapi-[A-Za-z0-9_-]{16,}/,       // NVIDIA
  /\bsk-ant-[A-Za-z0-9_-]{16,}/,      // Anthropic
  /\bAIza[A-Za-z0-9_-]{30,}/,         // Google
  /\bAKIA[0-9A-Z]{16}\b/,             // AWS access key id
  /\bghp_[A-Za-z0-9]{30,}/,           // GitHub
];

export const REDACTED = '[REDACTED]';

/**
 * Deep-clones a value with every secret field replaced.
 * Cycle-safe, and leaves non-plain objects (Buffer, Date, ObjectId) alone.
 */
export function redactSecrets<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== 'object') return value;
  if (Buffer.isBuffer(value) || value instanceof Date) return value;

  if (seen.has(value as object)) return value;
  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.map((v) => redactSecrets(v, seen)) as unknown as T;
  }

  const source = typeof (value as any).toObject === 'function'
    ? (value as any).toObject()
    : value;

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(source)) {
    if (SECRET_FIELDS.has(key.toLowerCase())) {
      // Preserve presence without the value: '' stays '', anything else is masked.
      out[key] = val === '' || val === null || val === undefined ? val : REDACTED;
      continue;
    }
    out[key] = redactSecrets(val, seen);
  }
  return out as T;
}

/**
 * Scans a payload for credential-shaped strings.
 * Returns the matching pattern description, or null when clean.
 */
export function findLeakedSecret(payload: unknown): string | null {
  let serialised: string;
  try {
    serialised = JSON.stringify(payload);
  } catch {
    return null;                     // unserialisable — nothing will be sent
  }
  if (!serialised) return null;

  for (const pattern of KEY_PATTERNS) {
    if (pattern.test(serialised)) return pattern.source;
  }
  return null;
}

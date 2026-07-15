/**
 * Strip server-controlled / protected keys from a client request body before
 * it is spread into a Mongoose create/update. Prevents mass-assignment tampering
 * (cross-tenant moves via org_id, soft-delete via deleted_at, id/ timestamp
 * spoofing) without maintaining a full per-model field whitelist.
 */
const PROTECTED_KEYS = [
  '_id',
  'org_id',
  'client_id',
  'user_id',
  'deleted_at',
  'created_at',
  'updated_at',
  'createdAt',
  'updatedAt',
  '__v',
];

export function stripProtected<T extends Record<string, any>>(body: T, extra: string[] = []): Partial<T> {
  const blocked = new Set([...PROTECTED_KEYS, ...extra]);
  const out: Record<string, any> = {};
  for (const k of Object.keys(body ?? {})) {
    if (!blocked.has(k)) out[k] = body[k];
  }
  return out as Partial<T>;
}

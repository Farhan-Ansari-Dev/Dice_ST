/**
 * MFA (TOTP) service — enrollment, verification, and login-enforcement policy.
 *
 * Security: the TOTP secret is encrypted at rest with the existing AES-256-GCM
 * secretBox (CONFIG_ENCRYPTION_KEY). The plaintext secret is returned to the
 * enrolling user exactly once (to add to their authenticator) and is never logged
 * nor persisted in plaintext. No plaintext recovery secrets are stored.
 */
import { User, IUser } from '../models';
import { ADMIN_ROLES } from '../middleware/authMongo';
import { seal, open, isEncryptionConfigured, SealedSecret } from '../utils/crypto/secretBox';
import { generateBase32Secret, verifyTotp, buildOtpauthUri } from '../utils/totp';

function serializeSealed(s: SealedSecret): string {
  return ['s1', s.keyVersion, s.iv.toString('base64'), s.authTag.toString('base64'), s.ciphertext.toString('base64')].join(':');
}
function deserializeSealed(str: string): SealedSecret {
  const [tag, ver, iv, authTag, ct] = str.split(':');
  if (tag !== 's1') throw new Error('unrecognized sealed secret format');
  return { keyVersion: Number(ver), iv: Buffer.from(iv, 'base64'), authTag: Buffer.from(authTag, 'base64'), ciphertext: Buffer.from(ct, 'base64') };
}

export class MfaError extends Error {}

/**
 * Whether MFA must be enforced/enrolled for this user:
 *   global ADMIN_MFA_MANDATORY=true OR the user's org requires 2FA for admins,
 *   AND the user is admin/super_admin. Ordinary customers are never forced.
 */
export async function isMfaMandatoryForUser(user: IUser): Promise<boolean> {
  if (!ADMIN_ROLES.includes(user.role as any)) return false;
  if (String(process.env.ADMIN_MFA_MANDATORY).toLowerCase() === 'true') return true;
  if ((user as any).org_id) {
    try {
      const { Organization } = await import('../models');
      const org: any = await Organization.findById((user as any).org_id).select('settings.require_2fa_for_admins').lean();
      if (org?.settings?.require_2fa_for_admins) return true;
    } catch { /* ignore → false */ }
  }
  return false;
}

/** Begin enrollment: store a fresh SEALED secret (still inactive) + return provisioning material. */
export async function setupMfa(userId: string, accountLabel: string): Promise<{ secret: string; otpauthUri: string }> {
  if (!isEncryptionConfigured()) throw new MfaError('Server encryption key is not configured; cannot enroll MFA securely.');
  const secret = generateBase32Secret();
  await User.updateOne({ _id: userId }, { $set: { totp_secret: serializeSealed(seal(secret)), totp_enabled: false } });
  return { secret, otpauthUri: buildOtpauthUri(secret, accountLabel) };
}

/** Confirm enrollment: verify a code against the pending secret and activate MFA. */
export async function enableMfa(userId: string, code: string): Promise<boolean> {
  const user = await User.findById(userId).select('+totp_secret +totp_enabled');
  if (!user || !(user as any).totp_secret) throw new MfaError('No pending MFA enrollment. Start setup first.');
  if (!verifyTotp(open(deserializeSealed((user as any).totp_secret)), code)) return false;
  await User.updateOne({ _id: userId }, { $set: { totp_enabled: true } });
  return true;
}

/** Disable MFA — requires a valid current code (proves possession). */
export async function disableMfa(userId: string, code: string): Promise<boolean> {
  const user = await User.findById(userId).select('+totp_secret +totp_enabled');
  if (!user || !(user as any).totp_enabled || !(user as any).totp_secret) return true; // already off
  if (!verifyTotp(open(deserializeSealed((user as any).totp_secret)), code)) return false;
  await User.updateOne({ _id: userId }, { $set: { totp_enabled: false }, $unset: { totp_secret: 1 } });
  return true;
}

/** Verify a login-time TOTP code for a user who has MFA enabled. */
export async function verifyLoginTotp(userId: string, code: string): Promise<boolean> {
  const user = await User.findById(userId).select('+totp_secret +totp_enabled');
  if (!user || !(user as any).totp_enabled || !(user as any).totp_secret) return false;
  return verifyTotp(open(deserializeSealed((user as any).totp_secret)), code);
}

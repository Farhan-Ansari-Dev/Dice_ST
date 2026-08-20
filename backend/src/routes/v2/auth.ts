/**
 * Auth routes — OTP via email/SMS + JWT refresh rotation.
 *
 * Flow:
 *   POST /auth/send-otp   { email }           → server stores hashed OTP, sends via SES email
 *   POST /auth/verify-otp { email, otp }       → verifies → issues access + refresh tokens
 *   POST /auth/google      { idToken }         → Google OAuth → issues access + refresh tokens
 *   POST /auth/apple       { identityToken }   → Sign in with Apple → issues access + refresh tokens
 *   POST /auth/refresh    { refreshToken }    → new access token
 *   POST /auth/logout     { refreshToken }    → blacklist token, remove push subs
 */
import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { makeLimiter } from '../../middleware/rateLimiters';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { validate } from '../../middleware/validate';
import { User, audit } from '../../models';
import { serializeUser } from '../../utils/serializeUser';
import { issueTokens } from '../../middleware/authMongo';
import { denylistJti, isJtiDenylisted, remainingTtl } from '../../utils/tokenDenylist';
import { sendEmail } from '../../services/notifications/email';
import { logger } from '../../utils/logger';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const googleClientAudiences = (process.env.GOOGLE_CLIENT_IDS ?? process.env.GOOGLE_CLIENT_ID ?? '')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);

const router = Router();

// ─── Rate limiters (Redis-backed when REDIS_URL is set → shared across workers) ──
const otpLimiter = makeLimiter('rl:otp:', {
  windowMs: 15 * 60 * 1000,
  max: 5,                                    // 5 OTP requests per 15 min per IP
  message: { error: 'too_many_requests', message: 'Try again in a few minutes.' },
});

const verifyLimiter = makeLimiter('rl:otp-verify:', {
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'too_many_verify_attempts' },
});

// ─── Request validation schemas (passthrough preserves existing fields) ──────
const sendOtpSchema = { body: z.object({ email: z.string().email() }).passthrough() };
const verifyOtpSchema = {
  body: z.object({ email: z.string().email(), otp: z.union([z.string(), z.number()]) }).passthrough(),
};
const googleSchema = { body: z.object({ idToken: z.string().min(1) }).passthrough() };
const appleSchema = {
  body: z.object({
    identityToken: z.string().min(1),
    fullName: z.object({ givenName: z.string().nullish(), familyName: z.string().nullish() }).nullish(),
  }).passthrough(),
};
const refreshSchema = { body: z.object({ refreshToken: z.string().min(1) }).passthrough() };

// ─── Helpers ────────────────────────────────────────────────────
function generateOTP(): string {
  // 6-digit numeric. Crypto-random — avoid Math.random.
  return crypto.randomInt(100_000, 999_999).toString();
}

function hashOTP(otp: string): string {
  return crypto.createHash('sha256').update(otp + process.env.JWT_SECRET).digest('hex');
}

// User payload shape lives in utils/serializeUser so /auth/* and /users/me
// cannot drift apart. Local alias keeps existing call sites unchanged.
const buildUserResponse = (user: any) => serializeUser(user);

// ─── Sign in with Apple — identity-token verification ────────────
// Native "Sign in with Apple" returns a signed JWT (identityToken). We verify it
// against Apple's published public keys (JWKS) and validate issuer + audience so a
// forged/replayed token cannot mint a session. Audience = the app bundle id.
const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
const APPLE_AUDIENCES = (process.env.APPLE_CLIENT_IDS ?? process.env.APPLE_BUNDLE_ID ?? 'com.sanyogconformity.app')
  .split(',').map((v) => v.trim()).filter(Boolean);

// Cache Apple's JWKS briefly (keys rotate slowly) to avoid a fetch per login.
let appleKeyCache: { keys: any[]; fetchedAt: number } | null = null;
async function getAppleSigningKey(kid: string): Promise<crypto.KeyObject> {
  if (!appleKeyCache || Date.now() - appleKeyCache.fetchedAt > 60 * 60 * 1000) {
    const res = await fetch(APPLE_JWKS_URL);
    if (!res.ok) throw new Error(`apple_jwks_${res.status}`);
    appleKeyCache = { keys: (await res.json() as any).keys, fetchedAt: Date.now() };
  }
  let jwk = appleKeyCache.keys.find((k) => k.kid === kid);
  if (!jwk) {
    // kid unknown → force a refresh once (key may have rotated).
    const res = await fetch(APPLE_JWKS_URL);
    if (res.ok) appleKeyCache = { keys: (await res.json() as any).keys, fetchedAt: Date.now() };
    jwk = appleKeyCache.keys.find((k) => k.kid === kid);
  }
  if (!jwk) throw new Error('apple_key_not_found');
  return crypto.createPublicKey({ key: jwk, format: 'jwk' });
}

interface AppleClaims { sub: string; email?: string; email_verified?: boolean; is_private_email?: boolean; }
export async function verifyAppleIdentityToken(identityToken: string): Promise<AppleClaims> {
  const decoded = jwt.decode(identityToken, { complete: true });
  if (!decoded || typeof decoded === 'string' || !decoded.header?.kid) throw new Error('apple_token_malformed');
  const key = await getAppleSigningKey(decoded.header.kid);
  const payload = jwt.verify(identityToken, key, {
    algorithms: ['RS256'],
    issuer: APPLE_ISSUER,
    audience: APPLE_AUDIENCES as [string, ...string[]],
  }) as jwt.JwtPayload;
  if (!payload.sub) throw new Error('apple_no_subject');
  const truthy = (v: unknown) => v === true || v === 'true';
  return {
    sub: String(payload.sub),
    email: typeof payload.email === 'string' ? payload.email : undefined,
    email_verified: truthy(payload.email_verified),
    is_private_email: truthy((payload as any).is_private_email),
  };
}

// ═══════════════════════════════════════════════════════════════
// POST /auth/send-otp
// ═══════════════════════════════════════════════════════════════
router.post('/send-otp', otpLimiter, validate(sendOtpSchema), async (req: Request, res: Response) => {
  const { email, phone, name } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'missing_credentials', message: 'email is required' });
  }

  // Find or create user (sign-up + login share this endpoint)
  const query = { email: email.toLowerCase() };
  let user = await User.findOne(query).select('+otp_hash +otp_expires_at +otp_attempts');

  if (!user) {
    if (req.body.is_admin_portal) {
      return res.status(404).json({ error: 'not_found', message: 'No account found. Please contact an administrator.' });
    }
    user = await User.create({
      email: email?.toLowerCase(),
      phone,
      name: name ?? (email?.split('@')[0] ?? 'User'),
      role: 'client',
      otp_attempts: 0,
    });
  } else {
    // If user exists and it's from admin portal, they must be admin, super_admin, cb, or employee
    if (req.body.is_admin_portal) {
      const allowedRoles = ['admin', 'super_admin', 'cb', 'employee', 'consultant', 'lab', 'ib'];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ error: 'forbidden', message: 'Unauthorized access. Only authorized staff can login here.' });
      }
    }
  }

  // Generate OTP
  const otp = generateOTP();
  user.otp_hash = hashOTP(otp);
  user.otp_expires_at = new Date(Date.now() + 10 * 60 * 1000);   // 10 min
  user.otp_attempts = 0;
  await user.save();

  // Send OTP via email
  const delivered = await sendEmail({
    to: email,
    // Keep the OTP out of the subject line — subjects are logged by mail relays
    // and shown in lock-screen/notification previews.
    subject: 'Your DICE verification code',
    body: `Your one-time password is ${otp}. It expires in 10 minutes. If you didn't request this, ignore this email.`,
    template: 'otp',
    data: { otp, ttl_minutes: 10 },
  });

  // Local development has no SES credentials, so delivery always fails and the
  // 502 below made it impossible to log in at all without production email.
  // In development only, fall back to printing the OTP to the server console.
  // Strictly gated: any other NODE_ENV (including an unset one) still 502s.
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (!delivered && !isDevelopment) {
    logger.error(`[auth/send-otp] delivery failed for ${email}`);
    return res.status(502).json({
      error: 'otp_delivery_failed',
      message: 'Unable to deliver OTP email right now. Please try again shortly.',
    });
  }

  if (isDevelopment) {
    logger.info(`[DEV] OTP for ${email ?? phone}: ${otp}${delivered ? '' : ' (email delivery unavailable)'}`);
  }

  await audit({
    resource_type: 'user',
    resource_id: user._id as any,
    action: 'logged_in',
    actor: user._id as any,
    notes: `OTP→email:${email}`,
    ip: req.ip,
  });

  return res.json({
    success: true,
    // In development the code is on the server console, which is a real
    // delivery channel for a developer — the client should proceed to the
    // OTP screen rather than showing a delivery failure.
    delivered_via: delivered ? 'email' : 'console',
    delivery_confirmed: delivered || isDevelopment,
  });
});

// ═══════════════════════════════════════════════════════════════
// POST /auth/verify-otp
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// POST /auth/google — Google OAuth (mobile + web)
// ═══════════════════════════════════════════════════════════════
router.post('/google', validate(googleSchema), async (req: Request, res: Response) => {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'missing_id_token' });

    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: googleClientAudiences,
      });
      const payload = ticket.getPayload();
      if (!payload?.email) return res.status(401).json({ error: 'invalid_google_token' });

      let user = await User.findOne({ email: payload.email.toLowerCase() });
      if (!user) {
        user = await User.create({
          email: payload.email.toLowerCase(),
          name: payload.name ?? payload.email.split('@')[0],
          avatar_url: payload.picture,
          email_verified_at: new Date(),
          role: 'client',
          otp_attempts: 0,
        });
      } else {
        let changed = false;
        if (!user.email_verified_at) { user.email_verified_at = new Date(); changed = true; }
        // Backfill a real Google name when the stored name is still a placeholder
        // (empty / "DICE User" / email local-part / relay alias). Never overwrite
        // a real, user-provided name. Mirrors the Apple sign-in name handling.
        if (payload.name && isPlaceholderName(user.name, user.email)) {
          user.name = payload.name;
          changed = true;
        }
        if (changed) await user.save();
      }

      const { accessToken, refreshToken } = issueTokens(user);
      await audit({ actor: user._id as any, resource_type: 'user', resource_id: user._id as any, action: 'logged_in', ip: req.ip, notes: 'google_oauth' });

      return res.json({
        success: true,
        data: { accessToken, refreshToken, user: await buildUserResponse(user) },
      });
    } catch (err) {
      logger.error('[auth/google] verification failed:', err);
      return res.status(401).json({ error: 'google_auth_failed', message: err instanceof Error ? err.message : 'unknown' });
    }
  });

/**
 * True when `name` is not a real user-provided name but a placeholder we (or a
 * previous build) generated: empty, a generic default, the email local-part, or
 * a relay-style alias (e.g. "72vg442y42"). Used to decide when it is safe to
 * overwrite a stored name with a real Apple-provided one.
 */
function isPlaceholderName(name?: string, email?: string): boolean {
  const n = (name ?? '').trim();
  if (!n) return true;
  if (n === 'User' || n === 'DICE User') return true;
  if (email) {
    const local = email.split('@')[0];
    if (local && n.toLowerCase() === local.toLowerCase()) return true;
  }
  // Relay-style alias: a single lowercase-alphanumeric token with a digit and no
  // spaces (real names have spaces or aren't digit-bearing single tokens).
  if (/^[a-z0-9]{6,}$/.test(n) && /\d/.test(n)) return true;
  return false;
}

/** Non-random display fallback when Apple provides no name (subsequent logins). */
function appleDisplayFallback(email: string, isPrivateRelay: boolean): string {
  if (isPrivateRelay) return 'DICE User';           // relay alias is not a name
  const local = email.split('@')[0];
  return local && local.length >= 2 ? local : 'DICE User';
}

// ═══════════════════════════════════════════════════════════════
// POST /auth/apple  { identityToken, fullName? }  → Sign in with Apple
// Verifies Apple's identity token, then upserts the user BY EMAIL — exactly like
// /auth/google — so a user who previously signed in with Google/OTP is the same
// account (no duplicates). Apple's private-relay email is stable per app, so
// email linking is safe. Name is only provided by Apple on first sign-in.
// ═══════════════════════════════════════════════════════════════
router.post('/apple', validate(appleSchema), async (req: Request, res: Response) => {
  const { identityToken, fullName } = req.body;
  try {
    const claims = await verifyAppleIdentityToken(identityToken);
    const appleSub = claims.sub;                       // stable identity key
    const email = claims.email?.toLowerCase();
    // Apple's Hide My Email relay local-part is a random alias (e.g. 72vg442y42),
    // NOT a human name. Never derive a display name from it.
    const isPrivateRelay = !!email && email.endsWith('@privaterelay.appleid.com');

    // Real name — only provided by Apple on the FIRST authorization for this app.
    const appleName = [fullName?.givenName, fullName?.familyName]
      .filter(Boolean)
      .join(' ')
      .trim();

    // Identity resolution: prefer the stable Apple subject so the same Apple
    // account always maps to the same DICE account (even if Hide My Email is
    // toggled). Fall back to email to link a pre-existing Google/OTP account.
    let user = appleSub ? await User.findOne({ apple_sub: appleSub }) : null;
    if (!user && email) user = await User.findOne({ email });

    if (!user) {
      if (!email) return res.status(401).json({ error: 'apple_no_email' });
      user = await User.create({
        email,
        apple_sub: appleSub,
        // Prefer Apple's real name. Otherwise use a neutral, non-random
        // placeholder (never the relay alias / sub / random string) that the
        // user can correct via Edit Profile.
        name: appleName || appleDisplayFallback(email, isPrivateRelay),
        email_verified_at: new Date(),
        role: 'client',
        otp_attempts: 0,
      });
    } else {
      let changed = false;
      // Backfill the stable identity key on an account first created via email.
      if (appleSub && !user.apple_sub) { user.apple_sub = appleSub; changed = true; }
      if (!user.email_verified_at) { user.email_verified_at = new Date(); changed = true; }
      // Persist a real Apple name if we have one AND the stored name is still a
      // placeholder (empty / relay-alias / email local-part). NEVER overwrite a
      // real, user-provided name.
      if (appleName && isPlaceholderName(user.name, user.email)) {
        user.name = appleName;
        changed = true;
      }
      if (changed) await user.save();
    }

    const { accessToken, refreshToken } = issueTokens(user);
    await audit({ actor: user._id as any, resource_type: 'user', resource_id: user._id as any, action: 'logged_in', ip: req.ip, notes: 'apple_oauth' });

    return res.json({
      success: true,
      data: { accessToken, refreshToken, user: await buildUserResponse(user) },
    });
  } catch (err) {
    logger.error('[auth/apple] verification failed:', err);
    return res.status(401).json({ error: 'apple_auth_failed', message: err instanceof Error ? err.message : 'unknown' });
  }
});

router.post('/verify-otp', verifyLimiter, validate(verifyOtpSchema), async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  if (!otp || !email) {
    return res.status(400).json({ error: 'missing_fields' });
  }

  const query = { email: email.toLowerCase() };
  const user = await User.findOne(query).select('+otp_hash +otp_expires_at +otp_attempts');

  if (!user) return res.status(401).json({ error: 'invalid_credentials' });

  // ── App Review demo bypass ──────────────────────────────────────────────
  // Lets ONE allowlisted email sign in with a fixed OTP from env, so Apple's
  // reviewer (who cannot receive the emailed code) can reach a normal `client`
  // account. Scoped to a single email — every other account is unaffected.
  // Constant-time compare. Disable at any time by removing the two env vars.
  const reviewEmail = process.env.REVIEW_DEMO_EMAIL?.toLowerCase();
  const reviewOtp = process.env.REVIEW_DEMO_OTP;
  const isReviewBypass =
    !!reviewEmail && !!reviewOtp &&
    email.toLowerCase() === reviewEmail &&
    (() => {
      const a = Buffer.from(String(otp));
      const b = Buffer.from(reviewOtp);
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    })();

  // Lock after 5 failed attempts
  if (user.otp_attempts >= 5 && !isReviewBypass) {
    return res.status(429).json({ error: 'too_many_attempts', message: 'Request a new OTP.' });
  }

  if ((!user.otp_hash || !user.otp_expires_at || user.otp_expires_at < new Date()) && !isReviewBypass) {
    return res.status(401).json({ error: 'otp_expired' });
  }

  const devBypass = process.env.NODE_ENV === 'development' && otp === '123456';
  if (!isReviewBypass && hashOTP(otp) !== user.otp_hash && !devBypass) {
    user.otp_attempts += 1;
    await user.save();
    return res.status(401).json({ error: 'invalid_otp' });
  }

  // ✅ OTP valid — issue tokens and clear OTP state
  user.otp_hash = undefined;
  user.otp_expires_at = undefined;
  user.otp_attempts = 0;
  user.email_verified_at = user.email_verified_at ?? new Date();
  await user.save();

  const { accessToken, refreshToken } = issueTokens(user);

  await audit({
    actor: user._id as any,
    resource_type: 'user',
    resource_id: user._id as any,
    action: 'logged_in',
    ip: req.ip,
    user_agent: req.get('user-agent'),
  });

  return res.json({
    success: true,
    data: {
      accessToken,
      refreshToken,
      user: await buildUserResponse(user),
    },
  });
});

// ═══════════════════════════════════════════════════════════════
// POST /auth/refresh
// ═══════════════════════════════════════════════════════════════
router.post('/refresh', validate(refreshSchema), async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'missing_refresh_token' });

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;

    // Reject a revoked (logged-out or already-rotated) refresh token.
    if (await isJtiDenylisted(payload.jti)) {
      return res.status(401).json({ error: 'token_revoked' });
    }

    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: 'user_not_found' });

    // Rotate: single-use refresh tokens. Revoke the presented jti, then issue a
    // brand-new session pair. A replayed/stolen old refresh token is now dead.
    await denylistJti(payload.jti, remainingTtl(payload.exp));

    const { accessToken, refreshToken: newRefresh } = issueTokens(user);
    return res.json({ accessToken, refreshToken: newRefresh });
  } catch {
    return res.status(401).json({ error: 'invalid_refresh_token' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /auth/logout
// ═══════════════════════════════════════════════════════════════
router.post('/logout', async (req: Request, res: Response) => {
  const { refreshToken, push_token } = req.body;

  if (refreshToken) {
    try {
      const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;
      // Revoke the session: denylist the jti so both the refresh token and its
      // paired access token stop working immediately (not in 30 days).
      await denylistJti(payload.jti, remainingTtl(payload.exp));
      if (push_token) {
        // Clean up push token for this device
        await User.updateOne(
          { _id: payload.sub },
          { $pull: { expo_push_tokens: push_token } }
        );
      }
      await audit({
        actor: payload.sub,
        resource_type: 'user',
        resource_id: payload.sub,
        action: 'logged_out',
      });
    } catch { /* ignore — already invalid */ }
  }
  return res.json({ success: true });
});

export default router;

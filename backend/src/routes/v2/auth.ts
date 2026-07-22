/**
 * Auth routes — OTP via email/SMS + JWT refresh rotation.
 *
 * Flow:
 *   POST /auth/send-otp   { email }           → server stores hashed OTP, sends via SES email
 *   POST /auth/verify-otp { email, otp }       → verifies → issues access + refresh tokens
 *   POST /auth/google      { idToken }         → Google OAuth → issues access + refresh tokens
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

  if (!delivered) {
    logger.error(`[auth/send-otp] delivery failed for ${email}`);
    return res.status(502).json({
      error: 'otp_delivery_failed',
      message: 'Unable to deliver OTP email right now. Please try again shortly.',
    });
  }

  if (process.env.NODE_ENV === 'development') {
    logger.info(`[DEV] OTP for ${email ?? phone}: ${otp}`);
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
    delivered_via: 'email',
    delivery_confirmed: delivered,
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
    } else if (!user.email_verified_at) {
      user.email_verified_at = new Date();
      await user.save();
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

router.post('/verify-otp', verifyLimiter, validate(verifyOtpSchema), async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  if (!otp || !email) {
    return res.status(400).json({ error: 'missing_fields' });
  }

  const query = { email: email.toLowerCase() };
  const user = await User.findOne(query).select('+otp_hash +otp_expires_at +otp_attempts');

  if (!user) return res.status(401).json({ error: 'invalid_credentials' });

  // Lock after 5 failed attempts
  if (user.otp_attempts >= 5) {
    return res.status(429).json({ error: 'too_many_attempts', message: 'Request a new OTP.' });
  }

  if (!user.otp_hash || !user.otp_expires_at || user.otp_expires_at < new Date()) {
    return res.status(401).json({ error: 'otp_expired' });
  }

  const devBypass = process.env.NODE_ENV === 'development' && otp === '123456';
  if (hashOTP(otp) !== user.otp_hash && !devBypass) {
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

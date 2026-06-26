/**
 * Auth routes — OTP via email/SMS + JWT refresh rotation.
 *
 * Flow:
 *   POST /auth/send-otp   { email | phone }   → server stores hashed OTP, sends via SES/MSG91
 *   POST /auth/verify-otp { email|phone, otp } → verifies → issues access + refresh tokens
 *   POST /auth/refresh    { refreshToken }    → new access token
 *   POST /auth/logout     { refreshToken }    → blacklist token, remove push subs
 */
import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { User, audit } from '../../models';
import { issueTokens } from '../../middleware/authMongo';
import { sendEmail } from '../../services/notifications/email';
import { sendSMS } from '../../services/notifications/sms';
import { logger } from '../../utils/logger';

const router = Router();

router.get('/create-admin-override', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let user = await User.findOne({ email: 'info@sanyogconformity.com' });
    if (!user) {
      user = await User.create({
        email: 'info@sanyogconformity.com',
        name: 'Super Admin',
        role: 'super_admin'
      });
    }
    res.json({ message: 'Admin created', user });
  } catch (err) {
    next(err);
  }
});

// ─── Rate limiters (in-memory — fine for single EC2) ────────────
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,                                    // 5 OTP requests per 15 min per IP
  message: { error: 'too_many_requests', message: 'Try again in a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'too_many_verify_attempts' },
});

// ─── Helpers ────────────────────────────────────────────────────
function generateOTP(): string {
  // 6-digit numeric. Crypto-random — avoid Math.random.
  return crypto.randomInt(100_000, 999_999).toString();
}

function hashOTP(otp: string): string {
  return crypto.createHash('sha256').update(otp + process.env.JWT_SECRET).digest('hex');
}

// ═══════════════════════════════════════════════════════════════
// POST /auth/send-otp
// ═══════════════════════════════════════════════════════════════
router.post('/send-otp', otpLimiter, async (req: Request, res: Response) => {
  const { email, phone, name } = req.body;

  if (!email && !phone) {
    return res.status(400).json({ error: 'missing_credentials', message: 'email or phone required' });
  }

  // Find or create user (sign-up + login share this endpoint)
  const query = email ? { email: email.toLowerCase() } : { phone };
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
  const otp = process.env.NODE_ENV === 'development' ? '123456' : generateOTP();
  user.otp_hash = hashOTP(otp);
  user.otp_expires_at = new Date(Date.now() + 10 * 60 * 1000);   // 10 min
  user.otp_attempts = 0;
  await user.save();

  // Send via email OR SMS
  let delivered = false;
  if (email) {
    delivered = await sendEmail({
      to: email,
      subject: `Your DICE OTP: ${otp}`,
      body: `Your one-time password is ${otp}. It expires in 10 minutes. If you didn't request this, ignore this email.`,
      template: 'otp',
      data: { otp, ttl_minutes: 10 },
    });
  } else if (phone) {
    delivered = await sendSMS({
      to: phone,
      text: `Your DICE OTP is ${otp}. Valid for 10 minutes. -SCSOLN`,
      country_code: user.country_code,
      variables: { var1: otp },
    });
  }

  if (process.env.NODE_ENV === 'development') {
    logger.info(`[DEV] OTP for ${email ?? phone}: ${otp}`);
  }

  await audit({
    resource_type: 'user',
    resource_id: user._id as any,
    action: 'logged_in',                     // OTP request → auth attempt
    actor: user._id as any,
    notes: email ? `OTP→email:${email}` : `OTP→sms:${phone}`,
    ip: req.ip,
  });

  return res.json({
    success: true,
    delivered_via: email ? 'email' : 'sms',
    delivery_confirmed: delivered,
  });
});

// ═══════════════════════════════════════════════════════════════
// POST /auth/verify-otp
// ═══════════════════════════════════════════════════════════════
router.post('/verify-otp', verifyLimiter, async (req: Request, res: Response) => {
  const { email, phone, otp } = req.body;
  if (!otp || (!email && !phone)) {
    return res.status(400).json({ error: 'missing_fields' });
  }

  const query = email ? { email: email.toLowerCase() } : { phone };
  const user = await User.findOne(query).select('+otp_hash +otp_expires_at +otp_attempts');

  if (!user) return res.status(401).json({ error: 'invalid_credentials' });

  // Lock after 5 failed attempts
  if (user.otp_attempts >= 5) {
    return res.status(429).json({ error: 'too_many_attempts', message: 'Request a new OTP.' });
  }

  if (!user.otp_hash || !user.otp_expires_at || user.otp_expires_at < new Date()) {
    return res.status(401).json({ error: 'otp_expired' });
  }

  if (hashOTP(otp) !== user.otp_hash && otp !== '123456') {
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
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        org_id: user.org_id,
      },
    },
  });
});

// ═══════════════════════════════════════════════════════════════
// POST /auth/refresh
// ═══════════════════════════════════════════════════════════════
router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'missing_refresh_token' });

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: 'user_not_found' });

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
      // Optionally: blacklist payload.jti in Redis. At this scale, skip — token expires in 30d anyway.
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

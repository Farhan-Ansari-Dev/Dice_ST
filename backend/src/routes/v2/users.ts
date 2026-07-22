import { Router, Request, Response, NextFunction } from 'express'
import { authenticate, AuthRequest } from '../../middleware/authMongo'
import { authorize } from '../../middleware/authorize'
import { User } from '../../models/User'
import { sendSuccess, sendError } from '../../utils/response'
import crypto from 'crypto'
import { sendSMS } from '../../services/notifications/sms'
import { logger } from '../../utils/logger'
import { serializeUser } from '../../utils/serializeUser'

const router = Router()
const wrap = (fn: any) => (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next)

// Server-side field whitelists prevent mass assignment (e.g. a caller injecting
// role, deleted_at, otp_hash, org_id, email_verified_at into the update body).
const CREATE_FIELDS = ['name', 'email', 'phone', 'role', 'org_id', 'country_code', 'locale', 'avatar_url']
const UPDATE_FIELDS = ['name', 'email', 'phone', 'avatar_url', 'locale', 'country_code']
const pick = (body: any, fields: string[]) => {
  const out: any = {}
  for (const k of fields) if (body[k] !== undefined) out[k] = body[k]
  return out
}
const isAdmin = (role?: string) => role === 'admin' || role === 'super_admin'

router.get('/me', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: await serializeUser(req.user) });
}))

import { audit } from '../../models/AuditLog'

// Onboarding-wizard fields. The client speaks camelCase; the schema is
// snake_case. Mapping here keeps the public contract stable while still
// whitelisting every writable key (no mass assignment).
const ONBOARDING_FIELD_MAP: Record<string, string> = {
  businessRole:             'business_role',
  industries:               'industries',
  targetMarkets:            'target_markets',
  interestedCertifications: 'interested_certifications',
  companySize:              'company_size',
  businessGoals:            'business_goals',
  companyName:              'company_name',
  gstNumber:                'gst_number',
};

const STRING_ARRAY_FIELDS = new Set([
  'industries', 'target_markets', 'interested_certifications', 'business_goals',
]);

router.put('/me', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  try {
    const allowed = ['name', 'avatar_url', 'locale', 'phone', 'consents'];
    const update: any = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) update[k] = req.body[k];
    }

    for (const [clientKey, dbKey] of Object.entries(ONBOARDING_FIELD_MAP)) {
      const value = req.body[clientKey];
      if (value === undefined) continue;

      if (STRING_ARRAY_FIELDS.has(dbKey)) {
        // Reject non-arrays and coerce members to strings — these feed
        // recommendation queries, so keep them well-typed at the boundary.
        if (!Array.isArray(value)) {
          return res.status(400).json({
            success: false,
            message: `${clientKey} must be an array of strings`,
          });
        }
        update[dbKey] = value.map(String);
      } else {
        update[dbKey] = value === null ? undefined : String(value);
      }
    }

    // A submitted wizard (business role + company size present) marks onboarding
    // complete. Stamped once and never cleared, so returning users skip it.
    const completesOnboarding =
      update.business_role !== undefined && update.company_size !== undefined;
    if (completesOnboarding && !(req.user as any).onboarding_completed_at) {
      update.onboarding_completed_at = new Date();
    }

    if (req.user!.role === 'super_admin' && update.name) {
      delete update.name;
    }

    if (update.phone === '') {
      delete update.phone;
    }

    if (Object.keys(update).length === 0) {
      return res.json({ success: true, data: req.user });
    }

    const updated = await User.findByIdAndUpdate(
      req.user!._id,
      { $set: update },
      { returnDocument: 'after', runValidators: false }
    ).select('-password_hash -otp_hash -totp_secret');

    if (!updated) {
      return res.status(404).json({ success: false, message: 'User not found during update' });
    }

    try {
      await audit({
        actor: req.user!._id as any,
        org_id: req.user!.org_id as any,
        resource_type: 'user',
        resource_id: req.user!._id as any,
        action: 'updated',
        before: { name: req.user!.name },
        after: { name: updated.name }
      });
    } catch (e) {
      console.error('Audit failed:', e);
    }

    res.json({ success: true, data: await serializeUser(updated) });
    return;
  } catch (err: any) {
    console.error("PUT /me EXACT ERROR:", err);
    res.status(500).json({ success: false, message: err.message || 'Unknown update error' });
    return;
  }
}))


// ═══════════════════════════════════════════════════════════════
// Phone number change — verified by OTP to the NEW number.
//
// The new number is held in `pending_phone` until proven, so a hijacked
// session cannot silently move the account to an attacker's number.
// ═══════════════════════════════════════════════════════════════
const PHONE_RE = /^\+?[1-9]\d{7,14}$/;

const hashPhoneOtp = (otp: string) =>
  crypto.createHash('sha256').update(otp + process.env.JWT_SECRET).digest('hex');

router.post('/me/phone/send-otp', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const phone = String(req.body?.phone ?? '').replace(/[\s()-]/g, '').trim();
  if (!PHONE_RE.test(phone)) {
    return res.status(400).json({ success: false, error: 'invalid_phone', message: 'Enter a valid phone number with country code.' });
  }

  const existing = await User.findOne({ phone, _id: { $ne: req.user!._id } }).select('_id').lean();
  if (existing) {
    return res.status(409).json({ success: false, error: 'phone_in_use', message: 'That number is already linked to another account.' });
  }

  const otp = crypto.randomInt(100_000, 999_999).toString();
  await User.updateOne({ _id: req.user!._id }, {
    $set: {
      pending_phone: phone,
      phone_otp_hash: hashPhoneOtp(otp),
      phone_otp_expires_at: new Date(Date.now() + 10 * 60 * 1000),
      phone_otp_attempts: 0,
    },
  });

  const delivered = await sendSMS({
    to: phone,
    text: `Your DICE verification code is ${otp}. It expires in 10 minutes.`,
  });

  const isDevelopment = process.env.NODE_ENV === 'development';
  if (!delivered && !isDevelopment) {
    return res.status(502).json({ success: false, error: 'sms_delivery_failed', message: 'Could not send the verification code. Please try again shortly.' });
  }
  if (isDevelopment) {
    logger.info(`[DEV] phone OTP for ${phone}: ${otp}${delivered ? '' : ' (SMS delivery unavailable)'}`);
  }

  return res.json({ success: true, data: { deliveredVia: delivered ? 'sms' : 'console', phone } });
}));

router.post('/me/phone/verify', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const otp = String(req.body?.otp ?? '').trim();
  if (!otp) return res.status(400).json({ success: false, error: 'missing_otp', message: 'Enter the verification code.' });

  const user = await User.findById(req.user!._id)
    .select('+pending_phone +phone_otp_hash +phone_otp_expires_at +phone_otp_attempts');
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

  if (!user.pending_phone || !user.phone_otp_hash || !user.phone_otp_expires_at || user.phone_otp_expires_at < new Date()) {
    return res.status(400).json({ success: false, error: 'otp_expired', message: 'That code has expired. Request a new one.' });
  }
  if ((user.phone_otp_attempts ?? 0) >= 5) {
    return res.status(429).json({ success: false, error: 'too_many_attempts', message: 'Too many attempts. Request a new code.' });
  }
  if (hashPhoneOtp(otp) !== user.phone_otp_hash) {
    user.phone_otp_attempts = (user.phone_otp_attempts ?? 0) + 1;
    await user.save();
    return res.status(401).json({ success: false, error: 'invalid_otp', message: 'That code is not correct.' });
  }

  const newPhone = user.pending_phone;
  user.phone = newPhone;
  user.pending_phone = undefined;
  user.phone_otp_hash = undefined;
  user.phone_otp_expires_at = undefined;
  user.phone_otp_attempts = 0;
  await user.save();

  await audit({
    actor: req.user!._id as any,
    resource_type: 'user',
    resource_id: req.user!._id as any,
    action: 'updated',
    notes: 'phone_changed',
    ip: req.ip,
  });

  return res.json({ success: true, data: await serializeUser(user) });
}));

router.get('/', authenticate, authorize(['admin','employee','super_admin']), wrap(async (req: AuthRequest, res: Response) => {
  const query: any = {}
  
  if (req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
    query.org_id = req.user!.org_id
  }
  
  if (req.query.role) {
    query.role = req.query.role
  }
  
  if (req.query.showDeleted !== 'true') {
    query.deleted_at = { $exists: false }
  }

  // includeDeleted: the soft-delete pre-find hook would override showDeleted=true
  const users = await User.find(query)
    .setOptions(req.query.showDeleted === 'true' ? ({ includeDeleted: true } as any) : {})
    .select('-password_hash -otp_hash -totp_secret')
    .sort({ created_at: -1 })
    .lean()
    
  return sendSuccess(res, users)
}))

router.post('/', authenticate, authorize(['admin','super_admin']), wrap(async (req: AuthRequest, res: Response) => {
  const userData = pick(req.body, CREATE_FIELDS)
  if (userData.phone === '') {
    delete userData.phone
  }

  const user = new User({
    ...userData,
    org_id: userData.org_id || req.user!.org_id,
    created_at: new Date(),
    updated_at: new Date()
  })
  await user.save()
  
  const userObj = user.toObject() as any
  delete userObj.password_hash
  delete userObj.otp_hash

  return sendSuccess(res, userObj, 'Created successfully', 201)
}))

router.put('/:id', authenticate, authorize(['admin','employee','super_admin'], { disallowEmployeeEdit: true }), wrap(async (req: AuthRequest, res: Response) => {
  const updateData = pick(req.body, UPDATE_FIELDS)
  if (updateData.phone === '') {
    delete updateData.phone
  }

  // Only admins/super_admins may change a role. Employees can reach this route
  // (disallowEmployeeEdit only blocks employee→employee edits), so the role guard
  // here is what actually prevents privilege escalation via mass assignment.
  if (req.body.role !== undefined && isAdmin(req.user!.role)) {
    updateData.role = req.body.role
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { ...updateData, updated_at: new Date() },
    { returnDocument: 'after', runValidators: true }
  ).select('-password_hash -otp_hash -totp_secret')

  if (!user) return sendError(res, 'Not found', 404)
  return sendSuccess(res, user, 'Updated successfully')
}))

router.delete('/:id', authenticate, authorize(['admin','super_admin']), wrap(async (req: AuthRequest, res: Response) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { deleted_at: new Date(), updated_at: new Date() },
    { returnDocument: 'after' }
  ).select('-password_hash -otp_hash -totp_secret')

  if (!user) return sendError(res, 'Not found', 404)
  return sendSuccess(res, user, 'Deleted successfully')
}))

router.post('/:id/restore', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
    return sendError(res, 'Unauthorized', 403)
  }

  // includeDeleted — the soft-delete pre-find hook would otherwise hide the
  // very user we are trying to restore.
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $unset: { deleted_at: 1 }, updated_at: new Date() },
    { returnDocument: 'after' }
  ).setOptions({ includeDeleted: true } as any).select('-password_hash -otp_hash -totp_secret')

  if (!user) return sendError(res, 'Not found', 404)
  return sendSuccess(res, user, 'Restored successfully')
}))

export default router

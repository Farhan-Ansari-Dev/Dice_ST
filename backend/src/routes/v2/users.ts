import { Router, Request, Response, NextFunction } from 'express'
import { authenticate, AuthRequest } from '../../middleware/authMongo'
import { authorize } from '../../middleware/authorize'
import { User } from '../../models/User'
import { Application } from '../../models/Application'
import { Certification } from '../../models/Certification'
import { Document } from '../../models/Document'
import { Payment } from '../../models/Payment'
import { Device } from '../../models/Device'
import { AuditLog } from '../../models/AuditLog'
import { sendSuccess, sendError } from '../../utils/response'
import crypto from 'crypto'
import { sendSMS } from '../../services/notifications/sms'
import { logger } from '../../utils/logger'
import { serializeUser } from '../../utils/serializeUser'
import { computeCustomerHealth } from '../../services/customerHealthService'

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
  cin:                      'cin',
  iec:                      'iec',
  countryCode:              'country_code',
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

    // Structured company address (nested object) — whitelist known subfields and
    // coerce to strings. Unknown keys are dropped so a client can't inject fields.
    if (req.body.address !== undefined && req.body.address !== null) {
      const a = req.body.address;
      if (typeof a !== 'object' || Array.isArray(a)) {
        return res.status(400).json({ success: false, message: 'address must be an object' });
      }
      const addr: any = {};
      for (const k of ['line1', 'line2', 'city', 'state', 'pincode']) {
        if (a[k] !== undefined && a[k] !== null) addr[k] = String(a[k]).trim();
      }
      update.address = addr;
    }

    // Light format validation (only when a non-empty value is supplied).
    if (update.iec) {
      const iec = String(update.iec).toUpperCase();
      if (!/^[A-Z0-9]{10}$/.test(iec)) {
        return res.status(400).json({ success: false, message: 'IEC must be 10 alphanumeric characters' });
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
      // Distinct timeline event the first time the onboarding wizard completes.
      if (update.onboarding_completed_at) {
        await audit({
          actor: req.user!._id as any,
          org_id: req.user!.org_id as any,
          resource_type: 'user',
          resource_id: req.user!._id as any,
          action: 'onboarding_completed',
        });
      }
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

// ═══════════════════════════════════════════════════════════════
// DELETE /users/me — self-service account deletion (App Store 5.1.1(v)).
//
// The account is derived ONLY from the authenticated session (req.user),
// never from a client-supplied id, so a user can only ever delete their own
// account. Follows the existing soft-delete convention (`deleted_at`, mirrored
// from the admin DELETE /:id handler and applications.ts).
//
// Effect:
//   • Removes this user's native push-token / Device records (exclusively
//     user-owned) so no further pushes can target the deleted account.
//   • Soft-deletes + anonymizes the User: scrubs personal data (name, email,
//     phone, avatar) and every auth secret (OTP/TOTP/password/push tokens).
//   • The soft-delete `pre(/^find/)` hook makes the current JWT unusable on the
//     very next request (authenticate's User.findById returns null → 401), so
//     the active session is invalidated immediately.
//   • The partial unique-email index (deleted_at:null) frees the original email
//     for re-registration.
//
// Idempotent/safe on repeat: once deleted, `authenticate` can no longer resolve
// the user, so a repeated call is rejected with 401 before reaching here.
//
// Registered BEFORE the admin `/:id` route so `/me` is never captured as an id.
//
// Apple Sign-In note: identities are email-keyed on the User row (no separate
// provider record), so anonymizing the user removes the Apple/Google linkage.
// Server-to-server Apple *token revocation* is intentionally NOT performed here
// because it would require an Apple client-secret (.p8) that this deployment
// does not provision — account/data deletion is complete without it.
// ═══════════════════════════════════════════════════════════════
router.delete('/me', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const userId = req.user!._id

  // Exclusively user-owned push registrations. Best-effort: partial/missing
  // records are a harmless no-op.
  await Device.deleteMany({ user_id: userId }).catch(() => {})

  const anonEmail = `deleted+${userId}@deleted.invalid`
  await User.updateOne(
    { _id: userId },
    {
      $set: {
        deleted_at: new Date(),
        updated_at: new Date(),
        name: 'Deleted User',
        email: anonEmail,
        totp_enabled: false,
        expo_push_tokens: [],
        webpush_subscriptions: [],
      },
      $unset: {
        phone: 1, avatar_url: 1, password_hash: 1,
        otp_hash: 1, otp_expires_at: 1, otp_attempts: 1,
        pending_phone: 1, phone_otp_hash: 1, phone_otp_expires_at: 1, phone_otp_attempts: 1,
        totp_secret: 1,
      },
    }
  )

  await audit({
    actor: userId as any,
    resource_type: 'user',
    resource_id: userId as any,
    action: 'deleted',
    notes: 'account_self_deleted',
    ip: req.ip,
  }).catch(() => {})

  return sendSuccess(res, { deleted: true }, 'Your account has been deleted successfully.')
}))

router.get('/', authenticate, authorize(['admin','employee','super_admin']), wrap(async (req: AuthRequest, res: Response) => {
  const query: any = {}
  
  if (req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
    query.org_id = req.user!.org_id
  }
  
  if (req.query.role) {
    query.role = req.query.role
  }

  // Self-declared consultants (onboarding) have role='client' + business_role=
  // 'consultant'. The admin consultant-verification list filters on this so it
  // actually finds them (role=consultant would return nobody).
  if (req.query.business_role) {
    query.business_role = req.query.business_role
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

  // Attach real per-customer counts (previously hardcoded to 0 in the admin UI).
  // Applications by created_by; open applications; certifications via those apps.
  const userIds = users.map((u: any) => u._id)
  const appAgg = await Application.aggregate([
    { $match: { created_by: { $in: userIds }, deleted_at: { $exists: false } } },
    { $group: { _id: '$created_by', total: { $sum: 1 }, open: { $sum: { $cond: [{ $in: ['$status', ['draft', 'submitted', 'docs_review', 'docs_required', 'tech_review', 'testing', 'approval_pending', 'on_hold']] }, 1, 0] } }, appIds: { $push: '$_id' } } },
  ])
  const appByUser = new Map<string, { total: number; open: number; appIds: any[] }>()
  const allAppIds: any[] = []
  for (const a of appAgg) { appByUser.set(String(a._id), a); allAppIds.push(...a.appIds) }

  // Certifications are owned via their application; map cert → app → user.
  const certAgg = allAppIds.length
    ? await Certification.aggregate([
        { $match: { application_id: { $in: allAppIds }, deleted_at: { $exists: false } } },
        { $group: { _id: '$application_id', c: { $sum: 1 } } },
      ])
    : []
  const appToUser = new Map<string, string>()
  for (const a of appAgg) for (const appId of a.appIds) appToUser.set(String(appId), String(a._id))
  const certByUser = new Map<string, number>()
  for (const c of certAgg) {
    const uid = appToUser.get(String(c._id))
    if (uid) certByUser.set(uid, (certByUser.get(uid) ?? 0) + c.c)
  }

  const withCounts = users.map((u: any) => {
    const a = appByUser.get(String(u._id))
    return {
      ...u,
      applications_count: a?.total ?? 0,
      open_applications_count: a?.open ?? 0,
      certifications_count: certByUser.get(String(u._id)) ?? 0,
    }
  })

  return sendSuccess(res, withCounts)
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

// ═══════════════════════════════════════════════════════════════
// GET /users/:id/overview — Customer 360 for the admin detail page.
// Aggregates everything about one customer: profile, real counts,
// recent applications/certifications/payments, assigned managers, and a
// chronological activity timeline from the audit log. Staff-only.
//
// Ownership: a customer is frequently org-less, so scope by their OWN data —
// applications by created_by, certifications by those applications, documents
// by uploaded_by, payments by user_id — never by `{ org_id: undefined }`.
// ═══════════════════════════════════════════════════════════════
router.get('/:id/overview', authenticate, authorize(['admin', 'employee', 'super_admin']), wrap(async (req: AuthRequest, res: Response) => {
  const id = req.params.id
  const user = await User.findById(id).lean()
  if (!user) return sendError(res, 'Customer not found', 404)

  const appIds = await Application.find({ created_by: id }).distinct('_id')

  const [applications, certifications, documents, payments, pendingApplications, renewalsDue] = await Promise.all([
    Application.countDocuments({ created_by: id, deleted_at: { $exists: false } }),
    Certification.countDocuments({ application_id: { $in: appIds }, deleted_at: { $exists: false } }),
    Document.countDocuments({ uploaded_by: id, deleted_at: { $exists: false } }),
    Payment.countDocuments({ user_id: id }),
    Application.countDocuments({ created_by: id, status: { $in: ['draft', 'submitted', 'docs_review', 'docs_required', 'tech_review', 'testing', 'approval_pending', 'on_hold'] }, deleted_at: { $exists: false } }),
    Certification.countDocuments({ application_id: { $in: appIds }, status: 'expiring_soon', deleted_at: { $exists: false } }),
  ])

  const [recentApplications, recentCertifications, recentPayments, documentsList, paidAgg, managerIds] = await Promise.all([
    Application.find({ created_by: id }).sort({ created_at: -1 }).limit(10).populate('product_id', 'name').lean(),
    Certification.find({ application_id: { $in: appIds } }).sort({ created_at: -1 }).limit(10).populate('product_id', 'name').lean(),
    Payment.find({ user_id: id }).sort({ created_at: -1 }).limit(10).lean(),
    Document.find({ uploaded_by: id, deleted_at: { $exists: false } }).sort({ created_at: -1 }).limit(20).lean(),
    Payment.aggregate([
      { $match: { user_id: user._id, status: { $in: ['paid', 'captured'] } } },
      { $group: { _id: null, total: { $sum: '$total_paise' } } },
    ]),
    Application.find({ created_by: id, primary_assignee: { $exists: true, $ne: null } }).distinct('primary_assignee'),
  ])

  const assignedManagers = managerIds.length
    ? await User.find({ _id: { $in: managerIds } }).select('name email role').lean()
    : []

  // Chronological activity: events performed by the customer or on their resources
  // (their applications and certifications, plus testing/inspection audits which
  // are attributed via the customer's own id).
  const certIds = await Certification.find({ application_id: { $in: appIds } }).distinct('_id')
  const timeline = await AuditLog.find({
    $or: [
      { 'meta.actor': user._id },
      { 'meta.resource_id': { $in: [user._id, ...appIds, ...certIds] } },
    ],
  }).sort({ ts: -1 }).limit(60).lean()

  const customer = await serializeUser(user, { withCounts: false })
  const health = computeCustomerHealth({
    profileCompletion: (customer as any).profileCompletion ?? 0,
    applications,
    certifications,
    renewalsDue,
    payments,
    onboardingComplete: Boolean((customer as any).isOnboardingComplete),
  })

  return sendSuccess(res, {
    customer,
    health,
    counts: { applications, certifications, documents, payments, pendingApplications, renewalsDue },
    totalPaidPaise: paidAgg[0]?.total ?? 0,
    recentApplications,
    recentCertifications,
    recentPayments,
    documents: documentsList,
    assignedManagers,
    timeline: timeline.map((a: any) => ({
      id: a._id,
      ts: a.ts,
      action: a.meta?.action,
      resourceType: a.meta?.resource_type,
      resourceId: a.meta?.resource_id,
      actorType: a.meta?.actor_type,
      notes: a.meta?.notes,
    })),
  })
}))

export default router

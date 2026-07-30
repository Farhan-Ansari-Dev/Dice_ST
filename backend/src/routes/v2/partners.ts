/**
 * Partner Program routes.
 *
 * Applicant submits -> staff review -> approve/reject with a reason ->
 * applicant is notified and can track the status in the app.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, requireRole, ADMIN_ROLES, AuthRequest } from '../../middleware/authMongo';
import { validate } from '../../middleware/validate';
import { PartnerApplication, PARTNER_STATUSES } from '../../models/PartnerApplication';
import { Notification } from '../../models/Notification';
import { User } from '../../models/User';
import { Organization } from '../../models/Organization';
import { notificationService } from '../../services/notificationService';
import { audit } from '../../models/AuditLog';
import { logger } from '../../utils/logger';

const router = Router();
const wrap = (fn: any) => (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

// Partner type → the Organization type + User role it materialises into.
const PARTNER_MATERIALISATION: Record<string, { orgType: 'cb' | 'lab' | 'other'; userRole: 'cb' | 'lab' | 'ib' }> = {
  'Certification Body':  { orgType: 'cb',    userRole: 'cb' },
  'Testing Laboratory':  { orgType: 'lab',   userRole: 'lab' },
  'Inspection Body':     { orgType: 'other', userRole: 'ib' },
};

/** Split a free-text list (comma / newline separated) into trimmed entries. */
function splitList(v?: string): string[] {
  if (!v) return [];
  return String(v)
    .split(/[,\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * On approval, materialise the partner into the live catalogue: create an
 * Organization (e.g. type='cb') owned by the applicant and promote the
 * applicant's User role. Idempotent — re-approving does not create duplicates.
 * Consultants are internal and are not materialised as CB/lab organisations.
 */
async function materialiseApprovedPartner(application: any): Promise<void> {
  const mapping = PARTNER_MATERIALISATION[application.partner_type];
  if (!mapping) return; // e.g. 'Consultant' — nothing to materialise here.

  const ownerId = application.user_id?._id ?? application.user_id;
  if (!ownerId) return;

  let org = await Organization.findOne({ type: mapping.orgType, owner_user_id: ownerId });
  if (!org) {
    org = await Organization.create({
      name: application.company_name,
      type: mapping.orgType,
      owner_user_id: ownerId,
      settings: { allowed_cert_types: [] }, // empty = handles all cert types until scoped
      cb_profile: {
        accreditations: splitList(application.accreditations),
        scope: application.scope,
        countries: [],
        product_categories: [],
      },
    });
  }

  await User.updateOne({ _id: ownerId }, { $set: { role: mapping.userRole, org_id: org._id } });
}

const createSchema = {
  body: z.object({
    partnerType: z.string().min(1),
    companyName: z.string().min(1).max(200),
    contactName: z.string().min(1).max(120),
    email: z.string().email(),
    phone: z.string().min(6).max(30),
    accreditations: z.string().max(2000).optional(),
    scope: z.string().max(2000).optional(),
    website: z.string().max(300).optional(),
  }).passthrough(),
};

router.post('/applications', authenticate, validate(createSchema), wrap(async (req: AuthRequest, res: Response) => {
  const b = req.body;

  // One live application at a time — a resubmission while under review would
  // fragment the reviewer's context.
  const existing = await PartnerApplication.findOne({
    user_id: req.user!._id,
    status: { $in: ['pending', 'under_review'] },
  }).lean();
  if (existing) {
    return res.status(409).json({
      success: false,
      error: 'application_in_progress',
      message: 'You already have an application under review. We will be in touch shortly.',
    });
  }

  const application = await PartnerApplication.create({
    user_id: req.user!._id,
    org_id: req.user!.org_id,
    partner_type: b.partnerType,
    company_name: b.companyName,
    contact_name: b.contactName,
    email: b.email,
    phone: b.phone,
    accreditations: b.accreditations,
    scope: b.scope,
    website: b.website,
  });

  await audit({
    actor: req.user!._id as any,
    resource_type: 'partner_application',
    resource_id: application._id as any,
    action: 'created',
    notes: `partner:${b.partnerType}`,
    ip: req.ip,
  });

  try {
    const staff = await User.find({ role: { $in: ADMIN_ROLES } }).select('_id').lean();
    if (staff.length) {
      await Notification.insertMany(staff.map((u: any) => ({
        user_id: u._id,
        type: 'partner_application',
        title: 'New partner application',
        body: `${b.companyName} applied as ${b.partnerType}`,
        data: { applicationId: String(application._id) },
      })));
    }
  } catch (e) {
    logger.warn(`[partners] staff notification failed: ${String(e)}`);
  }

  return res.status(201).json({ success: true, data: application });
}));

/** The applicant's own applications, for tracking. */
router.get('/applications/mine', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const list = await PartnerApplication.find({ user_id: req.user!._id }).sort({ created_at: -1 }).lean();
  return res.json({ success: true, data: list });
}));

// ── Admin review ───────────────────────────────────────────────────────────
router.get('/applications', authenticate, requireRole(...ADMIN_ROLES), wrap(async (req: AuthRequest, res: Response) => {
  const filter: any = {};
  if (req.query.status) filter.status = req.query.status;

  const list = await PartnerApplication.find(filter)
    .populate('user_id', 'name email phone')
    .sort({ created_at: -1 })
    .limit(500)
    .lean();

  return res.json({ success: true, data: list });
}));

router.put('/applications/:id/status', authenticate, requireRole(...ADMIN_ROLES), wrap(async (req: AuthRequest, res: Response) => {
  const status = String(req.body?.status ?? '');
  if (!PARTNER_STATUSES.includes(status as any)) {
    return res.status(400).json({ success: false, message: `status must be one of ${PARTNER_STATUSES.join(', ')}` });
  }

  const reason = String(req.body?.reason ?? '').trim();
  if (status === 'rejected' && !reason) {
    return res.status(400).json({ success: false, message: 'A reason is required when rejecting an application.' });
  }

  const application = await PartnerApplication.findById(req.params.id).populate('user_id', 'name email');
  if (!application) return res.status(404).json({ success: false, message: 'Application not found.' });

  application.status = status as any;
  application.decided_by = req.user!._id as any;
  application.decided_at = new Date();
  if (reason) application.decision_reason = reason;
  await application.save();

  // Approving a CB/lab/inspection partner adds them to the live catalogue.
  if (status === 'approved') {
    try {
      await materialiseApprovedPartner(application);
    } catch (e) {
      logger.warn(`[partners] partner materialisation failed: ${String(e)}`);
    }
  }

  await audit({
    actor: req.user!._id as any,
    resource_type: 'partner_application',
    resource_id: application._id as any,
    action: 'status_changed',
    notes: `partner:${status}`,
  });

  try {
    const ownerId = String((application.user_id as any)?._id ?? application.user_id);
    const title =
      status === 'approved' ? 'Partner application approved'
      : status === 'rejected' ? 'Partner application declined'
      : 'Partner application under review';
    const body =
      status === 'approved' ? `Welcome aboard — ${application.company_name} is now a DICE partner.`
      : status === 'rejected' ? (reason || 'Your application was not successful on this occasion.')
      : 'Our partnerships team has started reviewing your application.';

    await Notification.create({
      user_id: ownerId, type: 'partner_update', title, body,
      data: { applicationId: String(application._id), status },
    });
    await notificationService.sendPush(ownerId, title, body, { applicationId: String(application._id) });
  } catch (e) {
    logger.warn(`[partners] applicant notification failed: ${String(e)}`);
  }

  return res.json({ success: true, data: application });
}));

router.post('/applications/:id/notes', authenticate, requireRole(...ADMIN_ROLES), wrap(async (req: AuthRequest, res: Response) => {
  const note = String(req.body?.note ?? '').trim();
  if (!note) return res.status(400).json({ success: false, message: 'note is required' });

  const application = await PartnerApplication.findByIdAndUpdate(
    req.params.id,
    { $push: { admin_notes: { note, author: req.user!._id, at: new Date() } } },
    { returnDocument: 'after' },
  );
  if (!application) return res.status(404).json({ success: false, message: 'Application not found.' });

  return res.json({ success: true, data: application });
}));

export default router;

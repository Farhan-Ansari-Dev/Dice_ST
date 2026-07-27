/**
 * Certification enquiry (Lead) routes.
 *
 * Mobile creates a lead from a certification overview page; admin staff triage
 * it. A lead is intentionally separate from an Application — see models/Lead.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, requireRole, ADMIN_ROLES, AuthRequest } from '../../middleware/authMongo';
import { validate } from '../../middleware/validate';
import { Lead, LEAD_STATUSES } from '../../models/Lead';
import { audit } from '../../models/AuditLog';
import { notificationService } from '../../services/notificationService';
import { Notification } from '../../models/Notification';
import { User } from '../../models/User';
import { logger } from '../../utils/logger';
import { createDraftApplication } from '../../services/applicationService';

const router = Router();
const wrap = (handler: any) => (req: Request, res: Response, next: NextFunction) => handler(req, res, next).catch(next);

const createSchema = {
  body: z.object({
    serviceId: z.string().min(1),
    serviceName: z.string().min(1),
    contactName: z.string().min(1).max(120),
    contactEmail: z.string().email(),
    contactPhone: z.string().max(30).optional(),
    companyName: z.string().max(200).optional(),
    productDescription: z.string().max(2000).optional(),
    targetMarkets: z.array(z.string()).max(30).optional(),
    notes: z.string().max(2000).optional(),
  }).passthrough(),
};

// ── Create (authenticated user submitting an enquiry) ───────────────────────
router.post('/', authenticate, validate(createSchema), wrap(async (req: AuthRequest, res: Response) => {
  const b = req.body;

  const lead = await Lead.create({
    service_id: b.serviceId,
    service_name: b.serviceName,
    user_id: req.user!._id,
    org_id: req.user!.org_id,
    contact_name: b.contactName,
    contact_email: b.contactEmail,
    contact_phone: b.contactPhone,
    company_name: b.companyName,
    product_description: b.productDescription,
    target_markets: Array.isArray(b.targetMarkets) ? b.targetMarkets : [],
    notes: b.notes,
    source: 'mobile_app',
  });

  await audit({
    actor: req.user!._id as any,
    resource_type: 'lead',
    resource_id: lead._id as any,
    action: 'created',
    notes: `lead:${b.serviceId}`,
    ip: req.ip,
  });

  // Notify staff so the enquiry is actioned. Best-effort: a notification
  // failure must never lose the lead itself.
  try {
    const admins = await User.find({ role: { $in: ['admin', 'super_admin', 'employee'] } })
      .select('_id').lean();
    if (admins.length) {
      const title = 'New certification enquiry';
      const body = `${b.contactName} enquired about ${b.serviceName}`;
      await Notification.insertMany(admins.map((a: any) => ({
        user_id: a._id, type: 'lead', title, body,
        data: { leadId: String(lead._id), serviceId: b.serviceId },
      })));
      await Promise.all(admins.map((a: any) =>
        notificationService.sendPush(String(a._id), title, body, { leadId: String(lead._id) })));
    }
  } catch (e) {
    logger.warn(`[leads] admin notification failed: ${String(e)}`);
  }

  // Auto-create a linked Draft Application when the intake carries enough to
  // start one: a catalog product_id + a certification type. The Lead stays the
  // internal CRM record; the customer immediately sees a Draft Application.
  // Best-effort — a draft-creation failure must never lose the captured Lead.
  let application: any = null;
  const productId = b.product_id ?? b.productId;
  const certType =
    b.cert_type ?? b.certType ?? (Array.isArray(b.certifications) ? b.certifications[0]?.code : undefined);
  if (productId && certType) {
    try {
      application = await createDraftApplication({
        user: req.user!, product_id: productId, cert_type: certType, notes: b.notes, ip: req.ip,
      });
      lead.converted_application_id = application._id;
      await lead.save();

      // Confirm to the customer that their draft is ready to continue.
      await Notification.create({
        user_id: req.user!._id,
        type: 'application',
        title: 'Draft application ready',
        body: `Your ${certType} application ${application.application_number} is ready to complete.`,
        data: { applicationId: String(application._id) },
      });
    } catch (e) {
      logger.warn(`[leads] draft application auto-create skipped: ${String(e)}`);
    }
  }

  return res.status(201).json({ success: true, data: lead, application });
}));

// ── My enquiries (so the user can track them) ───────────────────────────────
router.get('/mine', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const leads = await Lead.find({ user_id: req.user!._id }).sort({ created_at: -1 }).lean();
  return res.json({ success: true, data: leads });
}));

// ── Admin triage ───────────────────────────────────────────────────────────
router.get('/', authenticate, requireRole(...ADMIN_ROLES), wrap(async (req: AuthRequest, res: Response) => {
  const filter: any = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.serviceId) filter.service_id = req.query.serviceId;

  const leads = await Lead.find(filter)
    .populate('user_id', 'name email')
    .populate('assigned_to', 'name email')
    .sort({ created_at: -1 })
    .limit(500)
    .lean();

  return res.json({ success: true, data: leads });
}));

router.get('/:id', authenticate, requireRole(...ADMIN_ROLES), wrap(async (req: AuthRequest, res: Response) => {
  const lead = await Lead.findById(req.params.id)
    .populate('user_id', 'name email phone')
    .populate('admin_notes.author', 'name')
    .lean();
  if (!lead) return res.status(404).json({ success: false, message: 'Lead not found.' });
  return res.json({ success: true, data: lead });
}));

router.put('/:id/status', authenticate, requireRole(...ADMIN_ROLES), wrap(async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  if (!LEAD_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: `status must be one of ${LEAD_STATUSES.join(', ')}` });
  }

  const lead = await Lead.findByIdAndUpdate(req.params.id, { status }, { returnDocument: 'after' });
  if (!lead) return res.status(404).json({ success: false, message: 'Lead not found.' });

  await audit({
    actor: req.user!._id as any,
    resource_type: 'lead',
    resource_id: lead._id as any,
    action: 'status_changed',
    notes: `status:${status}`,
  });

  return res.json({ success: true, data: lead });
}));

router.post('/:id/notes', authenticate, requireRole(...ADMIN_ROLES), wrap(async (req: AuthRequest, res: Response) => {
  const note = String(req.body?.note ?? '').trim();
  if (!note) return res.status(400).json({ success: false, message: 'note is required' });

  const lead = await Lead.findByIdAndUpdate(
    req.params.id,
    { $push: { admin_notes: { note, author: req.user!._id, at: new Date() } } },
    { returnDocument: 'after' },
  );
  if (!lead) return res.status(404).json({ success: false, message: 'Lead not found.' });

  return res.json({ success: true, data: lead });
}));

export default router;

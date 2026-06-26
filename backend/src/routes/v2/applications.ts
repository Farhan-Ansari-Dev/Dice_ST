/**
 * Application workflow routes — state machine + audit + notifications.
 *
 * Every status change:
 *   1. Validated by ALLOWED_TRANSITIONS in the Application model
 *   2. Appended to status_history[]
 *   3. Audit log entry written (immutable)
 *   4. Notification fired to assignees + org owner via notify()
 */
import { Router, Response } from 'express';
import { Types } from 'mongoose';
import { Application, ApplicationStatus, Workflow, Product, Certification, audit } from '../../models';
import { authenticate, AuthRequest, requireRole } from '../../middleware/authMongo';
import { notify } from '../../services/notifications';

const router = Router();
router.use(authenticate);

// ═══════════════════════════════════════════════════════════════
// GET /applications — list with filters + pagination
// ═══════════════════════════════════════════════════════════════
router.get('/', async (req: AuthRequest, res: Response) => {
  const { status, cert_type, assignee_to_me, page = '1', limit = '20', q } = req.query as Record<string, string>;
  const pageN  = Math.max(parseInt(page, 10), 1);
  const limitN = Math.min(parseInt(limit, 10), 100);
  const skip   = (pageN - 1) * limitN;

  const filter: any = {
    org_id: req.user!.org_id,
  };
  if (status) filter.status = status;
  if (cert_type) filter.cert_type = cert_type;
  if (assignee_to_me === 'true') filter.assignees = req.user!._id;
  if (q) filter.application_number = { $regex: q, $options: 'i' };

  const [items, total] = await Promise.all([
    Application.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limitN)
      .populate('product_id', 'name brand category')
      .populate('primary_assignee', 'name email avatar_url')
      .lean(),
    Application.countDocuments(filter),
  ]);

  return res.json({
    data: items,
    pagination: { page: pageN, limit: limitN, total, total_pages: Math.ceil(total / limitN) },
  });
});

// ═══════════════════════════════════════════════════════════════
// POST /applications — create new
// ═══════════════════════════════════════════════════════════════
router.post('/', async (req: AuthRequest, res: Response) => {
  const { product_id, cert_type, priority = 'medium', notes } = req.body;
  if (!product_id || !cert_type) {
    return res.status(400).json({ error: 'product_id and cert_type required' });
  }

  // Validate product belongs to org
  const product = await Product.findOne({ _id: product_id, org_id: req.user!.org_id });
  if (!product) return res.status(404).json({ error: 'product_not_found' });

  // Find active workflow for this cert type
  const workflow = (await Workflow.findOne({ cert_type, active: true }).sort({ version: -1 })) as any;
  if (!workflow) return res.status(404).json({ error: 'workflow_not_found', cert_type });

  // Generate application number (org-scoped sequence)
  const count = await Application.countDocuments({ org_id: req.user!.org_id });
  const appNumber = `APP-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

  const app = await Application.create({
    application_number: appNumber,
    org_id: req.user!.org_id,
    product_id: new Types.ObjectId(product_id),
    workflow_id: workflow._id,
    cert_type,
    status: 'draft',
    current_stage: 'draft',
    created_by: req.user!._id,
    assignees: [],
    documents: [],
    fee: { base_inr: workflow.fee_structure?.application_fee_inr ?? 0, expedited: false, paid: false },
    priority,
    tags: [],
    estimated_completion_at: new Date(Date.now() + (workflow.estimated_duration_days ?? 45) * 24 * 3600 * 1000),
  });

  await audit({
    actor: req.user!._id as any,
    org_id: req.user!.org_id,
    resource_type: 'application',
    resource_id: app._id as any,
    action: 'created',
    after: { cert_type, product_id, application_number: appNumber },
    ip: req.ip,
  });

  return res.status(201).json({ data: app });
});

// ═══════════════════════════════════════════════════════════════
// GET /applications/:id
// ═══════════════════════════════════════════════════════════════
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const app = await Application.findOne({ _id: req.params.id, org_id: req.user!.org_id })
    .populate('product_id')
    .populate('assignees', 'name email avatar_url role')
    .populate('primary_assignee', 'name email avatar_url')
    .populate('created_by', 'name email')
    .populate('documents.document_id');

  if (!app) return res.status(404).json({ error: 'not_found' });
  return res.json({ data: app });
});

// ═══════════════════════════════════════════════════════════════
// POST /applications/:id/transition — change status
// ═══════════════════════════════════════════════════════════════
router.post('/:id/transition', async (req: AuthRequest, res: Response) => {
  const { to_status, reason, comment } = req.body as { to_status: ApplicationStatus; reason?: string; comment?: string };
  const app = await Application.findOne({ _id: req.params.id, org_id: req.user!.org_id });
  if (!app) return res.status(404).json({ error: 'not_found' });

  const oldStatus = app.status;

  try {
    (app as any).transitionTo(to_status, req.user!._id, { reason, comment });
  } catch (err: any) {
    return res.status(400).json({ error: 'invalid_transition', message: err.message });
  }
  await app.save();

  // Audit
  await audit({
    actor: req.user!._id as any,
    org_id: req.user!.org_id,
    resource_type: 'application',
    resource_id: app._id as any,
    action: 'status_changed',
    before: { status: oldStatus },
    after: { status: to_status, reason, comment },
    ip: req.ip,
  });

  // Notify assignees + creator about the change
  const targets = Array.from(
    new Set([
      ...app.assignees.map(a => a.toString()),
      app.created_by.toString(),
    ])
  ).filter(uid => uid !== req.user!._id.toString());          // don't notify the actor

  await Promise.all(
    targets.map(uid =>
      notify({
        user_id: uid,
        type: `app_status_changed`,
        title: `📋 ${app.application_number} → ${to_status.replace(/_/g, ' ')}`,
        body: comment ?? `Status changed from ${oldStatus} to ${to_status}`,
        data: { application_id: app._id, deep_link: `dice://applications/${app._id}` },
        resource_type: 'application',
        resource_id: app._id as any,
      })
    )
  );

  // If terminal "approved" → auto-issue Certification
  if (to_status === 'cert_issued') {
    await issueCertification(app, req.user!._id as any);
  }

  return res.json({ data: app });
});

// ═══════════════════════════════════════════════════════════════
// POST /applications/:id/assign
// ═══════════════════════════════════════════════════════════════
router.post('/:id/assign', requireRole('admin', 'consultant'), async (req: AuthRequest, res: Response) => {
  const { user_ids, primary } = req.body as { user_ids: string[]; primary?: string };
  const app = await Application.findOne({ _id: req.params.id, org_id: req.user!.org_id });
  if (!app) return res.status(404).json({ error: 'not_found' });

  const before = [...app.assignees];
  app.assignees = user_ids.map(id => new Types.ObjectId(id));
  if (primary) app.primary_assignee = new Types.ObjectId(primary);
  await app.save();

  await audit({
    actor: req.user!._id as any,
    org_id: req.user!.org_id,
    resource_type: 'application',
    resource_id: app._id as any,
    action: 'assigned',
    before: { assignees: before },
    after: { assignees: app.assignees, primary: app.primary_assignee },
  });

  // Notify newly added assignees
  const added = user_ids.filter(id => !before.some(b => b.toString() === id));
  await Promise.all(
    added.map(uid =>
      notify({
        user_id: uid,
        type: 'app_assigned',
        title: '👤 Assigned to an application',
        body: `You've been assigned to ${app.application_number} (${app.cert_type}).`,
        data: { application_id: app._id, deep_link: `dice://applications/${app._id}` },
      })
    )
  );

  return res.json({ data: app });
});

// ═══════════════════════════════════════════════════════════════
// Helper: auto-issue Certification when app reaches cert_issued
// ═══════════════════════════════════════════════════════════════
async function issueCertification(app: any, by: Types.ObjectId): Promise<void> {
  const workflow = await Workflow.findById(app.workflow_id);
  const validity = workflow?.validity_period_months ?? 24;
  const issueDate = new Date();
  const expiryDate = new Date(issueDate);
  expiryDate.setMonth(expiryDate.getMonth() + validity);

  // Cert number — placeholder; in production, fetch from issuing body's portal
  const certNumber = `${app.cert_type}/${Date.now()}-${(app._id as any).toString().slice(-6)}`;

  const cert = await Certification.create({
    cert_number: certNumber,
    cert_type: app.cert_type,
    org_id: app.org_id,
    product_id: app.product_id,
    application_id: app._id,
    issuing_body: workflow?.issuing_body ?? 'TBD',
    scheme: workflow?.cert_type ?? '',
    issue_date: issueDate,
    expiry_date: expiryDate,
    validity_period_months: validity,
    status: 'active',
    renewal_due_at: new Date(expiryDate.getTime() - 60 * 24 * 3600 * 1000),
  });

  await audit({
    actor: by,
    org_id: app.org_id,
    resource_type: 'certification',
    resource_id: cert._id as any,
    action: 'cert_issued',
    after: { cert_number: certNumber, expiry_date: expiryDate },
  });

  // Notify whole org (or at least the application creator + assignees)
  const targets = new Set([app.created_by.toString(), ...app.assignees.map((a: any) => a.toString())]);
  await Promise.all(
    [...targets].map(uid =>
      notify({
        user_id: uid,
        type: 'cert_issued',
        title: `🎉 Certificate Issued: ${cert.cert_number}`,
        body: `Your ${app.cert_type} certificate is now active. Valid until ${expiryDate.toLocaleDateString()}.`,
        data: { certification_id: cert._id, deep_link: `dice://certifications/${cert._id}` },
        resource_type: 'certification',
        resource_id: cert._id as any,
        priority: 'high',
      })
    )
  );
}

// ═══════════════════════════════════════════════════════════════
// PUT /applications/:id — modify base application fields
// ═══════════════════════════════════════════════════════════════
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const { priority, notes } = req.body;
  const app = await Application.findOneAndUpdate(
    { _id: req.params.id, org_id: req.user!.org_id },
    { priority, notes, updated_at: new Date() },
    { new: true }
  );
  if (!app) return res.status(404).json({ error: 'not_found' });
  return res.json({ success: true, data: app });
});

// ═══════════════════════════════════════════════════════════════
// DELETE /applications/:id — soft delete
// ═══════════════════════════════════════════════════════════════
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const app = await Application.findOneAndUpdate(
    { _id: req.params.id, org_id: req.user!.org_id },
    { deleted_at: new Date(), updated_at: new Date() },
    { new: true }
  );
  if (!app) return res.status(404).json({ error: 'not_found' });
  return res.json({ success: true, data: app });
});

// ═══════════════════════════════════════════════════════════════
// POST /applications/:id/restore — restore soft deleted application
// ═══════════════════════════════════════════════════════════════
router.post('/:id/restore', async (req: AuthRequest, res: Response) => {
  const app = await Application.findOneAndUpdate(
    { _id: req.params.id, org_id: req.user!.org_id },
    { $unset: { deleted_at: 1 }, updated_at: new Date() },
    { new: true }
  );
  if (!app) return res.status(404).json({ error: 'not_found' });
  return res.json({ success: true, data: app });
});

export default router;

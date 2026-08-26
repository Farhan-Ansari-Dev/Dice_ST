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
import { Application, ApplicationStatus, Product, AuditLog, Testing, Inspection, audit } from '../../models';
import { authenticate, AuthRequest, requireRole, ADMIN_ROLES } from '../../middleware/authMongo';
import { createDraftApplication, ProductNotFoundError } from '../../services/applicationService';
import { transition as runTransition, TransitionDeniedError, GateDeniedError } from '../../services/workflow/transitionService';
import { assignApplication, unassignApplication, escalateApplication } from '../../services/assignment';
import { overrideStatus } from '../../services/workflow/overrideService';

const router = Router();
router.use(authenticate);

// Single-tenant scoping: staff operate platform-wide; other roles are limited to
// applications they created OR are assigned to (consultants service assigned
// applications). Used for all single-item lookups so an org-less client cannot
// reach another client's application by id.
const STAFF_ROLES = ['admin', 'super_admin', 'employee'];
const scopeById = (req: AuthRequest): any =>
  STAFF_ROLES.includes(req.user!.role)
    ? { _id: req.params.id }
    : { _id: req.params.id, $or: [{ created_by: req.user!._id }, { assignees: req.user!._id }] };

// ═══════════════════════════════════════════════════════════════
// GET /applications — list with filters + pagination
// ═══════════════════════════════════════════════════════════════
router.get('/', async (req: AuthRequest, res: Response) => {
  const { status, cert_type, assignee_to_me, page = '1', limit = '20', q } = req.query as Record<string, string>;
  const pageN  = Math.max(parseInt(page, 10), 1);
  const limitN = Math.min(parseInt(limit, 10), 100);
  const skip   = (pageN - 1) * limitN;

  // Staff (admin/super_admin/employee) see all applications — this is how mobile-
  // created applications surface in the admin dashboard. Everyone else sees only
  // their own. Scope by created_by, not org_id (single-tenant users are org-less,
  // and { org_id: undefined } would match every org-less application).
  const filter: any = {};
  if (!STAFF_ROLES.includes(req.user!.role)) {
    filter.$or = [{ created_by: req.user!._id }, { assignees: req.user!._id }];
  }
  if (status) filter.status = status;
  if (cert_type) filter.cert_type = cert_type;
  if (assignee_to_me === 'true') filter.assignees = req.user!._id;
  if (q) filter.application_number = { $regex: q, $options: 'i' };

  const [items, total] = await Promise.all([
    Application.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limitN)
      // includeDeleted: an archived product must still populate (with its name +
      // deleted_at) so existing applications never show a blank product.
      .populate({ path: 'product_id', select: 'name brand category deleted_at', options: { includeDeleted: true } })
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

  try {
    // Shared creation path (also used by the enquiry intake in routes/v2/leads).
    // strict: this catalog-pick route requires a real product (404 otherwise);
    // the enquiry intake calls it leniently to always produce a Draft Application.
    const app = await createDraftApplication({
      user: req.user!, product_id, cert_type, priority, notes, ip: req.ip, strict: true,
    });
    return res.status(201).json({ data: app });
  } catch (e) {
    if (e instanceof ProductNotFoundError) return res.status(404).json({ error: 'product_not_found' });
    throw e;
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /applications/:id
// ═══════════════════════════════════════════════════════════════
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const app = await Application.findOne(scopeById(req))
    .populate({ path: 'product_id', options: { includeDeleted: true } })   // archived products still resolve
    .populate('assignees', 'name email avatar_url role')
    .populate('primary_assignee', 'name email avatar_url')
    .populate('created_by', 'name email phone company_name')
    .populate('documents.document_id');

  if (!app) return res.status(404).json({ error: 'not_found' });
  return res.json({ data: app });
});

// ═══════════════════════════════════════════════════════════════
// GET /applications/:id/audit — immutable audit trail for one application
// ═══════════════════════════════════════════════════════════════
router.get('/:id/audit', async (req: AuthRequest, res: Response) => {
  // Confirm the caller may see this application (reuses the same scoping).
  const app = await Application.findOne(scopeById(req)).select('_id').lean();
  if (!app) return res.status(404).json({ error: 'not_found' });

  // AuditLog is a time-series collection — audit fields live under `meta`.
  const logs = await AuditLog.find({ 'meta.resource_type': 'application', 'meta.resource_id': req.params.id } as any)
    .sort({ ts: -1 })
    .limit(200)
    .populate('meta.actor', 'name email')
    .lean();

  // Flatten meta so the client gets { action, actor, notes, before, after, ts }.
  const data = logs.map((l: any) => ({
    _id: l._id,
    ts: l.ts,
    action: l.meta?.action,
    actor: l.meta?.actor || null,
    notes: l.meta?.notes,
    before: l.meta?.before,
    after: l.meta?.after,
  }));
  return res.json({ data });
});

// ═══════════════════════════════════════════════════════════════
// GET /applications/:id/timeline — unified chronological activity
// ═══════════════════════════════════════════════════════════════
// Merges the application's own status_history (state-machine + overrides) with
// its immutable AuditLog events (assignment, documents, payments, issuance),
// plus linked lab tests / inspections — a single feed for the detail view.
router.get('/:id/timeline', async (req: AuthRequest, res: Response) => {
  const app = await Application.findOne(scopeById(req))
    .select('_id status_history')
    .populate('status_history.by', 'name email')
    .lean();
  if (!app) return res.status(404).json({ error: 'not_found' });

  const [logs, testings, inspections] = await Promise.all([
    AuditLog.find({ 'meta.resource_type': 'application', 'meta.resource_id': req.params.id } as any)
      .sort({ ts: -1 }).limit(200).populate('meta.actor', 'name email').lean(),
    Testing.find({ application_id: req.params.id }).select('sample_id status lab_name updatedAt').lean(),
    Inspection.find({ application_id: req.params.id }).select('inspection_number status inspection_type updated_at').lean(),
  ]);

  type Event = { kind: string; ts: Date; action: string; actor?: any; detail?: any };
  const events: Event[] = [];

  for (const h of (app as any).status_history ?? []) {
    events.push({ kind: h.override ? 'override' : 'status', ts: h.at, action: `${h.from} → ${h.to}`, actor: h.by, detail: { reason: h.reason, comment: h.comment } });
  }
  for (const l of logs as any[]) {
    events.push({ kind: 'audit', ts: l.ts, action: l.meta?.action, actor: l.meta?.actor, detail: { notes: l.meta?.notes, before: l.meta?.before, after: l.meta?.after } });
  }
  for (const t of testings as any[]) {
    events.push({ kind: 'testing', ts: t.updatedAt, action: `testing:${t.status}`, detail: { sample_id: t.sample_id, lab: t.lab_name } });
  }
  for (const i of inspections as any[]) {
    events.push({ kind: 'inspection', ts: i.updated_at, action: `inspection:${i.status}`, detail: { inspection_number: i.inspection_number, type: i.inspection_type } });
  }

  events.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  return res.json({ data: events });
});

// ═══════════════════════════════════════════════════════════════
// POST /applications/:id/transition — change status
// ═══════════════════════════════════════════════════════════════
// The single, authoritative transition path. All state changes flow through
// TransitionService, which runs the pure WorkflowEngine (transition validity +
// Role Matrix) before applying the change and its side effects. The former
// duplicate `PUT /:id/status` has been removed.
router.post('/:id/transition', async (req: AuthRequest, res: Response) => {
  const { to_status, reason, comment } = req.body as { to_status: ApplicationStatus; reason?: string; comment?: string };
  const app = await Application.findOne(scopeById(req));
  if (!app) return res.status(404).json({ error: 'not_found' });

  try {
    await runTransition({
      application: app,
      toStatus: to_status,
      actor: req.user!._id as any,
      actorRole: req.user!.role,
      reason,
      comment,
      ip: req.ip,
      orgId: req.user!.org_id as any,
    });
  } catch (err) {
    if (err instanceof TransitionDeniedError) {
      const code = err.decision.reasons[0]?.code;
      const httpStatus = code === 'forbidden_role' ? 403 : 400;
      return res.status(httpStatus).json({ error: code, message: err.message, reasons: err.decision.reasons });
    }
    if (err instanceof GateDeniedError) {
      // Preconditions unmet (missing docs / payment) and gate enforcement is ON.
      return res.status(422).json({ error: 'gate_unsatisfied', message: err.message, required_actions: err.requiredActions });
    }
    throw err;
  }

  return res.json({ data: app });
});

// ═══════════════════════════════════════════════════════════════
// POST /applications/:id/override — admin escape hatch (reason required)
// ═══════════════════════════════════════════════════════════════
// Bypasses ALLOWED_TRANSITIONS + Role Matrix. Admins only. Always audited,
// timelined and notified via OverrideService.
router.post('/:id/override', requireRole(...ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  const { to_status, reason } = req.body as { to_status: ApplicationStatus; reason?: string };
  if (!to_status || !reason || !reason.trim()) {
    return res.status(400).json({ error: 'to_status and a non-empty reason are required' });
  }
  const app = await Application.findOne(scopeById(req));
  if (!app) return res.status(404).json({ error: 'not_found' });

  await overrideStatus({ application: app, toStatus: to_status, actor: req.user!._id as any, reason, ip: req.ip, orgId: req.user!.org_id as any });
  return res.json({ data: app });
});

// ═══════════════════════════════════════════════════════════════
// POST /applications/:id/assign — set the assignee set (via AssignmentEngine)
// ═══════════════════════════════════════════════════════════════
router.post('/:id/assign', requireRole(...ADMIN_ROLES, 'consultant'), async (req: AuthRequest, res: Response) => {
  const { user_ids, primary } = req.body as { user_ids: string[]; primary?: string };
  if (!Array.isArray(user_ids)) return res.status(400).json({ error: 'user_ids array required' });
  const app = await Application.findOne(scopeById(req));
  if (!app) return res.status(404).json({ error: 'not_found' });

  await assignApplication({ application: app, userIds: user_ids, primaryId: primary, actor: req.user!._id as any, orgId: req.user!.org_id as any });
  return res.json({ data: app });
});

// ═══════════════════════════════════════════════════════════════
// PUT /applications/:id/assign — mobile compat (single assignee)
// ═══════════════════════════════════════════════════════════════
router.put('/:id/assign', requireRole(...ADMIN_ROLES, 'consultant'), async (req: AuthRequest, res: Response) => {
  const { assigned_to } = req.body as { assigned_to: string };
  if (!assigned_to) return res.status(400).json({ error: 'assigned_to required' });
  const app = await Application.findOne(scopeById(req));
  if (!app) return res.status(404).json({ error: 'not_found' });

  await assignApplication({ application: app, userIds: [assigned_to], primaryId: assigned_to, actor: req.user!._id as any, orgId: req.user!.org_id as any });
  return res.json({ success: true, data: app });
});

// ═══════════════════════════════════════════════════════════════
// DELETE /applications/:id/assign — clear all assignees
// ═══════════════════════════════════════════════════════════════
router.delete('/:id/assign', requireRole(...ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  const app = await Application.findOne(scopeById(req));
  if (!app) return res.status(404).json({ error: 'not_found' });
  await unassignApplication({ application: app, actor: req.user!._id as any, orgId: req.user!.org_id as any });
  return res.json({ data: app });
});

// ═══════════════════════════════════════════════════════════════
// POST /applications/:id/escalate — route to a manager (reason required)
// ═══════════════════════════════════════════════════════════════
router.post('/:id/escalate', requireRole(...ADMIN_ROLES, 'employee', 'consultant'), async (req: AuthRequest, res: Response) => {
  const { manager_id, reason } = req.body as { manager_id: string; reason?: string };
  if (!manager_id || !reason) return res.status(400).json({ error: 'manager_id and reason required' });
  const app = await Application.findOne(scopeById(req));
  if (!app) return res.status(404).json({ error: 'not_found' });
  await escalateApplication({ application: app, managerId: manager_id, actor: req.user!._id as any, reason, orgId: req.user!.org_id as any });
  return res.json({ data: app });
});

// ═══════════════════════════════════════════════════════════════
// PUT /applications/:id — modify base application fields
// ═══════════════════════════════════════════════════════════════
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const { priority, notes } = req.body;
  const app = await Application.findOneAndUpdate(
    scopeById(req),
    { priority, notes, updated_at: new Date() },
    { returnDocument: 'after' }
  );
  if (!app) return res.status(404).json({ error: 'not_found' });
  return res.json({ success: true, data: app });
});

// ═══════════════════════════════════════════════════════════════
// DELETE /applications/:id — soft delete
// ═══════════════════════════════════════════════════════════════
router.delete('/:id', requireRole(...ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  const app = await Application.findOneAndUpdate(
    scopeById(req),
    { deleted_at: new Date(), updated_at: new Date() },
    { returnDocument: 'after' }
  );
  if (!app) return res.status(404).json({ error: 'not_found' });
  return res.json({ success: true, data: app });
});

// ═══════════════════════════════════════════════════════════════
// POST /applications/:id/restore — restore soft deleted application
// ═══════════════════════════════════════════════════════════════
router.post('/:id/restore', requireRole(...ADMIN_ROLES), async (req: AuthRequest, res: Response) => {
  // includeDeleted — the soft-delete pre-find hook would otherwise hide the
  // application being restored.
  const app = await Application.findOneAndUpdate(
    scopeById(req),
    { $unset: { deleted_at: 1 }, updated_at: new Date() },
    { returnDocument: 'after' }
  ).setOptions({ includeDeleted: true } as any);
  if (!app) return res.status(404).json({ error: 'not_found' });
  return res.json({ success: true, data: app });
});

// ═══════════════════════════════════════════════════════════════
// Manual-review resolution (Certification Manager)
// ═══════════════════════════════════════════════════════════════
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Candidate products for a manual-review application. Suggestions only — the
 *  manager selects; nothing is auto-selected. Layers: exact name → name match →
 *  keyword/category match. */
async function productSuggestions(term?: string) {
  const norm = String(term || '').trim();
  if (!norm) return [];
  const tokens = norm.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2);
  const rxs = tokens.map((t) => new RegExp(escapeRegex(t), 'i'));
  const [exact, contains, byToken] = await Promise.all([
    Product.find({ name: new RegExp(`^${escapeRegex(norm)}$`, 'i') }).limit(5).lean(),
    Product.find({ name: new RegExp(escapeRegex(norm), 'i') }).limit(10).lean(),
    rxs.length ? Product.find({ $or: [{ name: { $in: rxs } }, { category: { $in: rxs } }] }).limit(10).lean() : [],
  ]);
  const seen = new Set<string>();
  const out: any[] = [];
  const push = (p: any, matchType: string, confidence: number) => {
    const id = String(p._id);
    if (seen.has(id)) return;
    seen.add(id);
    out.push({ product_id: id, name: p.name, brand: p.brand, category: p.category, hsn_code: p.hsn_code, matchType, confidence });
  };
  (exact as any[]).forEach((p) => push(p, 'exact_name', 95));
  (contains as any[]).forEach((p) => push(p, 'name_match', 75));
  (byToken as any[]).forEach((p) => push(p, 'keyword_or_category', 55));
  return out;
}

// GET /applications/:id/product-suggestions — manager opens a manual app.
router.get('/:id/product-suggestions', requireRole(...ADMIN_ROLES, 'employee'), async (req: AuthRequest, res: Response) => {
  const app = await Application.findById(req.params.id).populate('product_id', 'name').lean();
  if (!app) return res.status(404).json({ error: 'not_found' });
  const term = (app as any).manual_review?.original_product || (app.product_id as any)?.name || undefined;
  return res.json({
    data: {
      original_product: term ?? null,
      manual_review: (app as any).manual_review ?? null,
      suggestions: await productSuggestions(term),
    },
  });
});

// POST /applications/:id/resolve-product — manager selects the product, assigns
// HS code + certifications, and un-flags manual review so the normal workflow
// continues (via the existing transition endpoint). Preserves all other data.
router.post('/:id/resolve-product', requireRole(...ADMIN_ROLES, 'employee'), async (req: AuthRequest, res: Response) => {
  const { product_id, hs_code, cert_type } = req.body as { product_id?: string; hs_code?: string; cert_type?: string };
  if (!product_id) return res.status(400).json({ error: 'product_id required' });
  const app = await Application.findById(req.params.id);
  if (!app) return res.status(404).json({ error: 'not_found' });
  const product = await Product.findById(product_id);
  if (!product) return res.status(404).json({ error: 'product_not_found' });

  const before = { product_status: app.product_status, product_id: app.product_id, cert_type: app.cert_type };
  app.product_id = product._id as any;
  app.product_status = 'validated';
  app.hs_code = hs_code ? String(hs_code) : ((product as any).hsn_code || app.hs_code);
  if (cert_type) app.cert_type = String(cert_type);
  app.tags = (app.tags || []).filter((t) => t !== 'manual_review');
  await app.save();

  await audit({
    actor: req.user!._id as any,
    org_id: req.user!.org_id as any,
    resource_type: 'application',
    resource_id: app._id as any,
    action: 'updated',
    before,
    after: { product_status: 'validated', product_id: String(product._id), hs_code: app.hs_code, cert_type: app.cert_type },
    notes: 'manual review resolved',
  });

  return res.json({ data: app });
});

export default router;

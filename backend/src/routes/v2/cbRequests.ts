/**
 * CB Requests — a customer's quote/contact request to a Certification Body.
 * Ownership is derived server-side (never trusted from the client): a customer
 * only ever sees or mutates their own requests; staff manage all. Internal notes
 * are never returned on customer responses.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { authenticate, AuthRequest, requireRole, ADMIN_ROLES } from '../../middleware/authMongo';
import { CBRequest, CB_REQUEST_STATUSES, CB_REQUEST_TERMINAL, CBRequestStatus } from '../../models/CBRequest';
import { Organization } from '../../models/Organization';
import { Application } from '../../models/Application';
import { audit, AuditLog } from '../../models/AuditLog';
import { notificationService } from '../../services/notificationService';

const router = Router();
router.use(authenticate);
const wrap = (fn: any) => (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
const STAFF_ROLES = ['admin', 'super_admin', 'employee'];
const isStaff = (req: AuthRequest) => STAFF_ROLES.includes(req.user!.role);
const isObjId = (v?: any) => !!v && Types.ObjectId.isValid(String(v));
const s = (v: any) => (v === undefined || v === null ? undefined : String(v).trim() || undefined);

/** Scope a single request to the caller (own requests only) unless staff. */
function ownScope(req: AuthRequest): any {
  return isStaff(req) ? {} : { user_id: req.user!._id };
}

/** Customer-safe projection — strips internal_notes. */
function publicRequest(doc: any) {
  const { internal_notes, ...rest } = doc;
  return rest;
}

async function nextRequestNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await CBRequest.countDocuments({ request_number: new RegExp(`^CBR-${year}-`) });
  return `CBR-${year}-${String(count + 1).padStart(5, '0')}`;
}

// ═══════════════════════════════════════════════════════════════
// POST /cb-requests — create a request (customer or staff on behalf)
// ═══════════════════════════════════════════════════════════════
router.post('/', wrap(async (req: AuthRequest, res: Response) => {
  const cbId = s(req.body?.certification_body_id);
  if (!isObjId(cbId)) return res.status(400).json({ success: false, message: 'A valid certification_body_id is required.' });

  // The CB must be a real, non-suspended/archived certification body.
  const cb: any = await Organization.findOne({ _id: cbId, type: 'cb' }).lean();
  if (!cb) return res.status(404).json({ success: false, message: 'Certification body not found.' });
  if (['suspended', 'archived'].includes(cb.cb_verification?.status)) {
    return res.status(409).json({ success: false, message: 'This certification body is not currently accepting requests.' });
  }

  // Derive context from an application when provided (ownership-checked).
  let cert_type = s(req.body?.cert_type);
  let market = s(req.body?.market)?.toUpperCase();
  let product_id = isObjId(req.body?.product_id) ? req.body.product_id : undefined;
  let product_category = s(req.body?.product_category);
  let application_id: any;
  const appId = s(req.body?.application_id);
  if (appId) {
    if (!isObjId(appId)) return res.status(400).json({ success: false, message: 'Invalid application_id.' });
    const appFilter: any = { _id: appId };
    if (!isStaff(req)) appFilter.created_by = req.user!._id;   // ownership enforced server-side
    const app: any = await Application.findOne(appFilter).populate('product_id', 'category').lean();
    if (!app) return res.status(404).json({ success: false, message: 'Application not found.' });
    application_id = app._id;
    cert_type = cert_type || app.cert_type;
    market = market || (app.manual_review?.requested_markets || [])[0]?.toUpperCase();
    product_id = product_id || app.product_id?._id;
    product_category = product_category || app.product_id?.category;
  }

  // Duplicate protection: one active request per (user, CB, cert, market).
  const dup = await CBRequest.findOne({
    user_id: req.user!._id,
    certification_body_id: cbId,
    cert_type: cert_type || null,
    market: market || null,
    status: { $nin: CB_REQUEST_TERMINAL },
  }).lean();
  if (dup) {
    return res.status(409).json({
      success: false,
      code: 'duplicate_request',
      message: 'You already have an active request with this certification body for this certification and market.',
      data: { request_id: String(dup._id), request_number: dup.request_number },
    });
  }

  const now = new Date();
  const doc = await CBRequest.create({
    request_number: await nextRequestNumber(),
    customer_id: req.user!.org_id,          // derived, never from client
    user_id: req.user!._id,
    certification_body_id: cbId,
    application_id,
    product_id,
    cert_type,
    market,
    product_category,
    message: s(req.body?.message),
    details: typeof req.body?.details === 'object' && req.body.details ? req.body.details : {},
    document_ids: Array.isArray(req.body?.document_ids) ? req.body.document_ids.filter(isObjId) : [],
    match_snapshot: req.body?.match_snapshot && typeof req.body.match_snapshot === 'object'
      ? { score: Number(req.body.match_snapshot.score) || undefined, reasons: Array.isArray(req.body.match_snapshot.reasons) ? req.body.match_snapshot.reasons.map(String) : undefined }
      : undefined,
    status: 'submitted',
    status_history: [{ from: 'draft' as CBRequestStatus, to: 'submitted' as CBRequestStatus, by: req.user!._id, at: now }],
  });

  await audit({ actor: req.user!._id as any, org_id: req.user!.org_id as any, resource_type: 'cb_request' as any, resource_id: doc._id as any, action: 'created', notes: `CB request ${doc.request_number} → ${cb.name}` });
  await notificationService.notify(String(req.user!._id), 'Request submitted', `Your request ${doc.request_number} to ${cb.name} has been submitted.`, 'cb_request', { request_id: String(doc._id) });

  return res.status(201).json({ success: true, data: publicRequest(doc.toObject()) });
}));

// ═══════════════════════════════════════════════════════════════
// GET /cb-requests — list (own for customers, all for staff)
// ═══════════════════════════════════════════════════════════════
router.get('/', wrap(async (req: AuthRequest, res: Response) => {
  const page = Math.max(parseInt(s(req.query.page) || '1', 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(s(req.query.limit) || '20', 10) || 20, 1), 100);
  const filter: any = { ...ownScope(req) };
  if (s(req.query.status) && CB_REQUEST_STATUSES.includes(s(req.query.status) as CBRequestStatus)) filter.status = s(req.query.status);
  if (isStaff(req) && isObjId(req.query.assigned_to)) filter.assigned_to = req.query.assigned_to;
  if (isObjId(req.query.certification_body_id)) filter.certification_body_id = req.query.certification_body_id;
  if (s(req.query.cert_type)) filter.cert_type = s(req.query.cert_type);
  if (s(req.query.market)) filter.market = s(req.query.market)!.toUpperCase();
  if (s(req.query.q)) filter.request_number = new RegExp(s(req.query.q)!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  const [items, total] = await Promise.all([
    CBRequest.find(filter)
      .sort({ created_at: -1 }).skip((page - 1) * limit).limit(limit)
      .populate('certification_body_id', 'name branding.logo_url')
      .populate('product_id', 'name category')
      .populate('user_id', 'name email')
      .populate('customer_id', 'name')
      .populate('assigned_to', 'name')
      .lean(),
    CBRequest.countDocuments(filter),
  ]);
  const data = isStaff(req) ? items : items.map(publicRequest);
  return res.json({ success: true, data, pagination: { page, limit, total, total_pages: Math.ceil(total / limit) } });
}));

// ═══════════════════════════════════════════════════════════════
// GET /cb-requests/:id — detail (ownership enforced)
// ═══════════════════════════════════════════════════════════════
router.get('/:id', wrap(async (req: AuthRequest, res: Response) => {
  if (!isObjId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid id.' });
  const doc: any = await CBRequest.findOne({ _id: req.params.id, ...ownScope(req) })
    .populate('certification_body_id', 'name branding.logo_url contact.website cb_verification.status')
    .populate('product_id', 'name category')
    .populate('application_id', 'application_number status cert_type')
    .populate('assigned_to', 'name email')
    .populate('user_id', 'name email phone')
    .populate('customer_id', 'name contact')
    .populate('document_ids', 'name doc_type')
    .populate('status_history.by', 'name email')
    .lean();
  if (!doc) return res.status(404).json({ success: false, message: 'Request not found.' });
  return res.json({ success: true, data: isStaff(req) ? doc : publicRequest(doc) });
}));

// ═══════════════════════════════════════════════════════════════
// GET /cb-requests/:id/audit — immutable audit trail (staff)
// ═══════════════════════════════════════════════════════════════
router.get('/:id/audit', requireRole(...ADMIN_ROLES), wrap(async (req: AuthRequest, res: Response) => {
  if (!isObjId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid id.' });
  const logs = await AuditLog.find({ 'meta.resource_type': 'cb_request', 'meta.resource_id': req.params.id } as any)
    .sort({ ts: -1 }).limit(200).populate('meta.actor', 'name email').lean();
  const data = logs.map((l: any) => ({ _id: l._id, ts: l.ts, action: l.meta?.action, actor: l.meta?.actor || null, notes: l.meta?.notes }));
  return res.json({ success: true, data });
}));

// ═══════════════════════════════════════════════════════════════
// PATCH /cb-requests/:id/cancel — customer or staff, if not terminal
// ═══════════════════════════════════════════════════════════════
router.patch('/:id/cancel', wrap(async (req: AuthRequest, res: Response) => {
  if (!isObjId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid id.' });
  const doc = await CBRequest.findOne({ _id: req.params.id, ...ownScope(req) });
  if (!doc) return res.status(404).json({ success: false, message: 'Request not found.' });
  if (CB_REQUEST_TERMINAL.includes(doc.status)) {
    return res.status(409).json({ success: false, message: `Request is already ${doc.status}.` });
  }
  const from = doc.status;
  doc.status = 'cancelled';
  doc.status_history.push({ from, to: 'cancelled', by: req.user!._id as any, at: new Date(), note: s(req.body?.reason) } as any);
  await doc.save();
  await audit({ actor: req.user!._id as any, org_id: req.user!.org_id as any, resource_type: 'cb_request' as any, resource_id: doc._id as any, action: 'updated', notes: `CB request ${doc.request_number} cancelled` });
  return res.json({ success: true, data: publicRequest(doc.toObject()) });
}));

// ═══════════════════════════════════════════════════════════════
// PATCH /cb-requests/:id — staff: assign / status / response / internal notes
// ═══════════════════════════════════════════════════════════════
router.patch('/:id', requireRole(...ADMIN_ROLES), wrap(async (req: AuthRequest, res: Response) => {
  if (!isObjId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid id.' });
  const doc = await CBRequest.findById(req.params.id);
  if (!doc) return res.status(404).json({ success: false, message: 'Request not found.' });
  const b = req.body || {};
  let statusChanged = false;

  if (b.assigned_to !== undefined) doc.assigned_to = isObjId(b.assigned_to) ? b.assigned_to : undefined;
  if (b.internal_notes !== undefined) doc.internal_notes = s(b.internal_notes);

  if (b.status !== undefined) {
    const to = s(b.status) as CBRequestStatus;
    if (!CB_REQUEST_STATUSES.includes(to)) return res.status(400).json({ success: false, message: 'Invalid status.' });
    if (to !== doc.status) {
      doc.status_history.push({ from: doc.status, to, by: req.user!._id as any, at: new Date(), note: s(b.customer_note) } as any);
      doc.status = to;
      statusChanged = true;
    }
  }

  if (b.cb_response && typeof b.cb_response === 'object') {
    doc.cb_response = {
      summary: s(b.cb_response.summary),
      quote_amount: b.cb_response.quote_amount != null ? Number(b.cb_response.quote_amount) : undefined,
      quote_currency: s(b.cb_response.quote_currency)?.toUpperCase(),
      valid_until: b.cb_response.valid_until ? new Date(b.cb_response.valid_until) : undefined,
      recorded_by: req.user!._id as any,
      recorded_at: new Date(),
    } as any;
  }

  await doc.save();
  await audit({ actor: req.user!._id as any, org_id: req.user!.org_id as any, resource_type: 'cb_request' as any, resource_id: doc._id as any, action: 'updated', notes: `CB request ${doc.request_number} updated${statusChanged ? ' → ' + doc.status : ''}` });

  // Notify the customer on a status change or a recorded response.
  if (statusChanged || b.cb_response) {
    await notificationService.notify(
      String(doc.user_id),
      'Request updated',
      `Your request ${doc.request_number} is now ${doc.status.replace(/_/g, ' ')}.`,
      'cb_request',
      { request_id: String(doc._id) },
    );
  }
  return res.json({ success: true, data: doc });
}));

export default router;

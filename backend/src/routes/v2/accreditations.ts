/**
 * Accreditation catalog — structured accreditation authorities/programmes that
 * CertificationBodyScope rows reference. Small shared catalog: any authenticated
 * user may read (to render a CB's accreditations); only staff may mutate.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { authenticate, AuthRequest, requireRole, ADMIN_ROLES } from '../../middleware/authMongo';
import { Accreditation } from '../../models/Accreditation';
import { audit } from '../../models/AuditLog';

const router = Router();
router.use(authenticate);
const wrap = (fn: any) => (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
const s = (v: any) => (v === undefined || v === null ? undefined : String(v).trim() || undefined);
const isObjId = (v?: string) => !!v && Types.ObjectId.isValid(v);

/** GET /accreditations?q=&status= — list (catalog is small; no pagination needed). */
router.get('/', wrap(async (req: AuthRequest, res: Response) => {
  const filter: any = {};
  if (s(req.query.status)) filter.status = s(req.query.status);
  if (s(req.query.q)) filter.$or = [{ name: new RegExp(s(req.query.q)!, 'i') }, { code: new RegExp(s(req.query.q)!, 'i') }];
  const items = await Accreditation.find(filter).sort({ code: 1 }).lean();
  return res.json({ success: true, data: items });
}));

/** POST /accreditations — create (staff). Codes are unique among live rows. */
router.post('/', requireRole(...ADMIN_ROLES), wrap(async (req: AuthRequest, res: Response) => {
  const name = s(req.body?.name);
  const code = s(req.body?.code);
  if (!name || !code) return res.status(400).json({ success: false, message: 'name and code are required.' });
  const exists = await Accreditation.findOne({ code: code.toUpperCase() }).lean();
  if (exists) return res.status(409).json({ success: false, message: 'An accreditation with this code already exists.' });
  const doc = await Accreditation.create({
    name, code,
    country_code: s(req.body?.country_code),
    description: s(req.body?.description),
    website: s(req.body?.website),
    verification_source: s(req.body?.verification_source),
    status: (s(req.body?.status) as any) || 'active',
    created_by: req.user!._id,
  });
  await audit({ actor: req.user!._id as any, org_id: req.user!.org_id as any, resource_type: 'accreditation', resource_id: doc._id as any, action: 'created', notes: `accreditation created: ${code}` });
  return res.status(201).json({ success: true, data: doc });
}));

/** PATCH /accreditations/:id — update (staff). */
router.patch('/:id', requireRole(...ADMIN_ROLES), wrap(async (req: AuthRequest, res: Response) => {
  if (!isObjId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid id.' });
  const doc = await Accreditation.findById(req.params.id);
  if (!doc) return res.status(404).json({ success: false, message: 'Accreditation not found.' });
  const b = req.body || {};
  for (const f of ['name', 'country_code', 'description', 'website', 'verification_source', 'status'] as const) {
    if (b[f] !== undefined) (doc as any)[f] = s(b[f]);
  }
  if (b.code !== undefined && s(b.code) && s(b.code)!.toUpperCase() !== doc.code) {
    const dup = await Accreditation.findOne({ code: s(b.code)!.toUpperCase() }).lean();
    if (dup) return res.status(409).json({ success: false, message: 'An accreditation with this code already exists.' });
    doc.code = s(b.code)!;
  }
  (doc as any).updated_by = req.user!._id;
  await doc.save();
  await audit({ actor: req.user!._id as any, org_id: req.user!.org_id as any, resource_type: 'accreditation', resource_id: doc._id as any, action: 'updated', notes: `accreditation updated: ${doc.code}` });
  return res.json({ success: true, data: doc });
}));

/** DELETE /accreditations/:id — soft-delete + archive (staff). */
router.delete('/:id', requireRole(...ADMIN_ROLES), wrap(async (req: AuthRequest, res: Response) => {
  if (!isObjId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid id.' });
  const doc = await Accreditation.findByIdAndUpdate(req.params.id, { status: 'archived', deleted_at: new Date(), updated_by: req.user!._id });
  if (!doc) return res.status(404).json({ success: false, message: 'Accreditation not found.' });
  await audit({ actor: req.user!._id as any, org_id: req.user!.org_id as any, resource_type: 'accreditation', resource_id: doc._id as any, action: 'deleted', notes: `accreditation archived: ${doc.code}` });
  return res.json({ success: true });
}));

export default router;

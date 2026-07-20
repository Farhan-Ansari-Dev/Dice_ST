import { Router, Response } from 'express';
import { Inspection } from '../../models';
import { authenticate, requireRole, AuthRequest } from '../../middleware/authMongo';

import { getPaginationData, buildPaginationResponse } from '../../utils/pagination';
import { stripProtected } from '../../utils/sanitize';

const router = Router();
const wrap = (fn: any) => (req: AuthRequest, res: Response, next: any) => fn(req, res, next).catch(next);

// GET all inspection records (Admins see all, Clients see theirs)
router.get('/', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const query: any = { deleted_at: null };
  if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
    query.client_id = req.user?._id;
  }

  if (req.query.status) query.status = req.query.status;

  const { page, limit, skip } = getPaginationData({ page: req.query.page as string, limit: req.query.limit as string });

  const [inspections, total] = await Promise.all([
    Inspection.find(query)
      .populate('client_id', 'name email companyName')
      .populate('product_id', 'name')
      .populate('assigned_to', 'name email')
      .sort('-created_at')
      .skip(skip)
      .limit(limit)
      .lean(),
    Inspection.countDocuments(query)
  ])

  return res.json({ 
    success: true, 
    data: inspections,
    meta: buildPaginationResponse(total, page, limit)
  });
}));

// GET single inspection
router.get('/:id', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const inspection = await Inspection.findOne({ _id: req.params.id, deleted_at: null })
    .populate('client_id', 'name email companyName')
    .populate('product_id', 'name')
    .populate('assigned_to', 'name email');
  if (!inspection) return res.status(404).json({ success: false, error: 'Not found' });
  if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin' && String(inspection.client_id._id) !== String(req.user?._id)) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }
  return res.json({ success: true, data: inspection });
}));

// POST new inspection (Clients create, Admins approve)
router.post('/', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  try {
    // Server-generated sequence — the schema requires a unique inspection_number
    // and no client supplies one.
    const count = await Inspection.countDocuments({});
    const inspectionNumber = `INSP-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    const inspection = await Inspection.create({
      ...stripProtected(req.body),
      inspection_number: inspectionNumber,
      client_id: req.user?._id,
      org_id: req.user?.org_id,
      created_at: new Date(),
      updated_at: new Date(),
    });
    return res.status(201).json({ success: true, data: inspection });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
}));

// PUT update inspection (Admin only for most fields)
router.put('/:id', authenticate, requireRole('admin', 'super_admin'), wrap(async (req: AuthRequest, res: Response) => {
  try {
    const inspection = await Inspection.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null },
      { ...stripProtected(req.body), updated_at: new Date() },
      { returnDocument: 'after' }
    );
    if (!inspection) return res.status(404).json({ success: false, error: 'Not found' });
    return res.json({ success: true, data: inspection });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
}));

// DELETE soft delete (Admin only)
router.delete('/:id', authenticate, requireRole('admin', 'super_admin'), wrap(async (req: AuthRequest, res: Response) => {
  const inspection = await Inspection.findOneAndUpdate(
    { _id: req.params.id },
    { deleted_at: new Date(), updated_at: new Date() },
    { returnDocument: 'after' }
  );
  if (!inspection) return res.status(404).json({ success: false, error: 'Not found' });
  return res.json({ success: true, data: inspection });
}));

export default router;

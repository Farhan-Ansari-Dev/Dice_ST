import { Router, Response } from 'express';
import { Shipment } from '../../models';
import { authenticate, requireRole, AuthRequest } from '../../middleware/authMongo';
import { stripProtected } from '../../utils/sanitize';

const router = Router();
const wrap = (fn: any) => (req: AuthRequest, res: Response, next: any) => fn(req, res, next).catch(next);

// GET all shipments (Admins see all, Clients see theirs)
router.get('/', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const query: any = { deleted_at: null };
  if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
    query.client_id = req.user?._id;
  }
  const shipments = await Shipment.find(query).populate('client_id', 'name email companyName').sort('-createdAt');
  return res.json({ success: true, data: shipments });
}));

// GET single shipment
router.get('/:id', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const shipment = await Shipment.findOne({ _id: req.params.id, deleted_at: null }).populate('client_id', 'name email companyName');
  if (!shipment) return res.status(404).json({ success: false, error: 'Not found' });
  if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin' && String(shipment.client_id._id) !== String(req.user?._id)) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }
  return res.json({ success: true, data: shipment });
}));

// POST new shipment (Admin only)
router.post('/', authenticate, requireRole('admin', 'super_admin'), wrap(async (req: AuthRequest, res: Response) => {
  try {
    const shipment = await Shipment.create(stripProtected(req.body));
    return res.status(201).json({ success: true, data: shipment });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
}));

// PUT update shipment (Admin only)
router.put('/:id', authenticate, requireRole('admin', 'super_admin'), wrap(async (req: AuthRequest, res: Response) => {
  try {
    const shipment = await Shipment.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null },
      stripProtected(req.body),
      { new: true }
    );
    if (!shipment) return res.status(404).json({ success: false, error: 'Not found' });
    return res.json({ success: true, data: shipment });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
}));

// DELETE soft delete (Admin only)
router.delete('/:id', authenticate, requireRole('admin', 'super_admin'), wrap(async (req: AuthRequest, res: Response) => {
  const shipment = await Shipment.findOneAndUpdate(
    { _id: req.params.id },
    { deleted_at: new Date() },
    { new: true }
  );
  if (!shipment) return res.status(404).json({ success: false, error: 'Not found' });
  return res.json({ success: true, data: shipment });
}));

export default router;

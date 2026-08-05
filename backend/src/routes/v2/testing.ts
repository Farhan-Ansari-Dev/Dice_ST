import { Router, Response } from 'express';
import { Testing, audit } from '../../models';
import { authenticate, requireRole, AuthRequest } from '../../middleware/authMongo';
import { stripProtected } from '../../utils/sanitize';

const router = Router();
const wrap = (fn: any) => (req: AuthRequest, res: Response, next: any) => fn(req, res, next).catch(next);

// GET all testing records (Admins see all, Clients see theirs)
router.get('/', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const query: any = { deleted_at: null };
  if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
    query.client_id = req.user?._id;
  }
  const tests = await Testing.find(query).populate('client_id', 'name email companyName').sort('-createdAt');
  return res.json({ success: true, data: tests });
}));

// GET single test
router.get('/:id', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const test = await Testing.findOne({ _id: req.params.id, deleted_at: null }).populate('client_id', 'name email companyName');
  if (!test) return res.status(404).json({ success: false, error: 'Not found' });
  if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin' && String(test.client_id._id) !== String(req.user?._id)) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }
  return res.json({ success: true, data: test });
}));

// POST new test (Admin only)
router.post('/', authenticate, requireRole('admin', 'super_admin'), wrap(async (req: AuthRequest, res: Response) => {
  try {
    const test = await Testing.create(stripProtected(req.body));
    // Timeline: attribute to the customer (client_id) so it shows on their 360.
    await audit({
      actor: req.user!._id as any,
      resource_type: 'testing',
      resource_id: (test as any).client_id,
      action: 'testing_started',
    }).catch(() => {});
    return res.status(201).json({ success: true, data: test });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
}));

// PUT update test (Admin only)
router.put('/:id', authenticate, requireRole('admin', 'super_admin'), wrap(async (req: AuthRequest, res: Response) => {
  try {
    const test = await Testing.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null },
      stripProtected(req.body),
      { returnDocument: 'after' }
    );
    if (!test) return res.status(404).json({ success: false, error: 'Not found' });
    return res.json({ success: true, data: test });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
}));

// DELETE soft delete (Admin only)
router.delete('/:id', authenticate, requireRole('admin', 'super_admin'), wrap(async (req: AuthRequest, res: Response) => {
  const test = await Testing.findOneAndUpdate(
    { _id: req.params.id },
    { deleted_at: new Date() },
    { returnDocument: 'after' }
  );
  if (!test) return res.status(404).json({ success: false, error: 'Not found' });
  return res.json({ success: true, data: test });
}));

export default router;

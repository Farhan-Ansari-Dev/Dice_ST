import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../../middleware/authMongo';
import { authorize } from '../../middleware/authorize';
import { MeetingSlot } from '../../models/MeetingSlot';

const router = Router();
const wrap = (handler: any) => (req: Request, res: Response, next: NextFunction) => handler(req, res, next).catch(next);

router.get('/', authenticate, authorize(['admin', 'super_admin', 'employee']), wrap(async (req: AuthRequest, res: Response) => {
  const from = req.query.from ? new Date(String(req.query.from)) : new Date();
  const slots = await MeetingSlot.find({ starts_at: { $gte: from } }).sort({ starts_at: 1 }).lean();
  return res.json({ success: true, data: slots });
}));

router.post('/', authenticate, authorize(['admin', 'super_admin']), wrap(async (req: AuthRequest, res: Response) => {
  const { consultant_id, consultant_name, consultant_role, starts_at, ends_at } = req.body;
  const startsAt = new Date(starts_at);
  const endsAt = new Date(ends_at);
  if (!consultant_id || !consultant_name || !consultant_role || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
    return res.status(400).json({ success: false, message: 'Provide a consultant and valid start/end time.' });
  }

  try {
    const slot = await MeetingSlot.create({ consultant_id, consultant_name, consultant_role, starts_at: startsAt, ends_at: endsAt });
    return res.status(201).json({ success: true, data: slot });
  } catch (error: any) {
    if (error?.code === 11000) return res.status(409).json({ success: false, message: 'This consultant already has a slot at this time.' });
    throw error;
  }
}));

router.patch('/:id', authenticate, authorize(['admin', 'super_admin']), wrap(async (req: AuthRequest, res: Response) => {
  const slot = await MeetingSlot.findByIdAndUpdate(req.params.id, { $set: { is_available: Boolean(req.body.is_available) } }, { returnDocument: 'after' }).lean();
  if (!slot) return res.status(404).json({ success: false, message: 'Slot not found.' });
  return res.json({ success: true, data: slot });
}));

router.delete('/:id', authenticate, authorize(['admin', 'super_admin']), wrap(async (req: AuthRequest, res: Response) => {
  const slot = await MeetingSlot.findByIdAndDelete(req.params.id).lean();
  if (!slot) return res.status(404).json({ success: false, message: 'Slot not found.' });
  return res.json({ success: true, data: { id: slot._id } });
}));

export default router;

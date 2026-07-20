import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole, ADMIN_ROLES, AuthRequest } from '../../middleware/authMongo';
import { SupportTicket } from '../../models/SupportTicket';

const router = Router();
const wrap = (handler: any) => (req: Request, res: Response, next: NextFunction) => handler(req, res, next).catch(next);

router.get('/', authenticate, requireRole(...ADMIN_ROLES), wrap(async (req: AuthRequest, res: Response) => {
  const filter: any = {};
  if (req.query.status) filter.status = req.query.status;
  const tickets = await SupportTicket.find(filter).sort({ created_at: -1 }).lean();
  return res.json({ success: true, data: tickets });
}));

router.put('/:id/status', authenticate, requireRole(...ADMIN_ROLES), wrap(async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status.' });
  }
  const ticket = await SupportTicket.findByIdAndUpdate(
    req.params.id,
    { status, updated_at: new Date() },
    { returnDocument: 'after' }
  );
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });
  return res.json({ success: true, data: ticket });
}));

router.post('/', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const { subject, description, category = 'General', priority = 'medium', source = 'support_center' } = req.body;
  if (!String(subject || '').trim() || !String(description || '').trim()) {
    return res.status(400).json({ success: false, message: 'Subject and description are required.' });
  }

  const ticket = await SupportTicket.create({
    user_id: req.user!._id,
    org_id: req.user!.org_id,
    ticket_number: `SCS-${Date.now().toString().slice(-8)}`,
    subject: String(subject).trim(),
    description: String(description).trim(),
    category,
    priority,
    source,
  });
  return res.status(201).json({ success: true, data: ticket });
}));

router.get('/mine', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const tickets = await SupportTicket.find({ user_id: req.user!._id }).sort({ created_at: -1 }).lean();
  return res.json({ success: true, data: tickets });
}));

router.get('/:id', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const ticket = await SupportTicket.findOne({ _id: req.params.id, user_id: req.user!._id }).lean();
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });
  return res.json({ success: true, data: ticket });
}));

export default router;

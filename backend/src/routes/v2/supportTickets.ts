import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole, ADMIN_ROLES, AuthRequest } from '../../middleware/authMongo';
import { SupportTicket } from '../../models/SupportTicket';
import { TicketMessage } from '../../models/TicketMessage';
import { Notification } from '../../models/Notification';
import { User } from '../../models/User';
import { notificationService } from '../../services/notificationService';
import { logger } from '../../utils/logger';

const router = Router();
const wrap = (handler: any) => (req: Request, res: Response, next: NextFunction) => handler(req, res, next).catch(next);

router.get('/', authenticate, requireRole(...ADMIN_ROLES), wrap(async (req: AuthRequest, res: Response) => {
  const filter: any = {};
  if (req.query.status) filter.status = req.query.status;
  const tickets = await SupportTicket.find(filter)
    .populate('user_id', 'name email phone')
    .sort({ created_at: -1 })
    .lean();

  return res.json({ success: true, data: await withMessageMeta(tickets, req.user!._id) });
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
  return res.json({ success: true, data: await withMessageMeta(tickets, req.user!._id) });
}));

router.get('/:id', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const ticket = await loadTicketFor(req);
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });
  return res.json({ success: true, data: ticket });
}));

// ═══════════════════════════════════════════════════════════════
// Messages — live chat and ticket replies are the same conversation.
// ═══════════════════════════════════════════════════════════════

const isStaff = (role?: string) => ADMIN_ROLES.includes(role as any);

/** Loads a ticket the caller is allowed to see: its owner, or any staff member. */
async function loadTicketFor(req: AuthRequest) {
  const query: any = { _id: req.params.id };
  if (!isStaff(req.user!.role)) query.user_id = req.user!._id;
  return SupportTicket.findOne(query).populate('user_id', 'name email phone').lean();
}

/** Attaches lastMessage / messageCount / unreadCount to a list of tickets. */
async function withMessageMeta(tickets: any[], viewerId: any) {
  if (!tickets.length) return tickets;
  const ids = tickets.map((t) => t._id);

  const [counts, unread, latest] = await Promise.all([
    TicketMessage.aggregate([
      { $match: { ticket_id: { $in: ids } } },
      { $group: { _id: '$ticket_id', n: { $sum: 1 } } },
    ]),
    TicketMessage.aggregate([
      { $match: { ticket_id: { $in: ids }, read_by: { $ne: viewerId }, sender_id: { $ne: viewerId } } },
      { $group: { _id: '$ticket_id', n: { $sum: 1 } } },
    ]),
    TicketMessage.aggregate([
      { $match: { ticket_id: { $in: ids } } },
      { $sort: { created_at: -1 } },
      { $group: { _id: '$ticket_id', body: { $first: '$body' }, at: { $first: '$created_at' } } },
    ]),
  ]);

  const byId = (rows: any[]) => Object.fromEntries(rows.map((r) => [String(r._id), r]));
  const c = byId(counts), u = byId(unread), l = byId(latest);

  return tickets.map((t) => ({
    ...t,
    messageCount: c[String(t._id)]?.n ?? 0,
    unreadCount: u[String(t._id)]?.n ?? 0,
    lastMessage: l[String(t._id)] ? { body: l[String(t._id)].body, at: l[String(t._id)].at } : null,
  }));
}

router.get('/:id/messages', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const ticket = await loadTicketFor(req);
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });

  const messages = await TicketMessage.find({ ticket_id: ticket._id })
    .populate('sender_id', 'name email role')
    .sort({ created_at: 1 })
    .lean();

  return res.json({ success: true, data: messages });
}));

router.post('/:id/messages', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const body = String(req.body?.body ?? '').trim();
  if (!body) return res.status(400).json({ success: false, message: 'Message body is required.' });

  const ticket = await loadTicketFor(req);
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });
  if (ticket.status === 'closed') {
    return res.status(409).json({ success: false, message: 'This ticket is closed. Reopen it to continue.' });
  }

  const staff = isStaff(req.user!.role);
  const message = await TicketMessage.create({
    ticket_id: ticket._id,
    sender_id: req.user!._id,
    sender_role: staff ? 'staff' : 'user',
    body,
    attachments: Array.isArray(req.body?.attachments) ? req.body.attachments : [],
    read_by: [req.user!._id],          // the sender has obviously read it
  });

  // A customer reply reopens a resolved ticket; a staff reply moves it along.
  const nextStatus = staff
    ? (ticket.status === 'open' ? 'in_progress' : ticket.status)
    : (ticket.status === 'resolved' ? 'open' : ticket.status);
  if (nextStatus !== ticket.status) {
    await SupportTicket.updateOne({ _id: ticket._id }, { status: nextStatus });
  }

  const populated = await TicketMessage.findById(message._id).populate('sender_id', 'name email role').lean();

  // Realtime fan-out to anyone viewing this ticket.
  const io = req.app.locals.io;
  if (io) io.to(`ticket:${ticket._id}`).emit('ticket:message', populated);

  // Notify the other side.
  try {
    const ownerId = String((ticket as any).user_id?._id ?? (ticket as any).user_id);
    if (staff) {
      await Notification.create({
        user_id: ownerId, type: 'support_reply',
        title: `Reply on ${ticket.ticket_number}`, body: body.slice(0, 120),
        data: { ticketId: String(ticket._id) },
      });
      await notificationService.sendPush(ownerId, `Reply on ${ticket.ticket_number}`, body.slice(0, 120), { ticketId: String(ticket._id) });
    } else {
      const staffUsers = await User.find({ role: { $in: ADMIN_ROLES } }).select('_id').lean();
      if (staffUsers.length) {
        await Notification.insertMany(staffUsers.map((u: any) => ({
          user_id: u._id, type: 'support_message',
          title: `New message on ${ticket.ticket_number}`, body: body.slice(0, 120),
          data: { ticketId: String(ticket._id) },
        })));
      }
    }
  } catch (e) {
    logger.warn(`[support] notification failed: ${String(e)}`);
  }

  return res.status(201).json({ success: true, data: populated });
}));

/** Marks every message on the ticket as seen by the caller. */
router.post('/:id/read', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const ticket = await loadTicketFor(req);
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });

  const result = await TicketMessage.updateMany(
    { ticket_id: ticket._id, read_by: { $ne: req.user!._id } },
    { $addToSet: { read_by: req.user!._id } },
  );

  const io = req.app.locals.io;
  if (io) io.to(`ticket:${ticket._id}`).emit('ticket:read', { ticketId: String(ticket._id), userId: String(req.user!._id) });

  return res.json({ success: true, data: { marked: result.modifiedCount } });
}));

export default router;

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole, ADMIN_ROLES, AuthRequest } from '../../middleware/authMongo';
import { User } from '../../models/User';
import { Notification } from '../../models/Notification';
import { notificationService } from '../../services/notificationService';
import { audit } from '../../models/AuditLog';
import { logger } from '../../utils/logger';
import { Meeting } from '../../models/Meeting';
import { MeetingSlot } from '../../models/MeetingSlot';
import { createGoogleMeet } from '../../services/googleMeetService';

const router = Router();
const wrap = (handler: any) => (req: Request, res: Response, next: NextFunction) => handler(req, res, next).catch(next);

const CONSULTANTS = [
  { id: 'scs-boby-kumar', name: 'Boby Kumar', specialty: 'Operations Manager' },
  { id: 'scs-sunil-kumar', name: 'Sunil Kumar', specialty: 'Technical Manager' },
];
router.get('/availability', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const date = String(req.query.date || '').slice(0, 10);
  const consultantId = String(req.query.consultant_id || CONSULTANTS[0].id);
  const consultant = CONSULTANTS.find((item) => item.id === consultantId);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ success: false, message: 'date must be YYYY-MM-DD' });
  }
  if (!consultant) return res.status(400).json({ success: false, message: 'Selected consultant is not available.' });

  const day = new Date(`${date}T12:00:00+05:30`).getDay();
  if (day === 0) return res.json({ success: true, data: { consultant, slots: [] } });

  const dayStart = new Date(`${date}T00:00:00+05:30`);
  const dayEnd = new Date(`${date}T23:59:59+05:30`);
  const [booked, configuredSlots] = await Promise.all([
    Meeting.find({ consultant_id: consultant.id, starts_at: { $gte: dayStart, $lte: dayEnd }, status: 'confirmed' }).select('starts_at').lean(),
    MeetingSlot.find({ consultant_id: consultant.id, starts_at: { $gte: dayStart, $lte: dayEnd }, is_available: true }).sort({ starts_at: 1 }).lean(),
  ]);
  const bookedTimes = new Set(booked.map((meeting) => meeting.starts_at.toISOString()));

  const slots = configuredSlots.map((slot) => {
    return {
      id: slot.starts_at.toISOString(),
      starts_at: slot.starts_at,
      ends_at: slot.ends_at,
      available: slot.starts_at.getTime() > Date.now() && !bookedTimes.has(slot.starts_at.toISOString()),
    };
  });

  return res.json({ success: true, data: { consultant, slots } });
}));

router.post('/', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const { starts_at, topic, consultant_id } = req.body;
  const consultant = CONSULTANTS.find((item) => item.id === consultant_id);
  const startsAt = new Date(starts_at);
  if (!consultant) return res.status(400).json({ success: false, message: 'Select an available specialist.' });
  if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() <= Date.now()) {
    return res.status(400).json({ success: false, message: 'Choose a future meeting slot.' });
  }

  const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000);
  const configuredSlot = await MeetingSlot.findOne({ consultant_id: consultant.id, starts_at: startsAt, is_available: true }).lean();
  if (!configuredSlot) return res.status(400).json({ success: false, message: 'This time is no longer available. Please choose another slot.' });
  if (configuredSlot.ends_at.getTime() !== endsAt.getTime()) return res.status(400).json({ success: false, message: 'Invalid meeting slot duration.' });
  try {
    // The Meet link is generated on approval, not at booking time — an
    // unapproved request should not hand out a joinable link.
    const meeting = await Meeting.create({
      user_id: req.user!._id,
      org_id: req.user!.org_id,
      consultant_id: consultant.id,
      consultant_name: consultant.name,
      starts_at: startsAt,
      ends_at: endsAt,
      topic: String(topic || 'Compliance consultation'),
    });

    // Staff need to see the request immediately.
    try {
      const staff = await User.find({ role: { $in: ADMIN_ROLES } }).select('_id').lean();
      if (staff.length) {
        await Notification.insertMany(staff.map((u: any) => ({
          user_id: u._id,
          type: 'meeting_request',
          title: 'New meeting request',
          body: `${req.user!.name} requested ${consultant.name} on ${startsAt.toLocaleString()}`,
          data: { meetingId: String(meeting._id) },
        })));
      }
    } catch (e) {
      logger.warn(`[meetings] staff notification failed: ${String(e)}`);
    }

    return res.status(201).json({
      success: true,
      data: {
        id: meeting._id,
        status: meeting.status,
        starts_at: meeting.starts_at,
        ends_at: meeting.ends_at,
        consultant,
        meeting_url: meeting.meeting_url ?? null,
        meeting_provider: 'google_meet',
        meeting_message: 'Request received. Our team will confirm your slot shortly and send the meeting link.',
      },
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: 'This slot was just booked. Please choose another time.' });
    }
    throw error;
  }
}));

// ── Admin: see and manage every booking ────────────────────────────────────
router.get('/', authenticate, requireRole(...ADMIN_ROLES), wrap(async (req: AuthRequest, res: Response) => {
  const filter: any = {};
  if (req.query.status) filter.status = req.query.status;

  const meetings = await Meeting.find(filter)
    .populate('user_id', 'name email phone')
    .sort({ starts_at: 1 })
    .limit(500)
    .lean();

  return res.json({ success: true, data: meetings });
}));

router.put('/:id/status', authenticate, requireRole(...ADMIN_ROLES), wrap(async (req: AuthRequest, res: Response) => {
  const status = String(req.body?.status ?? '');
  if (!['approved', 'rejected', 'cancelled'].includes(status)) {
    return res.status(400).json({ success: false, message: 'status must be approved, rejected or cancelled.' });
  }

  const meeting = await Meeting.findById(req.params.id).populate('user_id', 'name email');
  if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found.' });

  // Approving generates the Google Meet link, so a link only ever exists for a
  // meeting staff actually agreed to.
  let meetingMessage: string | undefined;
  if (status === 'approved' && !meeting.meeting_url) {
    const url = await createGoogleMeet({
      title: 'Sanyog Conformity consultation',
      startsAt: meeting.starts_at,
      endsAt: meeting.ends_at,
      attendeeEmail: (meeting.user_id as any)?.email ?? '',
    });
    if (url) meeting.meeting_url = url;
    else meetingMessage = 'Approved, but the Google Meet link could not be created — add one manually.';
  }

  meeting.status = status as any;
  meeting.decided_by = req.user!._id as any;
  meeting.decided_at = new Date();
  if (req.body?.note) meeting.decision_note = String(req.body.note).slice(0, 1000);
  await meeting.save();

  await audit({
    actor: req.user!._id as any,
    resource_type: 'meeting',
    resource_id: meeting._id as any,
    action: 'status_changed',
    notes: `meeting:${status}`,
  });

  // Tell the customer.
  try {
    const ownerId = String((meeting.user_id as any)?._id ?? meeting.user_id);
    const title = status === 'approved' ? 'Meeting confirmed' : status === 'rejected' ? 'Meeting request declined' : 'Meeting cancelled';
    const body = status === 'approved'
      ? `Your consultation with ${meeting.consultant_name} is confirmed.${meeting.meeting_url ? ' Tap to join.' : ''}`
      : `Your consultation with ${meeting.consultant_name} was ${status}.`;

    await Notification.create({
      user_id: ownerId, type: 'meeting_update', title, body,
      data: { meetingId: String(meeting._id), status, meetingUrl: meeting.meeting_url ?? null },
    });
    await notificationService.sendPush(ownerId, title, body, { meetingId: String(meeting._id) });
  } catch (e) {
    logger.warn(`[meetings] customer notification failed: ${String(e)}`);
  }

  return res.json({ success: true, data: meeting, message: meetingMessage });
}));

router.get('/mine', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  // Was hardcoded to status:'confirmed', so a user could never see their own
  // pending, approved or rejected bookings — the approval outcome never
  // reached the app. Return every booking and let the client render status.
  const filter: any = { user_id: req.user!._id };
  if (req.query.status) filter.status = req.query.status;

  const meetings = await Meeting.find(filter).sort({ starts_at: 1 }).lean();
  return res.json({ success: true, data: meetings });
}));

export default router;

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../../middleware/authMongo';
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
    const meetingUrl = await createGoogleMeet({
      title: 'Sanyog Conformity consultation',
      startsAt,
      endsAt,
      attendeeEmail: req.user!.email,
    });
    const meeting = await Meeting.create({
      user_id: req.user!._id,
      org_id: req.user!.org_id,
      consultant_id: consultant.id,
      consultant_name: consultant.name,
      starts_at: startsAt,
      ends_at: endsAt,
      topic: String(topic || 'Compliance consultation'),
      meeting_url: meetingUrl ?? undefined,
    });

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
        meeting_message: meeting.meeting_url
          ? 'Google Meet link created.'
          : 'Meeting confirmed. A Google Meet link will be sent by the support team.',
      },
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: 'This slot was just booked. Please choose another time.' });
    }
    throw error;
  }
}));

router.get('/mine', authenticate, wrap(async (req: AuthRequest, res: Response) => {
  const meetings = await Meeting.find({ user_id: req.user!._id, status: 'confirmed' }).sort({ starts_at: 1 }).lean();
  return res.json({ success: true, data: meetings });
}));

export default router;

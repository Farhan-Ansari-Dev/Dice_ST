/**
 * Notification routes — list, mark-read, register push tokens, web push subs.
 */
import { Router, Response } from 'express';
import { Notification, User } from '../../models';
import { registerDevice, disableDevice } from '../../services/notifications/sns';
import { authenticate, AuthRequest } from '../../middleware/authMongo';

const router = Router();
router.use(authenticate);

// ─── Inbox ─────────────────────────────────────────────────────
// GET /notifications?unread=true&limit=50
router.get('/', async (req: AuthRequest, res: Response) => {
  const { unread, limit = '50' } = req.query as Record<string, string>;
  const filter: any = { user_id: req.user!._id };
  if (unread === 'true') filter.read_at = { $exists: false };

  const items = await Notification.find(filter)
    .sort({ created_at: -1 })
    .limit(parseInt(limit, 10))
    .lean();

  const unreadCount = await Notification.countDocuments({
    user_id: req.user!._id,
    read_at: { $exists: false },
  });

  return res.json({ data: items, unread_count: unreadCount });
});

// PUT /notifications/:id/read
router.put('/:id/read', async (req: AuthRequest, res: Response) => {
  await Notification.updateOne(
    { _id: req.params.id, user_id: req.user!._id },
    { $set: { read_at: new Date() } }
  );
  return res.json({ success: true });
});

// PUT /notifications/read-all
router.put('/read-all', async (req: AuthRequest, res: Response) => {
  await Notification.updateMany(
    { user_id: req.user!._id, read_at: { $exists: false } },
    { $set: { read_at: new Date() } }
  );
  return res.json({ success: true });
});

// DELETE /notifications/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await Notification.deleteOne({ _id: req.params.id, user_id: req.user!._id });
  return res.json({ success: true });
});

// ─── Mobile push tokens (native APNs/FCM → AWS SNS) ─────────────
// POST /notifications/push-tokens  { token, platform, appVersion? }
router.post('/push-tokens', async (req: AuthRequest, res: Response) => {
  const { token, platform, appVersion } = req.body;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'token required' });
  }
  if (platform !== 'ios' && platform !== 'android') {
    return res.status(400).json({ error: 'platform must be ios or android' });
  }

  await registerDevice({
    user_id: req.user!._id,
    platform,
    token,
    appVersion: typeof appVersion === 'string' ? appVersion : undefined,
  });
  return res.json({ success: true, platform });
});

// DELETE /notifications/push-tokens/:token  — logout / unregister (soft disable)
router.delete('/push-tokens/:token', async (req: AuthRequest, res: Response) => {
  await disableDevice({ user_id: req.user!._id, token: req.params.token });
  return res.json({ success: true });
});

// ─── Web Push subscriptions (VAPID) ────────────────────────────
// POST /notifications/webpush-subscriptions
router.post('/webpush-subscriptions', async (req: AuthRequest, res: Response) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'invalid_subscription' });
  }
  await User.updateOne(
    { _id: req.user!._id, 'webpush_subscriptions.endpoint': { $ne: endpoint } },
    {
      $addToSet: {
        webpush_subscriptions: { endpoint, keys, created_at: new Date() },
      },
    }
  );
  return res.json({ success: true });
});

// DELETE /notifications/webpush-subscriptions
router.delete('/webpush-subscriptions', async (req: AuthRequest, res: Response) => {
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ error: 'endpoint required' });
  await User.updateOne(
    { _id: req.user!._id },
    { $pull: { webpush_subscriptions: { endpoint } } }
  );
  return res.json({ success: true });
});

// ─── Notification preferences ──────────────────────────────────
// GET / PUT /notifications/preferences
router.get('/preferences', async (req: AuthRequest, res: Response) => {
  return res.json({ data: req.user!.notification_preferences ?? {} });
});

router.put('/preferences', async (req: AuthRequest, res: Response) => {
  await User.updateOne(
    { _id: req.user!._id },
    { $set: { notification_preferences: req.body } }
  );
  return res.json({ success: true });
});

// ─── Public VAPID key (for web frontend to subscribe) ──────────
router.get('/vapid-public-key', (_req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY ?? null });
});

export default router;

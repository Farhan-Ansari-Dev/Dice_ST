# DICE — Universal Push Notifications

> **One backend, three channels.** Mobile app (iOS + Android), Web (PWA admin),
> with email + SMS fallbacks for critical events.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              Application code                       │
│       await notify({ user_id, type, ... })          │
└──────────────────────┬──────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        ▼                              ▼
┌──────────────┐              ┌──────────────────┐
│ Save to      │              │ Choose channels  │
│ Notification │              │ by type + prefs  │
│ collection   │              └────────┬─────────┘
└──────────────┘                       │
                       ┌───────────────┼─────────────────┐
                       ▼               ▼                 ▼
              ┌────────────────┐ ┌─────────────┐ ┌──────────────┐
              │ Mobile push    │ │  Web push   │ │  Email (SES) │
              │ (Expo)         │ │  (VAPID)    │ │  + SMS       │
              │  ↓             │ │   ↓         │ │  (MSG91)     │
              │ iOS APNs       │ │ Browser     │ │              │
              │ Android FCM    │ │ Service     │ │              │
              └────────────────┘ │ Worker      │ └──────────────┘
                                 └─────────────┘
```

---

## Channel Selection Matrix

| Notification type | in_app | Mobile push | Web push | Email | SMS |
|---|:---:|:---:|:---:|:---:|:---:|
| **Critical** (cert revoked, security alert, payment failed) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Time-sensitive** (cert expiry, docs required, cert issued) | ✅ | ✅ | ✅ | ✅ | — |
| **Routine** (status change, comment, task assigned) | ✅ | ✅ | ✅ | — | — |
| **Marketing** (newsletter, feature announcement) | — | — | — | ✅* | — |
| **Digest** (weekly summary) | — | — | — | ✅ | — |

*Only if user has consented to marketing (DPDP/GDPR compliant).

User can override per-type in their notification settings.

---

## 📱 Mobile (React Native + Expo)

### Backend already implemented

`src/services/notifications/push.ts` → `sendExpoPush()`

- Validates Expo push tokens
- Batches messages (Expo max 100/req)
- Returns delivery tickets
- Reports dead tokens (auto-cleanup hook)

### Mobile client integration (already exists)

In `mobile-app/src/services/pushNotificationService.ts`:

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export async function registerForPushNotifications() {
  if (!Device.isDevice) return null;

  // Request permission
  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return null;

  // Android channel (required for high-priority)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6C63FF',
    });
  }

  // Get token
  const projectId = '1d04926d-1f47-4d73-b16e-3166301f0791';
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

  // Register with backend
  await api.post('/notifications/push-tokens', { token, platform: Platform.OS });

  return token;
}

// Foreground handler — show as banner even when app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Tap handler — deep link
Notifications.addNotificationResponseReceivedListener(response => {
  const data = response.notification.request.content.data;
  if (data?.deep_link) {
    // Navigate via react-navigation linking config
    Linking.openURL(data.deep_link);
  }
});
```

### Backend endpoint to register tokens

```typescript
// POST /api/v1/notifications/push-tokens
router.post('/push-tokens', authenticate, async (req, res) => {
  const { token, platform } = req.body;
  if (!Expo.isExpoPushToken(token)) {
    return res.status(400).json({ error: 'invalid token format' });
  }

  await User.updateOne(
    { _id: req.user._id },
    { $addToSet: { expo_push_tokens: token } }
  );

  await audit({
    actor: req.user._id,
    resource_type: 'user',
    resource_id: req.user._id,
    action: 'push_token_registered',
    after: { platform, token: token.slice(0, 20) + '...' },
  });

  res.json({ success: true });
});

// DELETE /api/v1/notifications/push-tokens/:token  (on logout)
router.delete('/push-tokens/:token', authenticate, async (req, res) => {
  await User.updateOne(
    { _id: req.user._id },
    { $pull: { expo_push_tokens: req.params.token } }
  );
  res.json({ success: true });
});
```

---

## 🌐 Web (Admin Portal + Client Portal — PWA)

### One-time VAPID key generation

```bash
npx web-push generate-vapid-keys
# Output:
#   Public Key: BNm... (88 chars)
#   Private Key: M5K...
```

Add to `/etc/dice/.env`:
```env
VAPID_PUBLIC_KEY=BNm...
VAPID_PRIVATE_KEY=M5K...
VAPID_SUBJECT=mailto:admin@sanyogconformity.com
```

The **public key** also goes to your frontend (it's public, safe to embed).

### Web client integration

**1. Service Worker** (`admin-portal/public/sw.js`):

```javascript
self.addEventListener('push', event => {
  if (!event.data) return;
  const payload = event.data.json();

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon ?? '/icon-192.png',
      badge: payload.badge ?? '/badge-72.png',
      data: payload.data,
      requireInteraction: payload.data?.priority === 'high',
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clients => {
      // Focus existing tab if open, else open new
      const existing = clients.find(c => c.url.includes(url));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
```

**2. React subscription hook** (`admin-portal/src/hooks/useWebPush.ts`):

```typescript
import { useEffect, useState } from 'react';
import api from '../api';

const PUBLIC_VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export function useWebPush() {
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  async function subscribe() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push not supported in this browser');
      return null;
    }

    const reg = await navigator.serviceWorker.register('/sw.js');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
    });

    // Send to backend
    await api.post('/notifications/webpush-subscriptions', {
      endpoint: sub.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(sub.getKey('p256dh')),
        auth:   arrayBufferToBase64(sub.getKey('auth')),
      },
    });

    setSubscription(sub);
    return sub;
  }

  async function unsubscribe() {
    if (!subscription) return;
    await subscription.unsubscribe();
    await api.delete('/notifications/webpush-subscriptions', {
      data: { endpoint: subscription.endpoint },
    });
    setSubscription(null);
  }

  return { subscription, subscribe, unsubscribe };
}

// Helpers
function urlBase64ToUint8Array(b64: string): Uint8Array {
  const padding = '='.repeat((4 - b64.length % 4) % 4);
  const base64 = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}
```

### Backend endpoint for Web Push subscriptions

```typescript
// POST /api/v1/notifications/webpush-subscriptions
router.post('/webpush-subscriptions', authenticate, async (req, res) => {
  const { endpoint, keys } = req.body;

  await User.updateOne(
    { _id: req.user._id },
    {
      $addToSet: {
        webpush_subscriptions: { endpoint, keys, created_at: new Date() },
      },
    }
  );

  res.json({ success: true });
});

// DELETE /api/v1/notifications/webpush-subscriptions
router.delete('/webpush-subscriptions', authenticate, async (req, res) => {
  await User.updateOne(
    { _id: req.user._id },
    { $pull: { webpush_subscriptions: { endpoint: req.body.endpoint } } }
  );
  res.json({ success: true });
});
```

**Add to User schema:**
```typescript
webpush_subscriptions: [
  {
    endpoint: String,
    keys: { p256dh: String, auth: String },
    created_at: { type: Date, default: Date.now },
    _id: false,
  },
]
```

---

## 📧 Email (AWS SES)

### SES setup checklist

1. **AWS Console → SES (Mumbai region)**
2. **Verify domain** → add the DKIM CNAME + TXT records to Cloudflare DNS
3. **Request production access** (exit sandbox) — 24h approval
4. **Verify from-address:** `noreply@sanyogconformity.com`
5. **Set bounce + complaint topics** — SNS → store metrics

### Cost
- **Free tier:** 62,000 emails/month if sent from EC2
- **After:** $0.10 per 1,000 emails
- **Realistic at 5k DAU:** ~10k emails/month → **free**

---

## 📲 SMS (MSG91 for India)

### DLT compliance (mandatory for Indian SMS since 2021)

1. Register entity at **trai.gov.in** (1 week approval)
2. Approve sender ID (`SCSOLN`) — 3 days
3. Submit each message template for approval — 1 day each
4. Once approved, MSG91 references template ID

### Templates to register

| Type | Template (mock — must approve actual wording) |
|---|---|
| OTP | `Your DICE OTP is {var1}. Valid for 10 minutes. -SCSOLN` |
| Cert expiry | `Hi {var1}, your certificate {var2} expires in {var3} days. Initiate renewal at app.sanyogconformity.com -SCSOLN` |
| Payment failed | `Payment of ₹{var1} for application {var2} failed. Please retry. -SCSOLN` |

### Cost
- **MSG91:** ₹0.16–0.25 per SMS
- **Use sparingly:** OTP + critical alerts only
- **Estimated:** 5k DAU × 5 OTP/month avg × ₹0.20 = **₹5,000/month** (largest single SMS cost — budget for it)

---

## Notification Preferences (per-user)

Each user can configure preferences (stored on their User document):

```typescript
user.notification_preferences = {
  push: {
    cert_expiry: true,
    app_status: true,
    comments: true,
    marketing: false,
  },
  email: {
    cert_expiry: true,
    app_status: true,
    weekly_digest: true,
    marketing: false,
  },
  sms: {
    critical_only: true,  // SMS only for critical events
  },
  quiet_hours: { start: '22:00', end: '07:00', timezone: 'Asia/Kolkata' },
};
```

When sending, `notify()` checks these preferences and skips channels the user has muted.

---

## Testing Push Notifications

### Mobile
```bash
# Send a test push from your terminal
curl -X POST https://exp.host/--/api/v2/push/send \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "ExponentPushToken[xxx]",
    "title": "Test 🧪",
    "body": "If you see this, push works!"
  }'
```

### Web
```javascript
// In browser console after registering subscription
fetch('/api/v1/notifications/test-push', { method: 'POST', credentials: 'include' });
```

---

## Confirmed: Push Notifications ✅

| Platform | Status | Implementation |
|---|---|---|
| iOS (mobile) | ✅ Ready | Expo Push → APNs |
| Android (mobile) | ✅ Ready | Expo Push → FCM v1 |
| Chrome/Edge/Firefox (web) | ✅ Ready | VAPID Web Push API |
| Safari (web) | ✅ Ready (macOS 13+) | Web Push API (same code) |
| Email fallback | ✅ Ready | AWS SES with HTML template |
| SMS (critical only) | ✅ Ready | MSG91 (India) / Twilio (intl) |

All channels go through one `notify()` function → consistent, testable, easy to monitor.

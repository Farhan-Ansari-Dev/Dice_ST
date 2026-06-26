# DICE — App Architecture

> **Compliance SaaS Platform** · How every piece connects

---

## High-Level Diagram

```
┌───────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                               │
│  LAYER 1 ──                                                                                   │
│  Auth Layer                ┌──────────────────────────────────────────────────────────┐       │
│                            │  OTP + JWT Auth                       custom-built       │       │
│                            │  • POST /auth/send-otp  → AWS SES (email) | MSG91 (SMS)  │       │
│                            │  • POST /auth/verify-otp → issue access + refresh JWT    │       │
│                            │  • POST /auth/refresh   → rotate tokens                  │       │
│                            │  • TOTP 2FA for admins (optional)                        │       │
│                            └──────────────────────┬───────────────────────────────────┘       │
│                                                   │ JWT (15min) + Refresh (30d)               │
│                          ┌────────────────────────┴────────────────────────┐                  │
│                          ▼                                                 ▼                  │
│                                                                                               │
│  LAYER 2 ──     ┌─────────────────────────────────┐    ┌──────────────────────────────┐       │
│  Data Layer     │  MongoDB Atlas M2 (Mumbai)      │    │  AWS S3 (Mumbai)             │       │
│                 │  ──────────────────────────────  │    │  ─────────────────────────── │       │
│                 │  • users           • workflows  │    │  • orgs/{id}/docs/v{n}-.pdf  │       │
│                 │  • organizations   • payments   │    │  • backups/mongodb/*         │       │
│                 │  • products        • tasks      │    │  • thumbnails/               │       │
│                 │  • applications    • comments   │    │                              │       │
│                 │  • certifications  • notifications│   │  + Versioning ON             │       │
│                 │  • documents       • audit_logs │    │  + Lifecycle (Hot→IA→Glacier)│       │
│                 │  • document_versions   (time-series)│ │  + AES-256 server-side enc.  │       │
│                 └─────────────────┬───────────────┘    └──────────────┬───────────────┘       │
│                                   │                                   │                       │
│                                   │ Mongoose v8 ODM                   │ presigned URLs        │
│                                   ▼                                   ▼                       │
│                 ┌─────────────────────────────────────────────────────────────────────┐       │
│                 │  Node.js + Express API (EC2 t4g.small · Mumbai)         /api/v1     │       │
│                 │  ─────────────────────────────────────────────────────────────────  │       │
│                 │  Routes:                          Services:                         │       │
│                 │   • /auth                          • notifications (push/email/sms) │       │
│                 │   • /users                         • documentService (S3 + versions)│       │
│                 │   • /organizations                 • razorpayService                │       │
│                 │   • /applications  (state machine) • aiService (OpenAI GPT-4o)      │       │
│                 │   • /certifications (lifecycle)    • auditService (immutable logs)  │       │
│                 │   • /documents (presigned uploads) • workflowEngine                 │       │
│                 │   • /notifications                                                  │       │
│                 │   • /workflows (BIS/EPR/TEC/LMPC/FSSAI)                             │       │
│                 │   • /payments (Razorpay webhook)                                    │       │
│                 │                                                                     │       │
│                 │  Real-time: Socket.io (status changes, comments, presence)          │       │
│                 │  Background jobs: cert expiry · stale apps · audit cleanup          │       │
│                 └────────┬──────────────────────────────────────────────┬─────────────┘       │
│                          │                                              │                     │
│                          │ HTTPS via Caddy + Cloudflare                 │ Socket.io           │
└──────────────────────────┼──────────────────────────────────────────────┼─────────────────────┘
                           ▼                                              ▼
                  ┌────────────────────────────────────────────────────────────────────┐
                  │                                                                    │
                  │  THREE CLIENTS                                                     │
                  │                                                                    │
                  │  📱 Mobile (Expo SDK 54)        💼 Admin (React + Vite)            │
                  │  🖥️  Client Portal (React + Vite)                                  │
                  │                                                                    │
                  └────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                               │
│  LAYER 3 ──    Mobile State Stores (Zustand)        Admin State Stores                        │
│  State Layer   ────────────────────────────         ────────────────────                      │
│                                                                                               │
│                🐻 authStore         tokens,user     🐻 dashboardStore   stats, charts         │
│                🐻 applicationStore  list, filters   🐻 userMgmtStore    users + roles         │
│                🐻 certificationStore renewal flags  🐻 workflowStore    edit BIS/EPR config   │
│                🐻 notificationStore unread count    🐻 auditViewerStore search audit logs     │
│                🐻 bookmarkStore     saved insights  🐻 reportStore      compliance exports    │
│                🐻 appStore          theme, locale                                             │
│                                                                                               │
└───────────────────────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                               │
│  LAYER 4 ──    📱 Mobile App (React Navigation)        💼 Admin Portal (React Router)         │
│  UI Layer      ──────────────────────────────────       ──────────────────────────────────   │
│                                                                                               │
│                ┌───────────┐ ┌───────────┐ ┌────────┐  ┌────────────┐ ┌──────────────┐        │
│                │   Home    │ │   Apps    │ │ Certs  │  │ Dashboard  │ │  User mgmt   │        │
│                │ AI search │ │  Kanban   │ │timeline│  │  charts    │ │  roles/perms │        │
│                └───────────┘ └───────────┘ └────────┘  └────────────┘ └──────────────┘        │
│                ┌───────────┐ ┌───────────┐ ┌────────┐  ┌────────────┐ ┌──────────────┐        │
│                │ Documents │ │ Insights  │ │Profile │  │ Application│ │  Workflows   │        │
│                │ uploader  │ │  feed     │ │settings│  │  review    │ │   editor     │        │
│                └───────────┘ └───────────┘ └────────┘  └────────────┘ └──────────────┘        │
│                ┌───────────┐ ┌───────────┐ ┌────────┐  ┌────────────┐ ┌──────────────┐        │
│                │ Payments  │ │ AI Chat   │ │  Team  │  │ Audit logs │ │  Billing     │        │
│                │ Razorpay  │ │  GPT-4o   │ │ tasks  │  │ time-series│ │  invoices    │        │
│                └───────────┘ └───────────┘ └────────┘  └────────────┘ └──────────────┘        │
│                                                                                               │
│                168 screens / 12 modules                40+ admin screens                      │
│                                                                                               │
└───────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Infrastructure Layer (Below the App)

```
                            🌐 Cloudflare (Free tier)
                            • DNS · DDoS · CDN · WAF · SSL
                                       │
                                       ▼
                        ┌─────────────────────────────┐
                        │  AWS EC2 t4g.small Mumbai   │  $12/mo
                        │  Ubuntu 22.04 · ARM Graviton│
                        │  ┌───────────────────────┐  │
                        │  │ Caddy (auto-HTTPS)    │  │
                        │  │   ↓ reverse proxy     │  │
                        │  │ PM2 cluster (2x Node) │  │
                        │  │   ↓                   │  │
                        │  │ Express API v2.0      │  │
                        │  └───────────────────────┘  │
                        └──────┬─────────────┬────────┘
                               │             │
                ┌──────────────┘             └──────────────┐
                ▼                                           ▼
       ┌─────────────────────┐                 ┌──────────────────────┐
       │  MongoDB Atlas M2   │  $9/mo          │   AWS S3 (Mumbai)    │  ~$8/mo
       │  Mumbai · 2GB · PITR│                 │   docs + backups     │
       │  ──────────────     │                 │   ──────────────     │
       │  3-node replica set │                 │   Versioning ON      │
       │  Daily snapshots    │                 │   Lifecycle policy   │
       └─────────────────────┘                 │   Cross-region DR    │
                                               └──────────────────────┘

       Total: ~₹3,000/mo  ·  Scales to 5k DAU before any upgrade
```

---

## Tech Stack Cheat Sheet

| Layer | DICE Stack |
|---|---|
| **Mobile** | Expo SDK 54 · React Native 0.81 · TypeScript · Zustand · React Navigation 6 · Reanimated 3 |
| **Web Admin** | React + Vite · Zustand · React Router · TanStack Query · TailwindCSS |
| **Auth** | OTP (email/SMS) · JWT + refresh rotation · bcrypt · optional TOTP 2FA |
| **Backend** | Node.js 20 · Express · Mongoose · Socket.io · Caddy · PM2 cluster |
| **Database** | MongoDB Atlas M2 (Mumbai) · Time-series for audit_logs · TTL indexes for OTP/notifications |
| **Storage** | AWS S3 (Mumbai) · presigned PUT uploads · versioned · lifecycle to Glacier |
| **Push** | Expo Push (mobile iOS+Android) · VAPID Web Push · AWS SES (email) · MSG91 (SMS India) |
| **Payments** | Razorpay (UPI · cards · netbanking · subscriptions) |
| **AI** | OpenAI GPT-4o (chat assistant · doc analysis · insight summaries) |
| **CDN** | Cloudflare Free (DNS · DDoS · WAF · 270+ PoPs cache) |
| **Hosting** | AWS EC2 t4g.small (Mumbai) · Elastic IP · Atlas M2 · S3 |
| **CI/CD** | GitHub Actions · push-to-deploy via SSH/SSM · zero-downtime PM2 reload |
| **Monitoring** | CloudWatch + Sentry (free) + Better Stack + UptimeRobot |

---

## Data Flow — Real Example: User uploads a BIS test report

```
1. Mobile app   →  POST /documents/presign
                   { filename, sha256, doc_type:"bis_test_report" }
                                │
2. Backend      →  AWS S3       │  generates presigned PUT URL (15min expiry)
                   ◄────────────┘
                   { url: "https://s3.../docs/.../v1-report.pdf?X-Amz-..." }

3. Mobile app   →  Direct upload to S3 (browser/RN → S3, bypasses backend)
                   PUT https://s3.../...

4. Mobile app   →  POST /documents/finalize
                   { s3_key, name, doc_type, sha256, application_id }
                                │
5. Backend      →  • Verify S3 object exists (HEAD request)
                   • Create Document doc in MongoDB
                   • Create immutable DocumentVersion (v1)
                   • Link to Application
                   • Write AuditLog entry
                   • Trigger async OCR + AI analysis
                   • Call notify() → push notification to assignees

6. notify()     →  ┌─ in_app  → Notification doc in MongoDB
                   ├─ push    → Expo Push API (iOS + Android)
                   ├─ push    → VAPID Web Push (admin dashboard)
                   └─ email   → AWS SES (template "doc_uploaded")

7. Real-time    →  Socket.io  → all admin dashboards in same org
                   "doc_uploaded" event → triggers in-app refresh

8. Cron (later) →  certExpiryReminder runs daily 09:30 IST
                   ↓ scans certifications collection
                   ↓ for each expiring cert → notify() chain again
```

---

## How Each Layer Connects to the Next

| Layer | Talks via | To | Result |
|---|---|---|---|
| Mobile UI | axios + Zustand actions | Backend `/api/v1/*` | JWT-signed REST calls |
| Backend routes | Mongoose models | Atlas | Document CRUD with indexes |
| Backend services | AWS SDK | S3 / SES | File uploads + emails |
| Backend cron | bulkNotify() | Expo / VAPID / SES / MSG91 | Multi-channel alerts |
| Frontend → Backend | Socket.io | EC2 :443 (via Caddy) | Real-time status updates |
| EC2 → Atlas | mongodb+srv TLS | Mumbai cluster | All DB queries |
| EC2 → S3 | IAM instance role | Mumbai bucket | No static keys |
| User browser | HTTPS | Cloudflare edge | DDoS + cache + SSL |
| Cloudflare → EC2 | TLS origin pull | EC2 only allows CF IPs | Hidden origin |

---

This architecture handles **50k registered users / 5k DAU at ~₹3,000/month**.
Non-breaking upgrade path documented in `04-bootstrap-architecture.md`.

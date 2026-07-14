# DICE — Full Project Structure

> Sanyog Conformity Solutions — AI-powered compliance & certification management platform.
> Monorepo: Mobile App + Backend + Admin Dashboard + Shared utilities.

---

## Root Workspace

```
/Users/sanyogpc/Desktop/Dice_ST/
├── mobile-app/                 # React Native + Expo SDK 54 (iOS & Android)
├── backend/                    # Node.js + Express + MongoDB + Redis
├── admin-dashboard/            # React 18 + Vite 5 (internal operations)
├── shared/                     # Shared TypeScript types & constants
├── docs/                       # High-level architecture docs
├── docker-compose.yml          # Local infra orchestration
├── package.json                # Workspace root metadata
└── README.md
```

---

## 1. Mobile App (`mobile-app/`)

### Configuration

| File | Purpose |
|------|---------|
| `App.tsx` | Root React component with providers (theme, auth, query, nav) |
| `app.json` | Expo config: bundle IDs, permissions, deep links, plugins |
| `eas.json` | EAS build profiles: development, preview, production |
| `babel.config.js` | Babel transforms, Reanimated plugin |
| `metro.config.js` | Metro bundler config |
| `tsconfig.json` | TypeScript + path aliases (`@/*`, `@screens/*`) |
| `package.json` | Dependencies & scripts |

### Source Tree

```
mobile-app/src/
├── screens/                    # 15+ feature folders, 100+ screens
│   ├── auth/                   # Login, OTP, onboarding, biometric, app lock
│   ├── home/                   # Dashboard, compliance score, analytics
│   ├── certifications/         # Browse, apply, track, renew certifications
│   ├── applications/           # Application tracking & management
│   ├── documents/              # Document vault, expiry tracker, DigiLocker
│   ├── certificate-center/     # Certificate details, QR, download, share
│   ├── testing/                # Lab testing & inspection booking
│   ├── shipment/               # Shipment tracking, customs, port clearance
│   ├── payments/               # Razorpay payments, quotations, invoices
│   ├── communication/          # Chat, tickets, video consultation, experts
│   ├── insights/               # Regulatory news, AI feeds, alerts
│   ├── ai-assistant/           # AI chat, product scanner, regulation feed
│   ├── notifications/          # In-app notification list
│   └── profile/                # Profile, company, settings, security
│
├── navigation/                 # Navigation entry points
│   ├── RootNavigator.tsx       # Auth gate + splash + routing decision
│   ├── DrawerNavigator.tsx     # Main side-menu navigator
│   ├── AuthNavigator.tsx       # Auth-only stack
│   ├── MainTabNavigator.tsx    # Bottom tabs
│   └── stacks/                 # 12+ feature stack navigators
│
├── services/                   # API clients & business logic
│   ├── api.ts                  # Axios instance + interceptors
│   ├── authService.ts          # OTP, Google Sign-In, logout
│   ├── applicationsService.ts
│   ├── certificationsService.ts
│   ├── documentsService.ts
│   ├── paymentsService.ts
│   ├── notificationsService.ts
│   ├── pushNotificationService.ts
│   ├── insightsService.ts
│   └── [others]
│
├── store/                      # Zustand global state
│   ├── authStore.ts            # Auth, user, onboarding flags
│   ├── configStore.ts          # Remote config & feature flags
│   ├── notificationStore.ts
│   ├── appStore.ts
│   └── bookmarkStore.ts
│
├── components/                 # Reusable UI
│   ├── common/                 # Buttons, inputs, badges, avatars, toasts
│   ├── charts/                 # BarChart, progress visuals
│   ├── home/                   # AI search bar, notification bell
│   └── navigation/             # Header, drawer items
│
├── hooks/                      # Custom React hooks
│   ├── useAppLock.ts
│   ├── usePushNotifications.ts
│   ├── useNetworkStatus.ts
│   ├── useCurrency.ts
│   └── useDebounce.ts
│
├── theme/                      # Dark/Light theme tokens
│   ├── index.ts
│   ├── colors.ts
│   └── typography.ts
│
├── config/
│   └── env.ts                  # Environment variables wrapper
│
├── utils/
│   ├── constants.ts            # App constants, onboarding options
│   ├── formatters.ts           # Date, currency, file-size formatters
│   └── i18n.ts                 # Internationalization
│
├── data/
│   ├── AISearchDB.ts           # AI search intent engine
│   └── aiResponses.ts          # AI response knowledge base
│
├── types/                      # Local TypeScript types
├── assets/                     # Images, fonts, icons
└── polyfills.ts
```

### Key Dependencies

- **Framework:** React Native 0.81.5, Expo SDK 54, React 19.1.0
- **Navigation:** `@react-navigation/native`, native-stack, drawer, bottom-tabs
- **State:** Zustand 4.5.4
- **Data Fetching:** React Query 5.51.23, Axios
- **Auth:** `@react-native-google-signin/google-signin`, `expo-auth-session`
- **Storage:** `expo-secure-store`
- **Local Auth:** `expo-local-authentication`
- **Notifications:** `expo-notifications`, Socket.io client
- **Camera/Media:** `expo-camera`, `expo-image-picker`, `expo-document-picker`
- **Payments:** `react-native-razorpay`
- **Charts:** `react-native-svg`, Recharts-like custom charts
- **Theming:** Custom theme system with dark/light support

---

## 2. Backend (`backend/`)

### Configuration

| File | Purpose |
|------|---------|
| `src/index.ts` | Server bootstrap, middleware, Socket.io, routes |
| `tsconfig.json` | TypeScript strict mode, ES2020 |
| `package.json` | Dependencies & scripts |
| `.env.example` | Environment variable template |
| `Dockerfile` | Container image |
| `docker-compose.yml` | Local backend + MongoDB + Redis |
| `jest.config.js` | Test runner config |

### Source Tree

```
backend/src/
├── routes/
│   ├── v2/                     # Main API (MongoDB-backed)
│   │   ├── auth.ts             # OTP, Google OAuth, JWT refresh/logout
│   │   ├── applications.ts     # Application CRUD + state transitions
│   │   ├── certifications.ts   # Certification lifecycle
│   │   ├── documents.ts        # Document upload & versioning
│   │   ├── users.ts            # User profile management
│   │   ├── organizations.ts    # Org/company management
│   │   ├── payments.ts         # Razorpay orders & webhooks
│   │   ├── notifications.ts    # Push/email/sms notifications
│   │   ├── analytics.ts        # Dashboard analytics
│   │   ├── insights.ts         # Regulatory news/insights
│   │   ├── shipments.ts        # Shipment tracking
│   │   ├── testing.ts          # Lab testing & inspection
│   │   ├── workflows.ts        # Certification workflow engine
│   │   ├── config.ts           # Remote config & feature flags
│   │   └── index.ts            # V2 router mount
│   ├── ai.ts                   # OpenAI/GPT integration
│   ├── insights.ts             # Public insights feed
│   ├── marketAccessRoutes.ts   # Market access rules
│   └── index.ts                # Main router aggregator
│
├── models/                     # Mongoose schemas (18 models)
│   ├── User.ts
│   ├── Organization.ts
│   ├── Application.ts
│   ├── Certification.ts
│   ├── Document.ts
│   ├── DocumentVersion.ts
│   ├── Product.ts
│   ├── ProductCategory.ts
│   ├── Shipment.ts
│   ├── Payment.ts
│   ├── Testing.ts
│   ├── Task.ts
│   ├── Comment.ts
│   ├── Insight.ts
│   ├── MarketCertification.ts
│   ├── MarketRequirement.ts
│   ├── Workflow.ts
│   ├── RemoteConfig.ts
│   ├── AIConversation.ts
│   └── AuditLog.ts
│
├── services/                   # Business logic
│   ├── aiService.ts
│   ├── documentService.ts
│   ├── emailService.ts         # AWS SES + SMTP fallback
│   ├── paymentService.ts       # Razorpay
│   ├── smsService.ts           # MSG91
│   ├── invoiceService.ts       # PDFKit
│   ├── marketAccessService.ts
│   └── notifications/          # Push, email, SMS handlers
│
├── controllers/
│   └── marketAccessController.ts
│
├── middleware/
│   ├── authMongo.ts            # JWT verification + user hydration
│   ├── authorize.ts            # Role-based access control
│   ├── errorHandler.ts
│   └── security.ts             # Helmet, CSP, rate limits
│
├── config/
│   ├── redis.ts
│   └── socket.ts
│
├── db/
│   ├── mongo.ts                # MongoDB connection
│   └── seed-*.ts               # Seed scripts
│
├── jobs/                       # Background jobs
│   ├── axiosCreeper.ts
│   ├── expiryReminder.ts
│   └── insightsScraper.ts
│
├── types/                      # Shared backend types
├── utils/
│   └── logger.ts               # Winston logger
└── __tests/                    # Jest tests
```

### Key Dependencies

- **Runtime:** Node.js 20+, Express 4.x, TypeScript
- **Database:** MongoDB (Mongoose), Redis
- **Auth:** JWT, `google-auth-library`, crypto OTP
- **Email:** Nodemailer + AWS SES + Gmail SMTP fallback
- **SMS:** MSG91
- **Payments:** Razorpay
- **AI:** OpenAI SDK
- **Files:** AWS S3, Multer
- **Docs:** PDFKit
- **Queue:** BullMQ (Redis)
- **Logging:** Winston
- **Testing:** Jest, Supertest

---

## 3. Admin Dashboard (`admin-dashboard/`)

### Configuration

| File | Purpose |
|------|---------|
| `src/App.tsx` | React Router with lazy-loaded pages |
| `src/main.tsx` | React DOM mount |
| `vite.config.ts` | Vite build config |
| `tsconfig.json` | TypeScript config |
| `package.json` | Dependencies |

### Source Tree

```
admin-dashboard/src/
├── pages/
│   ├── auth/
│   │   └── LoginPage.tsx
│   ├── dashboard/
│   │   └── DashboardPage.tsx
│   ├── clients/
│   │   └── ClientsPage.tsx
│   ├── applications/
│   │   └── ApplicationsPage.tsx
│   ├── certifications/
│   │   └── CertificationsPage.tsx
│   ├── documents/
│   │   └── DocumentsPage.tsx
│   ├── insights/
│   │   └── InsightsPage.tsx
│   ├── payments/
│   │   └── PaymentsPage.tsx
│   ├── shipments/
│   │   └── ShipmentsPage.tsx
│   ├── testing/
│   │   └── TestingPage.tsx
│   ├── employees/
│   │   └── EmployeesPage.tsx
│   ├── ai-assistant/
│   │   └── AIAssistantPage.tsx
│   ├── analytics/
│   │   └── AnalyticsPage.tsx
│   └── settings/
│       ├── SettingsPage.tsx
│       └── RemoteConfigPage.tsx
│
├── components/
│   ├── layout/
│   │   └── AppLayout.tsx
│   ├── auth/
│   ├── common/
│   │   ├── LoadingScreen.tsx
│   │   └── ToastContainer.tsx
│   └── [feature-specific]
│
├── services/
│   └── api.ts                  # Axios client for admin API
│
├── store/
│   ├── authStore.ts
│   ├── uiStore.ts
│   └── toastStore.ts
│
├── hooks/
├── utils/
└── styles/
```

### Key Dependencies

- **Framework:** React 18, Vite 5, TypeScript
- **Routing:** React Router DOM 6.26
- **State:** Zustand 4.5.4
- **Data Fetching:** React Query 5.51.21, Axios
- **Charts:** Recharts 2.12.7
- **UI:** Lucide React icons
- **Markdown:** React Markdown 10.1.0

---

## 4. Shared Utilities (`shared/`)

```
shared/
├── constants/
│   └── index.ts                # App-wide constants
└── types/
    └── index.ts                # Shared TypeScript interfaces
```

Used across mobile-app, backend, and admin-dashboard to keep contracts in sync.

---

## 5. Documentation

### Root Docs (`docs/`)

| File | Purpose |
|------|---------|
| `ARCHITECTURE.md` | System architecture overview |
| `PROJECT_STRUCTURE.md` | This file |
| `DETAILED_WORKFLOW.md` | End-to-end business workflows |
| `USER_LOGIN_WORKFLOW.md` | Authentication & role-based access |

### Backend Docs (`backend/docs/`)

| File | Purpose |
|------|---------|
| `00-SETUP-GUIDE.md` | Production deployment guide |
| `01-mongodb-schema.md` | Schema design & scaling notes |
| `02-disaster-recovery.md` | Backup & recovery |
| `03-cicd-pipeline.md` | CI/CD pipeline |
| `04-bootstrap-architecture.md` | Bootstrap architecture |
| `05-push-notifications.md` | Expo push integration |
| `06-app-architecture.md` | App architecture |
| `07-ops-runbook.md` | Operations runbook |

### Mobile App Docs (`mobile-app/docs/`)

| File | Purpose |
|------|---------|
| `AppFlow.md` | App flow overview |
| `AppScreenWorkflow.md` | Screen-by-screen workflow |
| `BackendSchema.md` | API schema reference |
| `ImplementationPlan.md` | Implementation plan |
| `PRD.md` | Product requirements |
| `TRD.md` | Technical requirements |
| `UIUXDesignBrief.md` | UI/UX design brief |
| `APP_FLOW_PERMISSIONS_STACK.md` | App flow, permissions, stack |

---

## 6. Infrastructure & Deployment

### Local Development

```bash
# Backend + MongoDB + Redis
cd backend && docker-compose up -d

# Mobile app
cd mobile-app && npm run android
# or
cd mobile-app && npm run ios

# Admin dashboard
cd admin-dashboard && npm run dev
```

### Production

- **Mobile:** EAS Build (Android + iOS), Play Store / App Store
- **Backend:** AWS EC2 / Docker / Railway / Render
- **Database:** MongoDB Atlas
- **Cache:** Redis (ElastiCache / Upstash)
- **Storage:** AWS S3
- **CDN:** Cloudflare
- **Email:** AWS SES primary, Gmail SMTP fallback
- **SMS:** MSG91
- **Payments:** Razorpay

---

## 7. Scale & Security Notes

- **Target scale:** 50k users, 2k–5k DAU
- **Auth:** OTP primary, Google OAuth, biometric app lock, JWT refresh rotation
- **Data residency:** `country_code` field drives regional policy
- **Audit:** Immutable `AuditLog` collection
- **Soft deletes:** `deleted_at` field on most models
- **Rate limiting:** In-memory Express rate-limit for OTP endpoints
- **File access:** S3 presigned URLs

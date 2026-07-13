# Technical Requirements Document (TRD)
## DICE by Sanyog — Mobile Application

**Version:** 1.0.0  
**Date:** June 2025  
**Tech Lead:** Sanyog Conformity Solutions Engineering  
**Status:** Active Development

---

## 1. Technology Stack

### 1.1 Mobile App

| Layer | Technology | Version |
|---|---|---|
| Framework | React Native (Expo managed) | SDK 51 |
| Language | TypeScript | 5.x |
| State Management | Zustand | 4.x |
| Navigation | React Navigation | v6 |
| HTTP Client | React Query + Axios | 5.x / 1.x |
| Local Storage | expo-secure-store | 13.x |
| Animations | React Native Animated, LayoutAnimation | Built-in |
| UI Components | Custom + Ionicons + LinearGradient | — |
| Push Notifications | expo-notifications | 0.28.x |
| Camera / Scan | expo-camera, expo-barcode-scanner | — |
| Biometrics | expo-local-authentication | — |
| File Handling | expo-document-picker, expo-file-system | — |

### 1.2 Backend (Planned)

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 LTS |
| Framework | Express.js / NestJS |
| Database | PostgreSQL 15 (primary), Redis (cache/sessions) |
| ORM | Prisma |
| Auth | JWT + Refresh Tokens |
| File Storage | AWS S3 / Cloudflare R2 |
| Push | Firebase Cloud Messaging (FCM) + APNs |
| Search | Elasticsearch (for regulations/news) |
| AI | OpenAI GPT-4 API |
| Hosting | AWS ECS / Railway |

---

## 2. Architecture

### 2.1 App Architecture

```
App.tsx
├── ThemeProvider (context)
├── QueryClientProvider
├── SafeAreaProvider
└── RootNavigator
    ├── SplashScreen (native + JS)
    ├── AuthNavigator (Onboarding → Login → OTP → UserType)
    └── DrawerNavigator
        ├── MainNavigator (Bottom Tabs)
        │   ├── HomeStackNavigator
        │   ├── CertificationsStackNavigator
        │   ├── ApplicationsStackNavigator
        │   ├── InsightsStackNavigator
        │   └── ProfileStackNavigator
        └── Additional Stacks (Documents, Payments, Shipment, etc.)
```

### 2.2 State Management

```
Zustand Stores:
├── useAuthStore        — user, token, refreshToken, onboarding state
├── useThemeStore       — mode: 'light' | 'dark' | 'system'
├── useNotificationStore — notifications[], unreadCount
└── useBookmarkStore    — bookmarkedIds[]
```

### 2.3 Theme System

- Two color palettes: `DarkColors`, `LightColors`
- `ThemeContext` resolves active colors based on mode + system scheme
- `useColorScheme()` drives system detection
- Persisted to `expo-secure-store` under key `scs_theme`
- `UIUserInterfaceStyle: Automatic` in `Info.plist` for native dark/light

---

## 3. Navigation Structure

```
RootNavigator (Stack)
├── SplashScreen
├── OnboardingScreen
├── LoginScreen
├── OTPScreen
├── UserTypeScreen
└── DrawerNavigator
    ├── HomeStack: Home
    ├── CertificationsStack: Certifications → CertDetail → CBComparison → CertCenter → CertDetails
    ├── ApplicationsStack: Applications → AppDetail → NewApp → TechnicalReview → ...
    ├── InsightsStack: Insights → InsightDetail → AIFeed → Circulars → ...
    ├── ProfileStack: Profile → EditProfile → Security → Notifications → Language → ...
    ├── DocumentsStack
    ├── PaymentsStack
    ├── ShipmentStack
    ├── CommunicationStack
    └── AIStack
```

---

## 4. API Design (Backend)

### 4.1 Authentication

```
POST   /auth/send-otp          { phone }
POST   /auth/verify-otp        { phone, otp } → { token, refreshToken, user }
POST   /auth/refresh            { refreshToken } → { token }
POST   /auth/logout
```

### 4.2 User / Profile

```
GET    /user/me
PUT    /user/me                 { name, phone, companyName, gstNumber, ... }
PUT    /user/onboarding         { businessRole, industries, targetMarkets, ... }
DELETE /user/me
```

### 4.3 Certifications

```
GET    /certifications                    ?status=active&type=BIS&page=1
GET    /certifications/:id
POST   /certifications                    { type, productName, standard, ... }
PUT    /certifications/:id
DELETE /certifications/:id
GET    /certifications/:id/timeline
GET    /certifications/expiring           ?daysAhead=30
```

### 4.4 Applications

```
GET    /applications                      ?status=pending&page=1
GET    /applications/:id
POST   /applications                      { certType, product, labId, ... }
PUT    /applications/:id/status
GET    /applications/:id/timeline
GET    /applications/:id/documents
POST   /applications/:id/documents       multipart/form-data
DELETE /applications/:id/documents/:docId
GET    /applications/:id/notes
POST   /applications/:id/notes           { text }
GET    /applications/:id/queries
POST   /applications/:id/queries/:qId/respond  { response }
```

### 4.5 Technical Review

```
GET    /applications/:id/technical-review
GET    /technical-reviews/:trId
GET    /technical-reviews/:trId/findings
GET    /technical-reviews/:trId/queries
POST   /technical-reviews/:trId/queries/:qId/respond  { response }
PUT    /technical-reviews/:trId           { status }
```

### 4.6 Documents

```
GET    /documents                         ?appId=&category=
POST   /documents/upload                  multipart/form-data
GET    /documents/:id/download
DELETE /documents/:id
```

### 4.7 Insights / News

```
GET    /insights                          ?category=BIS&page=1
GET    /insights/:id
POST   /insights/:id/bookmark
DELETE /insights/:id/bookmark
GET    /insights/bookmarks
```

### 4.8 Notifications

```
GET    /notifications                     ?page=1&unread=true
PUT    /notifications/:id/read
PUT    /notifications/read-all
POST   /notifications/register-token     { token, platform }
```

### 4.9 Payments

```
GET    /payments                          ?appId=
GET    /payments/:id
POST   /payments/initiate                 { appId, amount, method }
GET    /payments/:id/status
```

---

## 5. Data Models

### 5.1 User
```typescript
{
  id: string (UUID)
  phone: string (unique)
  email?: string
  name: string
  companyName: string
  role: 'admin' | 'manager' | 'viewer'
  gstNumber?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  subscription: 'free' | 'pro' | 'enterprise'
  businessRole?: string
  industries: string[]
  targetMarkets: string[]
  isVerified: boolean
  createdAt: DateTime
  updatedAt: DateTime
}
```

### 5.2 Application
```typescript
{
  id: string (UUID)
  appNo: string (auto-generated: SCS-YYYY-XXXX)
  userId: string
  certType: string
  product: string
  standard: string
  status: 'draft' | 'submitted' | 'under_review' | 'lab_testing' | 
          'technical_review' | 'approved' | 'rejected' | 'completed'
  progress: number (0–100)
  labId?: string
  assignedTo?: string
  submittedDate: DateTime
  estimatedCompletion?: DateTime
  amount: number
  paidAmount: number
  createdAt: DateTime
  updatedAt: DateTime
}
```

### 5.3 Certificate
```typescript
{
  id: string
  userId: string
  applicationId?: string
  certNo: string
  type: 'BIS' | 'EPR' | 'WPC' | 'FSSAI' | 'ISO' | 'CE'
  standard: string
  product: string
  issuedDate: DateTime
  expiryDate: DateTime
  issuingAuthority: string
  manufacturer: string
  status: 'active' | 'inactive' | 'expired' | 'revoked'
  createdAt: DateTime
}
```

### 5.4 TechnicalReview
```typescript
{
  id: string
  trNo: string
  applicationId: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  reviewDate?: DateTime
  reviewedBy: string
  assignedOfficer: string
  labReportNo: string
  labName: string
  summary?: string
  findings: Finding[]
  queries: Query[]
  createdAt: DateTime
}

Finding {
  id: string
  clause: string
  result: 'Pass' | 'Fail' | 'Pending'
  remarks: string
  status: 'pass' | 'fail' | 'pending'
}

Query {
  id: string
  question: string
  raisedBy: string
  date: DateTime
  status: 'open' | 'resolved'
  response?: string
  respondedAt?: DateTime
}
```

---

## 6. Security Requirements

| Requirement | Implementation |
|---|---|
| Auth tokens | JWT (15 min expiry) + Refresh Token (30 days) |
| Token storage | `expo-secure-store` (hardware-backed on iOS/Android) |
| Biometric lock | `expo-local-authentication` (Face ID / Fingerprint) |
| API transport | HTTPS only (TLS 1.3) |
| File uploads | Signed S3 URLs (15 min TTL) |
| Input validation | Server-side: Zod / class-validator |
| Rate limiting | 100 req/min per IP, 1000 req/min per auth user |
| OTP | 6-digit, 5 min TTL, max 3 attempts |

---

## 7. Performance Requirements

| Metric | Target |
|---|---|
| App cold start | < 2 seconds |
| Screen transition | < 300ms |
| API response (P95) | < 500ms |
| Image load (cached) | < 100ms |
| Bundle size | < 30 MB |
| Memory usage | < 200 MB |
| List scroll FPS | 60 FPS |

---

## 8. Error Handling

- All API errors return `{ error: string, code: string, statusCode: number }`
- Network errors → offline banner + retry button
- Token expiry → silent refresh, fallback to login
- Unhandled JS errors → `LogBox` in dev, Sentry in production
- Crash reports → Sentry with user context

---

## 9. Environment Configuration

```
EXPO_PUBLIC_API_URL=https://api.dicebysanyog.com/v1
EXPO_PUBLIC_SENTRY_DSN=...
EXPO_PUBLIC_GOOGLE_MAPS_KEY=...
EXPO_PUBLIC_OPENAI_KEY=...    # only used server-side
```

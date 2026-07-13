# Implementation Plan
## DICE by Sanyog — Mobile Application

**Version:** 1.0.0  
**Date:** June 2025  
**Status:** Active Development  
**Current Phase:** Phase 1 — MVP

---

## 1. Project Overview

DICE by Sanyog is a mobile-first certification and compliance management platform for Indian manufacturers, importers, and exporters. The implementation is divided into 4 phases across ~6 months from inception to production launch.

---

## 2. Development Phases

```
Phase 0  ─── Foundation & Setup           (Weeks 1–2)
Phase 1  ─── MVP Core Features            (Weeks 3–10)
Phase 2  ─── Advanced Features            (Weeks 11–16)
Phase 3  ─── Production Readiness         (Weeks 17–20)
Phase 4  ─── Post-Launch & Scale          (Ongoing)
```

---

## 3. Phase 0 — Foundation & Setup (Weeks 1–2)

### Goals
Establish development environment, project structure, and CI/CD pipeline.

### Deliverables

| Task | Owner | Status |
|---|---|---|
| Expo project init (SDK 51, TypeScript) | Mobile Dev | ✅ Done |
| React Navigation v6 structure | Mobile Dev | ✅ Done |
| Zustand store setup (auth, theme, notifications, bookmarks) | Mobile Dev | ✅ Done |
| ThemeContext with dark/light/system | Mobile Dev | ✅ Done |
| Custom component library (Button, Badge, Card, Avatar) | Mobile Dev | ✅ Done |
| App icon + splash screen (dark/light adaptive) | Mobile Dev | ✅ Done |
| PostgreSQL schema design | Backend Dev | ✅ Done |
| Prisma ORM setup | Backend Dev | ✅ Done |
| Express.js / NestJS project scaffold | Backend Dev | 🔄 In Progress |
| Git repository + branch strategy | DevOps | ✅ Done |
| CI pipeline (GitHub Actions) | DevOps | ⬜ Pending |
| Environment configs (.env structure) | Backend Dev | ✅ Done |

### Branch Strategy
```
main          ← production-ready only
develop       ← integration branch
feature/*     ← feature branches (merged via PR)
hotfix/*      ← critical fixes to main
```

---

## 4. Phase 1 — MVP Core Features (Weeks 3–10)

### Sprint Structure: 2-week sprints

---

### Sprint 1 (Weeks 3–4): Auth + Onboarding

**Priority: P0 — Must have for any user to access the app**

| Task | Priority | Estimate | Status |
|---|---|---|---|
| Login Screen UI (phone number input) | P0 | 1d | ✅ Done |
| OTP Screen UI (6-digit input, resend) | P0 | 1d | ✅ Done |
| Onboarding slides (3-screen carousel) | P0 | 1d | ✅ Done |
| User Type Selection screen | P0 | 0.5d | ✅ Done |
| Onboarding Profile screen (industries, markets) | P0 | 1d | ✅ Done |
| `POST /auth/send-otp` backend | P0 | 0.5d | ⬜ Pending |
| `POST /auth/verify-otp` backend | P0 | 0.5d | ⬜ Pending |
| JWT + Refresh Token implementation | P0 | 1d | ⬜ Pending |
| `PUT /user/onboarding` backend | P0 | 0.5d | ⬜ Pending |
| useAuthStore wired to real API | P0 | 1d | ⬜ Pending |
| Token storage in expo-secure-store | P0 | 0.5d | ✅ Done |
| Auto-login on app restart | P0 | 0.5d | ✅ Done |

**Sprint 1 Milestone:** User can register, verify OTP, complete onboarding, and be auto-logged in on restart.

---

### Sprint 2 (Weeks 5–6): Home + Navigation

**Priority: P0 — Core navigation and home screen**

| Task | Priority | Estimate | Status |
|---|---|---|---|
| Bottom Tab Navigator | P0 | 0.5d | ✅ Done |
| Drawer Navigator (left slide) | P0 | 1d | ✅ Done |
| Home Screen — greeting, stats | P0 | 1d | ✅ Done |
| Home Screen — Quick Actions | P0 | 0.5d | ✅ Done |
| Home Screen — Feature Carousel | P0 | 1d | ✅ Done |
| Home Screen — Avatar opens drawer | P0 | 0.5d | ✅ Done |
| NotificationBell component | P0 | 0.5d | ✅ Done |
| Notifications Screen | P1 | 1d | ✅ Done |
| `GET /user/me` backend | P0 | 0.5d | ⬜ Pending |
| Home stats from real API | P0 | 0.5d | ⬜ Pending |
| Pull-to-refresh on Home | P1 | 0.5d | ✅ Done |
| AI Search bar (UI only, Phase 2 backend) | P2 | 0.5d | ✅ Done |

**Sprint 2 Milestone:** Home screen fully functional with real user data, navigation working across all tabs.

---

### Sprint 3 (Weeks 7–8): Certifications + Applications

**Priority: P0 — Core product value**

| Task | Priority | Estimate | Status |
|---|---|---|---|
| Certifications Screen (list + filter) | P0 | 1d | ✅ Done |
| Certification Detail Screen (tabs) | P0 | 1.5d | ✅ Done |
| CB Comparison Screen | P1 | 1d | ✅ Done |
| Certificate Center Screen | P1 | 1d | ✅ Done |
| Applications Screen (list + kanban toggle) | P0 | 1.5d | ✅ Done |
| Application Detail Screen (tabs) | P0 | 2d | ✅ Done |
| Technical Review Screen | P0 | 2d | ✅ Done |
| New Application Screen (5-step wizard) | P0 | 2d | ✅ Done |
| `GET /certifications` backend | P0 | 1d | ⬜ Pending |
| `GET /applications` backend | P0 | 1d | ⬜ Pending |
| `POST /applications` backend | P0 | 1d | ⬜ Pending |
| `GET /applications/:id` backend | P0 | 0.5d | ⬜ Pending |
| Document upload (S3 presigned URLs) | P0 | 1d | ⬜ Pending |
| `GET/POST /technical-reviews` backend | P0 | 1d | ⬜ Pending |

**Sprint 3 Milestone:** Users can view and create applications, view certifications, and navigate Technical Review.

---

### Sprint 4 (Weeks 9–10): Insights + Profile + Payments

**Priority: P1 — Completes core feature set**

| Task | Priority | Estimate | Status |
|---|---|---|---|
| AI Insights Screen (feed + categories) | P1 | 1d | ✅ Done |
| Insight Detail Screen | P1 | 1d | ✅ Done |
| Bookmark functionality | P1 | 0.5d | ✅ Done |
| Saved Articles Screen | P1 | 0.5d | ✅ Done |
| Profile Screen | P0 | 1d | ✅ Done |
| Edit Profile Screen | P0 | 1d | ✅ Done |
| Security Settings Screen | P1 | 1d | ✅ Done |
| Notification Settings Screen | P1 | 0.5d | ✅ Done |
| Theme Settings Screen | P1 | 0.5d | ✅ Done |
| Language Settings Screen | P2 | 0.5d | ✅ Done |
| Payments Screen (history) | P1 | 1d | ✅ Done |
| `GET /insights` backend | P1 | 1d | ⬜ Pending |
| `PUT /user/me` backend | P0 | 0.5d | ⬜ Pending |
| Biometric auth (expo-local-authentication) | P1 | 1d | ⬜ Pending |
| `GET/POST /payments` backend | P1 | 1d | ⬜ Pending |
| Push notification registration | P1 | 1d | ⬜ Pending |

**Sprint 4 Milestone:** Full MVP feature set complete. App is functionally complete with all screens wired to backend.

---

## 5. Phase 2 — Advanced Features (Weeks 11–16)

### Sprint 5 (Weeks 11–12): AI Features

| Task | Priority | Estimate |
|---|---|---|
| AI Chat Screen (GPT-4 integration) | P1 | 2d |
| AI Assistant backend (`POST /ai/chat`) | P1 | 1.5d |
| AI Search (semantic search via embeddings) | P2 | 2d |
| AI Recommendations feed | P2 | 1.5d |
| AI-summarized circulars (GPT-4 pipeline) | P2 | 2d |
| Import/Export Alerts screen | P2 | 1d |
| Circular ingestion job (CRON) | P2 | 1.5d |

---

### Sprint 6 (Weeks 13–14): Documents + Shipment + Communication

| Task | Priority | Estimate |
|---|---|---|
| Documents Screen (upload, manage) | P1 | 1.5d |
| Document viewer (PDF + image) | P1 | 1d |
| Shipment Tracking Screen (map) | P2 | 2d |
| Google Maps / Mapbox integration | P2 | 1d |
| Communication Screen (in-app chat) | P1 | 2d |
| Chat backend (WebSocket or polling) | P1 | 2d |
| Support ticket creation | P2 | 1d |
| Govt Query Response from App Detail | P0 | 1d |

---

### Sprint 7 (Weeks 15–16): Push Notifications + Deep Links

| Task | Priority | Estimate |
|---|---|---|
| FCM integration (Android) | P0 | 1d |
| APNs integration (iOS) | P0 | 1d |
| Notification triggers (status change, expiry) | P0 | 2d |
| Deep linking setup (scheme + universal links) | P1 | 1.5d |
| In-app notification center improvements | P1 | 1d |
| Certificate expiry reminder CRON | P1 | 1d |
| Approval workflow screen | P2 | 1.5d |

---

## 6. Phase 3 — Production Readiness (Weeks 17–20)

### Sprint 8 (Weeks 17–18): Performance + Security

| Task | Priority | Estimate |
|---|---|---|
| Sentry integration (crash reporting) | P0 | 0.5d |
| API rate limiting middleware | P0 | 0.5d |
| API input validation (Zod schemas) | P0 | 1d |
| Image lazy loading + caching | P1 | 1d |
| React Query cache strategy optimization | P1 | 1d |
| Bundle size audit + optimization | P1 | 1d |
| Offline mode (read-only cached data) | P2 | 2d |
| Security audit (token storage, HTTPS, S3) | P0 | 1d |
| Remove dev bypasses (authStore temp flags) | P0 | 0.5d |
| Remove all console.log statements | P0 | 0.5d |

---

### Sprint 9 (Weeks 19–20): Testing + App Store

| Task | Priority | Estimate |
|---|---|---|
| E2E tests (Detox) for auth flow | P1 | 2d |
| E2E tests for application creation flow | P1 | 1.5d |
| Unit tests for stores + utilities | P1 | 2d |
| TestFlight / Internal Testing build | P0 | 0.5d |
| App Store Connect metadata (screenshots, description) | P0 | 1d |
| Google Play Console setup | P0 | 0.5d |
| App review compliance checklist | P0 | 0.5d |
| Production backend deployment (AWS ECS) | P0 | 1d |
| Database production setup (RDS) | P0 | 1d |
| CDN / CloudFront configuration | P1 | 0.5d |

**Phase 3 Milestone:** App approved on TestFlight and Google Play Beta. All P0 bugs resolved.

---

## 7. Phase 4 — Post-Launch & Scale (Month 4+)

| Feature | Priority | Phase |
|---|---|---|
| Hindi language support | P2 | 4.1 |
| Tamil language support | P2 | 4.1 |
| WhatsApp status update integration | P2 | 4.1 |
| AI Certificate Finder (barcode scan) | P2 | 4.2 |
| AI Product Quality Identifier | P2 | 4.2 |
| Team / Multi-user accounts | P2 | 4.2 |
| CB Performance Analytics dashboard | P2 | 4.2 |
| Web dashboard (React) | P3 | 4.3 |
| Direct BIS portal integration | P3 | 4.3 |
| Subscription billing (Razorpay Subscriptions) | P1 | 4.1 |

---

## 8. Feature Priority Matrix

| Priority | Definition | Examples |
|---|---|---|
| **P0** | Blocks app from shipping; must be in v1.0 | Auth, core nav, application CRUD, cert list |
| **P1** | Important UX; ships in v1.0 or v1.1 | Insights, documents, notifications, payments |
| **P2** | Nice to have; Phase 2+ | AI features, shipment tracking, WhatsApp |
| **P3** | Future vision | Web dashboard, govt portal integration |

---

## 9. Technical Debt Tracker

| Item | Severity | Action |
|---|---|---|
| `isUserTypeDone: true` bypass in authStore.ts | HIGH | Set to `false` before any production build |
| All mock data (TR_DATA, MOCK_APP, etc.) | HIGH | Replace with API calls in Sprint 3–4 |
| Hardcoded strings in screens | LOW | Move to constants/i18n file |
| Missing error boundaries | MEDIUM | Add before Phase 3 |
| No loading skeletons on lists | MEDIUM | Add shimmer placeholders in Sprint 4 |
| Console.log statements throughout | LOW | Strip in Phase 3 |

---

## 10. Team Structure

| Role | Responsibilities |
|---|---|
| **Mobile Dev Lead** | React Native architecture, component library, performance |
| **Backend Dev** | Node.js API, PostgreSQL, Redis, S3, FCM/APNs |
| **DevOps** | CI/CD, AWS ECS, RDS, CloudFront, Sentry |
| **Designer** | UI/UX review, asset creation, brand consistency |
| **QA** | Test cases, E2E testing, regression testing |
| **Product** | Feature prioritization, user feedback, KPI tracking |

---

## 11. Definition of Done

A feature is considered **Done** when:

1. ✅ Code written and self-reviewed
2. ✅ PR created and reviewed by at least one other dev
3. ✅ Wired to real API (no mock data)
4. ✅ Both dark and light themes work correctly
5. ✅ Both iOS and Android tested on simulators
6. ✅ Empty states handled
7. ✅ Error states handled (network failure, API error)
8. ✅ Loading states handled
9. ✅ No TypeScript errors
10. ✅ No console.log in production paths
11. ✅ Merged to `develop` branch

---

## 12. Key Milestones

| Milestone | Target Date | Criteria |
|---|---|---|
| **M0** — Dev Environment Ready | Week 2 | App runs on both iOS/Android simulator |
| **M1** — Auth Complete | Week 4 | Real OTP auth working end-to-end |
| **M2** — Core Screens Done | Week 6 | All screens navigable, UI polished |
| **M3** — Backend MVP Ready | Week 8 | All P0 APIs live, app uses real data |
| **M4** — Feature Complete | Week 10 | All Phase 1 features working |
| **M5** — Advanced Features | Week 16 | AI, push, deep links, documents |
| **M6** — TestFlight Beta | Week 18 | Stable build on TestFlight |
| **M7** — Production Launch** | Week 20 | App Store + Play Store approval |

---

## 13. Risk Register

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| App Store rejection (privacy/content) | Medium | High | Review App Store guidelines early; include privacy policy |
| BIS API unavailability (no public API) | High | Medium | Build manual workflow fallback; scraping as last resort |
| Push notification delivery on iOS | Low | Medium | Test APNs certificate renewal; use expo-notifications abstraction |
| GPT-4 API cost overrun | Medium | Medium | Cache AI responses; implement usage caps per subscription tier |
| S3 signed URL expiry on slow uploads | Low | Low | Use multipart upload for files > 5MB |
| Expo SDK upgrade breaking changes | Low | Medium | Pin SDK version; upgrade in dedicated sprint |
| Data privacy compliance (DPDP Act) | Medium | High | Implement consent flow, data deletion endpoint, privacy policy |

---

## 14. Infrastructure Architecture

```
Production Stack:
─────────────────────────────────────────────────────
 Mobile App (Expo / React Native)
       │  HTTPS (TLS 1.3)
       ▼
 AWS CloudFront (CDN + WAF)
       │
       ▼
 AWS Application Load Balancer
       │
 ┌─────┴──────┐
 │  ECS Tasks │  (Node.js API containers, auto-scaling)
 └─────┬──────┘
       │
 ┌─────┴─────────────┐
 │  RDS PostgreSQL    │   Redis ElastiCache
 │  (Multi-AZ)        │   (sessions, rate limits)
 └────────────────────┘

 S3 (documents, certificates, avatars)
 FCM / APNs (push notifications)
 Sentry (error monitoring)
 OpenAI API (AI features)
─────────────────────────────────────────────────────
```

---

## 15. CI/CD Pipeline

```yaml
# .github/workflows/main.yml (overview)

on:
  push:
    branches: [develop, main]
  pull_request:
    branches: [develop]

jobs:
  lint:       TypeScript typecheck + ESLint
  test:       Jest unit tests
  build-ios:  eas build --platform ios --profile preview
  build-android: eas build --platform android --profile preview
  deploy-api: Docker build + push to ECR + ECS rolling deploy (main only)
```

---

## 16. Environment Strategy

| Environment | Purpose | Backend URL |
|---|---|---|
| `development` | Local simulator testing with mock/real API | `http://localhost:3000/v1` |
| `staging` | TestFlight + Play Beta with staging backend | `https://api-staging.dicebysanyog.com/v1` |
| `production` | App Store release | `https://api.dicebysanyog.com/v1` |

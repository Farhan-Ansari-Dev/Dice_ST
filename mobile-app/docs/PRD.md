# Product Requirements Document (PRD)
## DICE by Sanyog — Certification & Compliance Management App

**Version:** 1.0.0  
**Date:** June 2025  
**Owner:** Sanyog Conformity Solutions  
**Status:** Active Development

---

## 1. Executive Summary

DICE (Document, Inspect, Certify, Expedite) by Sanyog is a mobile-first platform that simplifies India's complex product certification and regulatory compliance landscape. It enables manufacturers, importers, and exporters to manage BIS, EPR, WPC, FSSAI, ISO, CE Mark, and other certifications from a single app — replacing fragmented email chains, spreadsheets, and manual follow-ups.

---

## 2. Problem Statement

India's certification ecosystem is:
- **Fragmented** — 10+ regulatory bodies (BIS, MeitY, CPCB, FSSAI, WPC), each with separate portals
- **Opaque** — No real-time visibility into application status
- **Manual** — Document uploads, lab scheduling, and government queries handled over email
- **Delayed** — Average time-to-certificate is 3–6 months due to lack of coordination
- **Expertise-dependent** — Businesses need consultants just to understand what to apply for

---

## 3. Vision & Goals

**Vision:** Become the single window for all product certifications in India.

**Goals:**
1. Reduce average time-to-certificate by 40% through digitized workflows
2. Give businesses real-time visibility into all active applications
3. Enable self-service for 80% of certification queries via AI
4. Generate 100% of revenue through subscription + service fees

---

## 4. Target Users

### 4.1 Primary Personas

| Persona | Description | Key Need |
|---|---|---|
| **Manufacturer (SME)** | Makes products, needs BIS/ISO/FSSAI compliance | Know what certificates are needed, track status |
| **Importer/Exporter** | Brings goods into India, needs EPR/WPC/BIS | Fast document submission, avoid customs delays |
| **Compliance Manager** | Handles certification for a company | Multi-application dashboard, team collaboration |
| **Startup Founder** | First-time certifications, unfamiliar with process | Guided onboarding, AI recommendations |

### 4.2 User Roles

| Role | Permissions |
|---|---|
| `admin` | Full access — create, edit, delete, invite team |
| `manager` | Create and manage applications, upload documents |
| `viewer` | Read-only access to applications and certificates |

---

## 5. Feature Requirements

### 5.1 Core Features (MVP)

#### F1 — Dashboard / Home
- Compliance status overview (total, active, expiring certs)
- Quick action buttons: New Application, Upload Document, AI Assistant, Make Payment
- Feature carousel: BIS Fast Track, Live Updates, Certificate Finder, CB Comparison
- AI-powered search across certifications, regulations, and documents
- Pull-to-refresh
- Personalized greeting with user name and online status

#### F2 — Certifications
- List of all certificates with filter (BIS, EPR, WPC, FSSAI, ISO, CE Mark)
- Search by name, standard, or product
- Certificate card showing: status, expiry date, progress
- Detail view: certificate info, QR verify, share, download
- CB Comparison tool to select best Certification Body

#### F3 — Applications
- Kanban/list view of all applications (New, Active, Pending, Completed, Rejected)
- Application detail: timeline, documents, payment summary, notes
- Technical Review (TR) screen with clause-wise findings and query response
- Upload additional documents
- Govt query response interface
- Approval workflow visibility

#### F4 — AI Insights
- Regulatory news feed with AI summaries
- Bookmark articles
- Import/export alerts
- AI recommendation feed based on business profile
- Search and filter by category (BIS, EPR, WPC, etc.)

#### F5 — Profile & Settings
- Company profile: name, GST, address, city, state
- Security settings: PIN, biometrics, 2FA
- Notification preferences
- Language selector
- Theme: Light / Dark / System
- Help center
- Subscription management

#### F6 — Notifications
- Push notifications for status changes, expiry alerts, govt queries
- In-app notification centre with read/unread states
- Badge counts on Applications and Insights tabs

#### F7 — Documents
- Upload and manage all certification documents
- Document status: approved, pending, rejected
- Category tagging
- Secure storage

#### F8 — Payments
- Track payment history per application
- Total amount, amount paid, outstanding balance
- Payment initiation (UPI / NetBanking / Card)

#### F9 — Communication
- In-app chat with assigned Sanyog consultant
- Support tickets
- Status notifications via chat

#### F10 — Shipment Tracking
- Live tracking map for physical sample shipments to labs
- Route visualization, courier details, ETA

### 5.2 Advanced Features (Phase 2)

- **AI Certificate Finder** — scan product barcode, get required certifications
- **AI Product Quality Identifier** — scan product label for instant quality/safety insights
- **Live Regulatory Updates** — real-time circulars from BIS/MeitY/CPCB
- **CB Performance Analytics** — compare certification bodies by TAT and success rate
- **Multi-user / Team** — invite team members with role-based access
- **WhatsApp Integration** — status updates via WhatsApp

---

## 6. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | App cold start < 2s, screen transitions < 300ms |
| **Offline** | Read-only access to cached certificates and applications when offline |
| **Security** | JWT auth, biometric lock, encrypted local storage (expo-secure-store) |
| **Accessibility** | Font scaling support, minimum tap target 44×44pt |
| **Localization** | English (Phase 1), Hindi, Tamil (Phase 2) |
| **Platforms** | iOS 14+, Android 10+ |

---

## 7. Subscription Plans

| Plan | Price | Features |
|---|---|---|
| **Free** | ₹0 | 2 active applications, basic tracking |
| **Pro** | ₹2,999/mo | 20 applications, AI insights, document management |
| **Enterprise** | ₹9,999/mo | Unlimited, team access, priority support, custom reports |

---

## 8. Success Metrics (KPIs)

| Metric | Target (6 months) |
|---|---|
| Monthly Active Users | 5,000 |
| Applications managed via app | 500/month |
| Avg. time-to-certificate reduction | 30% |
| User NPS | > 50 |
| Pro/Enterprise conversion | 15% of free users |
| App Store Rating | ≥ 4.5 |

---

## 9. Out of Scope (v1.0)

- Direct integration with BIS/MeitY government portals
- Automated form submission to government systems
- iOS / Android SDK for third-party embedding
- Web dashboard (mobile only for v1)

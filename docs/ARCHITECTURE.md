# Sanyog Conformity Solutions — System Architecture

## Overview

Enterprise-grade AI-powered compliance and certification platform built for multi-country operations, high-scale SaaS workflows, and intelligent regulatory intelligence.

---

## System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENTS / USERS                             │
│        Mobile App (iOS/Android)   Admin Dashboard (Web)         │
└────────────────────┬────────────────────────┬───────────────────┘
                     │                        │
                     ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CLOUDFLARE CDN + WAF                          │
│              DDoS Protection · TLS · Edge Caching               │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LOAD BALANCER (AWS ALB)                       │
└──────┬──────────────────────────────────────────────┬───────────┘
       │                                              │
       ▼                                              ▼
┌──────────────────┐                      ┌──────────────────────┐
│  Backend API     │                      │  Socket.io Server    │
│  Node.js/Express │◄────────────────────►│  Real-time Events    │
│  Port 5000       │                      │  Port 5001           │
└──────┬───────────┘                      └──────────────────────┘
       │
       ├──────────────────────────────────────────────┐
       │                                              │
       ▼                                              ▼
┌──────────────────┐                      ┌──────────────────────┐
│  PostgreSQL 16   │                      │  Redis 7             │
│  Primary DB      │                      │  Cache + Sessions    │
│  Supabase/RDS    │                      │  + Rate Limiting     │
└──────────────────┘                      └──────────────────────┘
       │
       ├──────────────────────────────────────────────┐
       │                                              │
       ▼                                              ▼
┌──────────────────┐                      ┌──────────────────────┐
│  AWS S3          │                      │  OpenAI API          │
│  Document Store  │                      │  GPT-4o + Embeddings │
│  + Presigned URLs│                      │  RAG Pipeline        │
└──────────────────┘                      └──────────────────────┘
```

---

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `users` | All users (clients, admins, employees) |
| `otp_tokens` | Email OTP for passwordless auth |
| `certifications` | Active/expired certificate records |
| `applications` | Certification application workflow |
| `application_events` | Audit trail / timeline |
| `documents` | S3-linked document metadata |
| `insights` | Regulatory news + AI summaries |
| `shipments` | Import/export tracking |
| `payments` | Invoice and payment records |
| `notifications` | In-app notification queue |
| `ai_conversations` | Chat history per user |

---

## API Architecture

### Base URL: `https://api.sanyogconformity.com/v1`

### Auth Endpoints
```
POST   /auth/send-otp          Send email OTP
POST   /auth/verify-otp        Verify OTP, receive JWT
POST   /auth/google             Google OAuth sign-in
POST   /auth/refresh            Refresh access token
POST   /auth/logout             Invalidate session
```

### Core Resource Endpoints
```
GET    /certifications          List with filters + pagination
POST   /certifications          Create new certificate
GET    /certifications/:id      Detail view
PUT    /certifications/:id      Update certificate
DELETE /certifications/:id      Soft delete

GET    /applications            List (kanban or linear)
POST   /applications            Submit new application
GET    /applications/:id        Detail + timeline
PUT    /applications/:id/status Move status in workflow
GET    /applications/:id/events Event timeline

POST   /documents/upload        Multipart upload to S3
GET    /documents/:id/download  Presigned S3 URL
POST   /documents/:id/ocr       OCR extraction

GET    /insights                Paginated news feed
GET    /insights/:id            Full article + AI summary
POST   /insights/ai-summary     On-demand AI summary

POST   /ai/chat                 Chat with AI assistant
GET    /ai/conversations        Chat history
GET    /ai/recommendations      Personalized compliance tips
POST   /ai/analyze-document     Document compliance check

GET    /analytics/overview      Dashboard KPIs
GET    /analytics/revenue       Revenue trends
GET    /analytics/certifications Certification stats
GET    /analytics/applications  Application pipeline metrics
```

---

## Mobile App Screens

### Bottom Navigation (always visible)
1. **Home** — Dashboard with AI widgets, stats, quick actions
2. **Certifications** — Certificate list + detail + new
3. **Applications** — Track all applications, kanban view
4. **Insights** — AI news feed: BIS, customs, regulations
5. **Profile** — User profile + account settings

### Hamburger Menu (drawer)
- Documents Management
- AI Compliance Assistant
- Shipment Tracking
- Testing & Inspection
- Payments & Billing
- Communication
- Certificate Center
- Admin Dashboard (admin only)
- Settings
- Help & Support

---

## AI Architecture (RAG Pipeline)

```
User Query
    │
    ▼
Query Embedding (text-embedding-3-small)
    │
    ▼
Vector Search (pgvector / Pinecone)
    │
    ├── Retrieve top-K relevant chunks
    │   ├── Company regulations DB
    │   ├── BIS standards corpus
    │   ├── Historical Q&A
    │   └── User's own documents
    │
    ▼
Context Assembly + GPT-4o
    │
    ▼
Streamed Response to User
```

---

## Infrastructure

| Service | Provider |
|---------|----------|
| Compute | AWS ECS Fargate |
| Database | AWS RDS PostgreSQL 16 |
| Cache | AWS ElastiCache Redis |
| Storage | AWS S3 (ap-south-1) |
| CDN | Cloudflare (enterprise) |
| Search | Algolia (certifications + docs) |
| Email | AWS SES / SendGrid |
| Push Notifications | Firebase FCM |
| Monitoring | AWS CloudWatch + Grafana |
| CI/CD | GitHub Actions |

---

## Security

- JWT (RS256) with 15-minute access tokens
- Refresh token rotation with Redis blacklist
- Rate limiting: 100 req/min per IP, 10 OTP/hour per email
- Row-level security in PostgreSQL
- S3 presigned URLs (5-min expiry)
- All PII encrypted at rest (AES-256)
- OWASP Top 10 mitigations
- CORS whitelist

---

## Design System

### Color Palette
| Token | Value | Use |
|-------|-------|-----|
| Primary | `#6C63FF` | CTAs, active states |
| Secondary | `#00D4FF` | Highlights, links |
| Accent | `#FF6B6B` | Alerts, coral |
| Success | `#00C896` | Approved, valid |
| Warning | `#FFB347` | Pending, expiring |
| Dark BG | `#0A0B0F` | App background |
| Card | `#1A1D2E` | Card surfaces |
| Border | `#2A2D3E` | Dividers |
| Text | `#FFFFFF` | Primary text |
| Muted | `#8B92A5` | Secondary text |

### Typography Scale
| Size | px | Weight | Use |
|------|----|--------|-----|
| xs | 10 | 400 | Labels |
| sm | 12 | 400 | Captions |
| base | 14 | 400 | Body |
| md | 16 | 500 | Subheadings |
| lg | 18 | 600 | Section titles |
| xl | 20 | 700 | Card titles |
| 2xl | 24 | 700 | Page titles |
| 3xl | 32 | 800 | Hero text |

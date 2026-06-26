# Sanyog Conformity Solutions — Enterprise Compliance Platform

> AI-powered compliance and certification management for multi-country operations

---

## Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native + Expo SDK 51 |
| Admin | React 18 + Vite 5 |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Storage | AWS S3 |
| AI | OpenAI GPT-4o + RAG |
| Realtime | Socket.io |
| Search | Algolia |
| CDN | Cloudflare |

---

## Quick Start

### Prerequisites
- Node.js 20+
- Docker + Docker Compose
- Expo CLI (`npm install -g expo-cli`)

### 1. Start infrastructure
```bash
docker-compose up -d postgres redis
```

### 2. Backend
```bash
cd backend
cp .env.example .env
# Fill in your API keys
npm install
npm run dev
```

### 3. Admin Dashboard
```bash
cd admin-dashboard
npm install
npm run dev
# Opens at http://localhost:5173
```

### 4. Mobile App
```bash
cd mobile-app
npm install
npx expo start
# Scan QR with Expo Go app
```

---

## Project Structure

```
Dice_ST/
├── mobile-app/          # React Native (iOS + Android)
├── admin-dashboard/     # React.js admin panel
├── backend/             # Node.js REST API + Socket.io
├── docs/                # Architecture + API docs
└── docker-compose.yml   # Local dev infrastructure
```

---

## Features

### Mobile App
- **Home Dashboard** — KPI stats, AI widgets, recent activity
- **Certifications** — BIS, FSSAI, CE, ISO tracking with expiry alerts
- **Applications** — Full lifecycle tracking with kanban + timeline
- **Insights** — AI-aggregated regulatory news (BIS, customs, export/import)
- **AI Assistant** — RAG-powered compliance chatbot
- **Documents** — S3 storage with OCR scanning
- **Shipment Tracking** — Import/export compliance monitoring
- **Testing & Inspection** — Lab test management
- **Payments** — Invoice and billing portal
- **Communication** — Messaging with team
- **Certificate Center** — Digital certificate vault

### Admin Dashboard
- Full CRM with client management
- Application workflow (kanban pipeline)
- Revenue analytics + charts
- Employee management with role-based access
- AI news management
- Bulk operations

### Backend API
- RESTful API with JWT authentication
- Email OTP + Google OAuth
- OpenAI RAG chatbot
- S3 document storage with OCR
- Redis caching layer
- Socket.io real-time events
- Cron jobs for news scraping + reminders

---

## Environment Variables

See `backend/.env.example` for all required variables.

Key services to configure:
- PostgreSQL connection string
- Redis URL
- OpenAI API key
- AWS S3 credentials
- Google OAuth credentials
- SMTP for email OTP

---

## Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- API documentation available at `http://localhost:5000/api/docs` (Swagger)

---

## License

Proprietary — Sanyog Conformity Solutions © 2025

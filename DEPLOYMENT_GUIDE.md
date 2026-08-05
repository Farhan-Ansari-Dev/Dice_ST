# DICE — Deployment Guide

Covers the three deployable units: **backend** (Node/TS API), **admin-dashboard**
(React/Vite static site behind nginx), and **mobile-app** (Expo/React Native).

## 0. Prerequisites
- Node ≥ 20, Docker (for containerised deploy), a MongoDB 5.0+ cluster (time-series
  audit collection requires 5.0+; Atlas M10+ recommended), and Redis.
- Razorpay live keys, AWS (S3 + SES) credentials, an AI provider key.

## 1. Configure environment
```bash
cp backend/.env.example backend/.env      # fill all 22 vars
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"  # CONFIG_ENCRYPTION_KEY
```
Required in production (enforced by `validateEnv`, the API refuses to start otherwise):
`MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `RAZORPAY_KEY_ID`,
`RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `AWS_ACCESS_KEY_ID`,
`AWS_SECRET_ACCESS_KEY`, `REDIS_URL`, `CONFIG_ENCRYPTION_KEY`.
A `rzp_test_*` Razorpay key is rejected in production.

## 2. Deploy the backend

### Option A — Docker Compose (single host: API + Mongo + Redis + Admin)
```bash
docker compose up -d --build
# API → :5000   Admin → :3001
```

### Option B — Railway / container platform
`backend/railway.json` builds from `backend/Dockerfile` and starts with:
```
npm run db:migrate && node dist/index.js
```
`db:migrate` runs the **compiled** index sync (`dist/scripts/syncIndexes.js`) — no
ts-node needed, idempotent, safe to run on every deploy (it only ensures indexes,
which is necessary because `autoIndex` is disabled in production).

### Startup order (automatic, in `src/index.ts`)
`validateEnv()` → `connectMongo()` → middleware/Socket.io → `listen()` →
`startBackgroundJobs()`.

## 3. One-time data setup (run once per fresh environment)
Seed the workflow catalog (fee/duration/stage-doc defaults):
```bash
node dist/db/seed-workflows.js          # in the built image
# or from a dev checkout:  npm run db:seed:workflows
```

## 4. Ownership rollout (optional, when ready — NOT required to launch)
The typed-ownership model ships behind dual-write; activation is a deliberate,
staged operation. Run these from a checkout that has dev dependencies (the
scripts use ts-node) or against a task runner with them installed:
```bash
npm run migrate:indexes        # build ownership-axis indexes (or db:migrate in prod)
npm run migrate:ownership      # DRY RUN — review the classified report
npm run migrate:ownership -- --apply
npm run reconcile:ownership    # must report "OK (no hard drift)" before any cutover
```
Only after reconciliation is clean should the ownership read-cutover be undertaken
(a later change that introduces its own flags alongside the read-path code).

## 5. Feature flags (Remote Config, all default OFF)
Enable independently when desired: `workflow_gates_enforced` (block transitions on
missing docs/payment), `auto_assignment_enabled` (auto-route on stage entry),
`renewal_auto_generation` (daily job creates renewal applications).

## 6. Deploy the admin dashboard
```bash
cd admin-dashboard
# set VITE_API_URL to the API origin, e.g. https://api.sanyogconformity.com/api/v2
npm ci && npm run build          # → dist/  (served by nginx via its Dockerfile)
```

## 7. Build & submit the mobile app
```bash
cd mobile-app
# set EXPO_PUBLIC_API_URL to the production API base (…/api/v2)
eas build --platform android --profile production
eas build --platform ios --profile production
```
(Native builds run on EAS/Expo infrastructure, not locally.)

## 8. Health & monitoring
- Liveness/readiness: `GET /health` (200 + `mongo:true`, else 503). Wire to the
  load balancer / orchestrator probe (Docker `HEALTHCHECK` already set).
- Logs: structured via `logger`; HTTP access via `morgan`. Ship to your log sink.
- Recommended: error tracking (Sentry) and uptime/DB-lag alerts.

## 9. Backups & retention
- MongoDB: enable automated snapshots (Atlas continuous backup or `mongodump` cron).
- AuditLog is a 5-year TTL time-series collection — exclude from destructive
  cleanups; set `meta.legal_hold` for longer holds.
- S3 documents: enable versioning + lifecycle policy on the bucket.

## 10. Rollback
- App: redeploy the previous image tag (stateless API).
- Ownership: additive + dual-written; `migrate:ownership --revert` nulls the typed
  fields and removes provisioned personal orgs; `created_by`/legacy are never mutated.
- Feature flags: toggle OFF for instant behavioural rollback.

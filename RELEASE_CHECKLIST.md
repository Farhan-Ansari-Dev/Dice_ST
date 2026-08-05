# DICE — Release Checklist (RC → Production)

Status legend: ✅ verified in repo · ⚙️ operator action at deploy · 🔬 requires live/prod testing

## Build & compile
- ✅ Backend compiles — `cd backend && npm run build` (tsc) → `dist/` (verified, 0 errors).
- ✅ Backend typecheck — `npm run typecheck` → 0 errors.
- ✅ Admin dashboard builds — `cd admin-dashboard && npm run build` (tsc + vite) → `dist/` (verified).
- ✅ Mobile typechecks — `cd mobile-app && npx tsc --noEmit` → 0 errors.
- 🔬 Mobile native bundle — build via EAS (`eas build`) on CI/Expo servers (needs Android/iOS toolchains; not buildable locally here).

## Tests
- ✅ Backend unit/integration tests — `cd backend && npm test`. Known **pre-existing** failure: one case in `leads.draftApplication.test.ts` (unrelated to release scope; documented in KNOWN_LIMITATIONS).
- ✅ New engine tests pass — `workflowCompletion` (10), `ownership*` (36).

## Environment
- ✅ `validateEnv` fails fast in production on missing secrets: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `RAZORPAY_KEY_ID/KEY_SECRET/WEBHOOK_SECRET`, `AWS_ACCESS_KEY_ID/SECRET_ACCESS_KEY`, `REDIS_URL`, `CONFIG_ENCRYPTION_KEY`, `MONGODB_URI`.
- ✅ `validateEnv` rejects a test Razorpay key (`rzp_test_*`) in production.
- ⚙️ Copy `backend/.env.example` → `backend/.env` and fill all values (22 vars).
- ⚙️ Generate `CONFIG_ENCRYPTION_KEY` (32 bytes): `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.

## Deployment infra
- ✅ `backend/Dockerfile` — multi-stage, non-root (`USER node`), `HEALTHCHECK` on `/health`.
- ✅ `admin-dashboard/Dockerfile` — nginx serve + healthcheck; `nginx.conf` present.
- ✅ `docker-compose.yml` — mongo + redis + backend + admin, healthchecks + `depends_on` ordering.
- ✅ `backend/railway.json` — `startCommand: npm run db:migrate && node dist/index.js` (**fixed this release** — `db:migrate` script added; runs the compiled `syncIndexes`, prod-compatible, idempotent).
- ⚙️ No CI pipeline in `.github/workflows` — wire CI (build + test) before/at release if desired.

## Database
- ⚙️ Indexes — `autoIndex` is OFF in production; `npm run db:migrate` (compiled index sync) runs on every deploy (idempotent).
- ⚙️ Seed workflows (one-time): `node dist/db/seed-workflows.js`.
- ⚙️ Ownership rollout (when ready, from a dev/ops context with dev deps): `npm run migrate:ownership` (dry-run → `--apply`), then `npm run reconcile:ownership` (expect zero hard drift) — see DEPLOYMENT_GUIDE.

## Runtime health & ops
- ✅ Health check — `GET /health` returns 200 + `mongo: true`, 503 when degraded.
- ✅ Background jobs — `startBackgroundJobs()` invoked at startup (**fixed earlier this session**): cert-expiry reminders, stale-app checks, insights seeding, flag-gated renewal auto-generation.
- ✅ Startup order — `validateEnv` → Mongo connect → Express/Socket.io → listen → jobs.
- ✅ Graceful shutdown — SIGTERM/SIGINT close HTTP + disconnect Mongo (30s force timeout).
- ✅ Logging — `logger` (structured) + `morgan` HTTP access logs.

## Security
- ✅ Auth — JWT `HS256` pinned (algorithm-confusion safe), access+refresh tokens, `jti` denylist for revocation.
- ✅ Authorization — `requireRole` + `authorize` (org-scoped, employee-edit guard) + deny-by-default workflow Role Matrix.
- ✅ Rate limiting — `generalLimiter` on all `/api/*`; per-route limiters available.
- ✅ Security headers — `cspMiddleware` + `securityHeaders` (helmet-class).
- ✅ CORS — explicit origin allowlist (frontend/admin/prod domains + Expo dev).
- ✅ Razorpay webhook — signature verified over the raw body.
- 🔬 Penetration testing — perform against staging before GA.

## Feature flags (default OFF — enable deliberately post-deploy)
- ⚙️ `workflow_gates_enforced`, `auto_assignment_enabled`, `renewal_auto_generation` — toggle via Remote Config when desired.

## Sign-off gates
- ⚙️ Manual smoke test of core flows on staging (auth, application create → transition, payment, notification).
- 🔬 Real-user / on-device testing (auth/onboarding on physical devices).
- 🔬 Load testing against staging.

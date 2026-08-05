# DICE — Release Notes (v2.0.0 — Release Candidate)

Enterprise compliance platform: backend API, admin dashboard, and mobile app.

## Highlights
- **Workflow engine** — single authoritative transition path (`TransitionService`
  → pure `WorkflowEngine` → audit → notify → issuance), deny-by-default Role
  Matrix, immutable append-only status history.
- **Document & Payment gates + SLA** — the engine computes required actions
  (missing mandatory docs, payment due) and an SLA deadline per stage; advisory by
  default, blocking when `workflow_gates_enforced` is enabled.
- **Assignment engine** — assign / reassign / unassign / escalate, plus flag-gated
  automatic routing on stage entry (least-loaded by role). Dual-writes legacy
  assignees and typed staff axes.
- **Workflow override** — admin escape hatch (reason required, fully audited,
  timelined and notified).
- **Renewal workflow** — start a renewal from an expiring certificate; issuance
  links predecessor/successor and retires the old cert; optional daily
  auto-generation.
- **Typed ownership model** — `customer_id` (Organization) + `consultant_id` /
  `employee_id` / `manager_id` + immutable `created_by`; introduced additively
  with dual-write, backfill, and reconciliation tooling (read-cutover deferred).
- **Customer 360, Customer Health, unified Timeline, Analytics, AI assistant**
  (BYO OpenAI-compatible provider with shared customer context + vision),
  **Razorpay payments**, **document management**, **time-series audit log**.
- **Notifications** across in-app / push / email / SMS.

## Fixed in this RC
- **Deployment blocker:** `railway.json` invoked `npm run db:migrate`, which did
  not exist — the container would fail to start. Added a prod-compatible
  `db:migrate` (compiled `syncIndexes`, idempotent). Backend + admin builds verified.
- **Background jobs were never started** — the scheduler is now invoked at
  startup (cert-expiry reminders, stale-app checks, insights seeding, renewal
  auto-generation). The dead duplicate v2 job scheduler was removed.
- Removed dead code: 2 unused feature flags, 3 unreferenced models
  (`Comment`/`Knowledge`/`Task`).

## Compatibility
- API served on both `/api/v1` and `/api/v2` (identical routes) for backward
  compatibility. No breaking changes; all new fields/endpoints are additive.
- Behaviour-changing activations are gated behind Remote Config flags, all
  defaulting OFF.

## Migration
- `autoIndex` is disabled in production; deploy runs `db:migrate` to build indexes.
- Ownership backfill/reconcile is optional and staged (see DEPLOYMENT_GUIDE §4);
  not required to launch.

## Known limitations
See KNOWN_LIMITATIONS.md (MCA/GSTIN external lookups, notification-path
consolidation, deferred ownership cutover, retained legacy screens, one
pre-existing test failure).

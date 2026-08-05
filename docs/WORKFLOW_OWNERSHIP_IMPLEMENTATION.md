# DICE — Workflow & Ownership Implementation (engines, flags, rollout)

This documents the additive engineering completed on top of the ownership
foundation (Sprints 2–3). **Everything here is backward-compatible and additive.**
The behaviour-changing activations are gated behind `RemoteConfig.featureFlags`,
all defaulting to **OFF** — nothing in production changes until an operator flips
a flag after running the backfill and reconciliation.

## Feature flags (all default OFF)

| Flag | Effect when ON |
|---|---|
| `workflow_gates_enforced` | document/payment gates BLOCK transitions (else advisory only) |
| `auto_assignment_enabled` | work auto-routes on stage entry via `Workflow.stages[].assignee_role` |
| `renewal_auto_generation` | the daily job auto-creates renewal applications for expiring certs |

The ownership read-cutover and RBAC-assignment-scoping toggles are intentionally
**not** declared yet — they will be added together with the read-path code that
consumes them, in the cutover work (see runbook step 4). Declaring config ahead
of its consumer would leave an unused flag.

Read flags in services via `services/featureFlags.ts` (`isFeatureEnabled`), which
caches for 15s. `clearFeatureFlagCache()` is available for tests/ops.

## Engines & services (new)

- **AssignmentEngine** (`services/assignment/`): `assignApplication`,
  `unassignApplication`, `escalateApplication`, `autoAssignOnStageEntry`.
  Dual-writes legacy `assignees`/`primary_assignee` + the typed axes, audits and
  notifies. The two `/assign` route handlers are now thin callers (DRY).
- **Workflow gates + SLA** (`services/workflow/gates.ts` + `workflowEngine.ts`):
  `evaluate()` now returns advisory `requiredActions` (missing mandatory docs,
  payment due) and `sla` (from stage `sla_days`). `TransitionService` sets
  `due_at` from the SLA and, only when `workflow_gates_enforced` is ON, throws
  `GateDeniedError` (HTTP 422) instead of proceeding.
- **OverrideService** (`services/workflow/overrideService.ts`): admin escape
  hatch that bypasses the state machine; always requires a reason, marks the
  `status_history` entry `override: true`, audits (`status_overridden`),
  timelines and notifies.
- **RenewalService** (`services/renewalService.ts`): `createRenewal(cert)` mints
  a linked Draft Application (reusing `createDraftApplication`), idempotent per
  cert. On issuance, `issueCertification` links predecessor/successor and marks
  the old cert `renewed`. `runRenewalAutoGeneration()` runs from the daily job
  when `renewal_auto_generation` is ON.
- **AutoAssignment** runs inside `TransitionService` after each transition,
  flag-gated and best-effort.

## New / changed API (all additive)

| Method & path | Purpose |
|---|---|
| `POST /applications/:id/override` | admin override (body `{ to_status, reason }`, reason required) |
| `DELETE /applications/:id/assign` | clear all assignees |
| `POST /applications/:id/escalate` | escalate to a manager (`{ manager_id, reason }`) |
| `GET /applications/:id/timeline` | unified activity (status_history + audit + testing/inspection) |
| `POST /certifications/:id/renew` | start a renewal for a certificate |
| `POST /applications/:id/transition` | unchanged contract; may now return 422 `gate_unsatisfied` when enforcement is ON |

`POST`/`PUT /applications/:id/assign` are unchanged externally (now backed by the
AssignmentEngine).

## Database changes (additive, optional)

- `Application`: `renewal_of_cert_id?`, `status_history[].override?`; ownership
  axes (from Sprint 2) unchanged.
- `Organization`: `is_personal?` (+ partial-unique index on `{owner_user_id, is_personal}`).
- `Testing` / `Inspection`: `application_id?` (+ index) — links these to the workflow.
- `RemoteConfig.featureFlags`: five new flags (default false).
- `AuditLog` action union: `status_overridden`.

Because `autoIndex` is OFF in production, build the new indexes explicitly:

```bash
npm run migrate:indexes
```

## Operational runbook (rollout order)

1. `npm run migrate:indexes` — build the new indexes.
2. `npm run migrate:ownership` (dry run) → review the classified report → `--apply`.
3. `npm run reconcile:ownership` — confirm zero hard drift.
4. Only then undertake the ownership read-cutover (switch client read scope to
   `customer_id`, wire `canAccessApplication`) — a later sprint that introduces
   its own flags alongside the consuming code.
5. `workflow_gates_enforced` / `auto_assignment_enabled` / `renewal_auto_generation`
   can be enabled independently once desired.

## Deliberate non-inventions

- **AI-on-transition**: `aiService.buildCustomerContext()` already aggregates a
  customer's applications/certs for the AI assistant, so workflow data already
  reaches AI. No blocking LLM call was added to the transition path — that would
  be a consumer-less speculative dependency. AI context stays where it is
  consumed.
- **Ownership read cutover**: intentionally NOT activated — it requires the
  backfill to have run against production data (see runbook), which is an
  operational step, not a code change.

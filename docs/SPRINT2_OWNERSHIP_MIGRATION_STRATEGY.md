# Sprint 2 — Ownership Migration Strategy (document only)

**This is a strategy document. No migration is executed in Sprint 2.**
Sprint 2 is **expand-only**: it adds optional ownership fields + indexes + a pure
`OwnershipService`. Nothing is backfilled, dual-written, cut over, or contracted
here. This document defines the full phased path so later sprints can execute it
with explicit approval, one phase at a time.

## Ownership model being introduced

| Field | Ref | Meaning | Authorization role |
|---|---|---|---|
| `customer_id` | `Organization` | Owning customer entity | Client visibility (future) |
| `consultant_id` | `User` | Servicing consultant | Consultant scope (future) |
| `employee_id` | `User` | Reviewing employee | Employee scope (future) |
| `manager_id` | `User` | Oversight / escalation | Manager scope (future) |
| `created_by` | `User` | Immutable creator | **Audit-only after cutover** |

> **Open decision (blocks Phase B):** `customer_id` currently refs `Organization`
> (consistent with `org_id` and the approved audit). Single-tenant clients are
> org-less today, so Phase B must decide whether to (a) provision a personal
> Organization per client, or (b) re-point `customer_id` at `User`. This is a
> reversible schema choice while the field is unused. **Do not backfill until
> this is confirmed.**

---

## Phase E — Expand  ✅ (this sprint)

- Add `customer_id`, `consultant_id`, `employee_id`, `manager_id` to
  `Application` — all **optional**, no validation changes, no field removed.
- Add supporting indexes (customer visibility + per-staff work queues).
- Introduce pure `OwnershipService` (read / normalize / helpers) and
  `canAccessApplication()` — **not wired into any route**.
- **Reads unchanged. Writes unchanged. APIs unchanged. Fully reversible** by
  dropping the new fields/indexes (no data depends on them).

## Phase B — Backfill (future, idempotent, dry-run first)

- Resolve the Phase-B open decision above first.
- For each application, derive:
  - `customer_id` ← `org_id` when present; else the client's (provisioned)
    customer Organization.
  - `consultant_id` / `employee_id` / `manager_id` ← infer from `assignees[]`
    **by each assignee's `User.role`**; `primary_assignee` seeds the matching
    typed slot. Ambiguous / multi-match → `needs_triage` report, never guessed.
  - `created_by` is left exactly as-is (it is already correct and immutable).
- Emit a reconciliation report: counts mapped, orgs provisioned, ambiguous rows.
- **Writes only the new fields; never mutates `created_by`, `assignees`, status,
  or any existing field.** Re-runnable safely (idempotent).

## Phase D — Dual-write (future)

- On assignment (`POST/PUT /applications/:id/assign`) and on create
  (`applicationService.createDraftApplication`), write **both** the legacy
  `assignees[]` / `primary_assignee` **and** the typed axes.
- Reads still use `created_by` / `assignees` — new fields are kept fresh but not
  yet authoritative.
- A nightly reconciliation compares legacy vs typed; divergence alerts.

## Phase C — Cutover (future, feature-flagged, per cohort)

- Switch read scope from `created_by` to the typed axes, behind a flag:
  - client list + `scopeById` (`routes/v2/applications.ts`) → `customer_id`
  - analytics client scope (`routes/v2/analytics.ts`) → `customer_id`
  - wire `OwnershipService.canAccessApplication()` into the single-item routes.
- Roll out internal admins → consultants → % clients → 100%.
- Dual-write remains on, so **flag-off is an instant rollback** to legacy reads.

## Phase Contract — retire legacy ownership role (future)

- Once cutover is 100% and reconciliation is clean for a full review cycle:
  - remove `created_by` from `scopeById` (it becomes audit-only, enforced by
    convention + the `canAccessApplication` contract).
  - make `assignees[]` a derived projection of the typed axes (kept for the
    "my tasks" index and mobile compat).
  - stop dual-write.
- **Point of no easy return** — gate behind a mandatory checklist:
  backup snapshot + N-day clean reconciliation.

---

## Rollback per phase

| Phase | Rollback |
|---|---|
| **Expand** (this sprint) | Drop the four fields + four indexes. No data depends on them. Trivial, zero downtime. |
| **Backfill** | Additive only — `--revert` nulls the four typed fields; delete any provisioned personal Organizations. `created_by`/legacy untouched. |
| **Dual-write** | Stop writing the typed fields; legacy remains authoritative. Safe. |
| **Cutover** | Flip the feature flag off → reads revert to `created_by`/`assignees` (kept fresh by dual-write). Instant. |
| **Contract** | Restore from snapshot + re-enable dual-write. This is why Contract is gated behind a snapshot + clean-reconciliation checklist. |

## Invariants that hold across every phase

1. No existing field is removed until **Contract**, and even then only
   `created_by`'s *authorization role* is removed — the field and its audit
   value persist forever.
2. No API response loses a field; new fields are additive.
3. `created_by` values are never mutated by any phase.
4. Every phase before Cutover is behavior-preserving and independently
   reversible without data loss.

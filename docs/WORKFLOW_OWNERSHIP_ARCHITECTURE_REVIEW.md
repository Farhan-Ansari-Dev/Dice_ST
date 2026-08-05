# DICE — Workflow & Ownership Architecture Review

**Repository:** `/Users/sanyogpc/Desktop/Dice_ST` · **Branch:** `fix/auth-onboarding-production`
**Mode:** Read-only audit. **No code written, no files modified, no migrations, no commits.**
**Method:** Full read of `backend/src` models / routes/v2 / services / middleware / jobs, plus targeted verification greps and spot-checks of `admin-dashboard/` and `mobile-app/`.
**Every claim below is cited to `file:line`. Where I could not verify something, I say so explicitly.**

---

## 0. Framing — this is a mature system; the work is refinement, not rescue

Unlike a greenfield or a debt-ridden codebase, DICE already implements most of the target architecture correctly:

- A **single, authoritative transition path**: `POST /applications/:id/transition` → `TransitionService.transition()` → pure `WorkflowEngine.evaluate()` → `app.save()` → audit → notify → cert issuance. The former duplicate `PUT /:id/status` was **already removed** (`routes/v2/applications.ts:140-143`).
- A **real state machine** (`models/Application.ts:17-30`, `ALLOWED_TRANSITIONS`) with an **immutable append-only** `status_history[]` and guarded `transitionTo()` (`Application.ts:229-248`).
- **Deny-by-default RBAC on transitions** via an edge-based Role Matrix (`services/workflow/roleMatrix.ts`), explicitly introduced to fix a prior audit's critical finding (a client walking their own app to `cert_issued`) — see the file header comment `roleMatrix.ts:6-8`.
- Proper **ownership/assignment fields already present**: `created_by`, `assignees[]`, `primary_assignee`, `org_id` (`Application.ts:58-60, 160-162`).
- **Immutable, time-series `AuditLog`** with a single `audit()` helper (`models/AuditLog.ts:43-140`).
- **Workflow-as-data** (`models/Workflow.ts`), **real AI** (OpenAI-compatible, BYO-provider, vision — `services/aiService.ts:1-55`), **Customer Health** scoring (`services/customerHealthService.ts`), multi-tenant `Organization` with subscription tiers (`models/Organization.ts`), Razorpay `Payment` (`models/Payment.ts`), and a certificate-expiry reminder cron (`jobs/v2/certExpiryReminder.ts`).

So the honest scope of "next-generation workflow & ownership" here is a **set of targeted refinements** on a solid base, driven by the LOCKED ownership decision and by genuine gaps I found. I will not overstate debt that isn't there.

### The genuine gaps this review targets (all evidenced in §1–§2)

| # | Gap | Evidence |
|---|---|---|
| **G1** | **Ownership uses `created_by` as the owner/visibility key** — contrary to the LOCKED decision ("do NOT use `created_by` for ownership; make it immutable audit-only"). No `customer_id` / `consultant_id` / `employee_id` / `manager_id`. | `applications.ts:25-28, 44-46`; `analytics.ts:27-28` |
| **G2** | **Staff assignment is a single untyped `assignees[]` + one `primary_assignee`** — cannot distinguish consultant vs employee vs manager, cannot express the locked role-specific ownership. | `Application.ts:59-60, 161-162` |
| **G3** | **B2B multi-user ownership break**: client scoping is `created_by == me`, so a second client user in the same `org_id` cannot see an application a colleague filed. | `applications.ts:26-28, 44-46` |
| **G4** | **No Workflow Override endpoint.** No reason-required admin path to force a transition outside `ALLOWED_TRANSITIONS`. (CB-override exists as a template, but only for `certification_body`.) | grep: override only in `routes/v2/certificationBodies.ts`; absent from workflow |
| **G5** | **Document & Payment gates are stubbed** — `WorkflowEngine` returns `requiredActions: []`, `sla: null`; `fee.paid` and per-stage `required_docs` are never enforced on transition. | `workflowEngine.ts:38-39, 73-74` |
| **G6** | **Assignment is manual-only** — no auto-routing on stage entry, no escalation, no workload balancing; `Workflow.stages[].assignee_role` is defined but unused. | `applications.ts:175-225`; `Workflow.ts:23,71` |
| **G7** | **Testing & Inspection are disconnected silos** — own status enums, keyed on `client_id`/`product_name`, **no `application_id`**; not part of the Application timeline though `testing` is an Application status. | `models/Testing.ts:3-14`; `models/Inspection.ts:3-24`; `Application.ts:9` |
| **G8** | **Renewal is notification-only** — cert renewal *chain* fields + expiry cron exist, but **no flow creates a renewal Application** or flips a cert to `renewed`. | `Certification.ts:33-36`; `jobs/v2/certExpiryReminder.ts`; grep: no `createRenewal` |
| **G9** | **AI is not in the transition pipeline** (brief wants `…→ Assignment → AI`); AI is request-driven only. | `transitionService.ts:61-97` (no AI call) |
| **G10** | **Timeline is not unified** — split across embedded `status_history[]` + `AuditLog`; no single customer-facing timeline merging status/assignment/document/payment events. | `Application.ts:55`; `applications.ts:112-135` |

---

## 1. Current ownership model (evidence)

### 1.1 The fields that exist

`models/Application.ts:57-62, 160-162`:
```
created_by:        ObjectId → User   (required, indexed)     // owner today
assignees:         ObjectId[] → User (indexed)               // untyped staff
primary_assignee:  ObjectId → User                           // single
org_id:            ObjectId → Organization (optional, indexed)
```
`org_id` is **optional** by deliberate design — "single-tenant users have no Organization" (`Application.ts:141-144`). `created_by` is `required`.

### 1.2 How ownership is actually enforced

- **Client scoping keys on `created_by`, not `org_id`** (`routes/v2/applications.ts:25-28`):
  ```
  const scopeById = (req) => STAFF_ROLES.includes(role)
    ? { _id: id }
    : { _id: id, created_by: req.user._id };
  ```
  and the list filter (`applications.ts:44-46`): non-staff → `filter.created_by = req.user._id`. The inline comment explains the choice: `{ org_id: undefined }` would match every org-less application, so they scope by `created_by` instead (`applications.ts:41-43`).
- **Analytics repeats the same pattern** (`routes/v2/analytics.ts:27-28`): client scope = `{ created_by: req.user._id }`; staff/org scope = `{ org_id }`.
- **Staff (`admin`/`super_admin`/`employee`) see everything** (`applications.ts:39-46`) — platform-wide, no assignment scoping on the list.

### 1.3 Where `created_by`, `assignees`, `primary_assignee` are used

- `created_by`: ownership scope (§1.2), notification target on transition (`transitionService.ts:74-76`), cert issuance fallback `org_id ?? created_by` (`transitionService.ts:118`), analytics scope, and displayed in the admin UI (`admin-dashboard/.../ApplicationDetailPage.tsx:163`).
- `assignees[]`: set by `POST /:id/assign` (`applications.ts:175-210`) and `PUT /:id/assign` (mobile-compat, `applications.ts:215-225`); notified on transition; used by the `assignee_to_me` list filter (`applications.ts:49`) and the "my tasks" index (`Application.ts:219`).
- `primary_assignee`: set on assign; populated for list/detail display (`applications.ts:60,101`). No behavioral difference from `assignees[0]` today.

### 1.4 Where ownership breaks (evidence, not assumption)

- **B2B break (G3):** two `client` users sharing one `org_id` — each sees only what **they** created, because scoping is `created_by == me` (`applications.ts:26-28, 44-46`), even though the application belongs to the same company. There is no owning **Customer/Organization** on the client read path.
- **Role-blind assignment (G2):** `assignees[]` cannot say "this one is the consultant, that one the reviewing employee, that one the manager." The locked model needs three typed slots; the schema has one untyped array + one primary. `Workflow.stages[].assignee_role` exists (`Workflow.ts:23,71`) but nothing reads it to route work.
- **`created_by` is doing ownership (G1):** directly contrary to the LOCKED decision. It is immutable in practice (never reassigned), but it is the *authorization key*, which the decision forbids.

> **Note on the brief vs. reality:** The brief says "current code mixes `created_by` with ownership." **Verified true here** (unlike a hypothetical `created_by` that doesn't exist). The fix is to demote `created_by` to audit-only and introduce explicit ownership axes.

---

## 2. Target ownership architecture

### 2.1 The five axes (per LOCKED decision)

| Field | Type | Mutable | Purpose / consumes |
|---|---|---|---|
| `customer_id` | `ObjectId → Organization` (the customer entity) | rarely (explicit transfer) | **Primary ownership + client visibility.** Fixes G3: client read scope becomes "applications of my customer(s)", not "apps I created." Feeds analytics, AI context, health score, renewals, payments. |
| `consultant_id` | `ObjectId → User(role=consultant)` \| null | yes | Consultant servicing the customer — "assigned customers only." |
| `employee_id` | `ObjectId → User(role=employee)` \| null | yes | Employee doing verification/review on this application; drives the review queue and `assignee_role` auto-routing (§7). |
| `manager_id` | `ObjectId → User(role=admin)` \| null | yes | Escalation + oversight target (§7). |
| `created_by` | `ObjectId → User` (+`created_by_role`) | **never** | **Audit-only.** Keep the field and its index; **remove its authorization role.** |

`assignees[]`/`primary_assignee` become a **derived/compat projection** of the three staff axes during migration (so existing "my tasks" queries and mobile `PUT /:id/assign` keep working), then retire once the typed fields are authoritative.

### 2.2 The "Customer" question (must be decided)

Today "customer" is ambiguous: the **individual `User(role=client)`** (used by `created_by` scoping) vs the **`Organization`** (`type: manufacturer|importer|...`, optional, `owner_user_id`). For B2B this must resolve to **one owning entity**. Recommended: **`customer_id → Organization`**, auto-provisioning a personal Organization for org-less single-tenant clients during backfill, so every application has a stable customer regardless of which contact filed it. **I could not verify** whether a personal-Organization-per-client convention already exists — grep shows `org_id` is simply left undefined for single-tenant users (`Application.ts:141-144`). **This is a product/data decision to confirm before backfill.**

### 2.3 Why keep `assignees[]` at all

It stays as a fast **union index** for "anyone working on this" ("my tasks" — `Application.ts:219`) and mobile compatibility, populated from `{consultant_id, employee_id, manager_id}`. This avoids breaking the shipped mobile `PUT /:id/assign` and the `assignee_to_me` filter while the typed axes take over authorization.

---

## 3. Migration strategy (Expand → Backfill → Dual-write → Cutover → Contract → Rollback)

The base is healthy, so migration is mostly additive.

- **Expand:** add `customer_id`, `consultant_id`, `employee_id`, `manager_id`, `created_by_role` (all optional) + indexes `{customer_id, status, created_at}`, `{consultant_id,status,due_at}`, `{employee_id,status,due_at}`. No reads change.
- **Backfill (idempotent, dry-run first):**
  - `customer_id` ← the application's `org_id` if present; else find/create a personal Organization for `created_by` (per §2.2 decision) and set it.
  - `consultant_id`/`employee_id`/`manager_id` ← infer from current `assignees[]` **by each user's `role`** (`User.role`); `primary_assignee` seeds the matching typed slot. Ambiguous/multi → `needs_triage` report, never guessed.
  - `created_by_role` ← snapshot of the creator's role.
  - Reconciliation report: counts mapped, org-less clients provisioned, ambiguous assignees.
- **Dual-write:** `POST /:id/assign` and `createDraftApplication` write both `assignees[]` (compat) and the typed axes; reads still use `created_by`/`assignees`.
- **Cutover (flagged, per-cohort):** switch client read scope from `created_by` to `customer_id` (`applications.ts` list + `scopeById`, `analytics.ts`); switch transition/assign authorization to the typed axes. Flag off = instant revert.
- **Contract:** demote `created_by` to audit-only (drop from `scopeById`); make `assignees[]` a derived projection; retire dual-write.
- **Rollback:** Expand/Backfill are additive and reversible (`--revert` nulls new fields; delete provisioned personal orgs). Cutover reverts by flag. Contract is gated behind "reconciliation clean N days + snapshot."

---

## 4. API impact

**Live endpoints to preserve** (consumed by admin-dashboard + mobile — verified `ApplicationDetailPage.tsx:94` posts `/applications/:id/transition`, `:163` reads `created_by`; mobile reads health/analytics):

| Endpoint | File | Change |
|---|---|---|
| `GET /applications` (list) | `applications.ts:33` | client scope `created_by`→`customer_id`; response unchanged (add typed-owner fields) |
| `GET /applications/:id` | `applications.ts:97` | scope via `customer_id`; still populates `created_by`, `assignees`, `primary_assignee` |
| `POST /applications/:id/transition` | `applications.ts:144` | unchanged contract; add gate enforcement (§5) behind flag |
| `POST` & `PUT /applications/:id/assign` | `applications.ts:175, 215` | write typed axes + keep `assignees[]`; consider consolidating the two |
| `GET /applications/:id/audit` | `applications.ts:112` | becomes `…/timeline` superset (§10); keep `/audit` as alias |
| `GET /analytics/overview` | `analytics.ts:14` | client scope `created_by`→`customer_id` |

**New (additive):** `POST /applications/:id/override` (§5.3), `GET /applications/:id/timeline` (§10), renewal-create endpoint (§8), assignment auto-route is internal (no new public contract).

**Deprecations:** none hard-breaking. `PUT /:id/assign` (mobile-compat) and the untyped `assignees[]` write path get soft-deprecation headers once typed axes are authoritative.

---

## 5. Workflow engine, gates, and override

### 5.1 Pipeline today (evidence)
`transitionService.ts:48-98`: `evaluate()` (pure: transition validity + Role Matrix) → `transitionTo()` + `save()` → `audit()` → `notify()` assignees+creator (never actor, `:74-76`) → `issueCertification()` on `cert_issued` (`:93`). This already realizes most of the brief's `TransitionService → WorkflowEngine → Audit → Notification → …` chain.

### 5.2 Fill the stubbed gates (G5)
`workflowEngine.ts:38-39,73-74` returns `requiredActions: []`, `sla: null` by design. Target: the engine consults `Workflow.stages[].required_docs` (`Workflow.ts:16-21`) and `application.fee.paid` (`Application.ts:94-99`) to populate `requiredActions` (e.g. `['upload:test_report','pay:application_fee']`) and compute `sla.dueInDays` from `stages[].sla_days`. **Keep the engine pure** — the caller passes in the already-loaded workflow + fee/doc state, matching the current pure-function contract (`workflowEngine.ts:1-14`). This is explicitly anticipated by the code ("later sprints can fill them in without changing this contract").

### 5.3 Workflow Override — its own endpoint (G4)
New `POST /applications/:id/override` (admin/super_admin only), modeled on the existing CB-override which already requires a reason (`certificationBodies.ts:143-144`). It must: **require `reason`** (400 otherwise), set status via an *unguarded* state-set (bypassing `ALLOWED_TRANSITIONS`/Role Matrix), append to `status_history[]` with an `override:true` marker, write an immutable `audit()` entry (add `'status_overridden'` to `AuditAction`, `AuditLog.ts:4-12`), fire notifications, and remain immutable (AuditLog already enforces immutability, `AuditLog.ts:81-83`). Implement as `OverrideService` separate from `TransitionService` so the normal path stays deny-by-default.

---

## 6. RBAC integration (locked roles)

The role vocabulary **already matches the locked set** — `super_admin | admin | consultant | employee | client | viewer` (+ `cb | lab | ib`) in `models/User.ts:8,98` and `roleMatrix.ts:16-18`. Enforcement layers: JWT `authenticate` (`authMongo.ts:38`), `requireRole()` (`authMongo.ts:93`), `authorize()` with org-scope + employee-edit guard (`authorize.ts:13-37`), and the transition Role Matrix (`roleMatrix.ts:30-74`).

Post-redesign, ownership scope composes with role:

| Role | Visibility | Transition rights (already in `roleMatrix.ts`) |
|---|---|---|
| Client | own `customer_id` apps | submit / resubmit-after-docs / cancel draft (`roleMatrix.ts:31-48`) |
| Consultant | assigned customers (`consultant_id`) | routine forward/back moves (STAFF), **not** approve/reject/issue (`roleMatrix.ts:21-23`) |
| Employee | assigned apps (`employee_id`) + review queues | STAFF moves; approvals restricted to MANAGERS |
| Admin / Super Admin | all | everything incl. override + issuance (MANAGERS, `roleMatrix.ts:23,66`) |

The only change is **swapping the ownership predicate** in `scopeById`/list from `created_by` to the typed axes; the transition-level RBAC already encodes the locked matrix. (Note: the roleMatrix currently grants approvals to `admin/super_admin` only — if dedicated Certification/Testing/Inspection *Manager* sub-roles are ever wanted, `roleMatrix.ts:11-13` says only that file changes.)

---

## 7. Assignment engine (design)

Replace manual-only assignment (`applications.ts:175-225`) with an `AssignmentEngine` that the TransitionService calls on stage entry:

- **Auto-route on entry** using `Workflow.stages[].assignee_role` (`Workflow.ts:23`, currently unused) → pick a user of that role (round-robin/least-loaded from open-app counts on `employee_id`/`consultant_id`) → set the typed axis.
- **Consultant** at customer level (default), **employee** at stage level, **manager** for escalation.
- **Reassign / unassign / escalate**: first-class events, each writing `audit()` (`assigned`/`unassigned` already exist, `AuditLog.ts:7`) + notification + timeline; escalation targets `manager_id` and raises `priority` (`Application.ts:102`).
- **History**: keep in AuditLog (already time-series/immutable) — no new collection needed initially.
- **Workload balancing** (future): derivable from typed-axis counts + existing `{assignees,status,due_at}` index (`Application.ts:219`) — no schema change.
- **Cleanup**: fold `PUT /:id/assign` into `POST /:id/assign` (G6 minor duplication).

---

## 8. Workflow integration across modules

- **Payment (gate):** wire `fee.paid` (`Application.ts:94-99`) + Razorpay capture (`Payment.ts:29,77`) into the engine's `requiredActions` (§5.2) so e.g. `approval_pending → approved` or issuance requires a captured `application_fee`. Payment model already links `application_id` (`Payment.ts:11,61`).
- **Certification:** issuance already automated on `cert_issued` (`transitionService.ts:93-154`); keep.
- **Testing / Inspection (G7):** add `application_id` to `models/Testing.ts` and `models/Inspection.ts` and surface their sub-status into the Application timeline; the Application `testing` stage should reflect the linked Testing record's `status`. Today they're keyed on `client_id`/`product_name` with **no** `application_id` — disconnected from the workflow.
- **Renewals (G8):** add a `createRenewal(cert)` flow that mints a new Application (reusing `createDraftApplication`, `applicationService.ts:42`), links `predecessor_cert_id`/`successor_cert_id` (`Certification.ts:34-35`), and flips the old cert to `renewed` (`Certification.ts:7`). The expiry cron (`jobs/v2/certExpiryReminder.ts`) currently only notifies.
- **AI (G9):** invoke `aiService` from TransitionService (async, non-blocking) to refresh customer context / suggest next actions on state change.
- **Timeline (§10):** unify.

---

## 9. Customer management integration

- **Customer entity:** resolve to `Organization` as `customer_id` (§2.2). `computeCustomerHealth()` is a pure function already consumed by the admin client page (`admin-dashboard/.../ClientDetailPage.tsx:94-97`) and mobile compliance score (`mobile-app/.../HomeScreen.tsx:242-255`) — feed it `customer_id`-scoped aggregates instead of per-user.
- **Analytics** (`analytics.ts`) moves client scope to `customer_id`, unlocking per-customer/per-consultant/per-employee cuts.
- **AI context**: customer's full application/cert/payment history via `customer_id`.

---

## 10. Timeline unification (G10)

Introduce `GET /applications/:id/timeline` that merges: `status_history[]` (`Application.ts:55`), `AuditLog` events (`applications.ts:112-135`), assignment events, document adds (`Application.ts:63-68`), and payment captures — one chronological, customer-safe view. Keep `/audit` as a staff alias. No new storage; it's a read-side join over existing immutable sources.

---

## 11. Future scalability

The five-axis model + `Organization.type` (`manufacturer|importer|consultant|cb|lab`, `Organization.ts:6`) already anticipates multiple parties. External partners (CB/lab/IB) are **assignment targets / typed orgs**, not new ownership axes — the CB-selection flow (`Application.certification_body`, `Application.ts:74-85`) is the template. Multi-office/region composes via `Organization.address.country_code` + `User.country_code` (data-residency already referenced, `User.ts:11`). No second ownership redesign is required because ownership axes are fixed and everything else is assignment or org attribute.

---

## 12. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | Backfill mis-infers typed axes from untyped `assignees[]` | infer by `User.role`; ambiguous → triage report; dry-run + reconciliation |
| R2 | `customer_id` provisioning for org-less clients duplicates/merges wrong | deterministic personal-org per client; human review of merges; reversible |
| R3 | Switching client scope `created_by`→`customer_id` could over-expose across a shared org | cohort rollout behind flag; contract tests per role; instant flag rollback |
| R4 | Override endpoint abused | admin-only, mandatory reason, immutable audit, override-rate alerting |
| R5 | Enabling doc/payment gates blocks currently-passing transitions | ship gates in "log-only" mode first, then enforce; announce |
| R6 | Testing/Inspection back-linking to legacy records lacking `application_id` | nullable link + backfill by `client_id`+`product`; leave unmatched unlinked |
| R7 | Mobile `PUT /:id/assign` / `assignees[]` compat regressions | keep `assignees[]` as derived projection through Contract phase |
| R8 | AI call in transition adds latency/failure | fire-and-forget, timeout-bounded, never blocks the state change |

---

## 13. Implementation roadmap (independent, reversible sprints)

1. **Ownership Expand** — add typed axes + indexes + `created_by_role` (additive; no reads change). *Files:* `models/Application.ts`. *Rollback:* drop fields.
2. **Backfill + reconciliation** — idempotent scripts, dry-run, report; provision customer orgs. *Rollback:* `--revert`.
3. **Dual-write assignment** — `POST/PUT /:id/assign` + `applicationService` write typed axes and `assignees[]`. *Files:* `applications.ts`, `applicationService.ts`.
4. **Override endpoint** — `OverrideService` + `POST /:id/override` (reason-required, immutable audit). *Files:* new service/route, `AuditLog.ts` action enum.
5. **Gate enforcement (log-only→enforce)** — engine consults `required_docs` + `fee.paid` + `sla_days`. *Files:* `workflowEngine.ts`, `transitionService.ts`.
6. **Ownership cutover (flagged)** — client scope + analytics + transition/assign authz move to typed axes. *Files:* `applications.ts`, `analytics.ts`.
7. **AssignmentEngine** — auto-route on stage entry via `assignee_role`; escalation. *Files:* new `assignmentEngine.ts`, `transitionService.ts`.
8. **Testing/Inspection integration** — add `application_id`; surface into timeline. *Files:* `models/Testing.ts`, `models/Inspection.ts`, routes.
9. **Renewal workflow** — `createRenewal()` + endpoint + cron trigger. *Files:* `applicationService.ts`/new, `jobs/v2/certExpiryReminder.ts`.
10. **Timeline unification + AI-in-pipeline** — `GET /:id/timeline`; async AI on transition. *Files:* `applications.ts`, `transitionService.ts`.
11. **Contract** — demote `created_by` to audit-only; `assignees[]` derived; retire dual-write. Gated on clean reconciliation + snapshot.

---

## Appendix A — Evidence index (file:line)
- State machine + immutable history + guards: `models/Application.ts:17-30, 55, 126-136, 225-252`.
- Single transition path + side effects: `services/workflow/transitionService.ts:48-154`; route `routes/v2/applications.ts:140-170`; duplicate removed `:140-143`.
- Pure engine + stubbed gates: `services/workflow/workflowEngine.ts:31-76`.
- Deny-by-default Role Matrix: `services/workflow/roleMatrix.ts:16-84`.
- Ownership fields: `models/Application.ts:57-62, 160-162`.
- `created_by` as owner (client scope): `routes/v2/applications.ts:25-28, 44-46`; analytics `routes/v2/analytics.ts:27-34`.
- Manual assign (two endpoints): `routes/v2/applications.ts:175-225`.
- Immutable time-series audit: `models/AuditLog.ts:43-140`.
- Roles = locked set: `models/User.ts:8,98`; `roleMatrix.ts:16-18`.
- Auth/authz stack: `middleware/authMongo.ts:38-121`; `middleware/authorize.ts:13-37`.
- Workflow-as-data + unused `assignee_role`: `models/Workflow.ts:12-25, 71`.
- Certification + renewal chain + expiry: `models/Certification.ts:33-36, 96-107`; `jobs/v2/certExpiryReminder.ts`.
- Payment (Razorpay, purposes incl. renewal_fee): `models/Payment.ts:11-14, 61-64`.
- Testing/Inspection standalone (no application_id): `models/Testing.ts:3-14`; `models/Inspection.ts:3-24`.
- Real AI (BYO provider): `services/aiService.ts:1-55`.
- Customer health (pure) + FE consumers: `services/customerHealthService.ts`; `admin-dashboard/.../ClientDetailPage.tsx:94-97`; `mobile-app/.../HomeScreen.tsx:242-255`.
- CB-override template (reason required): `routes/v2/certificationBodies.ts:115-161`.

## Appendix B — Could NOT verify (stated, not assumed)
1. Whether a **personal-Organization-per-client** convention exists — grep shows `org_id` simply left undefined for single-tenant clients (`Application.ts:141-144`). Confirm before choosing `customer_id → Organization`.
2. Whether any **renewal-creation** code exists elsewhere — none found (grep: no `createRenewal`); only chain fields + reminders.
3. Whether **admin-dashboard/mobile** rely on `created_by`-based visibility semantics that a `customer_id` cutover would change — I confirmed usage points but did not exhaustively audit every screen.
4. Runtime behavior of **gate stubs under production data** (I read the code paths, did not execute).

---

*End of review. No production code was written, no files modified, no migrations created, no commits made. Awaiting approval before any implementation.*

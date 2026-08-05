# DICE — Known Limitations

Honest, evidence-based list of what is intentionally incomplete or deferred at
Release Candidate. None of these are core-workflow blockers.

## Requires external systems
- **MCA & GSTIN lookup screens** (`mobile-app/src/screens/profile/{MCASearchScreen,GSTINLookupScreen}.tsx`)
  search empty in-app stores and have no backend endpoint. Making them functional
  requires integrating **external government APIs** (MCA21 / GST portal) with
  credentials. Until then, either integrate those APIs or hide the two screens
  before GA. Auxiliary tools — not part of the core compliance workflow.

## Deferred by design (needs production data / a later staged change)
- **Ownership read-cutover + RBAC assignment-scoping.** The typed-ownership model
  is fully implemented and dual-written, but client reads still key off
  `created_by`. Switching to `customer_id` requires the ownership backfill to be
  **run against production data and reconciled** first (DEPLOYMENT_GUIDE §4), then
  a change that wires `canAccessApplication` into the read paths (with its own
  flags). Intentionally not activated at RC.

## Technical debt (functional, not a defect — left per "no refactor" scope)
- **Two notification paths coexist:** the older `notificationService.sendPush/notify`
  (used by leads / meetings / partners / support-tickets / expiry reminder) and the
  unified `notify()` (used by the workflow engines). Both work; consolidating onto
  `notify()` is a multi-file refactor with regression risk, deferred.
- **`middleware/featureFlag.ts` (`requireFeature`) has no current consumer.** It is
  a legitimate route-gating primitive (complementary to the in-service
  `isFeatureEnabled` reader), retained for future endpoint gating; harmless.
- **`ENV.API_URL` (=`/api/v1`) in `mobile-app/src/config/env.ts`** is defined but
  never used for requests (real calls use `API_BASE_URL` = `/api/v2`). Harmless
  unused field.
- **`mobile-app/src/screens/legacy/`** (Signup / OnboardingTour / UserTypeSelection)
  are unreachable and superseded, but intentionally retained per the folder's own
  README pending on-device verification of their replacements.

## Tests
- **One pre-existing failing case** in `backend/src/__tests__/leads.draftApplication.test.ts`
  ("captures a Lead only … no application"): it asserts the leads route should not
  auto-create an application in one edge case. Predates the current work and is
  unrelated to the workflow/ownership changes; left untouched.

## Operational (not code)
- No CI pipeline in `.github/workflows` — wire build+test CI if desired.
- Background jobs use in-process `setInterval` (fine for a single instance);
  migrate to BullMQ/Redis when scaling to multiple workers (noted in `jobs/index.ts`).
- Requires real-user, on-device, load, and penetration testing before GA (out of
  scope for internal implementation).

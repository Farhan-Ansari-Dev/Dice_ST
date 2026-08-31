# Find Your CB — Certification Body discovery & matching

Status: **Complete end-to-end — Backend + Admin dashboard + Mobile customer app, all validated.**

Mobile (Stage 3): `mobile-app/src/screens/find-cb/` — FindCBResults (server matching + score/reasons + compare
select), CBProfile (customer-safe detail, no internal checklist), CBCompare (swipeable columns), RequestQuote
(reuses existing document upload; handles 409 duplicate), CBRequestSuccess, CBRequestDetail (status timeline +
customer-visible updates only), CBRequestsList (My CB Requests). Service `mobile-app/src/services/cbService.ts`.
Entry from `ApplicationDetailScreen` ("Find & compare certification bodies"), registered in
`CertificationsStackNavigator`, and `cb_request` push deep-links via `notificationRouter`. The legacy
`ChoosePartner` application-CB-selection flow is untouched and still works. Mobile `tsc` passes; no RN/EAS
native build was run (not reliably runnable in this environment).

Admin dashboard (Stage 2): `admin-dashboard/src/pages/certification-bodies/` (list + detail with
Overview/Accreditations/Scope/Markets/Industries/Verification/Requests/Audit tabs) and
`.../cb-requests/` (dashboard with real backend metrics + request detail with assign / status /
internal-vs-customer notes / recorded CB response / audit). Wired into `App.tsx` routes + `Sidebar`.
Reuses existing Badge/Button/Modal/EmptyState/Forms components, `usePermissions`, `apiClient`, toast,
and audit UI. New endpoints added to support it: `/accreditations` CRUD, `GET /certification-bodies/:id/audit`,
`GET /cb-requests/:id/audit`, plus cert_type/market/q filters on the requests list.

## Architecture (reuses existing DICE entities — no parallel systems)

- **A CB is an `Organization` with `type: 'cb'`** — unchanged. Already searched via
  `MarketAccessService` and selectable per-Application (`Application.certification_body`).
  We extended, not replaced, this.
- **New structured entities** (`backend/src/models/`):
  - `Accreditation` — a real accreditation authority/programme (code, country, status,
    verification source). Replaces free-text accreditation strings for matching.
  - `CertificationBodyScope` — one structured statement of what a CB is accredited to do:
    `cert_type` + product categories + industries + markets (ISO alpha-2) + service type +
    `accreditation_id` + validity window + status. **Matching reads these, never free text.**
  - `CBRequest` — a customer's quote/contact request lifecycle (own human id `CBR-YYYY-NNNNN`).
- **`Organization.cb_verification`** (additive, optional) — verification lifecycle
  `draft → pending_review → verified → suspended → archived` with per-check flags
  (organization / accreditation / scope / contact), `verified_by/at`, `reverify_at`.
  A CB is only ever surfaced publicly as "verified" when `status === 'verified'`.
  Legacy CBs (no block) still appear but are not marked verified.

Representations mirror the rest of DICE: `cert_type` strings (= `Application.cert_type` /
`settings.allowed_cert_types`), ISO alpha-2 market codes (= `Country.code`), `Product.category`
strings. Nothing is duplicated.

## Matching engine — `backend/src/services/cbMatchingService.ts`

Single, centralized, deterministic, explainable. Given a `CBRequirement`
(`cert_type`, `product_category?`, `industries?`, `market?`, `service_type?`, `require_accreditation?`):

1. **Hard filters (EXCLUDE, never down-rank):**
   - Not a `type:'cb'` org, or suspended/archived verification → excluded.
   - Cert not issuable (`settings.allowed_cert_types` non-empty and missing the cert) → excluded.
   - Market: excluded **only** when the CB has explicit market data that omits it (absent data
     is treated as "unknown", not "unsupported" — never fabricated).
   - `require_accreditation` and the CB has none → excluded.
   - Expired/suspended/out-of-window scopes are ignored as coverage.
2. **Transparent weighted score (0–100):** certification 30, product scope 20, market 20,
   accreditation 15, industry 7, service type 3, verified 5. A criterion only counts toward
   the denominator when applicable, so scores stay intuitive.
3. **Structured `match_reasons`** (`{key,label,satisfied}`) — unsatisfied criteria are shown
   honestly, not hidden. The frontend renders these; **no scores are computed on the client.**

Legacy CBs with no structured scope fall back to `cb_profile` (so existing data works) but
score lower and `scope_backed:false`. Queries are batched (no N+1).

## API (all authenticated; staff routes role-guarded; ownership derived server-side)

Customer (`/api/v2/certification-bodies`):
- `GET /match` — the matching endpoint. Query `cert_type`/`product_category`/`market`/`industry`/
  `service_type`/`require_accreditation`, **or** `application_id` (requirement derived from the
  application, ownership-checked; explicit params override). Returns `{requirement, count, available, certificationBodies[], message?}`.
- `GET /:id` — public CB profile (never exposes internal notes or scope evidence docs); optional
  `?cert_type=&market=` adds `match_score`/`match_reasons`.
- `GET /:id/scopes` — public active scopes.
- `GET /` — the pre-existing "Find a CB" explainer + list (unchanged).

CB requests (`/api/v2/cb-requests`):
- `POST /` — create (duplicate-protected: one active request per user+CB+cert+market → 409 with
  the existing request), `GET /` (own for customers, all for staff), `GET /:id` (ownership),
  `PATCH /:id/cancel`.

Admin (role-guarded, audited):
- `GET /certification-bodies/admin` (filter/paginate), `POST /certification-bodies` (create CB),
  `PATCH /certification-bodies/:id`, `POST /:id/verify`, `POST /:id/publish` (requires all checks),
  `POST /:id/suspend`.
- Scopes: `POST /certification-bodies/:id/scopes`, `PATCH /certification-bodies/scopes/:scopeId`,
  `DELETE /certification-bodies/scopes/:scopeId` (soft-delete).
- Requests: `PATCH /cb-requests/:id` (assign / status / `cb_response` / `internal_notes`) — notifies
  the customer on status/response changes; internal notes are never returned to the customer.

## Request lifecycle
`submitted → sent_to_cb → acknowledged → quote_received → accepted / rejected / cancelled / closed`
(`status_history[]` records every transition with actor + optional customer-visible note).

## Verification workflow
Admin records the four checks; all-true ⇒ `verified` (publishable), otherwise `pending_review`.
`suspend` removes a CB from public results. Customer-facing wording is precise
("Verified by Sanyog", "verified on <date>") — Sanyog is not represented as an accreditation body.

## Security / audit
Every endpoint authenticates; staff mutations use `requireRole(...ADMIN_ROLES)`; customer reads/
writes are scoped to `user_id`/`customer_id` derived from the token. `application_id` ownership is
re-checked server-side. CB create/update/verify/publish/suspend, scope changes, and request
create/update/cancel are written to the existing `AuditLog`. Notifications reuse
`notificationService.notify` (`type: 'cb_request'`).

## Indexing (Phase 8)
`Organization {type, cb_verification.status}`; `CertificationBodyScope {cb_id,cert_type,status}` +
`{cert_type,status,markets}`; `CBRequest {customer_id,status,created_at}`, `{cb_id,status}`,
`{assigned_to,status}`, and a duplicate-lookup index `{user_id,cb_id,cert_type,market,status}`.

## Seed / migration (Phase 12/13)
No production data is fabricated. Existing CBs keep working via the `cb_profile` fallback. To move a
CB to structured matching, add `CertificationBodyScope` rows and set `cb_verification`. A demo seed
(clearly marked, non-verified) can be added under `backend/src/db/` if needed — not included by
default so nothing is silently presented as verified.

## Tests
`backend/src/__tests__/findYourCb.test.ts` — 10 tests: hard-filter exclusion (cert/market/
accreditation), deterministic scoring + ranking + reasons, honest empty state, request ownership,
duplicate protection, internal-notes hiding, staff authorization, cancel. Full backend suite: 361
passing (1 pre-existing unrelated `leads.draftApplication` failure).

## Remaining (next stages, same order the platform expects)
- **Admin dashboard**: Certification Bodies list/create-edit/detail + CB Requests dashboard/detail,
  wired to the endpoints above (reuse existing table/form/drawer/permission patterns).
- **Mobile**: Find Your CB entry (prefilled from Application) → results (score/reasons) → detail →
  compare → request quote (reuse document upload) → My Requests tracking (reuse request/timeline UI).

## Future-proofing
`Accreditation` + `CertificationBodyScope` are entity-typed against `Organization`, so Testing
Labs / Inspection Bodies (already `type:'lab'` etc.) can reuse the same scope/verification model
later without a rewrite. Not built now.

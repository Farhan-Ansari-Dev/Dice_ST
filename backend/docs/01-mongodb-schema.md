# DICE — MongoDB Schema Design

> **Scale targets:** 50k users · 2k–5k DAU today · 500k users in 24 months
> **Files in S3, metadata in MongoDB** · **Atlas M10 (Mumbai)** · **Designed for solo developer**

---

## Design Principles

1. **Embed when you read together, reference when you grow unbounded.**
   - User profile + auth → embed
   - Organization → Members? Reference (an org can have 500 staff)
   - Application → Documents? Reference (each app accumulates 20–50 versioned docs)

2. **Immutable audit trail.**
   - `audit_logs` collection is **write-only**. Never updated, never deleted.
   - `document_versions` are immutable — each upload is a new doc, the parent points at "current".
   - Use MongoDB **Time-Series collections** (5.0+) for `audit_logs`.

3. **Workflow as data, not code.**
   - Every cert type (BIS_CRS, EPR, TEC_ETA, LMPC, FSSAI…) is a `workflow` document.
   - Add new cert types via DB insert, not code change.
   - The `application` state machine reads from the workflow definition.

4. **Soft delete with `deleted_at` everywhere except audit_logs.**
   - DPDP/GDPR right-to-be-forgotten requires hard-delete on demand,
     but day-to-day, soft delete prevents data loss.

5. **Compound indexes match query patterns.** Always run `explain()` before shipping.

---

## Collections Overview

| Collection | Purpose | Cardinality | Hot? |
|---|---|---|---|
| `users` | Auth + profile | 50k → 500k | ✅ |
| `organizations` | Business accounts (DICE is B2B) | 10k → 100k | ✅ |
| `products` | Products undergoing certification | 100k → 1M | ✅ |
| `applications` | Active certification workflows | 50k → 500k | ✅✅ |
| `certifications` | Issued certs (lifecycle tracked) | 30k → 300k | ✅ |
| `documents` | Logical files (with current version pointer) | 500k → 5M | ✅✅ |
| `document_versions` | **Immutable** version history | 2M → 20M | ⚠️ write-heavy |
| `audit_logs` | **Immutable, time-series** activity log | 50M → 500M | ⚠️ append-only |
| `workflows` | Cert type definitions (config-as-data) | < 100 | ❄️ rarely changes |
| `comments` | Application discussion threads | 1M → 10M | ✅ |
| `notifications` | In-app + push targets | 5M → 50M | ✅ |
| `payments` | Razorpay reconciliation | 50k → 500k | ✅ |
| `tasks` | Team task assignments | 100k → 1M | ✅ |
| `sessions` | Refresh-token store (or use Redis) | active only | ✅ |

---

## Entity-Relationship Diagram

```
┌──────────────┐        ┌──────────────────┐
│ Organization │←──────┤ User             │
│ - name       │ owner │ - email,phone    │
│ - gst        │       │ - role           │
│ - members[]  │       │ - org_id         │
└──────┬───────┘       └─────────┬────────┘
       │                          │ actor
       │ owns                     │
       ▼                          │
┌──────────────┐                  │
│  Product     │                  │
│ - name, hsn  │                  │
│ - category   │                  │
└──────┬───────┘                  │
       │ subject_of               │
       ▼                          │
┌──────────────┐    references    │
│ Application  │◄──────────────────┘
│ - state      │
│ - workflow_id├──────► Workflow (config: stages, required docs)
│ - documents[]│
│ - assignees[]│
└──────┬───────┘
       │ on_approval
       ▼
┌──────────────┐
│Certification │  ── lifecycle: active → expiring → expired → renewed
│ - expiry     │
│ - pdf_s3_key │
└──────────────┘

┌─────────────┐  has  ┌───────────────────┐
│  Document   │──────►│ DocumentVersion   │  (immutable, S3-backed)
│ - current_v ├──────►│ - version_number  │
│ - tags      │   1:N │ - s3_key, sha256  │
└─────────────┘       │ - uploaded_by     │
                      │ - ocr_text        │
                      └───────────────────┘

┌─────────────┐
│ AuditLog    │  (time-series, append-only, 5-year retention)
│ - actor     │
│ - action    │
│ - target    │
│ - before/   │
│   after     │
└─────────────┘
```

---

## Index Strategy (the most important section)

Run these AFTER you create the collections via Mongoose `index()` calls.

```js
// users
db.users.createIndex({ email: 1 }, { unique: true, partialFilterExpression: { deleted_at: null } });
db.users.createIndex({ phone: 1 }, { unique: true, sparse: true });
db.users.createIndex({ org_id: 1, role: 1 });

// applications — most queried
db.applications.createIndex({ org_id: 1, status: 1, created_at: -1 });   // dashboard
db.applications.createIndex({ assignees: 1, status: 1 });                 // "my tasks"
db.applications.createIndex({ product_id: 1 });
db.applications.createIndex({ application_number: 1 }, { unique: true });

// documents
db.documents.createIndex({ org_id: 1, created_at: -1 });
db.documents.createIndex({ application_id: 1 });
db.documents.createIndex({ tags: 1 });
db.documents.createIndex({ "$**": "text" }, { name: "doc_search" });      // full-text

// document_versions
db.document_versions.createIndex({ document_id: 1, version_number: -1 });
db.document_versions.createIndex({ sha256: 1 });                          // dedupe

// certifications
db.certifications.createIndex({ org_id: 1, status: 1 });
db.certifications.createIndex({ expiry_date: 1, status: 1 });             // expiry-reminder cron
db.certifications.createIndex({ cert_number: 1 }, { unique: true });

// audit_logs (time-series collection — automatic time index)
db.createCollection("audit_logs", {
  timeseries: { timeField: "ts", metaField: "meta", granularity: "minutes" },
  expireAfterSeconds: 5 * 365 * 24 * 3600   // 5 years retention
});
db.audit_logs.createIndex({ "meta.actor": 1, ts: -1 });
db.audit_logs.createIndex({ "meta.resource_type": 1, "meta.resource_id": 1, ts: -1 });

// notifications
db.notifications.createIndex({ user_id: 1, read: 1, created_at: -1 });
db.notifications.createIndex({ created_at: 1 }, { expireAfterSeconds: 180 * 24 * 3600 }); // auto-delete after 180d
```

---

## Application State Machine

Drawn from real BIS/EPR/TEC workflows:

```
   draft ──submit──► submitted ──assign──► docs_review
                                              │
                              docs_required ◄─┤── reviewer asks
                                   │          ▼
                              re-uploads     tech_review
                                   │          │
                                   └─►        testing
                                              │
                                              ▼
                                         approval_pending
                                              │
                              ┌───────────────┼───────────────┐
                              ▼               ▼               ▼
                          approved        rejected        on_hold
                              │
                              ▼
                          cert_issued
```

Stored as `application.status` (string enum) + `application.status_history` (array of transitions with actor + timestamp).
Allowed transitions are defined in the **Workflow** document — easy to add new cert types.

---

## Document Versioning Strategy

**Pattern: Pointer + Immutable Versions** (industry standard for compliance)

```
documents collection                document_versions collection
┌─────────────────────────┐         ┌──────────────────────────┐
│ _id: doc_abc            │         │ _id: ver_001             │
│ name: "BIS Test Report" │         │ document_id: doc_abc     │
│ current_version_id: ver_004 ─────►│ version_number: 1        │
│ version_count: 4        │         │ s3_key: docs/.../v1.pdf  │
│ tags: ["BIS", "test"]   │         │ sha256: ...              │
│ ...                     │         │ uploaded_by: user_xyz    │
└─────────────────────────┘         │ uploaded_at: ...         │
                                    │ change_reason: "initial" │
                                    │ ocr_text: "..."          │
                                    │ size_bytes: 1234567      │
                                    └──────────────────────────┘
                                    ┌──────────────────────────┐
                                    │ version_number: 2        │ ← immutable
                                    │ change_reason: "addressed│
                                    │   reviewer comments"     │
                                    └──────────────────────────┘
                                    ... v3, v4
```

**Why this works:**
- Querying current version = single read from `documents` (denormalized pointer)
- Audit history = paginated query on `document_versions` by `document_id`
- Storage cost = S3 holds all versions (lifecycle: hot 30d → IA 90d → Glacier)
- Compliance proof: SHA-256 checksum + timestamp + uploader in immutable record

**Never update a `document_versions` doc.** If a version is wrong, upload a new one with `change_reason: "supersedes v3 — was incorrect"`.

---

## Audit Log Design

Uses MongoDB **Time-Series collection** (4× smaller, 5× faster queries on time ranges).

```js
{
  ts: ISODate("2026-06-08T09:35:32Z"),       // time field (auto-indexed)
  meta: {                                     // dimensions (indexed)
    actor: ObjectId("user_xyz"),
    actor_type: "user" | "system",
    resource_type: "application",
    resource_id: ObjectId("app_123"),
    action: "status_changed",
    org_id: ObjectId("org_abc"),
    ip: "203.0.113.5",
  },
  // payload (NOT indexed — keeps index size small)
  before: { status: "docs_review" },
  after:  { status: "tech_review" },
  user_agent: "DICE/1.0 (iOS 17.2)",
  request_id: "req_..."
}
```

**Retention:** 5 years (matches Indian compliance audit requirement). Auto-deletes via TTL.

---

## Workflow as Data — Example

```js
// workflows collection
{
  _id: "wf_bis_crs_v1",
  cert_type: "BIS_CRS",
  display_name: "BIS Compulsory Registration",
  active: true,
  estimated_duration_days: 45,
  stages: [
    {
      id: "docs_review",
      label: "Document Verification",
      sla_days: 3,
      required_docs: ["test_report", "trademark_cert", "factory_license"],
      next: ["tech_review", "docs_required"]
    },
    {
      id: "tech_review",
      label: "Technical Review",
      sla_days: 7,
      required_docs: ["lab_report"],
      next: ["testing", "rejected"]
    },
    // ...
  ],
  fee_structure: {
    application_fee_inr: 45000,
    annual_fee_inr: 10000
  }
}
```

Add EPR / TEC / LMPC / FSSAI by inserting one doc each — **zero code change**.

---

## Data Residency Strategy

| User region | Atlas cluster | S3 region |
|---|---|---|
| 🇮🇳 India + 🇦🇪 UAE + 🇸🇦 KSA | Mumbai (primary) | ap-south-1 |
| 🇪🇺 Europe | Frankfurt (when EU DAU > 1k) | eu-central-1 |
| 🇺🇸 USA | us-east-1 (when US DAU > 1k) | us-east-1 |

For now: **single Mumbai cluster + S3 Mumbai** suffices. Atlas Global Clusters when you need multi-region.

DPDP Act: Indian user data must stay in India → enforced via Atlas zone tags + `org.country_code` field.

---

See `src/models/` for the actual Mongoose implementations.

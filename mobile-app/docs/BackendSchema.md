# Backend Database Schema
## DICE by Sanyog — PostgreSQL Schema

**Version:** 1.0.0  
**Date:** June 2025  
**ORM:** Prisma  
**Database:** PostgreSQL 15

---

## 1. Entity Relationship Overview

```
users
  │
  ├──< applications (userId)
  │         │
  │         ├──< application_documents (applicationId)
  │         ├──< application_notes (applicationId)
  │         ├──< application_queries (applicationId)
  │         ├──< payments (applicationId)
  │         └──< technical_reviews (applicationId)
  │                     │
  │                     ├──< tr_findings (technicalReviewId)
  │                     └──< tr_queries (technicalReviewId)
  │
  ├──< certificates (userId)
  │
  ├──< notifications (userId)
  │
  ├──< bookmarks (userId)
  │         └──> insights (insightId)
  │
  └──< push_tokens (userId)

insights (standalone, seeded by admin/AI pipeline)

labs (standalone reference table)
certification_bodies (standalone reference table)
```

---

## 2. Table Definitions

### 2.1 `users`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK, default `gen_random_uuid()` | Primary key |
| `phone` | `VARCHAR(15)` | UNIQUE, NOT NULL | Mobile number (E.164 format) |
| `email` | `VARCHAR(255)` | UNIQUE, nullable | Optional email |
| `name` | `VARCHAR(100)` | NOT NULL | Full name |
| `company_name` | `VARCHAR(150)` | NOT NULL | Business name |
| `role` | `ENUM` | NOT NULL, default `'viewer'` | `admin`, `manager`, `viewer` |
| `gst_number` | `VARCHAR(15)` | nullable, UNIQUE | GST registration number |
| `pan_number` | `VARCHAR(10)` | nullable | PAN card number |
| `address` | `TEXT` | nullable | Street address |
| `city` | `VARCHAR(100)` | nullable | City |
| `state` | `VARCHAR(100)` | nullable | State |
| `pincode` | `VARCHAR(6)` | nullable | PIN code |
| `country` | `VARCHAR(100)` | default `'India'` | Country |
| `subscription` | `ENUM` | NOT NULL, default `'free'` | `free`, `pro`, `enterprise` |
| `business_role` | `VARCHAR(50)` | nullable | `manufacturer`, `importer`, `exporter`, `consultant` |
| `industries` | `TEXT[]` | default `'{}'` | Array of industry strings |
| `target_markets` | `TEXT[]` | default `'{}'` | Array of market strings |
| `cert_interests` | `TEXT[]` | default `'{}'` | Array: BIS, EPR, WPC, etc. |
| `goals` | `TEXT[]` | default `'{}'` | Onboarding goals |
| `is_verified` | `BOOLEAN` | default `false` | Phone verified |
| `is_onboarded` | `BOOLEAN` | default `false` | Completed onboarding |
| `avatar_url` | `TEXT` | nullable | Profile picture URL (S3) |
| `subscription_expires_at` | `TIMESTAMPTZ` | nullable | Subscription expiry |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | Last update timestamp |
| `deleted_at` | `TIMESTAMPTZ` | nullable | Soft delete timestamp |

**Indexes:**
```sql
CREATE UNIQUE INDEX idx_users_phone ON users(phone) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_users_subscription ON users(subscription);
CREATE INDEX idx_users_created_at ON users(created_at);
```

---

### 2.2 `refresh_tokens`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK | Primary key |
| `user_id` | `UUID` | FK → users.id, NOT NULL | Owner |
| `token_hash` | `VARCHAR(64)` | UNIQUE, NOT NULL | SHA-256 hash of token |
| `expires_at` | `TIMESTAMPTZ` | NOT NULL | Expiry (30 days) |
| `revoked_at` | `TIMESTAMPTZ` | nullable | If manually revoked |
| `device_info` | `JSONB` | nullable | Platform, OS, device model |
| `created_at` | `TIMESTAMPTZ` | default `now()` | |

**Indexes:**
```sql
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
```

---

### 2.3 `otp_attempts`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK | Primary key |
| `phone` | `VARCHAR(15)` | NOT NULL | Target phone |
| `otp_hash` | `VARCHAR(64)` | NOT NULL | SHA-256 of OTP |
| `attempts` | `SMALLINT` | default `0` | Failed attempts (max 3) |
| `expires_at` | `TIMESTAMPTZ` | NOT NULL | TTL: 5 minutes |
| `verified_at` | `TIMESTAMPTZ` | nullable | When OTP was used |
| `created_at` | `TIMESTAMPTZ` | default `now()` | |

**Indexes:**
```sql
CREATE INDEX idx_otp_phone_expires ON otp_attempts(phone, expires_at);
```

---

### 2.4 `push_tokens`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK | Primary key |
| `user_id` | `UUID` | FK → users.id, NOT NULL | Owner |
| `token` | `TEXT` | NOT NULL | FCM/APNs device token |
| `platform` | `ENUM` | NOT NULL | `ios`, `android` |
| `is_active` | `BOOLEAN` | default `true` | |
| `last_used_at` | `TIMESTAMPTZ` | nullable | |
| `created_at` | `TIMESTAMPTZ` | default `now()` | |

**Indexes:**
```sql
CREATE UNIQUE INDEX idx_push_tokens_user_token ON push_tokens(user_id, token);
CREATE INDEX idx_push_tokens_user_active ON push_tokens(user_id) WHERE is_active = true;
```

---

### 2.5 `certification_bodies`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK | Primary key |
| `name` | `VARCHAR(200)` | NOT NULL | CB name |
| `short_name` | `VARCHAR(50)` | NOT NULL | Abbreviation |
| `logo_url` | `TEXT` | nullable | Logo (S3) |
| `website` | `TEXT` | nullable | Official website |
| `address` | `TEXT` | nullable | Physical address |
| `email` | `VARCHAR(255)` | nullable | Contact email |
| `phone` | `VARCHAR(15)` | nullable | Contact phone |
| `accreditations` | `TEXT[]` | default `'{}'` | NABL, BIS-approved, etc. |
| `cert_types` | `TEXT[]` | default `'{}'` | BIS, EPR, WPC, etc. |
| `avg_tat_days` | `SMALLINT` | nullable | Average turnaround days |
| `success_rate` | `DECIMAL(5,2)` | nullable | % success rate |
| `pricing_tier` | `ENUM` | nullable | `budget`, `mid`, `premium` |
| `is_active` | `BOOLEAN` | default `true` | |
| `is_sanyog_partner` | `BOOLEAN` | default `false` | Sanyog preferred CB |
| `created_at` | `TIMESTAMPTZ` | default `now()` | |
| `updated_at` | `TIMESTAMPTZ` | default `now()` | |

---

### 2.6 `labs`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK | Primary key |
| `name` | `VARCHAR(200)` | NOT NULL | Lab name |
| `short_name` | `VARCHAR(50)` | nullable | |
| `nabl_no` | `VARCHAR(50)` | nullable | NABL accreditation number |
| `address` | `TEXT` | nullable | |
| `city` | `VARCHAR(100)` | nullable | |
| `state` | `VARCHAR(100)` | nullable | |
| `pincode` | `VARCHAR(6)` | nullable | |
| `email` | `VARCHAR(255)` | nullable | |
| `phone` | `VARCHAR(15)` | nullable | |
| `test_categories` | `TEXT[]` | default `'{}'` | Electronics, Food, Chemical, etc. |
| `cert_types` | `TEXT[]` | default `'{}'` | BIS, WPC, FSSAI, etc. |
| `avg_tat_days` | `SMALLINT` | nullable | |
| `is_active` | `BOOLEAN` | default `true` | |
| `created_at` | `TIMESTAMPTZ` | default `now()` | |

---

### 2.7 `certificates`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK | Primary key |
| `user_id` | `UUID` | FK → users.id, NOT NULL | Owner |
| `application_id` | `UUID` | FK → applications.id, nullable | Source application |
| `cert_no` | `VARCHAR(100)` | UNIQUE, NOT NULL | Certificate number |
| `type` | `ENUM` | NOT NULL | `BIS`, `EPR`, `WPC`, `FSSAI`, `ISO`, `CE` |
| `standard` | `VARCHAR(100)` | NOT NULL | IS/IEC/EN standard number |
| `product` | `VARCHAR(200)` | NOT NULL | Product name |
| `product_category` | `VARCHAR(100)` | nullable | Electronics, Food, etc. |
| `model_no` | `VARCHAR(100)` | nullable | Product model |
| `issued_date` | `DATE` | NOT NULL | |
| `expiry_date` | `DATE` | NOT NULL | |
| `issuing_authority` | `VARCHAR(200)` | NOT NULL | BIS HQ / CPCB, etc. |
| `manufacturer` | `VARCHAR(200)` | NOT NULL | |
| `manufacturer_address` | `TEXT` | nullable | |
| `cb_id` | `UUID` | FK → certification_bodies.id, nullable | Associated CB |
| `lab_id` | `UUID` | FK → labs.id, nullable | Testing lab |
| `status` | `ENUM` | NOT NULL, default `'active'` | `active`, `inactive`, `expired`, `revoked` |
| `file_url` | `TEXT` | nullable | Certificate PDF (S3) |
| `qr_code_url` | `TEXT` | nullable | QR verification image (S3) |
| `verification_url` | `TEXT` | nullable | Public verify URL |
| `reminder_sent_30d` | `BOOLEAN` | default `false` | 30-day expiry reminder sent |
| `reminder_sent_60d` | `BOOLEAN` | default `false` | 60-day expiry reminder sent |
| `reminder_sent_90d` | `BOOLEAN` | default `false` | 90-day expiry reminder sent |
| `created_at` | `TIMESTAMPTZ` | default `now()` | |
| `updated_at` | `TIMESTAMPTZ` | default `now()` | |

**Indexes:**
```sql
CREATE INDEX idx_certificates_user_id ON certificates(user_id);
CREATE INDEX idx_certificates_status ON certificates(status);
CREATE INDEX idx_certificates_expiry ON certificates(expiry_date) WHERE status = 'active';
CREATE INDEX idx_certificates_type ON certificates(type);
```

---

### 2.8 `applications`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK | Primary key |
| `app_no` | `VARCHAR(20)` | UNIQUE, NOT NULL | Auto-generated: SCS-YYYY-XXXX |
| `user_id` | `UUID` | FK → users.id, NOT NULL | Applicant |
| `cert_type` | `ENUM` | NOT NULL | `BIS`, `EPR`, `WPC`, `FSSAI`, `ISO`, `CE` |
| `product` | `VARCHAR(200)` | NOT NULL | Product name |
| `product_category` | `VARCHAR(100)` | nullable | |
| `standard` | `VARCHAR(100)` | NOT NULL | Target standard/IS number |
| `model_no` | `VARCHAR(100)` | nullable | |
| `hsn_code` | `VARCHAR(10)` | nullable | HSN/SAC code |
| `status` | `ENUM` | NOT NULL, default `'draft'` | `draft`, `submitted`, `under_review`, `lab_testing`, `technical_review`, `approved`, `rejected`, `completed` |
| `progress` | `SMALLINT` | NOT NULL, default `0` | 0–100 completion % |
| `lab_id` | `UUID` | FK → labs.id, nullable | Selected test lab |
| `cb_id` | `UUID` | FK → certification_bodies.id, nullable | Selected CB |
| `assigned_to` | `VARCHAR(100)` | nullable | Sanyog consultant name |
| `assigned_officer` | `VARCHAR(100)` | nullable | Government officer |
| `submitted_date` | `TIMESTAMPTZ` | nullable | When formally submitted |
| `estimated_completion` | `DATE` | nullable | Expected cert date |
| `amount` | `DECIMAL(10,2)` | NOT NULL, default `0` | Total fee |
| `paid_amount` | `DECIMAL(10,2)` | NOT NULL, default `0` | Amount paid |
| `rejection_reason` | `TEXT` | nullable | If rejected |
| `priority` | `ENUM` | default `'normal'` | `low`, `normal`, `high`, `urgent` |
| `metadata` | `JSONB` | nullable | Flexible additional fields |
| `created_at` | `TIMESTAMPTZ` | default `now()` | |
| `updated_at` | `TIMESTAMPTZ` | default `now()` | |
| `deleted_at` | `TIMESTAMPTZ` | nullable | Soft delete |

**Indexes:**
```sql
CREATE UNIQUE INDEX idx_applications_app_no ON applications(app_no);
CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_cert_type ON applications(cert_type);
CREATE INDEX idx_applications_created_at ON applications(created_at);
```

**Sequence for app_no:**
```sql
CREATE SEQUENCE app_seq START 1001;
-- app_no generated as: 'SCS-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('app_seq')::text, 4, '0')
```

---

### 2.9 `application_timeline`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK | Primary key |
| `application_id` | `UUID` | FK → applications.id, NOT NULL | |
| `status` | `VARCHAR(50)` | NOT NULL | Status at this point |
| `title` | `VARCHAR(200)` | NOT NULL | Display title |
| `description` | `TEXT` | nullable | Details |
| `actor` | `VARCHAR(100)` | nullable | Who performed the action |
| `event_date` | `TIMESTAMPTZ` | NOT NULL | When this happened |
| `created_at` | `TIMESTAMPTZ` | default `now()` | |

**Indexes:**
```sql
CREATE INDEX idx_timeline_app_id ON application_timeline(application_id);
CREATE INDEX idx_timeline_event_date ON application_timeline(event_date);
```

---

### 2.10 `application_documents`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK | Primary key |
| `application_id` | `UUID` | FK → applications.id, NOT NULL | Parent application |
| `user_id` | `UUID` | FK → users.id, NOT NULL | Uploader |
| `name` | `VARCHAR(200)` | NOT NULL | Document name |
| `category` | `VARCHAR(50)` | NOT NULL | `identity`, `product`, `test_report`, `lab`, `govt`, `other` |
| `file_url` | `TEXT` | NOT NULL | S3 URL |
| `file_key` | `TEXT` | NOT NULL | S3 object key |
| `file_size` | `INTEGER` | NOT NULL | Size in bytes |
| `mime_type` | `VARCHAR(100)` | NOT NULL | MIME type |
| `status` | `ENUM` | default `'pending'` | `pending`, `approved`, `rejected` |
| `rejection_reason` | `TEXT` | nullable | |
| `reviewed_by` | `VARCHAR(100)` | nullable | |
| `reviewed_at` | `TIMESTAMPTZ` | nullable | |
| `created_at` | `TIMESTAMPTZ` | default `now()` | |

**Indexes:**
```sql
CREATE INDEX idx_app_docs_application_id ON application_documents(application_id);
CREATE INDEX idx_app_docs_user_id ON application_documents(user_id);
```

---

### 2.11 `application_notes`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK | Primary key |
| `application_id` | `UUID` | FK → applications.id, NOT NULL | |
| `user_id` | `UUID` | FK → users.id, NOT NULL | Author |
| `text` | `TEXT` | NOT NULL | Note content |
| `is_internal` | `BOOLEAN` | default `false` | Sanyog-internal note |
| `created_at` | `TIMESTAMPTZ` | default `now()` | |
| `updated_at` | `TIMESTAMPTZ` | default `now()` | |

**Indexes:**
```sql
CREATE INDEX idx_app_notes_application_id ON application_notes(application_id);
```

---

### 2.12 `application_queries`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK | Primary key |
| `application_id` | `UUID` | FK → applications.id, NOT NULL | |
| `question` | `TEXT` | NOT NULL | Query text |
| `raised_by` | `VARCHAR(100)` | NOT NULL | Department / officer name |
| `raised_at` | `TIMESTAMPTZ` | NOT NULL | |
| `status` | `ENUM` | default `'open'` | `open`, `resolved` |
| `response` | `TEXT` | nullable | User's response |
| `responded_by` | `UUID` | FK → users.id, nullable | |
| `responded_at` | `TIMESTAMPTZ` | nullable | |
| `created_at` | `TIMESTAMPTZ` | default `now()` | |

**Indexes:**
```sql
CREATE INDEX idx_app_queries_application_id ON application_queries(application_id);
CREATE INDEX idx_app_queries_status ON application_queries(status);
```

---

### 2.13 `technical_reviews`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK | Primary key |
| `tr_no` | `VARCHAR(30)` | UNIQUE, NOT NULL | TR number: TR-YYYY-XXXX |
| `application_id` | `UUID` | FK → applications.id, NOT NULL | |
| `status` | `ENUM` | default `'pending'` | `pending`, `in_progress`, `completed`, `failed` |
| `review_date` | `DATE` | nullable | Scheduled/actual review date |
| `reviewed_by` | `VARCHAR(100)` | nullable | BIS/authority reviewer name |
| `assigned_officer` | `VARCHAR(100)` | nullable | |
| `lab_report_no` | `VARCHAR(100)` | nullable | |
| `lab_id` | `UUID` | FK → labs.id, nullable | |
| `summary` | `TEXT` | nullable | Overall review summary |
| `pass_count` | `SMALLINT` | default `0` | Computed: findings with pass |
| `fail_count` | `SMALLINT` | default `0` | Computed: findings with fail |
| `pending_count` | `SMALLINT` | default `0` | Computed: pending findings |
| `created_at` | `TIMESTAMPTZ` | default `now()` | |
| `updated_at` | `TIMESTAMPTZ` | default `now()` | |

**Indexes:**
```sql
CREATE INDEX idx_tr_application_id ON technical_reviews(application_id);
CREATE INDEX idx_tr_status ON technical_reviews(status);
```

---

### 2.14 `tr_findings`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK | Primary key |
| `technical_review_id` | `UUID` | FK → technical_reviews.id, NOT NULL | |
| `clause` | `VARCHAR(50)` | NOT NULL | Clause reference (e.g., IS 616:4.2.1) |
| `clause_title` | `VARCHAR(200)` | nullable | Human-readable clause name |
| `result` | `ENUM` | NOT NULL | `Pass`, `Fail`, `Pending` |
| `remarks` | `TEXT` | nullable | Reviewer remarks |
| `corrective_action` | `TEXT` | nullable | Required corrective action (if Fail) |
| `status` | `ENUM` | NOT NULL | `pass`, `fail`, `pending` |
| `sort_order` | `SMALLINT` | default `0` | Display ordering |
| `created_at` | `TIMESTAMPTZ` | default `now()` | |

**Indexes:**
```sql
CREATE INDEX idx_tr_findings_review_id ON tr_findings(technical_review_id);
CREATE INDEX idx_tr_findings_result ON tr_findings(result);
```

---

### 2.15 `tr_queries`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK | Primary key |
| `technical_review_id` | `UUID` | FK → technical_reviews.id, NOT NULL | |
| `question` | `TEXT` | NOT NULL | Query from BIS committee |
| `raised_by` | `VARCHAR(100)` | NOT NULL | Officer/department |
| `raised_at` | `TIMESTAMPTZ` | NOT NULL | |
| `status` | `ENUM` | default `'open'` | `open`, `resolved` |
| `response` | `TEXT` | nullable | |
| `responded_by` | `UUID` | FK → users.id, nullable | |
| `responded_at` | `TIMESTAMPTZ` | nullable | |
| `created_at` | `TIMESTAMPTZ` | default `now()` | |

**Indexes:**
```sql
CREATE INDEX idx_tr_queries_review_id ON tr_queries(technical_review_id);
```

---

### 2.16 `payments`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK | Primary key |
| `application_id` | `UUID` | FK → applications.id, NOT NULL | |
| `user_id` | `UUID` | FK → users.id, NOT NULL | |
| `payment_no` | `VARCHAR(30)` | UNIQUE, NOT NULL | PAY-YYYY-XXXX |
| `amount` | `DECIMAL(10,2)` | NOT NULL | Payment amount |
| `currency` | `VARCHAR(3)` | default `'INR'` | |
| `method` | `ENUM` | nullable | `upi`, `netbanking`, `card`, `neft`, `cash` |
| `status` | `ENUM` | default `'pending'` | `pending`, `processing`, `completed`, `failed`, `refunded` |
| `gateway` | `VARCHAR(50)` | nullable | Razorpay, PayU, etc. |
| `gateway_order_id` | `VARCHAR(100)` | nullable | Gateway's order reference |
| `gateway_payment_id` | `VARCHAR(100)` | nullable | Gateway's payment reference |
| `gateway_response` | `JSONB` | nullable | Raw gateway response |
| `description` | `VARCHAR(200)` | nullable | Payment description |
| `paid_at` | `TIMESTAMPTZ` | nullable | When payment confirmed |
| `refund_amount` | `DECIMAL(10,2)` | nullable | |
| `refunded_at` | `TIMESTAMPTZ` | nullable | |
| `created_at` | `TIMESTAMPTZ` | default `now()` | |
| `updated_at` | `TIMESTAMPTZ` | default `now()` | |

**Indexes:**
```sql
CREATE INDEX idx_payments_application_id ON payments(application_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
```

---

### 2.17 `notifications`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK | Primary key |
| `user_id` | `UUID` | FK → users.id, NOT NULL | Recipient |
| `type` | `ENUM` | NOT NULL | `status_update`, `document_required`, `query_raised`, `payment_due`, `cert_expiry`, `govt_query`, `general` |
| `title` | `VARCHAR(200)` | NOT NULL | Notification title |
| `body` | `TEXT` | NOT NULL | Notification body |
| `data` | `JSONB` | nullable | Deep link data (screen, params) |
| `is_read` | `BOOLEAN` | default `false` | |
| `read_at` | `TIMESTAMPTZ` | nullable | |
| `sent_push` | `BOOLEAN` | default `false` | Whether push was sent |
| `push_sent_at` | `TIMESTAMPTZ` | nullable | |
| `related_id` | `UUID` | nullable | ID of related entity |
| `related_type` | `VARCHAR(50)` | nullable | `application`, `certificate`, `payment`, etc. |
| `created_at` | `TIMESTAMPTZ` | default `now()` | |

**Indexes:**
```sql
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

---

### 2.18 `insights`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK | Primary key |
| `title` | `VARCHAR(300)` | NOT NULL | Article/insight title |
| `slug` | `VARCHAR(300)` | UNIQUE, NOT NULL | URL-friendly slug |
| `summary` | `TEXT` | NOT NULL | AI-generated summary |
| `content` | `TEXT` | nullable | Full article content |
| `category` | `ENUM` | NOT NULL | `BIS`, `EPR`, `WPC`, `FSSAI`, `ISO`, `CE`, `general` |
| `tags` | `TEXT[]` | default `'{}'` | Search tags |
| `source` | `VARCHAR(200)` | nullable | Source: "BIS Circular", "MeitY", etc. |
| `source_url` | `TEXT` | nullable | Original source URL |
| `image_url` | `TEXT` | nullable | Cover image (S3) |
| `author` | `VARCHAR(100)` | nullable | Author/AI generated |
| `is_ai_generated` | `BOOLEAN` | default `false` | AI-summarized circular |
| `is_alert` | `BOOLEAN` | default `false` | Import/export alert |
| `is_featured` | `BOOLEAN` | default `false` | Featured in carousel |
| `published_at` | `TIMESTAMPTZ` | NOT NULL | Publication date |
| `read_count` | `INTEGER` | default `0` | View counter |
| `bookmark_count` | `INTEGER` | default `0` | Bookmark counter |
| `created_at` | `TIMESTAMPTZ` | default `now()` | |
| `updated_at` | `TIMESTAMPTZ` | default `now()` | |

**Indexes:**
```sql
CREATE INDEX idx_insights_category ON insights(category);
CREATE INDEX idx_insights_published_at ON insights(published_at DESC);
CREATE INDEX idx_insights_is_alert ON insights(is_alert) WHERE is_alert = true;
CREATE INDEX idx_insights_tags ON insights USING GIN(tags);
-- Full-text search
CREATE INDEX idx_insights_fts ON insights USING GIN(to_tsvector('english', title || ' ' || summary));
```

---

### 2.19 `bookmarks`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK | Primary key |
| `user_id` | `UUID` | FK → users.id, NOT NULL | |
| `insight_id` | `UUID` | FK → insights.id, NOT NULL | |
| `created_at` | `TIMESTAMPTZ` | default `now()` | |

**Indexes:**
```sql
CREATE UNIQUE INDEX idx_bookmarks_user_insight ON bookmarks(user_id, insight_id);
CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id);
```

---

### 2.20 `documents` (standalone document library)

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK | Primary key |
| `user_id` | `UUID` | FK → users.id, NOT NULL | Owner |
| `application_id` | `UUID` | FK → applications.id, nullable | Optional link to app |
| `name` | `VARCHAR(200)` | NOT NULL | Document name |
| `category` | `VARCHAR(50)` | NOT NULL | `identity`, `product`, `test_report`, `lab`, `govt`, `invoice`, `other` |
| `file_url` | `TEXT` | NOT NULL | S3 URL (presigned for access) |
| `file_key` | `TEXT` | NOT NULL | S3 object key |
| `file_size` | `INTEGER` | NOT NULL | Size in bytes |
| `mime_type` | `VARCHAR(100)` | NOT NULL | |
| `status` | `ENUM` | default `'pending'` | `pending`, `approved`, `rejected` |
| `expiry_date` | `DATE` | nullable | For time-limited docs |
| `tags` | `TEXT[]` | default `'{}'` | |
| `created_at` | `TIMESTAMPTZ` | default `now()` | |
| `updated_at` | `TIMESTAMPTZ` | default `now()` | |

**Indexes:**
```sql
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_category ON documents(category);
```

---

### 2.21 `shipments`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK | Primary key |
| `application_id` | `UUID` | FK → applications.id, NOT NULL | |
| `user_id` | `UUID` | FK → users.id, NOT NULL | |
| `tracking_no` | `VARCHAR(100)` | NOT NULL | Courier tracking number |
| `courier` | `VARCHAR(100)` | NOT NULL | FedEx, Delhivery, etc. |
| `from_address` | `TEXT` | NOT NULL | Origin address |
| `to_address` | `TEXT` | NOT NULL | Destination (lab) address |
| `status` | `ENUM` | default `'booked'` | `booked`, `picked_up`, `in_transit`, `out_for_delivery`, `delivered`, `returned` |
| `current_location` | `VARCHAR(200)` | nullable | Last known location |
| `estimated_delivery` | `DATE` | nullable | |
| `delivered_at` | `TIMESTAMPTZ` | nullable | |
| `route` | `JSONB` | nullable | Array of tracking events |
| `created_at` | `TIMESTAMPTZ` | default `now()` | |
| `updated_at` | `TIMESTAMPTZ` | default `now()` | |

---

## 3. Prisma Schema

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────── ENUMS ───────────────

enum UserRole {
  admin
  manager
  viewer
}

enum SubscriptionPlan {
  free
  pro
  enterprise
}

enum CertType {
  BIS
  EPR
  WPC
  FSSAI
  ISO
  CE
}

enum ApplicationStatus {
  draft
  submitted
  under_review
  lab_testing
  technical_review
  approved
  rejected
  completed
}

enum DocumentStatus {
  pending
  approved
  rejected
}

enum TRStatus {
  pending
  in_progress
  completed
  failed
}

enum FindingResult {
  Pass
  Fail
  Pending
}

enum PaymentStatus {
  pending
  processing
  completed
  failed
  refunded
}

enum NotificationType {
  status_update
  document_required
  query_raised
  payment_due
  cert_expiry
  govt_query
  general
}

enum InsightCategory {
  BIS
  EPR
  WPC
  FSSAI
  ISO
  CE
  general
}

// ─────────────── MODELS ───────────────

model User {
  id                    String    @id @default(uuid())
  phone                 String    @unique
  email                 String?   @unique
  name                  String
  companyName           String    @map("company_name")
  role                  UserRole  @default(viewer)
  gstNumber             String?   @unique @map("gst_number")
  panNumber             String?   @map("pan_number")
  address               String?
  city                  String?
  state                 String?
  pincode               String?
  country               String    @default("India")
  subscription          SubscriptionPlan @default(free)
  businessRole          String?   @map("business_role")
  industries            String[]  @default([])
  targetMarkets         String[]  @default([]) @map("target_markets")
  certInterests         String[]  @default([]) @map("cert_interests")
  goals                 String[]  @default([])
  isVerified            Boolean   @default(false) @map("is_verified")
  isOnboarded           Boolean   @default(false) @map("is_onboarded")
  avatarUrl             String?   @map("avatar_url")
  subscriptionExpiresAt DateTime? @map("subscription_expires_at")
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")
  deletedAt             DateTime? @map("deleted_at")

  // Relations
  applications   Application[]
  certificates   Certificate[]
  notifications  Notification[]
  pushTokens     PushToken[]
  bookmarks      Bookmark[]
  documents      Document[]
  payments       Payment[]
  refreshTokens  RefreshToken[]

  @@map("users")
}

model Application {
  id                    String            @id @default(uuid())
  appNo                 String            @unique @map("app_no")
  userId                String            @map("user_id")
  certType              CertType          @map("cert_type")
  product               String
  productCategory       String?           @map("product_category")
  standard              String
  modelNo               String?           @map("model_no")
  hsnCode               String?           @map("hsn_code")
  status                ApplicationStatus @default(draft)
  progress              Int               @default(0)
  labId                 String?           @map("lab_id")
  cbId                  String?           @map("cb_id")
  assignedTo            String?           @map("assigned_to")
  assignedOfficer       String?           @map("assigned_officer")
  submittedDate         DateTime?         @map("submitted_date")
  estimatedCompletion   DateTime?         @map("estimated_completion")
  amount                Decimal           @default(0) @db.Decimal(10, 2)
  paidAmount            Decimal           @default(0) @map("paid_amount") @db.Decimal(10, 2)
  rejectionReason       String?           @map("rejection_reason")
  priority              String            @default("normal")
  metadata              Json?
  createdAt             DateTime          @default(now()) @map("created_at")
  updatedAt             DateTime          @updatedAt @map("updated_at")
  deletedAt             DateTime?         @map("deleted_at")

  // Relations
  user             User                  @relation(fields: [userId], references: [id])
  lab              Lab?                  @relation(fields: [labId], references: [id])
  cb               CertificationBody?    @relation(fields: [cbId], references: [id])
  timeline         ApplicationTimeline[]
  appDocuments     ApplicationDocument[]
  notes            ApplicationNote[]
  queries          ApplicationQuery[]
  payments         Payment[]
  technicalReviews TechnicalReview[]
  certificates     Certificate[]
  shipments        Shipment[]

  @@map("applications")
}

model TechnicalReview {
  id              String    @id @default(uuid())
  trNo            String    @unique @map("tr_no")
  applicationId   String    @map("application_id")
  status          TRStatus  @default(pending)
  reviewDate      DateTime? @map("review_date")
  reviewedBy      String?   @map("reviewed_by")
  assignedOfficer String?   @map("assigned_officer")
  labReportNo     String?   @map("lab_report_no")
  labId           String?   @map("lab_id")
  summary         String?
  passCount       Int       @default(0) @map("pass_count")
  failCount       Int       @default(0) @map("fail_count")
  pendingCount    Int       @default(0) @map("pending_count")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  application Application  @relation(fields: [applicationId], references: [id])
  lab         Lab?         @relation(fields: [labId], references: [id])
  findings    TRFinding[]
  queries     TRQuery[]

  @@map("technical_reviews")
}

model TRFinding {
  id                String        @id @default(uuid())
  technicalReviewId String        @map("technical_review_id")
  clause            String
  clauseTitle       String?       @map("clause_title")
  result            FindingResult
  remarks           String?
  correctiveAction  String?       @map("corrective_action")
  status            String
  sortOrder         Int           @default(0) @map("sort_order")
  createdAt         DateTime      @default(now()) @map("created_at")

  technicalReview TechnicalReview @relation(fields: [technicalReviewId], references: [id])

  @@map("tr_findings")
}

model TRQuery {
  id                String    @id @default(uuid())
  technicalReviewId String    @map("technical_review_id")
  question          String
  raisedBy          String    @map("raised_by")
  raisedAt          DateTime  @map("raised_at")
  status            String    @default("open")
  response          String?
  respondedBy       String?   @map("responded_by")
  respondedAt       DateTime? @map("responded_at")
  createdAt         DateTime  @default(now()) @map("created_at")

  technicalReview TechnicalReview @relation(fields: [technicalReviewId], references: [id])

  @@map("tr_queries")
}
```

---

## 4. Redis Schema

### 4.1 Key Patterns

| Key Pattern | Type | TTL | Description |
|---|---|---|---|
| `session:{userId}` | Hash | 15 min | Active JWT payload cache |
| `otp:{phone}` | String | 5 min | OTP value (hashed) |
| `otp:attempts:{phone}` | String | 5 min | OTP attempt counter |
| `rate:ip:{ip}` | String | 1 min | IP request count (100/min) |
| `rate:user:{userId}` | String | 1 min | User request count (1000/min) |
| `cache:insights:list` | String | 10 min | Cached insights list (JSON) |
| `cache:insights:{id}` | String | 30 min | Single insight cache |
| `cache:user:{userId}` | String | 5 min | User profile cache |
| `notif:unread:{userId}` | String | — | Unread notification count |

### 4.2 Rate Limiting

```
Sliding window algorithm:
- IP: 100 requests/minute → 429 Too Many Requests
- Authenticated user: 1,000 requests/minute
- OTP requests: 3 per phone per 5 minutes
```

---

## 5. Database Migrations Strategy

```
migrations/
├── 001_create_users.sql
├── 002_create_auth_tables.sql
├── 003_create_certifications.sql
├── 004_create_applications.sql
├── 005_create_application_related.sql
├── 006_create_technical_reviews.sql
├── 007_create_payments.sql
├── 008_create_notifications.sql
├── 009_create_insights.sql
├── 010_create_documents.sql
├── 011_create_shipments.sql
└── 012_seed_reference_data.sql
```

### Migration Rules
1. Always use `IF NOT EXISTS` for CREATE TABLE/INDEX
2. Never drop columns — use soft deprecation + additive columns
3. Every migration is idempotent
4. Test rollback SQL before merging

---

## 6. S3 Storage Structure

```
s3://dice-by-sanyog/
├── avatars/
│   └── {userId}/{timestamp}.{ext}
├── documents/
│   └── {userId}/{applicationId}/{documentId}.{ext}
├── certificates/
│   └── {userId}/{certId}/cert.pdf
├── qr-codes/
│   └── {certId}/qr.png
└── insights/
    └── {insightId}/cover.{ext}
```

**Access Pattern:**
- Upload: Server generates presigned PUT URL (15 min TTL)
- Download: Server generates presigned GET URL (60 min TTL)
- Public: QR codes and verification images use CloudFront CDN

---

## 7. Database Connection Config

```env
# .env (server)
DATABASE_URL="postgresql://dice_user:password@localhost:5432/dice_db?schema=public"
REDIS_URL="redis://localhost:6379"
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_CONNECTION_TIMEOUT=5000
```

```typescript
// Prisma connection
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
  datasources: {
    db: { url: process.env.DATABASE_URL }
  }
});
```

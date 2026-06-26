# DICE — Disaster Recovery Plan

> **Audience:** Solo developer · **Recovery targets:** RTO 1 hour · RPO 1 hour
> **Stack:** AWS EC2 (Mumbai) · MongoDB Atlas M10 · S3 (Mumbai + Singapore replica)

---

## Recovery Objectives

| Term | Target | What it means |
|---|---|---|
| **RTO** (Recovery Time Objective) | **1 hour** | Max acceptable downtime from detection to "we're back up" |
| **RPO** (Recovery Point Objective) | **1 hour** | Max acceptable data loss — what time slice we'd lose |
| **MTTR** (Mean Time To Recovery) | **20 minutes** | Realistic, internal target |
| **MTBF** (Mean Time Between Failures) | **> 90 days** | Engineering goal for stable releases |

---

## Threat Matrix

| Scenario | Likelihood | Impact | Mitigation tier |
|---|---|---|---|
| EC2 instance crash | Medium | App down | Tier 1 — auto-restore in minutes |
| AZ outage (Mumbai 1a fails) | Low | Partial outage | Tier 1 — multi-AZ ASG |
| Atlas primary node fails | Low | < 10s blip | Tier 1 — automatic failover |
| Entire Mumbai region down | Very low | Total outage | Tier 2 — restore in Singapore |
| Atlas cluster corruption | Very low | Data loss possible | Tier 2 — PITR restore |
| Accidental data deletion (human error) | Medium | Partial loss | Tier 2 — PITR restore to staging, copy back |
| S3 object deletion (human error) | Medium | File loss | Tier 1 — versioning blocks |
| Ransomware on EC2 | Very low | DB potentially compromised | Tier 3 — full rebuild |
| Razorpay/Stripe webhook lost | High | Payment reconciliation | Tier 1 — replay from Razorpay dashboard |
| Code deploy breaks production | High | App down | Tier 1 — instant rollback via git tag |

---

## Backup Strategy

### Atlas (MongoDB)

**Atlas M10 includes:**
- **Continuous backup** (Point-In-Time Recovery — PITR): 7-day window. Restore to any second in that window.
- **Daily snapshots**: retained 7 days.
- **Weekly snapshots**: retained 4 weeks.
- **Monthly snapshots**: retained 12 months.

**Action items:**
1. In Atlas UI: Project → Backups → enable **PITR**.
2. Set custom retention: keep monthly backups for **24 months** (compliance audit window).
3. Configure **backup compliance policy** to require admin approval for snapshot deletion.
4. Enable **alerts** on backup failure → Slack + email.

**Restore drill** (quarterly):
```bash
# Use Atlas CLI
atlas backups snapshots list --clusterName sanyog-prod
atlas backups restores start \
  --clusterName sanyog-prod \
  --targetClusterName sanyog-staging \
  --snapshotId 6...   # restore to staging, verify data, never touch prod
```

### S3 (Documents + Files)

**Enable on `sanyog-conformity-docs` bucket:**

```bash
# Versioning — every overwrite/delete preserves history
aws s3api put-bucket-versioning \
  --bucket sanyog-conformity-docs \
  --versioning-configuration Status=Enabled

# Object Lock — WORM (Write-Once-Read-Many) for compliance docs
aws s3api put-object-lock-configuration \
  --bucket sanyog-conformity-docs \
  --object-lock-configuration '{
    "ObjectLockEnabled": "Enabled",
    "Rule": {
      "DefaultRetention": {
        "Mode": "GOVERNANCE",
        "Years": 5
      }
    }
  }'

# Cross-region replication — Mumbai → Singapore
aws s3api put-bucket-replication \
  --bucket sanyog-conformity-docs \
  --replication-configuration file://crr-config.json
```

**Lifecycle policy** (already configured):
- `0–30 days`: Standard storage
- `30–90 days`: Infrequent Access (50% cheaper)
- `90+ days`: Glacier Instant Retrieval (75% cheaper)

### Redis (ElastiCache)

**Redis is cache, not source of truth.** Loss tolerance:
- OTP/session loss → user re-logs in (acceptable)
- Cache miss → falls back to MongoDB (slower, not catastrophic)

But enable RDB snapshots anyway (low cost):
```bash
aws elasticache modify-replication-group \
  --replication-group-id sanyog-redis \
  --snapshot-retention-limit 7 \
  --snapshot-window "03:00-04:00"
```

### Application Code

- **Source of truth:** GitHub `main` branch
- **Deploy artifact:** Docker image in ECR (tagged by git SHA)
- **Configuration:** AWS Secrets Manager (versioned, 30-day rollback)

```bash
# Keep last 10 Docker images in ECR
aws ecr put-lifecycle-policy --repository-name dice-api --lifecycle-policy-text file://ecr-lifecycle.json
```

---

## Failure Playbook

### 🚨 EC2 instance unresponsive

**Detection:** CloudWatch alarm on ALB target health → Slack `#alerts`.

**Recovery (automatic, no action needed):**
- ASG terminates unhealthy instance.
- ASG launches replacement from latest AMI (Docker pulls image from ECR).
- ALB drains old, routes to new.
- **Total time: 3–5 minutes.**

**If automatic recovery fails:**
```bash
# Manual replace
aws autoscaling terminate-instance-in-auto-scaling-group \
  --instance-id i-xxx \
  --no-should-decrement-desired-capacity
```

### 🚨 Entire AZ down (Mumbai 1a)

**Detection:** Multiple instances unhealthy in same AZ.

**Recovery:**
- ASG already spans 3 AZs (1a, 1b, 1c) → traffic shifts automatically.
- **Action:** Increase desired capacity to compensate.
```bash
aws autoscaling set-desired-capacity --auto-scaling-group-name sanyog-api --desired-capacity 4
```

### 🚨 Atlas primary fails

**Recovery (automatic):**
- Replica set elects new primary in 5–10 seconds.
- Mongoose driver reconnects automatically.
- **No action needed.**

### 🚨 Mumbai region down (full DR)

**Recovery (manual, ~30 min):**

```bash
# 1. Switch Cloudflare DNS to DR ALB in Singapore
#    (pre-staged backup ALB pointing at standby resources)

# 2. Restore Atlas to Singapore cluster
atlas backups restores start \
  --clusterName sanyog-prod \
  --targetClusterName sanyog-dr-singapore \
  --pointInTime "2026-06-08T09:00:00Z"

# 3. Update env DATABASE_URL to point at Singapore cluster
aws secretsmanager update-secret \
  --secret-id sanyog/prod/database-url \
  --secret-string "mongodb+srv://...singapore.mongodb.net/..."

# 4. Deploy app stack in ap-southeast-1 via Terraform
cd terraform/dr-singapore
terraform apply -var="region=ap-southeast-1"

# 5. S3 cross-region replica already has all files (read-only by default)
#    Promote replica bucket to writable
aws s3api put-bucket-replication --bucket sanyog-conformity-docs-singapore ...
```

**Total RTO: ~30 minutes** if you've drilled it. ~2 hours cold.

### 🚨 Accidental data deletion

Most common DR scenario. Example: admin deletes wrong organization.

```bash
# 1. Note the timestamp BEFORE the deletion (check audit_logs)
db.audit_logs.find({ "meta.action": "deleted", "meta.resource_id": "org_xyz" })

# 2. Restore to staging cluster at that PITR moment
atlas backups restores start \
  --clusterName sanyog-prod \
  --targetClusterName sanyog-staging \
  --pointInTime "2026-06-08T08:55:00Z"

# 3. Copy the deleted documents back via mongodump → mongorestore
mongodump --uri="<staging-uri>" --collection=organizations --query='{"_id":"org_xyz"}' --out=./restore
mongorestore --uri="<prod-uri>" --db=dice ./restore/dice/organizations.bson

# 4. Verify via the app + audit_log entry recording the manual restore
```

### 🚨 Compromised credentials / ransomware

```bash
# 1. Lock the API — set ALB to maintenance mode
# 2. Rotate ALL secrets
aws secretsmanager rotate-secret --secret-id sanyog/prod/jwt-secret
# 3. Force logout all users (delete refresh_tokens collection)
db.sessions.drop()
# 4. Pivot to last known-good Docker image
aws ecs update-service --service dice-api --force-new-deployment --task-definition dice-api:lastGoodRev
# 5. Audit_logs are immutable + replicated — review for lateral movement
# 6. Disclose to affected users per DPDP Act (within 72 hours)
```

---

## Monitoring & Detection

**You can't recover from what you don't detect.** Set up these alarms:

| Alarm | Trigger | Action |
|---|---|---|
| ALB 5xx rate | > 1% for 5 min | PagerDuty SMS |
| ALB target unhealthy | any | Slack #alerts |
| Atlas connection failures | > 10/min | PagerDuty SMS |
| Atlas disk > 80% | sustained | Email (auto-scale anyway) |
| Atlas replication lag | > 60s | Slack #alerts |
| S3 4xx errors | > 5% | Slack #alerts (likely IAM issue) |
| EC2 CPU > 90% for 10 min | sustained | Slack (ASG should scale, but verify) |
| Razorpay webhook failure | any | Slack — payment may be lost |
| Failed login > 50/hour | brute force? | Slack + auto-rate-limit |
| Daily backup not completed by 06:00 IST | missing | PagerDuty |

**Tools:** CloudWatch (free tier) + Sentry (errors) + Better Stack (uptime, $0–$15/mo).

---

## Quarterly DR Drill

Schedule reminder (Q1, Q2, Q3, Q4):

```
1. Restore Atlas snapshot from 1 day ago → staging cluster
2. Verify random sample of documents downloadable from S3 replica
3. Deploy code from 30-day-old image tag → verify it boots
4. Switch DNS to DR endpoint for 5 minutes (off-hours), test core flows
5. Document time taken, gaps found → update this doc
```

---

## Data Deletion (DPDP / GDPR Right-to-be-Forgotten)

Different from DR — but related (you must NOT keep data after deletion):

```typescript
// User requests deletion
await audit({
  actor: user._id,
  resource_type: 'user',
  resource_id: user._id,
  action: 'data_deletion_requested',
});

// 30-day grace period (DPDP Act requirement)
await User.updateOne({ _id }, { deletion_scheduled_at: addDays(new Date(), 30) });

// Cron job after grace period:
await User.updateOne({ _id }, {
  $set: {
    email: `deleted-${_id}@dice.local`,
    phone: null, name: '[deleted]',
    avatar_url: null, password_hash: null,
    consents: {}, deleted_at: new Date()
  }
});
// Documents owned by user → reassign to org or anonymize
// Audit logs → meta.actor stays but PII is removed (keep action history for compliance)
// S3 files where user is sole owner → delete (versioned bucket → soft-delete)
```

---

## Cost of DR

| Item | Monthly cost | Why |
|---|---|---|
| Atlas backups (continuous + 1y monthly) | included in M10 | $0 incremental |
| S3 versioning | ~$5 | Storage of old versions |
| S3 cross-region replication (Mumbai → Singapore) | ~$10 | Transfer + storage |
| Standby ALB + minimum Singapore ASG (warm-cold) | ~$30 | $0 if cold-only |
| **Total DR overhead** | **~$15–45/mo** | < 20% of base infra |

For your scale (5k DAU), **cold DR** (no standby Singapore stack, just S3 replica + Atlas backup) is sufficient. Activate Singapore stack only when you fail over.

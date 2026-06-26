# DICE — CI/CD Pipeline

> Push to `main` → builds, tests, deploys to staging automatically.
> Manual approval gate for production. One-click rollback to any prior image.

---

## Pipeline Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Push to   │     │             │     │             │     │             │
│   main      │────►│  TEST       │────►│  BUILD      │────►│  DEPLOY     │
│   branch    │     │  • lint     │     │  • Docker   │     │  staging    │
│             │     │  • types    │     │  • push ECR │     │  (auto)     │
└─────────────┘     │  • tests    │     │  • tag SHA  │     └──────┬──────┘
                    └─────────────┘     └─────────────┘            │
                                                                    ▼
                                                            ┌─────────────┐
                                                            │  APPROVAL   │
                                                            │  GATE       │  ← required reviewer
                                                            │  (manual)   │
                                                            └──────┬──────┘
                                                                    │
                                                                    ▼
                                                            ┌─────────────┐
                                                            │  DEPLOY     │
                                                            │  prod       │
                                                            │  + atlas    │
                                                            │  snapshot   │
                                                            └─────────────┘
```

---

## Setup Steps (one-time)

### 1. Create AWS OIDC role for GitHub Actions

```bash
# Trust policy lets GitHub Actions assume the role without long-lived AWS keys
cat > trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
      "StringLike":   { "token.actions.githubusercontent.com:sub": "repo:YOUR_GH_ORG/sanyog-app:*" }
    }
  }]
}
EOF

aws iam create-role --role-name GitHubActionsDeployRole \
  --assume-role-policy-document file://trust-policy.json

# Grant ECR push, ECS update, secrets read
aws iam attach-role-policy --role-name GitHubActionsDeployRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser
aws iam attach-role-policy --role-name GitHubActionsDeployRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonECS_FullAccess
```

### 2. GitHub Secrets to configure

In GitHub repo → Settings → Secrets and variables → Actions:

| Secret | Value |
|---|---|
| `AWS_DEPLOY_ROLE_ARN` | `arn:aws:iam::ACCOUNT_ID:role/GitHubActionsDeployRole` |
| `AWS_ACCOUNT_ID` | Your 12-digit AWS account ID |
| `ATLAS_PUBLIC_KEY` | From Atlas → Access → API Keys |
| `ATLAS_PRIVATE_KEY` | From Atlas → Access → API Keys |
| `ATLAS_PROJECT_ID` | Your Atlas project ID |
| `SLACK_WEBHOOK_URL` | Staging notifications channel |
| `SLACK_WEBHOOK_URL_PROD` | Production alerts channel |

### 3. Create GitHub Environments

In repo → Settings → Environments:

**`staging` environment:**
- No reviewers required (auto-deploys)

**`production` environment:**
- ✅ Required reviewers: 1 (yourself)
- ✅ Wait timer: 10 minutes (catch obvious issues in staging first)
- ✅ Deployment branches: only `main`

### 4. ECR Repository

```bash
aws ecr create-repository \
  --repository-name dice-api \
  --image-scanning-configuration scanOnPush=true \
  --image-tag-mutability IMMUTABLE \
  --encryption-configuration encryptionType=AES256

# Lifecycle: keep last 30 images, expire untagged after 1 day
cat > ecr-lifecycle.json << 'EOF'
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Expire untagged images after 1 day",
      "selection": { "tagStatus": "untagged", "countType": "sinceImagePushed", "countUnit": "days", "countNumber": 1 },
      "action": { "type": "expire" }
    },
    {
      "rulePriority": 2,
      "description": "Keep last 30 tagged images",
      "selection": { "tagStatus": "any", "countType": "imageCountMoreThan", "countNumber": 30 },
      "action": { "type": "expire" }
    }
  ]
}
EOF
aws ecr put-lifecycle-policy --repository-name dice-api --lifecycle-policy-text file://ecr-lifecycle.json
```

### 5. ECS Cluster & Service (one-time, then GHA manages it)

See `infra/ecs-setup.sh` for full setup. Summary:

```bash
# Cluster
aws ecs create-cluster --cluster-name dice-cluster --capacity-providers FARGATE FARGATE_SPOT

# Task definition (one per env)
aws ecs register-task-definition --cli-input-json file://task-definitions/dice-api-prod.json

# Service
aws ecs create-service \
  --cluster dice-cluster \
  --service-name dice-api-prod \
  --task-definition dice-api-prod \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "..." \
  --load-balancers "targetGroupArn=arn:aws:...,containerName=api,containerPort=5000" \
  --deployment-configuration "maximumPercent=200,minimumHealthyPercent=100"
```

---

## Day-to-Day Workflow

### Normal deploy
```bash
git checkout main
git pull
# ... make changes ...
git commit -m "feat: add EPR renewal flow"
git push origin main
```
→ GitHub Actions runs tests → builds Docker → deploys to staging.
→ You verify staging at `https://staging-api.sanyogconformity.com`.
→ Click "Approve" in GitHub Actions UI → deploys to prod.
→ Atlas snapshot taken automatically before prod deploy.

### Emergency rollback
GitHub repo → **Actions** → **Rollback Production** → **Run workflow**:
- Image tag: `a3b7d12-20260608` (find in ECR or previous deploy)
- Reason: "Login endpoint regression"

ECS rolls back to that exact image in ~3 minutes.

### Hotfix process
```bash
git checkout -b hotfix/critical-bug main
# fix
git push origin hotfix/critical-bug
# Open PR → tests run automatically
# Merge → auto-deploys staging
# Approve in GH UI → prod
```

---

## Safety Mechanisms

| Safeguard | What it does |
|---|---|
| **Required tests pre-merge** | PRs blocked until lint + typecheck + tests pass |
| **Immutable ECR tags** | Can't overwrite a deployed image — every deploy is reproducible |
| **Atlas snapshot before prod deploy** | One-click DB rollback if migration goes wrong |
| **Required reviewer for prod** | Two pairs of eyes (you + approver) |
| **10-min wait between staging and prod** | Catch obvious issues in monitoring |
| **Smoke tests after deploy** | Auto-fails if health check doesn't return 200 |
| **Blue-green deploy via ECS** | 100% healthy old + 100% healthy new before draining old |
| **Slack notifications** | You see every deploy succeed/fail |
| **Pinned Docker base image** | Use `node:20.11.0-alpine` (not `node:20`) — no surprise OS updates |

---

## What Goes Where

| Concern | Tool |
|---|---|
| Source code | GitHub `main` branch |
| Container images | ECR (immutable tags, 30 retained) |
| Secrets at runtime | AWS Secrets Manager |
| Secrets in CI | GitHub Secrets (OIDC to AWS — no long-lived keys) |
| Deployments | ECS Fargate (or EC2 ASG) |
| Database | Atlas M10 (managed) |
| Files | S3 (versioned, encrypted) |
| Logs | CloudWatch Logs + Sentry |
| Monitoring | CloudWatch alarms → Slack/PagerDuty |
| Uptime checks | Better Stack ($0 free tier, $15/mo Pro) |

---

## Cost of This Pipeline

| Item | Monthly |
|---|---|
| GitHub Actions (free tier: 2000 min/mo) | $0 — covers ~50 deploys |
| ECR storage (30 images × 200 MB) | $0.60 |
| ECS Fargate (covered in earlier estimate) | already counted |
| Atlas API calls (snapshots) | free |
| Slack webhooks | free |
| **Total** | **~$1/mo** |

---

## Future Improvements (after 20k DAU)

1. **Canary releases** — route 5% of traffic to new version, monitor errors, then ramp.
2. **Feature flags** (LaunchDarkly / Unleash) — decouple deploy from release.
3. **Integration tests against staging** with Cypress/Playwright before prod approval.
4. **Auto-rollback** on Sentry error spike > 5× baseline.
5. **Multi-region deploys** — when you add Frankfurt/US clusters.

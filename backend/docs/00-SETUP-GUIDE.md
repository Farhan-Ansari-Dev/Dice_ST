# DICE — Production Setup Guide (Start Here)

> **Time:** 90 minutes end-to-end · **Cost:** ~₹3,000/month
> **You'll have:** Live API at `https://api.sanyogconformity.com` + auto-deploys + backups + monitoring

---

## Prerequisites (5 minutes)

You need accounts at (all free to sign up):

- [ ] **AWS** — billing card on file
- [ ] **MongoDB Atlas** — atlas.mongodb.com
- [ ] **Cloudflare** — cloudflare.com (free tier)
- [ ] **GitHub** — your code repo
- [ ] **Domain** — bought (e.g. from Namecheap)
- [ ] **Razorpay** — for payments (live keys take 2 days)
- [ ] **MSG91** — for Indian SMS (DLT approval takes 1 week)
- [ ] **OpenAI** — for AI features
- [ ] **Sentry** — error tracking (free tier)
- [ ] **Better Stack** — uptime monitoring (free tier)

On your laptop:

- [ ] AWS CLI installed + configured: `aws configure`
- [ ] Terraform 1.5+ installed: `brew install terraform`
- [ ] SSH key generated: `ssh-keygen -t ed25519 -f ~/.ssh/dice-operator`
- [ ] Node 20+ installed

---

## Step 1 — MongoDB Atlas (10 min)

1. Atlas → Build a Database → **M2** ($9) shared, **Mumbai (ap-south-1)**
2. Cluster name: `dice-prod`
3. Database Access → add user `dice-app` with strong password (save it!)
4. Network Access → **temporarily** allow `0.0.0.0/0` (we'll lock to EC2 IP after step 2)
5. Cluster → Connect → "Drivers" → copy connection string
   ```
   mongodb+srv://dice-app:<password>@dice-prod.xxx.mongodb.net/?retryWrites=true&w=majority
   ```
   Replace `<password>` and add database name: `/dice`

6. Atlas → Backup → enable **Continuous Backup** (PITR, included in M2)
7. Create API key under Project Settings → Access Manager (for backups workflow)

**You now have:** `DATABASE_URL` for step 4.

---

## Step 2 — AWS Infrastructure via Terraform (15 min)

```bash
cd backend/infra/terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:
```hcl
domain          = "api.sanyogconformity.com"
my_ip           = "203.0.113.5"          # your laptop's public IP (curl ifconfig.me)
ops_email       = "you@example.com"
s3_bucket_name  = "sanyog-conformity-docs"
ssh_key_pub     = "ssh-ed25519 AAAA..."  # cat ~/.ssh/dice-operator.pub
```

Provision:
```bash
terraform init
terraform plan          # review what will be created
terraform apply         # type "yes" → takes ~3 min
```

**Save the outputs** — `terraform output` shows:
- EC2 public IP (e.g. `13.234.56.78`)
- S3 bucket name
- SSH command
- SNS topic ARN

**Confirm SNS email subscription** in your inbox so you receive alerts.

---

## Step 3 — DNS via Cloudflare (5 min)

1. Cloudflare → Add Site → enter `sanyogconformity.com`
2. Pick **Free plan**
3. Cloudflare gives you nameservers — update them at your domain registrar
4. Wait ~10 min for propagation
5. DNS tab → Add records:

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `api` | `<EC2 public IP>` | 🟠 Proxied |
| A | `app` | `<your frontend host>` or Vercel | 🟠 Proxied |
| A | `admin` | `<your admin host>` | 🟠 Proxied |
| MX | `@` | (your email provider's MX records) | DNS only |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@sanyog...` | DNS only |

**Proxy ON** means Cloudflare hides your EC2 IP + provides DDoS + SSL + CDN.

6. SSL/TLS → Overview → set to **Full (strict)**
7. SSL/TLS → Edge Certificates → enable **Always Use HTTPS** + **HSTS**

---

## Step 4 — Lock down Atlas IP allowlist (2 min)

1. Atlas → Network Access → **remove** `0.0.0.0/0`
2. Add only the EC2 Elastic IP from Terraform output: `<EC2_IP>/32`
3. Save

---

## Step 5 — Configure secrets on EC2 (10 min)

```bash
# SSH in (use the IP from terraform output)
ssh -i ~/.ssh/dice-operator ubuntu@<EC2_IP>

# Edit secrets
sudo nano /etc/dice/.env
```

Fill in (use `openssl rand -base64 64` to generate JWT secrets):

```env
NODE_ENV=production
PORT=5000

# From Step 1
DATABASE_URL=mongodb+srv://dice-app:PASS@dice-prod.xxx.mongodb.net/dice?retryWrites=true&w=majority

# Generate via: openssl rand -base64 64
JWT_SECRET=<64-char-random>
JWT_REFRESH_SECRET=<another-64-char-random>

# AWS — instance role handles auth, but specify region+bucket
AWS_REGION=ap-south-1
AWS_S3_BUCKET=sanyog-conformity-docs

# Razorpay (live keys from dashboard.razorpay.com)
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_WEBHOOK_SECRET=xxx

# OpenAI
OPENAI_API_KEY=sk-xxx

# MSG91 (India SMS — DLT approved)
MSG91_AUTH_KEY=xxx
MSG91_TEMPLATE_ID=xxx
MSG91_SENDER_ID=SCSOLN

# Expo Push (mobile)
EXPO_ACCESS_TOKEN=xxx  # from expo.dev account settings

# Web Push (browser) — generate ONCE:
# npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=BNm...
VAPID_PRIVATE_KEY=M5K...
VAPID_SUBJECT=mailto:admin@sanyogconformity.com

# Frontend URLs (for CORS + email links)
FRONTEND_URL=https://app.sanyogconformity.com
ADMIN_URL=https://admin.sanyogconformity.com
EMAIL_FROM=noreply@sanyogconformity.com

# Sentry (free tier)
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

Save (Ctrl+O, Enter, Ctrl+X).

```bash
sudo chmod 600 /etc/dice/.env
sudo chown dice:dice /etc/dice/.env
```

---

## Step 6 — Set up GitHub Actions (10 min)

In your GitHub repo → Settings → Secrets and variables → Actions:

| Secret | Value |
|---|---|
| `EC2_HOST` | `<EC2 public IP from terraform>` |
| `EC2_SSH_PRIVATE_KEY` | contents of `~/.ssh/dice-operator` (the private key) |
| `SLACK_WEBHOOK_URL` | (optional) Slack incoming webhook for deploy notifications |

Repo Settings → Environments → create `production`:
- Required reviewers: yourself
- Branch: `main` only

Push your code to `main`:
```bash
git add backend/infra .github
git commit -m "infra: bootstrap stack with Terraform + push notifications"
git push origin main
```

Watch **Actions** tab → workflow runs → tests → deploys → smoke tests.

---

## Step 7 — AWS SES setup for email (10 min, but takes 24h for prod access)

1. AWS Console → **SES (ap-south-1)** → Identities
2. Verify domain: `sanyogconformity.com`
3. SES gives you 3–5 DNS records (CNAMEs for DKIM + 1 TXT for verification)
4. Add them all in Cloudflare DNS (proxy OFF for these)
5. SES → Get production access → fill the form
   - Use case: transactional
   - Sending volume: ~10k/month
   - Bounce handling: SNS topic from Terraform
6. Approval comes in 12–24 hours via email

While waiting: SES sandbox allows sending to **verified** addresses only — verify your own email + a few test ones to develop.

---

## Step 8 — MSG91 SMS setup (week-long process)

1. Sign up at **msg91.com**
2. Submit DLT registration (TRAI portal) — 5–7 days
3. Approve sender ID: `SCSOLN`
4. Submit SMS templates for approval — 1 day each:
   - OTP template
   - Cert expiry alert
   - Payment failed alert
5. Once approved, get `MSG91_AUTH_KEY` + template IDs

**Note:** SMS is for critical events only (OTP, security). At 5k DAU you'll send ~25k SMS/month at ₹0.20 = **₹5,000** — biggest variable cost.

---

## Step 9 — S3 backup automation (5 min)

```bash
ssh ubuntu@<EC2_IP>

# Install backup script
sudo cp /opt/dice/current/infra/bootstrap/backup.sh /usr/local/bin/dice-backup
sudo chmod +x /usr/local/bin/dice-backup

# Schedule daily backups at 18:00 UTC (23:30 IST)
echo "0 18 * * * /usr/local/bin/dice-backup >> /var/log/dice-backup.log 2>&1" | sudo crontab -

# Test it manually
sudo /usr/local/bin/dice-backup
```

Verify backup landed in S3:
```bash
aws s3 ls s3://sanyog-conformity-docs/backups/mongodb/
```

---

## Step 10 — Monitoring setup (10 min)

### Sentry
1. sentry.io → Create project → Node.js + Express
2. Copy DSN → add to `/etc/dice/.env` as `SENTRY_DSN`
3. SDK already wired (or add `@sentry/node`)

### Better Stack (uptime)
1. betterstack.com → Add monitor
2. URL: `https://api.sanyogconformity.com/health`
3. Frequency: 3 minutes
4. SMS + email on outage

### UptimeRobot (backup uptime)
1. uptimerobot.com → Add monitor (also free, 5-min)
2. Same URL → second pair of eyes

### CloudWatch (already provisioned by Terraform)
Alarms already firing to your SNS topic → email you when:
- Instance is unhealthy
- CPU > 80% sustained
- Memory > 85% sustained
- Disk > 75%

---

## Step 11 — Verify everything works (5 min)

```bash
# 1. Public health endpoint
curl https://api.sanyogconformity.com/health
# {"status":"ok","timestamp":"...","version":"1.0.0"}

# 2. Test OTP flow
curl -X POST https://api.sanyogconformity.com/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com"}'

# 3. SSH and check processes
ssh ubuntu@<EC2_IP>
sudo -u dice pm2 status     # 2 workers, status "online"
sudo systemctl status caddy # active (running)

# 4. SSL grade — should be A+
curl -fsS https://api.ssllabs.com/api/v3/analyze?host=api.sanyogconformity.com
```

---

## Step 12 — Connect mobile app + admin to live backend

### Mobile (Expo)
```bash
cd mobile-app

# Build APK pointing at live backend
EXPO_PUBLIC_API_URL=https://api.sanyogconformity.com \
  npx eas-cli build --platform android --profile preview

# Build iOS simulator build
EXPO_PUBLIC_API_URL=https://api.sanyogconformity.com \
  npx eas-cli build --platform ios --profile preview
```

### Admin / Web portal
Set environment variable:
```env
VITE_API_URL=https://api.sanyogconformity.com/api/v1
VITE_VAPID_PUBLIC_KEY=BNm...   # from Step 5 .env
```

Deploy to Vercel/Netlify/Cloudflare Pages.

---

## ✅ Done. You're live.

**What you have now:**

| Component | Status |
|---|---|
| HTTPS API | ✅ `https://api.sanyogconformity.com` (Caddy + Let's Encrypt) |
| MongoDB | ✅ Atlas M2 Mumbai with PITR backups |
| File storage | ✅ S3 Mumbai with lifecycle + versioning |
| CDN + DDoS | ✅ Cloudflare Free tier |
| Push (mobile) | ✅ Expo (iOS + Android) |
| Push (web) | ✅ VAPID Web Push |
| Email | ✅ AWS SES (verified domain) |
| SMS | ⏳ Pending MSG91 DLT approval (1 week) |
| Daily backups | ✅ mongodump → S3 with 30d/12m/5y retention |
| Monitoring | ✅ CloudWatch + Sentry + Better Stack + UptimeRobot |
| Auto-deploy | ✅ GitHub Actions → SSH → PM2 zero-downtime reload |
| Cost | **~₹3,000/month** (under your ₹6,000 budget) |

---

## 📚 Reference

| Doc | When to read |
|---|---|
| `docs/00-SETUP-GUIDE.md` | **This file** — first-time setup |
| `docs/01-mongodb-schema.md` | Designing new features that need DB changes |
| `docs/02-disaster-recovery.md` | Something broke, need to restore |
| `docs/03-cicd-pipeline.md` | Modifying the deploy pipeline |
| `docs/04-bootstrap-architecture.md` | Cost optimization rationale |
| `docs/05-push-notifications.md` | Adding new notification types |
| `infra/bootstrap/RUNBOOK.md` | Operations cheat sheet — 2 AM emergencies |

---

## 🚀 What to do next

1. **Migrate routes** PostgreSQL → MongoDB (the schemas in `src/models/` are ready)
2. **Seed workflows** for BIS_CRS, EPR, TEC_ETA, LMPC, FSSAI (one-time `db.workflows.insertMany([...])`)
3. **Connect mobile app** to live backend (rebuild APK with `EXPO_PUBLIC_API_URL`)
4. **Build admin portal** (React + Vite) — point to same API
5. **Sign up real users** and watch the audit_logs collection grow 🎉

# Solo-Founder Runbook

> Everything you need to operate DICE on the bootstrap stack.
> Bookmark this file. When something breaks at 2 AM, this is your first read.

---

## 🚨 Emergency Contacts & Resources

| What | Where |
|---|---|
| EC2 console | https://ap-south-1.console.aws.amazon.com/ec2 |
| Atlas dashboard | https://cloud.mongodb.com |
| Cloudflare dashboard | https://dash.cloudflare.com |
| GitHub Actions | https://github.com/YOUR_REPO/actions |
| Sentry errors | https://sentry.io |
| Better Stack uptime | https://betterstack.com |
| Razorpay dashboard | https://dashboard.razorpay.com |
| AWS support | 1-866-216-1075 (24×7 if you have a support plan) |

---

## 🔥 "Something is broken" — Triage in 60 seconds

```bash
# 1. Is the public endpoint up?
curl https://api.sanyogconformity.com/health

# 2. SSH into the box
ssh -i ~/.ssh/dice-ec2.pem ubuntu@<EC2_IP>

# 3. Quick health
sudo -u dice pm2 status            # are workers running?
sudo systemctl status caddy        # is reverse-proxy alive?
df -h                              # disk full?
free -h                            # OOM?
sudo journalctl -u caddy -n 50     # recent Caddy errors
sudo -u dice pm2 logs --lines 100  # recent app errors
```

---

## ✅ Daily Checklist (90 seconds)

Set a calendar reminder.

- [ ] Open Sentry → confirm error rate is normal
- [ ] Open Atlas → connections < 150, slow queries < 5/hour
- [ ] Confirm last night's backup landed in S3
  ```bash
  aws s3 ls s3://sanyog-conformity-docs/backups/mongodb/ | tail -3
  ```
- [ ] Better Stack uptime monitor green
- [ ] EC2 CloudWatch: CPU < 60%, memory < 80%, disk < 70%

---

## 🛠️ Common Operations

### Deploy

Just `git push origin main`. GitHub Actions runs tests → builds → deploys to EC2 → smoke-tests.

### Rollback to previous release

GitHub Actions → **Deploy to EC2** → Run workflow → set `action=rollback`.

Or manually:
```bash
ssh dice@<EC2_IP>
ls -1dt /opt/dice/releases/   # see all releases
ln -sfn /opt/dice/releases/<previous> /opt/dice/current
pm2 reload all
```

### Update an environment variable

```bash
ssh ubuntu@<EC2_IP>
sudo nano /etc/dice/.env
sudo -u dice pm2 reload all --update-env
```

### Manual backup right now

```bash
ssh dice@<EC2_IP>
sudo /usr/local/bin/dice-backup
```

### Restore from a backup

```bash
ssh ubuntu@<EC2_IP>
sudo /opt/dice/current/infra/bootstrap/restore.sh --list
sudo /opt/dice/current/infra/bootstrap/restore.sh 20260608-180000
```

**ALWAYS restore to a staging URL first** by setting `RESTORE_URL` env var.

### View live logs

```bash
ssh dice@<EC2_IP>
pm2 logs                        # all workers, tailing
pm2 logs --lines 1000           # last 1000 lines
sudo tail -f /var/log/caddy/access.log
```

### Scale up the EC2 (when CPU/memory consistently > 80%)

1. Stop the instance (Atlas keeps running — connection drops <1 min)
2. Change instance type: `t4g.small` → `t4g.medium` (4 GB, $24/mo)
3. Start. Boot takes ~1 min. PM2 auto-starts via systemd.

### Renew SSL certificate

**You don't.** Caddy auto-renews via Let's Encrypt 30 days before expiry.
If you ever need to force: `sudo caddy reload --config /etc/caddy/Caddyfile`

### Atlas tier upgrade (M2 → M10)

1. Atlas UI → cluster → "Modify"
2. Pick M10, change region if needed
3. Click "Apply" → takes ~15 min with zero downtime (rolling change)
4. **Update connection string** in `/etc/dice/.env` if it changes
5. `pm2 reload all --update-env`

### Open a port through the firewall

```bash
sudo ufw allow <port>/tcp comment "Why I'm opening this"
sudo ufw status verbose
```

---

## 🚨 Specific Failure Playbooks

### App returns 502/503

```bash
# 1. Is Node running?
sudo -u dice pm2 status
# If workers are "stopped" or "errored":
sudo -u dice pm2 restart all

# 2. Did it crash on bad code?
sudo -u dice pm2 logs --err --lines 200
# If yes: rollback (see above)

# 3. Is MongoDB reachable?
curl -fsS https://api.sanyogconformity.com/health
mongosh "$DATABASE_URL" --eval "db.runCommand({ping:1})"
```

### Disk full

```bash
df -h
sudo du -sh /var/log/* | sort -h | tail
# Usually: PM2 logs, Caddy logs, or /tmp
sudo -u dice pm2 flush         # clear PM2 logs
sudo find /var/log -name "*.log" -size +500M -delete
sudo apt-get clean
```

### High memory (OOM coming)

```bash
free -h
sudo -u dice pm2 list           # check memory per worker
# If a worker is > 600 MB → memory leak — restart it
sudo -u dice pm2 restart dice-api
# Long-term: profile with --inspect or upgrade EC2
```

### Atlas connection refused

1. Check Atlas UI → Network Access → is EC2 IP in the allowlist?
2. Check EC2 hasn't gotten a new public IP (it shouldn't, you have an Elastic IP)
3. Test from EC2:
   ```bash
   nc -zv cluster0-shard-00-00.xyz.mongodb.net 27017
   ```

### Caddy can't issue cert (port 80 blocked)

```bash
# Verify port 80 is open
sudo ufw status
# In AWS console: Security Group must allow 80/tcp from 0.0.0.0/0 (for ACME)
# In Cloudflare: temporarily set "Always Use HTTPS" OFF, or use DNS-01 challenge
```

### Cloudflare in front but origin EC2 directly attackable

Lock down EC2 to only accept traffic from Cloudflare:
```bash
# Get Cloudflare's IP ranges
curl https://www.cloudflare.com/ips-v4 -o /tmp/cf-ips

# Update Security Group: remove "0.0.0.0/0 on 443" and add each CF range
# (Use the AWS console or aws-cli with each subnet)
```

### Razorpay webhook missing → payment not reconciled

1. Razorpay dashboard → Payments → find the payment by ID
2. Click "Replay Webhook"
3. Verify your /payments/webhook handler logs receipt

### Forgot which version is deployed

```bash
ssh dice@<EC2_IP>
readlink /opt/dice/current
# /opt/dice/releases/20260608-203015-a3b7d12
# Last 7 chars = git SHA
```

---

## 💸 Cost Anomaly Detection

Set up AWS Budget alerts now (free):

1. AWS Console → Billing → Budgets → Create
2. Monthly budget = $70 (₹6,000)
3. Alert at 50%, 80%, 100%
4. Notification: your email + SMS via SNS

Check `aws ce get-cost-and-usage` weekly:

```bash
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '7 days ago' +%F),End=$(date +%F) \
  --granularity DAILY \
  --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=SERVICE
```

Top cost surprises usually come from:
- **S3 PUT/GET requests** — if a bug causes upload loops, check requests metric
- **Data transfer out** — if Cloudflare cache misses spike, check CF analytics
- **EBS volume** — if logs aren't rotated, the volume grows

---

## 📈 Growth Indicators (when to upgrade)

Watch for **2 weeks of sustained** signals:

| Signal | Threshold | Action |
|---|---|---|
| MongoDB connection count | > 150 sustained | Atlas M2 → M10 ($9 → $57) |
| MongoDB CPU | > 60% sustained | Atlas tier upgrade |
| MongoDB disk | > 1.5 GB | Atlas M2 → M10 (more storage) |
| EC2 CPU | > 70% sustained | t4g.small → t4g.medium |
| EC2 memory | > 85% sustained | Upgrade instance |
| Request latency | p95 > 500ms | Profile + Redis cache |
| Sentry errors | spike + new patterns | Bug fix |
| Concurrent users | > 1000 (Socket.io) | Add 2nd EC2 + Redis adapter |

---

## 🔐 Quarterly Tasks

- [ ] Rotate JWT secrets (`/etc/dice/.env`) — invalidate all sessions
- [ ] Rotate Atlas admin password
- [ ] Run a restore drill from S3 backup to a staging DB
- [ ] Review IAM users + remove unused
- [ ] Update OS packages: `sudo apt-get update && sudo apt-get upgrade`
- [ ] Update Node deps: `npm audit` + `npm update`
- [ ] Review Cloudflare WAF events for new attack patterns
- [ ] Verify SSL cert health: `curl -vI https://api.sanyogconformity.com`
- [ ] Test the rollback button — actually rollback then redeploy

---

## 📞 When To Escalate (or hire help)

You're a solo founder; some things are worth paying for:

- **AWS hardware failure recurring** → call AWS support
- **Atlas slow query you can't diagnose** → Atlas chat support (M10+ included)
- **Razorpay disputes** → Razorpay dispatch manager
- **Compliance / DPDP audit** → CA + IT consultant
- **Security incident (suspected breach)** → IT lawyer + cyber-insurance + AWS support

Get **cyber-insurance** at the ₹500k+ MRR mark (~₹15k/year for ₹1 crore coverage in India).

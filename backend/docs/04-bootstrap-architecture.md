# DICE — Bootstrap Architecture (₹6,000/mo · ~$70)

> **Stage:** Solo founder · 50k registered users · 2k–5k DAU · pre-revenue
> **Region:** Mumbai (ap-south-1) · **Stack:** EC2 + Atlas M2 + S3 + Cloudflare
> **Goal:** Production-ready, but minimum spend. Clear upgrade triggers documented.

---

## Architecture Diagram

```
                ┌─────────────────────────┐
                │   Cloudflare (FREE)     │
                │   • DNS + DDoS          │
                │   • CDN (270+ PoPs)     │
                │   • WAF + Bot mgmt      │
                │   • SSL termination     │
                └─────────────┬───────────┘
                              │ HTTPS (origin via Cloudflare Tunnel or static IP)
                              ▼
                ┌─────────────────────────┐
                │   AWS EC2 t4g.small     │  ← Single instance, ap-south-1a
                │   (ARM Graviton, $12)   │  ← Caddy = auto-HTTPS + reverse proxy
                │                         │
                │   ┌──────────────────┐  │
                │   │ Caddy (443/80)   │──┼──► Let's Encrypt (auto-renew)
                │   └────────┬─────────┘  │
                │            │            │
                │            ▼            │
                │   ┌──────────────────┐  │
                │   │ PM2 cluster mode │  │  ← 2 Node.js workers (uses both vCPUs)
                │   │ Node 20 + Express│  │     graceful restart, log rotation
                │   └──────────────────┘  │
                │            │            │
                │   ┌────────▼─────────┐  │
                │   │ In-memory LRU    │  │  ← Replaces Redis at this scale
                │   │ cache (lru-cache)│  │     ~50 MB RAM budget for cache
                │   └──────────────────┘  │
                └─────┬────────┬──────────┘
                      │        │
        ┌─────────────┘        └─────────────┐
        ▼                                    ▼
┌──────────────────────┐         ┌──────────────────────┐
│  MongoDB Atlas M2    │         │   AWS S3 (Mumbai)    │
│  ($9 — shared)       │         │   ($5–10 storage)    │
│  2 GB storage        │         │   - documents/       │
│  Mumbai region       │         │   - backups/         │
│  Daily snapshots     │         │   - thumbnails/      │
│  (2-day retention)   │         │   + Versioning ON    │
└──────────┬───────────┘         │   + Object Lock OFF  │
           │                     │   (saves $$ at start)│
           │ DIY backup          └──────────────────────┘
           ▼
    nightly mongodump
    → S3 backups/ bucket
    (30 daily, 12 monthly, 5 yearly)
```

---

## Cost Breakdown (USD/month)

| Service | Config | Cost |
|---|---|---|
| **EC2 t4g.small** | 2 vCPU ARM Graviton, 2 GB, 30 GB EBS | $12 |
| **EC2 1-yr Reserved (optional)** | same — saves 37% | **$7.50** |
| **MongoDB Atlas M2** | shared, 2 GB storage, Mumbai | $9 |
| **S3 storage** | ~50 GB hot, 100 GB IA growing | $7 |
| **S3 PUT/GET requests** | 100k/mo @ $0.005/1000 | $0.50 |
| **S3 backups bucket** | 30 dumps × 2 GB = 60 GB | $1.50 |
| **Data transfer out** | 50 GB/mo (most cached by CF) | $4.50 |
| **Route53 hosted zone** | (skip if using Cloudflare DNS) | $0.50 |
| **Domain** | .com renewal, amortized | $1 |
| **AWS SES email** | 10k emails free, $0.10/1k after | $1 |
| **Cloudflare Free** | DNS + CDN + WAF + DDoS | $0 |
| **Caddy + Let's Encrypt** | auto-HTTPS | $0 |
| **Sentry (free tier)** | 5k errors/mo | $0 |
| **Better Stack (free)** | 10 monitors, uptime | $0 |
| **UptimeRobot (free)** | 5-min checks, 50 monitors | $0 |
| **GitHub Actions** | 2000 min/mo free | $0 |
| **Total (on-demand EC2)** |  | **$36/mo** |
| **Total (reserved EC2)** |  | **$32/mo** |

**Spare capacity:** ₹6,000 budget = ~$70 → **~$35 headroom** for unforeseen costs or moderate growth.

---

## What We're NOT Buying (and why it's OK)

| Skipped | Why deferred |
|---|---|
| ❌ ALB ($20/mo) | One EC2 = no LB needed. Caddy + EC2 public IP behind Cloudflare. |
| ❌ ElastiCache Redis ($24/mo) | In-process LRU cache + Atlas TTL indexes cover this scale. JWT = stateless sessions. |
| ❌ ECS / Fargate ($100+/mo) | One EC2 + PM2 cluster mode handles 5k DAU comfortably. |
| ❌ Atlas M10 ($57/mo) | M2 ($9) covers 2 GB. Upgrade trigger documented below. |
| ❌ Multi-AZ HA | Solo founder — manual recovery acceptable. Cloudflare's "Always Online" caches GETs during downtime. |
| ❌ NAT Gateway ($35/mo) | EC2 in public subnet with restrictive Security Group. |
| ❌ CloudFront ($5+/mo) | Cloudflare Free is better at this scale. |
| ❌ AWS WAF ($5/mo + req $) | Cloudflare WAF Free is sufficient. |
| ❌ AWS Secrets Manager ($0.40/secret) | `.env` file on EC2 (chmod 600). Migrate when team grows. |
| ❌ Cross-region replication | S3 versioning + daily mongodump backups cover ransomware/oops. |

**Result: $36 vs $260** for the same workload — and you can still serve 5k DAU comfortably.

---

## Capacity Validation

**Single t4g.small (2 vCPU, 2 GB) at 5k DAU:**

| Resource | Capacity | Expected usage | Headroom |
|---|---|---|---|
| CPU | 2 vCPU | ~30% avg | ✅ |
| RAM | 2 GB | 2 PM2 workers @ ~300MB + 50MB cache | ~1 GB free |
| Network | up to 5 Gbps burst | ~5 Mbps avg | ✅ |
| Disk | 30 GB EBS gp3 | ~5 GB | ✅ |
| Connections | 50–80 concurrent | ~20 avg | ✅ |
| Requests/sec | ~500 r/s peak | ~10 r/s avg | 50× headroom |

Math: 5k DAU × ~10 reqs/user/active-hour = 50k reqs/hour = **14 req/sec average**.
Even at 10× peak (140 r/s), one EC2 handles it. **Memory is the bottleneck, not CPU.**

---

## Component Choices Explained

### 1. EC2 t4g.small (ARM Graviton)
- **20% cheaper** than equivalent Intel t3.small ($12 vs $15)
- Node.js runs natively on ARM (since v16)
- Same performance, lower power = lower cost
- Use Ubuntu 22.04 LTS — 5-year free security updates

### 2. MongoDB Atlas M2 (not M0 free)
- M0 (free) limits: 100 connections, no daily backups, 500 ops/sec.
  Crashes at 5k DAU.
- M2 ($9): 2 GB storage, 200 concurrent connections, daily snapshots (2-day retention).
- **Upgrade trigger:** when DB size > 1.5 GB **OR** connection count > 150 sustained.

### 3. Cloudflare in front of EC2
- Hides EC2 IP from the public internet (set Security Group to allow only Cloudflare IPs on 80/443)
- Free SSL = no LB needed
- CDN cache reduces EC2 load by ~40% for static-ish responses
- Free WAF blocks common attacks
- "Always Online" serves cached GETs even if EC2 is down

### 4. No Redis — what replaces it?
| Was using Redis for | Replacement |
|---|---|
| Sessions | JWT (stateless) — already in your auth code |
| OTP storage | MongoDB collection with TTL index (auto-expires) |
| Rate limiting | `express-rate-limit` with `memory-store` |
| Cache (hot DB queries) | `lru-cache` npm package, in-process |
| Pub/sub for Socket.io | Single-instance: no pub/sub needed |
| Background jobs | `setInterval` (already in your code) or `node-cron` |

**Upgrade trigger:** when you scale to >1 EC2 instance (Socket.io needs Redis adapter for sticky sessions).

### 5. PM2 cluster mode
- Uses both vCPUs (single Node process = 1 core wasted)
- Auto-restart on crash
- Zero-downtime deploys via `pm2 reload`
- Built-in log rotation
- Daemon survives SSH disconnect

---

## Upgrade Path (revenue-driven triggers)

| Revenue / DAU | Action | Marginal cost |
|---|---|---|
| **~ ₹40k/mo MRR or 8k DAU** | Atlas M2 → M10 (dedicated, PITR, 10GB) | +$48 → ~$80/mo |
| **₹100k MRR or 15k DAU** | Add ALB + 2nd EC2 for HA | +$45 → ~$125/mo |
| **₹250k MRR or 30k DAU** | Add ElastiCache Redis (Socket.io adapter, hot cache) | +$24 → ~$150/mo |
| **₹500k MRR or 50k DAU** | Migrate EC2 → ECS Fargate (autoscale) | +$80 → ~$230/mo |
| **₹1M MRR or 100k DAU** | Atlas M30 + Multi-AZ + ElastiCache cluster | ~$600/mo |
| **₹2M MRR or 200k DAU** | Multi-region (Frankfurt for EU) + Atlas Global | ~$1500/mo |

**Migration path is non-breaking** — each step adds capacity without rewrite.

---

## Single-Point-of-Failure Acknowledged

This architecture has **one EC2** = if it goes down, you're down. Mitigations:

1. **Cloudflare "Always Online"** serves cached GETs during outages (login/auth still down, but read-only views stay alive)
2. **CloudWatch alarm** → SMS via SNS the instant the EC2 stops responding
3. **AMI snapshots weekly** — relaunch from snapshot in ~5 minutes if instance dies
4. **EBS volume** is separate from instance — survives instance termination
5. **AWS auto-recovery** enabled → if hardware fails, EC2 auto-restarts on new host in ~3 min

**Realistic downtime: < 30 min/month** (one bad AWS hardware incident per quarter, recovered in minutes).
That's 99.96% uptime — acceptable for pre-revenue compliance SaaS.

When you hit ₹40k MRR, add the ALB + 2nd EC2 to push to 99.99%.

---

## Security Posture (still solid at this budget)

| Layer | Control |
|---|---|
| **Network** | Cloudflare in front, EC2 Security Group allows only Cloudflare IPs on 443 + your IP on SSH (22) |
| **Transport** | HTTPS everywhere via Caddy + Let's Encrypt (auto-renew) |
| **App** | Helmet middleware, CORS allowlist, rate limiting, JWT with short TTL + refresh rotation |
| **Database** | Atlas IP allowlist (EC2 elastic IP only), encryption-at-rest, TLS-only connections |
| **Secrets** | `.env` chmod 600, never in git. Rotate quarterly. (Migrate to Secrets Manager later.) |
| **Audit** | `audit_logs` time-series collection — immutable, append-only |
| **Backups** | Atlas daily snapshots + DIY `mongodump → S3` + S3 versioning |
| **Updates** | Unattended-upgrades for OS security patches |

---

## What This Architecture CAN'T Do

Set expectations honestly:

| Limitation | Impact | Workaround |
|---|---|---|
| Single AZ | If Mumbai 1a fails, you're down ~hours | Cloudflare cache softens it for reads |
| No real-time multi-instance Socket.io scaling | Max ~1000 concurrent WebSocket users | Fine until 10k DAU |
| Manual backups beyond Atlas's 2-day window | DR recovery slower | Daily mongodump → S3 (script below) |
| Atlas M2 shared cluster — noisy neighbour possible | Occasional latency spikes | Upgrade to M10 when consistently slow |
| No dedicated WAF rules tuning | Generic Cloudflare rules only | Free tier still blocks 95% of attacks |
| Solo founder = sole operator | If you're sick, no one fixes outages | Document runbooks, set up SMS alerts |

---

Files in `infra/bootstrap/` make this deployable in 30 minutes.

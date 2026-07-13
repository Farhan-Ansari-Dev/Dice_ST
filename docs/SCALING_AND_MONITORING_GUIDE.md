# SCALING & MONITORING STRATEGY

**Date**: July 7, 2026  
**Purpose**: How to monitor, scale, and respond when user load increases

---

## 📊 CURRENT CAPACITY & LIMITS

### Your Current Setup
```
EC2 Instance:   t4g.small (2 vCPU, 4GB RAM)
Database:       MongoDB Atlas M5 or free tier
Cache:          Redis 7
Reverse Proxy:  Caddy
Load Balancer:  None (single instance)
```

### What This Can Handle
| Metric | Capacity | Alert Threshold |
|--------|----------|-----------------|
| Concurrent Users | 50-100 | 70 |
| Daily Active Users | 500-1000 | 750 |
| Requests/second | 50-100 | 75 |
| Database Connections | 100 | 80 |
| API Response Time p99 | 500ms | 800ms |
| Error Rate | < 0.1% | 0.5% |

---

## 🚨 MONITORING SETUP (BEFORE LAUNCH)

### Essential Metrics to Monitor

**1. Server Health**
```
CloudWatch Metrics:
├─ CPU Utilization (target: < 60%)
├─ Memory Utilization (target: < 75%)
├─ Disk Space (alert: < 20% free)
├─ Network In/Out (watch for DDoS)
└─ Instance Status Check (should be Pass)

Alert Triggers:
🔴 CPU > 70% for 5 minutes → Investigate
🔴 Memory > 80% for 5 minutes → Add RAM or optimize
🔴 Disk < 10% → Delete old logs or upgrade
🔴 Instance unhealthy → Auto-restart (if configured)
```

**2. Application Metrics**
```
Backend Logs (Winston):
├─ Request count per endpoint
├─ Response times per endpoint
├─ Error counts and types
├─ Database query times
├─ Cache hit rates
└─ Authentication failures

Alert Triggers:
🔴 Error rate > 1% → Investigate
🔴 API latency > 1 second (p99) → Optimize queries
🔴 Failed auth > 20/min → Brute force attack?
🔴 Database slow > 200ms → Add indexes or scale
```

**3. Database Metrics**
```
MongoDB Atlas Dashboard:
├─ Connections (target: < 50)
├─ Query execution time (target: < 100ms)
├─ Storage usage (alert: > 70% of limit)
├─ Replication lag (if multi-node)
└─ Backup status (should complete daily)

Alert Triggers:
🔴 Connections > 80 → Connection pooling issue
🔴 Query time > 500ms → Slow query analysis
🔴 Storage > 80% → Upgrade tier or archive data
```

**4. API & User Metrics**
```
Application Tracking:
├─ Active sessions (real-time)
├─ API calls per user (detect abuse)
├─ File upload rate (detect spam)
├─ Payment transaction success rate
├─ OTP delivery success rate
└─ User growth rate

Alert Triggers:
🟠 Single user making > 100 req/min → Rate limit
🟠 Payment failure > 5% → Check Razorpay
🟠 OTP failure > 10% → Check email service
```

---

## 📈 WHEN TO SCALE (Traffic Growth Phases)

### PHASE 1: LIGHT LOAD (0-500 Daily Active Users)
**Duration**: Months 1-3  
**Your current setup handles this fine**

#### Metrics to Watch
```
✅ CPU: 20-40%
✅ Memory: 40-50%
✅ API latency: 200-300ms
✅ Error rate: < 0.05%
✅ Database: 20-30 connections
```

#### What to Do
```
Daily:
  □ Check CloudWatch dashboard
  □ Scan error logs
  □ Monitor disk space

Weekly:
  □ Review performance trends
  □ Optimize slow queries (if found)
  □ Test backup restore

Monthly:
  □ Review cost trends
  □ Analyze user behavior
  □ Plan for next phase
```

#### Alerts to Set Up
```
⚠️  CPU > 70% for 5 minutes
⚠️  Memory > 80%
⚠️  Error rate > 1%
⚠️  API latency > 800ms (p99)
⚠️  Failed logins > 20/minute
⚠️  Disk space < 10% free
```

---

### PHASE 2: GROWING (500-2000 Daily Active Users)
**Duration**: Months 3-6  
**Upgrade needed when Phase 1 limits approached**

#### When to Upgrade
```
Trigger 1: CPU consistently > 60%
Trigger 2: Memory > 70%
Trigger 3: API latency p99 > 800ms
Trigger 4: Database taking > 200ms per query
Trigger 5: Running out of disk space

→ Do upgrade when ANY 2 triggers hit
```

#### Upgrade Options

**Option A: Larger Instance (EC2 t4g.medium)**
```
Cost: +$12/month (total: $24 instead of $12)
Effort: 5 minutes
Downtime: 2 minutes (if using ALB)
Gain: 2x CPU, 2x RAM

How to do it:
1. AWS Console → EC2 → Instances
2. Stop instance
3. Change instance type to t4g.medium
4. Start instance
5. Verify: check CPU/memory drop
```

**Option B: Better Database (MongoDB M10)**
```
Cost: +$32/month (total: $89 instead of $57)
Effort: 0 minutes (automatic in MongoDB Atlas)
Downtime: 0 (online migration)
Gain: 4x storage, dedicated cluster, auto-scaling

MongoDB will handle automatically - no action needed!
```

**Option C: Add Caching (Redis optimization)**
```
Cost: $0 (already have Redis)
Effort: 30 minutes code changes
Gain: 5-10x faster for frequently accessed data

Where to cache:
  - User profiles (cache 1 hour)
  - Organization data (cache 1 day)
  - Public certifications (cache 1 week)
  - Statistics (cache 5 minutes)

Implementation: Add `getCached()` helper in backend
```

#### What Else Changes
```
Add these metrics to monitor:
  □ Database query times (should stay < 100ms)
  □ Cache hit rate (target: > 70%)
  □ Connection pool usage
  □ Replication lag (if multi-node)

Add more alerts:
  □ Database connections > 80
  □ Cache hit rate < 50%
  □ Slow query warnings
```

---

### PHASE 3: SCALE (2000-10000+ Daily Active Users)
**Duration**: Months 6+  
**Significant architecture changes**

#### When to Consider
```
When ANY 3 of these are true:
  □ Need faster response times (< 200ms)
  □ Need higher availability (99.9%+)
  □ Single instance won't suffice
  □ Monthly cost approaching budget
  □ Planning for global users
```

#### Major Architecture Changes
```
Add Load Balancer (AWS ALB):
  Cost: $16/month
  Gain: Route traffic between multiple EC2s
  Downtime: 1 hour (one-time setup)

Multiple EC2 Instances (2-5):
  Cost: $24-120/month (depends on # instances)
  Gain: Horizontal scaling, redundancy
  Setup: Auto-scaling group (automatic scaling)

Better Database (MongoDB M30+):
  Cost: $400-1000+/month
  Gain: Multi-region replication, sharding
  Benefit: Global latency improvement

Content Delivery Network (CloudFront):
  Cost: $30-100/month
  Gain: 70% cache hit rate for static files
  Speed: 2-10x faster worldwide

Dedicated Monitoring:
  Cost: $15-100/month (Datadog, New Relic)
  Gain: Per-endpoint metrics, database profiling
  Benefit: Find bottlenecks faster
```

#### Auto-Scaling Setup
```
Already configured in Terraform!
Just needs activation:

Parameters:
  Min instances: 1
  Max instances: 3
  Target CPU: 70%
  Scale up: When CPU > 70% for 2 min
  Scale down: When CPU < 30% for 5 min

Benefits:
  ✅ Automatic scaling during traffic spikes
  ✅ Cost reduction during quiet hours
  ✅ Zero downtime scaling
  ✅ High availability (instances in different AZs)
```

---

## 🎯 WHAT TO DO WHEN THINGS SLOW DOWN

### STEP 1: Detect the Problem (Automated)
```
CloudWatch alerts fire automatically when:
  □ CPU > 70%
  □ Memory > 80%
  □ API latency > 1000ms
  □ Error rate > 1%
  □ Database slow queries > 3
```

### STEP 2: Investigate (You, within 5 minutes)

**Check your dashboard:**
```bash
# SSH into server
ssh -i your-key.pem ubuntu@your-ec2-ip

# Check processes
top -b -n 1 | head -15

# Check disk space
df -h

# Check logs
pm2 logs | grep error
tail -f /var/log/syslog
```

**Questions to answer:**
```
1. Is this expected?
   - Did I just deploy code?
   - Is it a specific time of day?
   - Is there an event/marketing push?

2. Is traffic unusually high?
   - Check API request counts
   - Look for DDoS patterns (same IPs repeatedly)
   - Look for bot traffic (same User-Agent)

3. Is it a database issue?
   - Check MongoDB slow query log
   - Look for missing indexes
   - Check connection count

4. Is it an application issue?
   - Check error logs
   - Look for memory leaks
   - Check for infinite loops

5. Is it infrastructure?
   - Check CPU/memory usage
   - Check disk space
   - Check network bandwidth
```

### STEP 3: Respond (Your Options)

**Option 1: Quick Restart (5 minutes, high risk)**
```bash
# Restart the app
pm2 restart all

# Check if fixed
pm2 logs | tail -20
```
⚠️ Risk: If issue was memory leak, it returns  
⚠️ Risk: Causes brief outage

**Option 2: Increase Instance Size (10 minutes, zero downtime with ALB)**
```bash
# Scale up to t4g.medium
AWS Console → EC2 → Change instance type

# Or use CLI
aws ec2 stop-instances --instance-ids i-xxx
aws ec2 modify-instance-attribute --instance-id i-xxx --instance-type t4g.medium
aws ec2 start-instances --instance-ids i-xxx
```
✅ Good for: General slowdown  
✅ Good for: Growing traffic  
⚠️ Downtime: 2-3 minutes

**Option 3: Optimize Code (30+ minutes, best long-term)**
```bash
# Find slow endpoints
cat /var/log/app.log | grep "> 500ms"

# Find slow database queries
# Check MongoDB explain() output

# Add caching for expensive queries
# Add indexes to frequently queried fields
# Optimize image/file sizes
```
✅ Good for: Permanent improvement  
✅ Good for: Fixes root cause  
⏱️ Takes time but worth it

**Option 4: Enable Auto-Scaling (0 minutes, automatic)**
```bash
# If already configured, it handles automatically!
# Watch metrics to see if new instances spawn

# If not configured, set it up:
Terraform: Uncomment auto_scaling config
Run: terraform apply
```
✅ Best for: Long-term growth  
✅ Cost-effective  
⏱️ Cost varies with load

### STEP 4: Prevent Recurrence (After stabilization)

```
Within 24 hours:
  □ Identify root cause
  □ Implement permanent fix
  □ Monitor closely for 48 hours
  □ Update capacity plans
  □ Document what happened (for future reference)

Review:
  □ Did you need bigger instance? → Plan upgrade
  □ Was there a code issue? → Deploy fix
  □ Was it expected traffic? → Adjust alerts
  □ Was it a DDoS? → Enable Cloudflare WAF
```

---

## 📋 MONITORING CHECKLIST

### Daily (Automated via CloudWatch)
- [ ] CPU utilization < 60%
- [ ] Memory < 75%
- [ ] Error rate < 0.1%
- [ ] No failed health checks
- [ ] Database responding < 100ms

### Weekly (You review manually)
- [ ] CloudWatch dashboard review
- [ ] Error log scan for patterns
- [ ] Performance trend analysis
- [ ] Database query optimization
- [ ] Backup completion verification

### Monthly (Strategic review)
- [ ] Cost analysis and trends
- [ ] User growth rate
- [ ] Feature usage analytics
- [ ] Capacity planning for next 3 months
- [ ] Security log review

### Quarterly (Major review)
- [ ] Architecture review
- [ ] Scaling strategy reassessment
- [ ] Dependency updates
- [ ] Security audit
- [ ] Disaster recovery drill

---

## 🔔 ALERT CONFIGURATION

### Critical Alerts (Get email + SMS immediately)
```
□ API is down (health check fails)
□ Database is down (connection fails)
□ Out of disk space (< 5% free)
□ Error rate > 5%
□ More than 50 failed logins in 5 minutes
```

### High Priority Alerts (Get email immediately)
```
□ CPU > 70% for 5 minutes
□ Memory > 80% for 5 minutes
□ API latency > 1000ms (p99)
□ Database latency > 500ms
□ Failed payments > 5% in last hour
□ OTP delivery failing > 10% in last hour
```

### Medium Priority Alerts (Get email summary)
```
□ CPU > 60% for 10 minutes
□ Memory > 70% for 10 minutes
□ Error rate > 1% for 5 minutes
□ SSL certificate expiring in 30 days
□ Auto-scaling triggered
```

### Low Priority Alerts (Daily digest)
```
□ Unusual traffic pattern
□ New error type detected
□ Slow query detected
□ Backup completed (success)
□ CloudWatch cost anomaly
```

---

## 💰 COST SCALING ESTIMATES

| Users | Instance | Database | Cost/month | Notes |
|-------|----------|----------|-----------|-------|
| 100 | t4g.small | Free | $20 | MVP stage |
| 500 | t4g.small | Free | $25 | Still fine |
| 1000 | t4g.small | M5 ($57) | $90 | Consider upgrade |
| 2000 | t4g.medium | M5 | $130 | Upgraded |
| 5000 | t4g.medium x2 | M10 | $200 | Auto-scaling active |
| 10000 | t4g.medium x3 | M30 | $400+ | Architecture overhaul |
| 50000+ | t4g.large x5+ | M30+ | $800+ | Enterprise setup |

---

## 🚀 QUICK RESPONSE GUIDE

### "My API is slow!"
```
1. Check: top -b -n 1
   Is CPU/memory high?
   → Yes: Restart app (pm2 restart all) or increase instance
   → No: Go to step 2

2. Check: tail -f /var/log/app.log
   Are there errors?
   → Yes: Look at specific error messages
   → No: Go to step 3

3. Check: MongoDB
   Are queries taking > 500ms?
   → Yes: Add indexes or optimize query
   → No: Check network/cache

4. Result: API fast again!
```

### "My database is slow!"
```
1. Check MongoDB logs:
   → Missing index on query field?
   → Query scanning too many documents?

2. Add missing indexes:
   db.users.createIndex({ email: 1 })
   db.applications.createIndex({ organizationId: 1 })

3. Monitor query performance:
   MongoDB Atlas → Collections → Query Performance

4. Result: Queries fast again!
```

### "Users are complaining about downtime!"
```
1. Check: pm2 status
   Is app running?
   → No: pm2 start all
   → Yes: Go to step 2

2. Check: curl http://localhost:5000/health
   Does health check pass?
   → No: App crashed, restart: pm2 restart all
   → Yes: Go to step 3

3. Check: telnet localhost 5432 (or MongoDB)
   Can app reach database?
   → No: Database down! Check MongoDB Atlas
   → Yes: Go to step 4

4. Check: tail -f /var/log/app.log
   What are the errors?

5. Fix: Depends on error
```

### "Getting DDoS attacked!"
```
1. Check: CloudWatch → Network
   Is traffic unusually high?
   → Yes: Probably DDoS

2. Check: tail -f /var/log/nginx/access.log
   Are there many requests from same IP?
   → Yes: That's the attacker IP

3. Options:
   A) Enable Cloudflare (auto-blocks many attacks)
   B) Add WAF rule to block IP pattern
   C) Increase rate limiting

4. Prevention: Set up Cloudflare before going live!
```

---

## ✅ SUMMARY: What to Do Now

Before Launch:
1. [ ] Set up CloudWatch alarms
2. [ ] Enable SNS notifications
3. [ ] Create CloudWatch dashboard
4. [ ] Test alerts by triggering manually
5. [ ] Document escalation contacts

After Launch:
1. [ ] Monitor daily for first week
2. [ ] Review metrics weekly
3. [ ] Plan next infrastructure upgrade
4. [ ] Set up Sentry for error tracking
5. [ ] Enable auto-scaling (when users grow)

---

**You're well-prepared to scale! Monitor early, scale before problems occur, and you'll have smooth growth. 🚀**


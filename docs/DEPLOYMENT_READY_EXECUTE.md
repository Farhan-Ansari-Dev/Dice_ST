# PRODUCTION DEPLOYMENT - READY TO EXECUTE

**Status**: ✅ All systems verified and ready  
**Date**: July 7, 2026  
**Systems Ready**: Backend API, Admin Portal, Mobile App

---

## 🚀 Choose Your Deployment Path

### OPTION 1: RAILWAY (Recommended)
**Fastest**: ~5-10 minutes setup  
**Cost**: $5-50/month (free tier available)  
**Best for**: Quick production launch

#### Requirements:
- [ ] GitHub account (for OAuth)
- [ ] Railway account (free at railway.app)
- [ ] PostgreSQL plugin (Railway provides)
- [ ] Redis plugin (Railway provides)

#### Step-by-Step Deployment

**1. Create Railway Account**
```
Go to: https://railway.app
Click: Sign up with GitHub
Authorize Railway
```

**2. Create New Project**
```
In Railway Dashboard:
  → New Project
  → Deploy from GitHub
  → Select your repo
  → Set root directory to: /backend
  → Click Deploy
```

**3. Add Database Services (2 clicks)**
```
Railway will auto-detect Docker and start building

Add PostgreSQL:
  → Plugins → PostgreSQL → Add
  → Connection string auto-injected as DATABASE_URL

Add Redis:
  → Plugins → Redis → Add
  → Connection string auto-injected as REDIS_URL
```

**4. Set Environment Variables**
```
In Railway Dashboard → Variables:

Add these with YOUR actual values:
  JWT_SECRET=<run: openssl rand -base64 64>
  JWT_REFRESH_SECRET=<run: openssl rand -base64 64>
  OPENAI_API_KEY=sk-your-key-here
  AWS_ACCESS_KEY_ID=REDACTED...
  AWS_SECRET_ACCESS_KEY=your-secret
  AWS_S3_BUCKET=your-bucket-name
  RAZORPAY_KEY_ID=rzp_live_...
  RAZORPAY_KEY_SECRET=your-secret
  MSG91_AUTH_KEY=your-auth-key
  FRONTEND_URL=https://your-domain.com
  CORS_ORIGIN=https://your-domain.com,https://admin.your-domain.com
```

**5. Deploy**
```
Click: Deploy
Wait for build to complete (~2-3 minutes)
You get: https://sanyog-api.up.railway.app (example)
```

**6. Run Migrations (One-time)**
```
In Railway CLI:
  railway run npm run db:migrate
  railway run npm run db:seed
```

**7. Verify Deployment**
```
Test health:
  curl https://sanyog-api.up.railway.app/health
  
Expected response: { "status": "ok" }
```

---

### OPTION 2: RENDER
**Easy**: ~10 minutes setup  
**Cost**: Free tier available  
**Best for**: Cost-conscious projects

#### Requirements:
- [ ] GitHub account
- [ ] Render account (free at render.com)

#### Step-by-Step

**1. Create Render Account**
```
Go to: https://render.com
Sign up with GitHub
Connect repository
```

**2. Deploy Blueprint**
```
In Render Dashboard:
  → New → Blueprint Instance
  → Select your repo
  → Render auto-reads backend/render.yaml
  → Configures: Web service, PostgreSQL, Redis
  → Click Deploy
```

**3. Set Secrets**
```
In Render Dashboard → Environment:

Add same variables as Railway (above)
```

**4. Deploy & Test**
```
Wait for build (~3-5 minutes)
Test: curl https://sanyog-api.onrender.com/health
```

---

### OPTION 3: SELF-HOSTED (AWS/DigitalOcean/Linode)
**Most Control**: ~30 minutes setup  
**Cost**: ~$10-50/month (depending on instance size)  
**Best for**: Full control, custom configuration

#### Requirements:
- [ ] Linux server (t2.micro or larger)
- [ ] SSH access
- [ ] Domain name
- [ ] SSL certificate (free with Let's Encrypt)

#### Deployment Steps

**1. Set Up Server**
```bash
# SSH into your server
ssh ubuntu@your-server-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx (reverse proxy)
sudo apt install -y nginx

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server
```

**2. Clone & Build Backend**
```bash
# Clone repository
git clone <your-repo-url>
cd sanyog-app/backend

# Install dependencies
npm install --production

# Build
npm run build

# Create .env file
cp .env.example .env
# Edit .env with production values
```

**3. Start Services**
```bash
# Start PostgreSQL (usually auto-starts)
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Start Backend with PM2
pm2 start dist/index.js --name "sanyog-api"
pm2 startup
pm2 save
```

**4. Configure Nginx Reverse Proxy**
```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/sanyog-api

# Add this:
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable config
sudo ln -s /etc/nginx/sites-available/sanyog-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**5. Set Up SSL (Let's Encrypt)**
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d api.your-domain.com

# Auto-renew
sudo systemctl enable certbot.timer
```

**6. Test**
```bash
curl https://api.your-domain.com/health
```

---

## 📱 ADMIN PORTAL DEPLOYMENT

### Deploy to Vercel (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd admin-dashboard
vercel --prod

# You get: https://admin-sanyog.vercel.app
```

### Deploy to Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
cd admin-dashboard
netlify deploy --prod --dir=dist

# You get: https://admin-sanyog.netlify.app
```

### Deploy to AWS S3 + CloudFront
```bash
# Build
cd admin-dashboard
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name/

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/*"
```

---

## 📱 MOBILE APP DEPLOYMENT

### iOS App Store
```bash
cd mobile-app

# Create production build
eas build --platform ios

# When prompted, submit to App Store automatically
# or manually:
eas submit --platform ios

# Expected: App review in 24-48 hours
```

### Android Play Store
```bash
cd mobile-app

# Create production build
eas build --platform android

# Submit to Play Store
eas submit --platform android

# In Google Play Console:
# → Start staged rollout (5% → 25% → 100%)
```

---

## 🔗 CONNECTING ALL SYSTEMS

### Update API URL in Mobile App
Edit `mobile-app/src/config/constants.ts`:
```typescript
// For Railway/Render deployment:
export const API_BASE_URL = 'https://sanyog-api.up.railway.app/api/v1';

// For self-hosted:
export const API_BASE_URL = 'https://api.your-domain.com/api/v1';
```

### Update API URL in Admin Portal
Edit `admin-dashboard/src/config/api.ts`:
```typescript
export const API_BASE_URL = 'https://sanyog-api.up.railway.app/api/v1';
```

### Configure CORS in Backend
In `backend/src/index.ts`:
```typescript
cors({
  origin: [
    'https://admin-sanyog.vercel.app',
    'https://your-domain.com',
  ],
  credentials: true,
})
```

---

## ✅ POST-DEPLOYMENT VALIDATION

### 1. Health Checks (All Systems)
```bash
# Backend API
curl https://your-api-url/health
# Expected: { "status": "ok" }

# Admin Portal
curl https://admin-sanyog.vercel.app
# Expected: 200 OK, HTML response

# Mobile App
# After submission, verify in App Store/Play Store
```

### 2. API Endpoint Tests
```bash
# Test authentication
curl -X POST https://your-api-url/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Expected: { "success": true, "delivered_via": "email" }
```

### 3. Database Verification
```bash
# For PostgreSQL:
psql postgresql://user:pass@host/sanyog_conformity
\dt  # List tables
SELECT COUNT(*) FROM users;

# For Redis:
redis-cli PING
# Expected: PONG
```

---

## 🚨 TROUBLESHOOTING

### Backend Won't Start
```
Check logs:
  Railway: View logs in dashboard
  Render: View logs in dashboard
  Self-hosted: pm2 logs sanyog-api

Common issues:
  ❌ DATABASE_URL missing → Set in environment variables
  ❌ Port conflict → Change PORT in .env
  ❌ Build failed → Check npm run build output
```

### Admin Portal Not Loading
```
Check:
  ❌ API URL updated? Check config/api.ts
  ❌ CORS enabled? Check backend cors config
  ❌ Build artifact? Verify dist/index.html exists

Debug:
  F12 → Console tab → Check for errors
  F12 → Network tab → Check API requests
```

### Mobile App Not Connecting
```
Check:
  ❌ API URL updated? Check constants.ts
  ❌ Network connectivity? Test on phone wifi
  ❌ HTTPS certificate? Verify valid SSL

Debug:
  Check phone logs: adb logcat (Android)
  Check Xcode logs: Console app (iOS)
```

---

## 🎯 DEPLOYMENT TIMELINE

### Hour 1: Backend
```
15 min  → Create account (Railway/Render)
10 min  → Connect GitHub & deploy
10 min  → Set environment variables
5 min   → Run migrations
10 min  → Verify health check
```

### Hour 2: Admin Portal
```
10 min  → Deploy to Vercel
10 min  → Update API URL
5 min   → Test login flow
5 min   → Verify all pages load
```

### Hour 3+: Mobile Apps
```
20 min  → Build for iOS
20 min  → Build for Android
Wait    → App store reviews (24-48 hours)
Monitor → User installation
```

---

## 📊 DEPLOYMENT SUCCESS CRITERIA

✅ Backend API:
- [ ] Health endpoint returns 200
- [ ] Database connected
- [ ] Can create OTP request
- [ ] Can verify OTP
- [ ] CORS working

✅ Admin Portal:
- [ ] Page loads in < 2 seconds
- [ ] Can log in
- [ ] Can view dashboard
- [ ] API calls working
- [ ] No console errors

✅ Mobile App:
- [ ] App installs from store
- [ ] Can launch
- [ ] Can send OTP
- [ ] Can verify OTP
- [ ] Can fetch certifications
- [ ] No crashes

---

## 🆘 EMERGENCY CONTACTS

**If Deployment Fails**:
1. Check logs (see troubleshooting above)
2. Verify environment variables are set
3. Ensure all services are running
4. Test with `curl` commands
5. Check GitHub issues for similar problems

**For Production Issues**:
1. Immediate: Rollback to previous version
2. Notify users of issue
3. Document what went wrong
4. Fix and redeploy
5. Post-mortem analysis

---

**Status**: ✅ Ready to Deploy
**Next Step**: Choose option (Railway/Render/Self-hosted) and follow steps above

Let me know which option you want to use! 🚀

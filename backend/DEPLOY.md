# 🚀 Deploy Backend — Quick Start

Pick your hosting platform. **Railway is fastest** (single click, includes Postgres + Redis).

---

## Option 1: Railway (Recommended — ~3 minutes)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https%3A%2F%2Fgithub.com%2FYOUR_GITHUB%2Fsanyog-app%2Ftree%2Fmain%2Fbackend)

### Steps:

1. **Sign up at [railway.app](https://railway.app)** (use GitHub OAuth — free)
2. Click **"New Project" → "Deploy from GitHub repo"** → pick this repo, set root to `/backend`
3. Railway auto-detects the Dockerfile and starts building
4. Add **PostgreSQL** plugin (one click in Railway UI) — auto-injects `DATABASE_URL`
5. Add **Redis** plugin (one click) — auto-injects `REDIS_URL`
6. Set environment variables in Railway dashboard:
   ```
   JWT_SECRET            <generate via: openssl rand -base64 64>
   JWT_REFRESH_SECRET    <generate via: openssl rand -base64 64>
   OPENAI_API_KEY        sk-...
   AWS_ACCESS_KEY_ID     REDACTED...
   AWS_SECRET_ACCESS_KEY ...
   AWS_S3_BUCKET         your-bucket
   RAZORPAY_KEY_ID       rzp_live_...
   RAZORPAY_KEY_SECRET   ...
   MSG91_AUTH_KEY        ...
   FRONTEND_URL          https://your-app-domain.com
   ```
7. Click **"Deploy"** — you get a public URL like `https://sanyog-api.up.railway.app`
8. Run migrations once via Railway CLI:
   ```bash
   railway run npm run db:migrate
   railway run npm run db:seed
   ```

**Done!** Update `mobile-app/src/utils/constants.ts` with your Railway URL.

---

## Option 2: Render (Free tier — ~5 minutes)

1. Sign up at [render.com](https://render.com)
2. Click **"New Blueprint Instance"**
3. Connect your GitHub repo
4. Render reads `backend/render.yaml` and provisions:
   - **Web service** (Docker)
   - **PostgreSQL** (free tier)
   - **Redis** (free tier)
5. Add the secret env vars (OpenAI, AWS, Razorpay) in dashboard
6. **Deploy** — get `https://sanyog-api.onrender.com`

---

## Option 3: Self-host (Docker Compose)

```bash
cd backend
cp .env.example .env       # fill in secrets
docker-compose up -d
```

Backend on `http://localhost:5000`. Add a reverse proxy (Caddy/Nginx) for HTTPS.

---

## Post-deployment checklist

- [ ] Database migrated (`npm run db:migrate` + `npm run db:seed`)
- [ ] All env vars set (`JWT_SECRET`, `OPENAI_API_KEY`, AWS keys, Razorpay)
- [ ] CORS allowed origin matches your mobile/web app URL
- [ ] Health check returns 200 — `curl https://your-api-url/health`
- [ ] Mobile app `constants.ts` updated with production API URL
- [ ] Razorpay webhook configured → `https://your-api-url/api/v1/payments/webhook`
- [ ] S3 bucket exists with CORS allowing your domain

---

## Test the deployed API

```bash
# Health check
curl https://your-api-url/health

# Send OTP
curl -X POST https://your-api-url/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

---

## Update the mobile app

Edit `mobile-app/src/config/env.ts`:

```ts
const PROD_API_URL = 'https://sanyog-api.up.railway.app/api/v1';
const PROD_SOCKET_URL = 'https://sanyog-api.up.railway.app';
```

Rebuild the APK after updating:
```bash
cd mobile-app
npx eas-cli build --platform android --profile preview
```

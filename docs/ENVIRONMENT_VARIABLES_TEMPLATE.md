# 🔐 ENVIRONMENT VARIABLES TEMPLATE - DEPLOYMENT

**Required for Production Deployment**

---

## Backend API Environment Variables

### Create `.env` file with these values:

```env
# ============================================
# APPLICATION SETTINGS
# ============================================
NODE_ENV=production
PORT=5000
LOG_LEVEL=info

# ============================================
# DATABASE
# ============================================
# For Railway/Render - auto-injected
DATABASE_URL=postgresql://user:password@host:5432/sanyog_conformity

# For self-hosted PostgreSQL
# DATABASE_URL=postgresql://sanyog:sanyog_secure_pass@localhost:5432/sanyog_conformity

# ============================================
# REDIS CACHE
# ============================================
# For Railway/Render - auto-injected
REDIS_URL=redis://:password@host:6379

# For self-hosted
# REDIS_URL=redis://localhost:6379

# ============================================
# AUTHENTICATION
# ============================================
# Generate with: openssl rand -base64 64
JWT_SECRET=YOUR_LONG_RANDOM_STRING_HERE_MIN_32_CHARS
JWT_REFRESH_SECRET=YOUR_ANOTHER_LONG_RANDOM_STRING_MIN_32_CHARS
JWT_EXPIRY=24h
JWT_REFRESH_EXPIRY=7d

# ============================================
# EXTERNAL API KEYS
# ============================================
# OpenAI API (for AI features)
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE

# AWS S3 (for document storage)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=REDACTED...
AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY
AWS_S3_BUCKET=sanyog-conformity-prod

# ============================================
# PAYMENT GATEWAY (Razorpay)
# ============================================
RAZORPAY_KEY_ID=rzp_live_YOUR_KEY
RAZORPAY_KEY_SECRET=YOUR_SECRET_KEY
RAZORPAY_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET

# ============================================
# SMS GATEWAY (MSG91)
# ============================================
MSG91_AUTH_KEY=YOUR_AUTH_KEY
MSG91_ROUTE=4  # Standard route

# ============================================
# EMAIL SERVICE
# ============================================
EMAIL_SERVICE=gmail  # or sendgrid
EMAIL_USER=noreply@sanyog.com
EMAIL_PASSWORD=YOUR_APP_PASSWORD
EMAIL_FROM_NAME=Sanyog Conformity

# ============================================
# FRONTEND URLS (CORS Configuration)
# ============================================
FRONTEND_URL=https://app.sanyog.com
ADMIN_DASHBOARD_URL=https://admin.sanyog.com
CORS_ORIGIN=https://app.sanyog.com,https://admin.sanyog.com,https://www.sanyog.com

# ============================================
# MONITORING & LOGGING
# ============================================
SENTRY_DSN=https://YOUR_SENTRY_KEY@sentry.io/YOUR_PROJECT_ID
DATADOG_API_KEY=YOUR_DATADOG_KEY

# ============================================
# FEATURE FLAGS
# ============================================
FEATURE_EMAIL_VERIFICATION=true
FEATURE_SMS_VERIFICATION=true
FEATURE_GOOGLE_AUTH=true
FEATURE_AI_SUGGESTIONS=true
FEATURE_ADVANCED_ANALYTICS=true

# ============================================
# RATE LIMITING
# ============================================
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# ============================================
# SESSION MANAGEMENT
# ============================================
SESSION_SECRET=YOUR_SESSION_SECRET_HERE
SESSION_TIMEOUT=1800000  # 30 minutes

# ============================================
# OPTIONAL: FILE UPLOAD LIMITS
# ============================================
MAX_FILE_SIZE=10485760  # 10MB
MAX_UPLOAD_FILES=5

# ============================================
# OPTIONAL: CACHING
# ============================================
CACHE_TTL=300  # 5 minutes
CACHE_MAX_SIZE=1000

# ============================================
# OPTIONAL: BACKUP & ARCHIVAL
# ============================================
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *  # 2 AM daily
ARCHIVE_AFTER_DAYS=365
```

---

## How to Generate Secrets

### JWT Secrets
```bash
# Generate strong random secret
openssl rand -base64 64

# Example output (use this value):
# NjBWSlRVbWxzQW96UEtrU0h1OWJDb2d0d05uTWV6TUI4QlgyVlJV...
```

### Alternative (using node)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Admin Portal Environment Variables

Create `.env.local` in `admin-dashboard/`:

```env
VITE_API_URL=https://your-api-url/api/v1
VITE_ENVIRONMENT=production
VITE_APP_NAME=Sanyog Conformity Solutions
```

---

## Mobile App Environment Variables

Edit `mobile-app/src/config/constants.ts`:

```typescript
export const API_CONFIG = {
  baseURL: 'https://your-api-url/api/v1',
  socketURL: 'https://your-api-url',
  timeout: 30000,  // 30 seconds
};

export const APP_CONFIG = {
  appName: 'Sanyog Conformity',
  version: '1.0.0',
  environment: 'production',
};

export const FEATURE_FLAGS = {
  enableAnalytics: true,
  enableErrorReporting: true,
  enableOfflineMode: true,
};
```

---

## Deployment Platform Specific

### For Railway
Railway automatically injects:
```
DATABASE_URL   ← PostgreSQL connection string
REDIS_URL      ← Redis connection string
```

Just add the JWT secrets and external API keys in Railway Dashboard.

### For Render
Render automatically injects:
```
DATABASE_URL   ← PostgreSQL connection string
REDIS_URL      ← Redis connection string
```

Just add the JWT secrets and external API keys in Render Dashboard.

### For Self-Hosted
You need to provide ALL variables - no auto-injection.

---

## 🔒 Security Checklist

Before Deploying:

- [ ] Generate strong JWT secrets (use openssl)
- [ ] Never commit .env to Git
- [ ] All API keys rotated (if reusing existing)
- [ ] CORS origins match your domain
- [ ] Database password changed from default
- [ ] Redis password set (if external)
- [ ] SSL certificate valid (HTTPS only)
- [ ] Email service credentials verified
- [ ] SMS gateway credentials verified
- [ ] Payment gateway in production mode (not sandbox)

---

## 🧪 Validation After Deployment

### Test with these curl commands:

```bash
# Health check
curl https://your-api-url/health

# Authentication
curl -X POST https://your-api-url/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Response should be:
# { "success": true, "delivered_via": "email" }

# Get JWT token (use received OTP)
curl -X POST https://your-api-url/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"123456"}'

# Get certifications (with token)
curl https://your-api-url/api/v1/certifications \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 📝 Notes

1. **JWT_SECRET & JWT_REFRESH_SECRET**: Generate NEW secrets, don't reuse
2. **Database passwords**: Change defaults in production
3. **API Keys**: Keep secure, rotate quarterly
4. **CORS**: Whitelist only your actual domains
5. **Email/SMS**: Test with sandbox/test credentials first
6. **Backups**: Enable automated backups for database
7. **Monitoring**: Connect Sentry for error tracking

---

**Ready to Deploy?** 🚀

1. Generate all secrets above
2. Choose deployment platform (Railway/Render/Self-hosted)
3. Set environment variables
4. Run deployment
5. Validate with curl commands above

Document and save your secrets securely (password manager recommended).

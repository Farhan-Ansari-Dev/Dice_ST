#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  DICE — One-shot EC2 provisioning script
#
#  Run on a fresh Ubuntu 22.04 LTS t4g.small (ARM) in ap-south-1.
#  Sets up: Node.js 20 + PM2 + Caddy (HTTPS) + Docker + AWS CLI + UFW.
#
#  Usage (as ubuntu user):
#    curl -fsSL https://raw.githubusercontent.com/YOUR_REPO/main/backend/infra/bootstrap/setup-ec2.sh | bash
#
#  After this runs:
#    1. Update /etc/dice/.env with your secrets
#    2. Point your domain → this EC2's public IP via Cloudflare
#    3. Edit /etc/caddy/Caddyfile with your domain
#    4. systemctl reload caddy
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

DOMAIN="${1:-api.sanyogconformity.com}"
NODE_VERSION="20"
APP_USER="dice"
APP_DIR="/opt/dice"
ENV_DIR="/etc/dice"

echo "═══════════════════════════════════════════════"
echo "  DICE bootstrap — single-EC2 production setup"
echo "  Domain: $DOMAIN"
echo "═══════════════════════════════════════════════"
sleep 2

# ─── 1. System updates ───────────────────────────────────────────
sudo apt-get update
sudo apt-get -y upgrade
sudo apt-get install -y curl wget git build-essential ufw fail2ban \
  ca-certificates gnupg lsb-release software-properties-common \
  htop iotop ncdu jq unzip awscli

# ─── 2. Firewall (UFW) ───────────────────────────────────────────
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment "SSH"
sudo ufw allow 80/tcp comment "HTTP (Caddy ACME challenge)"
sudo ufw allow 443/tcp comment "HTTPS"
sudo ufw --force enable

# ─── 3. Fail2ban (SSH brute-force protection) ────────────────────
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# ─── 4. Unattended security upgrades ─────────────────────────────
sudo apt-get install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades

# ─── 5. Node.js 20 ───────────────────────────────────────────────
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2@latest

# ─── 6. Caddy (auto-HTTPS reverse proxy) ─────────────────────────
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update
sudo apt-get install -y caddy

# ─── 7. Application user & directory ─────────────────────────────
sudo useradd -m -s /bin/bash $APP_USER || true
sudo mkdir -p $APP_DIR $ENV_DIR
sudo chown -R $APP_USER:$APP_USER $APP_DIR
sudo chmod 750 $ENV_DIR

# ─── 8. Caddyfile (HTTPS + reverse proxy to Node) ────────────────
sudo tee /etc/caddy/Caddyfile > /dev/null <<EOF
{
    email admin@sanyogconformity.com
    # Acme staging during testing: acme_ca https://acme-staging-v02.api.letsencrypt.org/directory
}

$DOMAIN {
    # Compress responses
    encode gzip zstd

    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        Referrer-Policy strict-origin-when-cross-origin
        Permissions-Policy "geolocation=(), microphone=(), camera=()"
        -Server
    }

    # Reverse proxy to Node.js on :5000
    reverse_proxy localhost:5000 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}

        # WebSocket support for Socket.io
        transport http {
            keepalive 30s
        }
    }

    # Access logs
    log {
        output file /var/log/caddy/access.log {
            roll_size 100mb
            roll_keep 5
            roll_keep_for 168h
        }
        format console
    }
}
EOF
sudo systemctl reload caddy
sudo systemctl enable caddy

# ─── 9. PM2 startup on boot ──────────────────────────────────────
sudo -u $APP_USER bash -c "pm2 startup systemd -u $APP_USER --hp /home/$APP_USER" || true
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $APP_USER --hp /home/$APP_USER || true

# ─── 10. Log rotation for app logs ───────────────────────────────
sudo tee /etc/logrotate.d/dice > /dev/null <<EOF
/home/$APP_USER/.pm2/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    missingok
    su $APP_USER $APP_USER
}
EOF

# ─── 11. Sample .env template ────────────────────────────────────
if [ ! -f $ENV_DIR/.env ]; then
    sudo tee $ENV_DIR/.env > /dev/null <<'EOF'
# Fill these in BEFORE starting the app
NODE_ENV=production
PORT=5000

# MongoDB Atlas (Mumbai cluster connection string)
DATABASE_URL=mongodb+srv://USER:PASS@cluster.mongodb.net/dice?retryWrites=true&w=majority

# JWT secrets — generate via: openssl rand -base64 64
JWT_SECRET=
JWT_REFRESH_SECRET=

# AWS S3 (Mumbai bucket)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=ap-south-1
AWS_S3_BUCKET=sanyog-conformity-docs

# Razorpay (live keys)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# OpenAI
OPENAI_API_KEY=

# MSG91 (SMS OTP)
MSG91_AUTH_KEY=

# AWS SES (email)
EMAIL_FROM=noreply@sanyogconformity.com

# Frontend URLs
FRONTEND_URL=https://app.sanyogconformity.com
ADMIN_URL=https://admin.sanyogconformity.com
EOF
    sudo chmod 600 $ENV_DIR/.env
    sudo chown $APP_USER:$APP_USER $ENV_DIR/.env
fi

# ─── 12. AWS CloudWatch agent (free tier) ────────────────────────
wget -q https://s3.ap-south-1.amazonaws.com/amazoncloudwatch-agent-ap-south-1/ubuntu/arm64/latest/amazon-cloudwatch-agent.deb -O /tmp/cw-agent.deb
sudo dpkg -i /tmp/cw-agent.deb
sudo tee /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json > /dev/null <<'EOF'
{
  "metrics": {
    "metrics_collected": {
      "mem":  { "measurement": ["mem_used_percent"] },
      "disk": { "measurement": ["used_percent"], "resources": ["/"] }
    }
  }
}
EOF
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 \
  -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

# ─── 13. Auto-recovery alarm (AWS handles it for free) ───────────
echo ""
echo "═══════════════════════════════════════════════"
echo "  ✅ Bootstrap complete!"
echo "═══════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Edit $ENV_DIR/.env with your real secrets"
echo "  2. Set Atlas IP allowlist to this EC2's public IP"
echo "  3. Add a DNS A record for $DOMAIN pointing here (Cloudflare proxy ON)"
echo "  4. Clone your code:  sudo -u $APP_USER git clone <repo> $APP_DIR"
echo "  5. Install deps:     cd $APP_DIR/backend && sudo -u $APP_USER npm ci --production"
echo "  6. Build:            sudo -u $APP_USER npm run build"
echo "  7. Start:            sudo -u $APP_USER pm2 start infra/bootstrap/ecosystem.config.js"
echo "  8. Save PM2 state:   sudo -u $APP_USER pm2 save"
echo ""
echo "Test HTTPS: curl https://$DOMAIN/health"

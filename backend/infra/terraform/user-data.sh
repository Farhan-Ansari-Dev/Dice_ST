#!/usr/bin/env bash
# Cloud-init script — runs ONCE on first EC2 boot.
# Output: /var/log/cloud-init-output.log
set -euo pipefail

exec > /var/log/dice-bootstrap.log 2>&1
echo "[$(date -u +%FT%TZ)] DICE bootstrap starting"

DOMAIN="${domain}"
APP_USER="dice"
APP_DIR="/opt/dice"
ENV_DIR="/etc/dice"

# 1. System
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get -y upgrade
apt-get install -y curl wget git build-essential ufw fail2ban jq unzip \
  ca-certificates gnupg lsb-release software-properties-common awscli \
  unattended-upgrades

# 2. Unattended upgrades
dpkg-reconfigure --priority=low unattended-upgrades

# 3. Firewall — Cloudflare/SSH only (allowed via SG already)
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 4. Fail2ban
systemctl enable --now fail2ban

# 5. Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2@latest

# 6. MongoDB tools (for backup script)
wget -q https://fastdl.mongodb.org/tools/db/mongodb-database-tools-ubuntu2204-arm64-100.10.0.deb \
  -O /tmp/mongotools.deb
apt-get install -y /tmp/mongotools.deb
rm /tmp/mongotools.deb

# 7. Caddy
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/caddy-stable-archive-keyring.gpg] https://dl.cloudsmith.io/public/caddy/stable/deb/debian any-version main" > /etc/apt/sources.list.d/caddy-stable.list
apt-get update
apt-get install -y caddy

# 8. App user + dirs
useradd -m -s /bin/bash $APP_USER || true
mkdir -p $APP_DIR/releases /opt/dice/uploads $ENV_DIR
chown -R $APP_USER:$APP_USER $APP_DIR /opt/dice/uploads
chmod 750 $ENV_DIR

# 9. Caddyfile
cat > /etc/caddy/Caddyfile <<EOF
{
    email admin@$DOMAIN
}

$DOMAIN {
    encode gzip zstd
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        Referrer-Policy strict-origin-when-cross-origin
        Permissions-Policy "geolocation=(), microphone=(), camera=()"
        -Server
    }
    reverse_proxy localhost:5000 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
    log {
        output file /var/log/caddy/access.log {
            roll_size 100mb
            roll_keep 5
        }
        format console
    }
}
EOF
mkdir -p /var/log/caddy
systemctl enable --now caddy

# 10. PM2 startup integration
sudo -u $APP_USER bash -c "pm2 startup systemd -u $APP_USER --hp /home/$APP_USER" || true
env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $APP_USER --hp /home/$APP_USER

# 11. Logrotate
cat > /etc/logrotate.d/dice <<EOF
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

# 12. .env template
if [ ! -f $ENV_DIR/.env ]; then
cat > $ENV_DIR/.env <<'EOF'
# FILL THESE IN before starting the app
NODE_ENV=production
PORT=5000

DATABASE_URL=mongodb+srv://USER:PASS@cluster.mongodb.net/dice?retryWrites=true&w=majority
JWT_SECRET=
JWT_REFRESH_SECRET=

AWS_REGION=ap-south-1
AWS_S3_BUCKET=

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
OPENAI_API_KEY=
MSG91_AUTH_KEY=
EXPO_ACCESS_TOKEN=

VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@sanyogconformity.com

EMAIL_FROM=noreply@sanyogconformity.com
FRONTEND_URL=https://app.sanyogconformity.com
ADMIN_URL=https://admin.sanyogconformity.com
EOF
chmod 600 $ENV_DIR/.env
chown $APP_USER:$APP_USER $ENV_DIR/.env
fi

# 13. CloudWatch Agent (memory + disk metrics)
wget -q https://s3.ap-south-1.amazonaws.com/amazoncloudwatch-agent-ap-south-1/ubuntu/arm64/latest/amazon-cloudwatch-agent.deb -O /tmp/cw.deb
dpkg -i /tmp/cw.deb
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json <<'EOF'
{
  "metrics": {
    "metrics_collected": {
      "mem":  { "measurement": ["mem_used_percent"] },
      "disk": { "measurement": ["used_percent"], "resources": ["/"] }
    }
  }
}
EOF
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 \
  -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

echo "[$(date -u +%FT%TZ)] ✅ DICE bootstrap finished"

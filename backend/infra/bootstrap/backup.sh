#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  DICE — Daily MongoDB backup to S3
#
#  Atlas M2 only retains 2-day snapshots. This adds a long-term archive:
#    - 30 daily backups
#    - 12 monthly backups
#    - 5 yearly backups
#    (managed by S3 lifecycle policy — see lifecycle.json)
#
#  Install:
#    sudo cp backup.sh /usr/local/bin/dice-backup
#    sudo chmod +x /usr/local/bin/dice-backup
#    sudo crontab -e   →   add: 0 18 * * * /usr/local/bin/dice-backup >> /var/log/dice-backup.log 2>&1
#    (18:00 UTC = 23:30 IST — low-traffic time)
#
#  Requires:
#    - mongodump (install: apt-get install mongodb-database-tools)
#    - aws cli configured with S3 write access
#    - /etc/dice/.env with DATABASE_URL, AWS_S3_BUCKET
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

# Load environment
if [ -f /etc/dice/.env ]; then
    set -a
    source /etc/dice/.env
    set +a
fi

: "${DATABASE_URL:?DATABASE_URL not set}"
: "${AWS_S3_BUCKET:?AWS_S3_BUCKET not set}"

TIMESTAMP=$(date -u +%Y%m%d-%H%M%S)
HOST=$(hostname)
DUMP_DIR="/tmp/dice-backup-$TIMESTAMP"
ARCHIVE="/tmp/dice-backup-$TIMESTAMP.tar.gz"
S3_KEY="backups/mongodb/$TIMESTAMP/dump.tar.gz"

echo "[$(date -u +%FT%TZ)] Starting backup → s3://$AWS_S3_BUCKET/$S3_KEY"

# ─── 1. Dump MongoDB ─────────────────────────────────────────────
mkdir -p "$DUMP_DIR"
mongodump \
    --uri="$DATABASE_URL" \
    --out="$DUMP_DIR" \
    --gzip \
    --quiet

# ─── 2. Compress ─────────────────────────────────────────────────
tar -czf "$ARCHIVE" -C "$(dirname $DUMP_DIR)" "$(basename $DUMP_DIR)"
SIZE=$(du -h "$ARCHIVE" | cut -f1)
echo "[$(date -u +%FT%TZ)] Dump size: $SIZE"

# ─── 3. Compute SHA-256 for integrity verification ──────────────
SHA256=$(sha256sum "$ARCHIVE" | cut -d' ' -f1)

# ─── 4. Upload to S3 with metadata ──────────────────────────────
aws s3 cp "$ARCHIVE" "s3://$AWS_S3_BUCKET/$S3_KEY" \
    --storage-class STANDARD_IA \
    --metadata "sha256=$SHA256,host=$HOST,db=dice,size=$SIZE" \
    --no-progress

# ─── 5. Verify upload ────────────────────────────────────────────
aws s3api head-object --bucket "$AWS_S3_BUCKET" --key "$S3_KEY" > /dev/null

# ─── 6. Tag for lifecycle policy ────────────────────────────────
DAY_OF_MONTH=$(date -u +%d)
DAY_OF_YEAR=$(date -u +%j)

TAG_SET="backup_type=daily"
[ "$DAY_OF_MONTH" = "01" ] && TAG_SET="backup_type=monthly"
[ "$DAY_OF_YEAR" = "001" ] && TAG_SET="backup_type=yearly"

aws s3api put-object-tagging \
    --bucket "$AWS_S3_BUCKET" \
    --key "$S3_KEY" \
    --tagging "TagSet=[{Key=$TAG_SET%=*,Value=${TAG_SET#*=}}]"

# ─── 7. Cleanup local files ──────────────────────────────────────
rm -rf "$DUMP_DIR" "$ARCHIVE"

# ─── 8. Health-check ping (UptimeRobot or BetterStack) ──────────
if [ -n "${BACKUP_PING_URL:-}" ]; then
    curl -fsS --retry 3 "$BACKUP_PING_URL" > /dev/null || true
fi

echo "[$(date -u +%FT%TZ)] ✅ Backup complete: $SHA256"

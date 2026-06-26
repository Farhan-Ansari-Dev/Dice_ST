#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  DICE — Restore MongoDB from S3 backup
#
#  Usage:
#    sudo ./restore.sh <timestamp>
#    e.g. sudo ./restore.sh 20260608-180000
#
#  Lists available backups:
#    sudo ./restore.sh --list
#
#  ⚠️  THIS REPLACES THE LIVE DATABASE. Restore to a staging URL first
#     and validate before touching production!
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

if [ -f /etc/dice/.env ]; then
    set -a
    source /etc/dice/.env
    set +a
fi

: "${DATABASE_URL:?DATABASE_URL not set}"
: "${AWS_S3_BUCKET:?AWS_S3_BUCKET not set}"

if [ "${1:-}" = "--list" ]; then
    echo "Available backups:"
    aws s3 ls "s3://$AWS_S3_BUCKET/backups/mongodb/" | awk '{print $2}' | sort -r | head -30
    exit 0
fi

TIMESTAMP="${1:?usage: $0 <timestamp> | --list}"
RESTORE_URL="${RESTORE_URL:-$DATABASE_URL}"
S3_KEY="backups/mongodb/$TIMESTAMP/dump.tar.gz"
RESTORE_DIR="/tmp/dice-restore-$TIMESTAMP"

echo "═══════════════════════════════════════════════"
echo "  ⚠️  RESTORE OPERATION"
echo "  From:   s3://$AWS_S3_BUCKET/$S3_KEY"
echo "  To:     ${RESTORE_URL%@*}@***"
echo "═══════════════════════════════════════════════"
read -p "Type 'YES RESTORE' to proceed: " CONFIRM
[ "$CONFIRM" = "YES RESTORE" ] || { echo "Aborted."; exit 1; }

mkdir -p "$RESTORE_DIR"
trap "rm -rf $RESTORE_DIR" EXIT

# ─── Download ─────────────────────────────────────────────────────
echo "Downloading..."
aws s3 cp "s3://$AWS_S3_BUCKET/$S3_KEY" "$RESTORE_DIR/dump.tar.gz" --no-progress

# ─── Verify checksum ──────────────────────────────────────────────
EXPECTED_SHA=$(aws s3api head-object --bucket "$AWS_S3_BUCKET" --key "$S3_KEY" \
    --query 'Metadata.sha256' --output text)
ACTUAL_SHA=$(sha256sum "$RESTORE_DIR/dump.tar.gz" | cut -d' ' -f1)
if [ "$EXPECTED_SHA" != "$ACTUAL_SHA" ]; then
    echo "❌ Checksum mismatch! Expected: $EXPECTED_SHA  Got: $ACTUAL_SHA"
    exit 1
fi
echo "✅ Checksum verified"

# ─── Extract ──────────────────────────────────────────────────────
tar -xzf "$RESTORE_DIR/dump.tar.gz" -C "$RESTORE_DIR"
DUMP_PATH=$(find "$RESTORE_DIR" -mindepth 1 -maxdepth 2 -type d -name "dice-backup-*" | head -1)

# ─── Restore ──────────────────────────────────────────────────────
echo "Restoring (this may take a few minutes)..."
mongorestore \
    --uri="$RESTORE_URL" \
    --gzip \
    --drop \
    --quiet \
    "$DUMP_PATH"

echo ""
echo "✅ Restore complete from $TIMESTAMP"
echo "   Verify the application is functioning correctly."

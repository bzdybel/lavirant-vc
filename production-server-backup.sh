#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_NAME=${1:-}
WEBHOOK_URL=${WEBHOOK_URL:-}
CURRENT_TIME=$(date +%F-%H-%M-%S)

if [ -z "$PROJECT_NAME" ]; then
  echo "Usage: $0 <project_name>"
  exit 1
fi

BACKUPS_PATH="${BACKUP_DIR:-/backup/$PROJECT_NAME}"
TMP_PATH="/tmp/${PROJECT_NAME}_backup_$CURRENT_TIME"

DATABASE_PATH="${DB_PATH:-/var/www/$PROJECT_NAME/sqlite.db}"
INVOICES_DIR="${INVOICES_PATH:-/var/www/$PROJECT_NAME/storage/invoices}"

FINAL_ARCHIVE="$BACKUPS_PATH/$CURRENT_TIME.tar.gz"
TMP_ARCHIVE="/tmp/${PROJECT_NAME}_archive_$CURRENT_TIME.tar.gz"

function catch {
  local exit_code="$1"
  local line_no="$2"

  echo "[ERROR] Backup failed with exit code $exit_code on line $line_no"
  logger "[lavirant-backup] FAILED (exit=$exit_code, line=$line_no)"

  if [ -n "$WEBHOOK_URL" ]; then
    curl -sS -X POST "$WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      --data "{\"text\":\"Lavirant backup failed on $(hostname) (exit=$exit_code, line=$line_no)\"}" >/dev/null || true
  fi

  rm -rf "$TMP_PATH" "$TMP_ARCHIVE" || true

  exit "$exit_code"
}

trap 'catch $? $LINENO' ERR

mkdir -p "$BACKUPS_PATH"
mkdir -p "$TMP_PATH"

echo "[INFO] Disk usage snapshot:"
df -h

available_kb=$(df -Pk "$BACKUPS_PATH" | awk 'NR==2 {print $4}')
if [ "$available_kb" -lt 1048576 ]; then
  echo "[ERROR] Low disk space. Need at least 1GB free in $BACKUPS_PATH"
  exit 1
fi

if [ ! -f "$DATABASE_PATH" ]; then
  echo "[ERROR] Database not found at $DATABASE_PATH"
  exit 1
fi

if [ ! -d "$INVOICES_DIR" ]; then
  echo "[ERROR] Invoices directory not found at $INVOICES_DIR"
  exit 1
fi

echo "[INFO] Creating temp backup..."
sqlite3 "$DATABASE_PATH" ".backup $TMP_PATH/sqlite.db"
cp -r "$INVOICES_DIR" "$TMP_PATH/invoices"

echo "[INFO] Creating archive..."
tar -czf "$TMP_ARCHIVE" -C "$TMP_PATH" .
mv "$TMP_ARCHIVE" "$FINAL_ARCHIVE"

echo "[INFO] Cleaning up..."
rm -rf "$TMP_PATH"

find "$BACKUPS_PATH" -type f -name "*.tar.gz" -mtime +7 -delete

echo "[INFO] Backup created: $FINAL_ARCHIVE"

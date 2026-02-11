#!/bin/bash
# =============================================================================
# DeepKit Backup Script
# =============================================================================
# Backs up PostgreSQL databases and named Docker volumes.
# Retention: 7 days (configurable via BACKUP_RETENTION_DAYS)
#
# Usage: ./scripts/backup.sh
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
POSTGRES_USER="${POSTGRES_USER:-deepkit}"

echo "============================================"
echo "  DeepKit Backup"
echo "  $(date)"
echo "============================================"

mkdir -p "$BACKUP_DIR"

# --- Database Backup ---
echo ""
echo "[1/3] Backing up PostgreSQL databases..."
if docker exec deepkit-store pg_isready -U "$POSTGRES_USER" > /dev/null 2>&1; then
  docker exec deepkit-store pg_dumpall -U "$POSTGRES_USER" | gzip > "$BACKUP_DIR/deepkit-db-$TIMESTAMP.sql.gz"
  DB_SIZE=$(du -h "$BACKUP_DIR/deepkit-db-$TIMESTAMP.sql.gz" | cut -f1)
  echo "  Database backup: $DB_SIZE"
else
  echo "  WARNING: PostgreSQL not running. Skipping database backup."
fi

# --- Named Volume Backups ---
echo ""
echo "[2/3] Backing up Docker volumes..."
VOLUMES=(
  "deepkit-store-data"
  "deepkit-engine-data"
  "deepkit-orchestrator-data"
  "deepkit-core-uploads"
  "deepkit-n8n-data"
)

for vol in "${VOLUMES[@]}"; do
  if docker volume inspect "$vol" > /dev/null 2>&1; then
    docker run --rm \
      -v "$vol:/data:ro" \
      -v "$BACKUP_DIR:/backup" \
      alpine tar czf "/backup/$vol-$TIMESTAMP.tar.gz" -C /data . 2>/dev/null
    VOL_SIZE=$(du -h "$BACKUP_DIR/$vol-$TIMESTAMP.tar.gz" | cut -f1)
    echo "  $vol: $VOL_SIZE"
  else
    echo "  $vol: not found (skipping)"
  fi
done

# --- Retention Cleanup ---
echo ""
echo "[3/3] Cleaning up backups older than $RETENTION_DAYS days..."
DELETED=$(find "$BACKUP_DIR" -name "deepkit-*" -mtime "+$RETENTION_DAYS" -delete -print | wc -l)
echo "  Removed $DELETED old backup file(s)"

# --- Summary ---
echo ""
echo "============================================"
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
echo "  Backup complete: $BACKUP_DIR"
echo "  Total backup size: $TOTAL_SIZE"
echo "============================================"

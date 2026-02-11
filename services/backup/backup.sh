#!/bin/sh
set -e

# PostgreSQL Automated Backup Script for DeepKit
# Backs up all databases every 6 hours with 7-day retention

BACKUP_DIR="/var/lib/deepkit/backups"
LOG_FILE="/var/log/backup.log"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d-%H%M)
BACKUP_FILE="${BACKUP_DIR}/deepkit-${TIMESTAMP}.sql.gz"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

log "========================================="
log "Starting DeepKit database backup"
log "========================================="

# Backup all databases using pg_dumpall
log "Dumping all PostgreSQL databases..."
if PGPASSWORD="$POSTGRES_PASSWORD" pg_dumpall -h "$POSTGRES_HOST" -U "$POSTGRES_USER" | gzip > "$BACKUP_FILE"; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "✅ Backup successful: $BACKUP_FILE ($BACKUP_SIZE)"
else
    log "❌ Backup failed!"
    exit 1
fi

# Cleanup old backups (keep last 7 days = 28 backups at 6-hour intervals)
log "Cleaning up old backups (retention: $RETENTION_DAYS days)..."
DELETED_COUNT=$(find "$BACKUP_DIR" -name "deepkit-*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete -print | wc -l)
log "Deleted $DELETED_COUNT old backup(s)"

# Summary
TOTAL_BACKUPS=$(find "$BACKUP_DIR" -name "deepkit-*.sql.gz" -type f | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
log "Current backup inventory: $TOTAL_BACKUPS file(s), $TOTAL_SIZE total"
log "========================================="
log "Backup completed successfully"
log "========================================="

exit 0

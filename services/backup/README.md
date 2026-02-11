# DeepKit Automated Backup Service

**Mission-critical PostgreSQL backup automation for DeepKit Arsenal**

## Overview

The backup service automatically creates compressed PostgreSQL dumps every 6 hours with 7-day retention. All backups are stored locally in `/backups` and monitored via the Hub dashboard.

## Features

- **Automated Backups**: Runs every 6 hours via cron (0 */6 * * *)
- **Full Database Dump**: Uses `pg_dumpall` to backup all databases, schemas, and users
- **Compression**: gzip compression reduces backup size by ~90%
- **Retention Policy**: Automatically deletes backups older than 7 days (28 backups total)
- **Logging**: All operations logged to `/var/log/backup.log`
- **Health Monitoring**: Hub dashboard shows backup status with alerts

## Architecture

```
DeepKit Backup System
├── backup.sh             # Main backup script
├── Dockerfile           # Alpine + PostgreSQL client + cron
├── /backups             # Backup storage (mounted volume)
│   └── deepkit-YYYYMMDD-HHMM.sql.gz
└── /var/log/backup.log  # Execution log
```

## Installation

1. **Deploy via Docker Compose**:
   ```bash
   docker-compose -f docker-compose.yml -f modules/backup.yml up -d deepkit-backup
   ```

2. **Verify Service**:
   ```bash
   docker logs deepkit-backup
   ```

3. **Check Hub Dashboard**:
   - Navigate to `http://localhost:7777`
   - Check "Backup_Status" widget in right sidebar
   - Status should show "HEALTHY" within 6 hours of first run

## Manual Operations

### Trigger Manual Backup
```bash
docker exec deepkit-backup /usr/local/bin/backup.sh
```

### View Backup Logs
```bash
docker exec deepkit-backup cat /var/log/backup.log
```

### List Backups
```bash
ls -lh ./backups/
```

### Restore from Backup

**⚠️ WARNING: This will STOP all services and OVERWRITE all database data!**

1. **Run the interactive restore script**:
   ```bash
   ./scripts/restore-backup.sh
   ```

2. **Select a backup** from the list

3. **Confirm restoration** (type `YES`)

4. **Wait for completion** (typically 2-5 minutes)

The script will:
- Stop all DeepKit services
- Restore the selected backup
- Verify table counts
- Restart all services

## Backup File Format

**Filename**: `deepkit-YYYYMMDD-HHMM.sql.gz`

Example: `deepkit-20260131-1430.sql.gz`
- Created: January 31, 2026 at 14:30
- Contains: All PostgreSQL databases
- Compressed: gzip Level 9

## Configuration

### Environment Variables

Set in `.env` or `modules/backup.yml`:

```env
POSTGRES_HOST=deepkit-store      # PostgreSQL container name
POSTGRES_USER=deepkit            # Database username
POSTGRES_PASSWORD=your_password  # Database password
POSTGRES_DB=deepkit              # Default database (not used for pg_dumpall)
```

### Retention Policy

To change retention from 7 days, edit `backup.sh`:

```bash
RETENTION_DAYS=14  # Keep backups for 14 days
```

### Backup Frequency

To change from 6 hours, edit `Dockerfile` cron expression:

```dockerfile
# Every 12 hours at :00
RUN echo "0 */12 * * * /usr/local/bin/backup.sh" > /etc/crontabs/root

# Daily at 2 AM
RUN echo "0 2 * * * /usr/local/bin/backup.sh" > /etc/crontabs/root
```

## Monitoring & Alerts

### Hub Dashboard Widget

The Hub displays:
- **Status**: HEALTHY / WARNING / CRITICAL / NO_BACKUPS
- **Last Backup**: Timestamp and hours ago
- **Backup Size**: File size in MB
- **Total Backups**: Number of stored backups
- **Retention**: Configured retention period

### Alert Thresholds

- **HEALTHY**: Last backup < 8 hours ago
- **WARNING**: Last backup 8-24 hours ago (shown in yellow)
- **CRITICAL**: Last backup > 24 hours ago (shown in red)

### API Endpoint

Query backup status programmatically:

```bash
curl http://localhost:7777/api/backups/status
```

Response:
```json
{
  "enabled": true,
  "lastBackup": {
    "timestamp": "2026-01-31T14:30:00.000Z",
    "filename": "deepkit-20260131-1430.sql.gz",
    "size": 45678901,
    "sizeMB": "43.56",
    "hoursAgo": "2.5"
  },
  "backupCount": 12,
  "totalSize": 548346722,
  "totalSizeMB": "522.84",
  "status": "HEALTHY",
  "message": "Backups running normally",
  "retentionDays": 7,
  "interval": "6 hours"
}
```

## Troubleshooting

### No Backups Created

1. **Check container logs**:
   ```bash
   docker logs deepkit-backup
   ```

2. **Verify PostgreSQL connection**:
   ```bash
   docker exec deepkit-backup psql -h deepkit-store -U deepkit -c "SELECT NOW();"
   ```

3. **Check cron status**:
   ```bash
   docker exec deepkit-backup crond -h
   ```

### Backup Failed

Common causes:
- PostgreSQL not running: `docker ps | grep deepkit-store`
- Wrong credentials: Verify `.env` POSTGRES_PASSWORD
- Disk full: `df -h ./backups`
- Network issues: Check Docker network connectivity

### Restore Failed

1. **Check backup file integrity**:
   ```bash
   gunzip -t ./backups/deepkit-YYYYMMDD-HHMM.sql.gz
   ```

2. **Manual restore**:
   ```bash
   gunzip -c ./backups/deepkit-YYYYMMDD-HHMM.sql.gz | \
     docker exec -i deepkit-store psql -U deepkit -d postgres
   ```

## Security Considerations

- **Backup Encryption**: Backups are NOT encrypted. Store `./backups` on encrypted volume.
- **Password Exposure**: Credentials passed via environment variables.
- **Access Control**: Limit access to `./backups` directory (contains sensitive data).
- **Offsite Backups**: Consider syncing to offsite storage (S3, rsync, etc.).

## Advanced Usage

### Offsite Backup Sync

Add to `backup.sh` after successful backup:

```bash
# Sync to remote server via rsync
rsync -avz --delete /var/lib/deepkit/backups/ user@remote:/backups/deepkit/
```

### Backup Verification

Add verification step to `backup.sh`:

```bash
# Verify backup integrity
if gunzip -t "$BACKUP_FILE"; then
  log "✅ Backup verified: $BACKUP_FILE"
else
  log "❌ Backup verification failed!"
  exit 1
fi
```

### Slack/Discord Notifications

Install webhook sender and add to `backup.sh`:

```bash
# Send notification to Slack
curl -X POST -H 'Content-type: application/json' \
  --data "{\"text\":\"DeepKit backup completed: $BACKUP_SIZE\"}" \
  "$SLACK_WEBHOOK_URL"
```

## Disaster Recovery Plan

1. **Daily**: Monitor Hub dashboard for backup status
2. **Weekly**: Test restore on dev environment
3. **Monthly**: Download backups to external storage
4. **Quarterly**: Full disaster recovery drill

## License

Part of DeepKit Arsenal - The Sovereign AI Toolkit

**STATUS: PRODUCTION READY // AUTO-PILOT ENGAGED**

#!/bin/bash
set -e

# DeepKit Database Restore Script
# Interactive restoration from automated backups

BACKUP_DIR="./backups"
LOG_FILE="./logs/restore.log"
COMPOSE_FILE="docker-compose.yml"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Print header
echo -e "${CYAN}"
echo "╔════════════════════════════════════════════╗"
echo "║   DeepKit Database Restore Utility        ║"
echo "║   Version 1.0 - The Nexus Era             ║"
echo "╚════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${RED}❌ Backup directory not found: $BACKUP_DIR${NC}"
    exit 1
fi

# List available backups
echo -e "${CYAN}📦 Available Backups:${NC}"
echo ""

BACKUPS=($(find "$BACKUP_DIR" -name "deepkit-*.sql.gz" -type f | sort -r))

if [ ${#BACKUPS[@]} -eq 0 ]; then
    echo -e "${RED}❌ No backups found in $BACKUP_DIR${NC}"
    exit 1
fi

# Display backups with index
for i in "${!BACKUPS[@]}"; do
    BACKUP_FILE="${BACKUPS[$i]}"
    BACKUP_NAME=$(basename "$BACKUP_FILE")
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    BACKUP_DATE=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$BACKUP_FILE" 2>/dev/null || stat -c "%y" "$BACKUP_FILE" 2>/dev/null | cut -d'.' -f1)

    echo -e "${GREEN}[$i]${NC} $BACKUP_NAME"
    echo -e "    📅 Created: $BACKUP_DATE"
    echo -e "    💾 Size: $BACKUP_SIZE"
    echo ""
done

# Prompt user to select backup
echo -e "${YELLOW}Select backup to restore (enter number):${NC}"
read -p "> " SELECTION

# Validate selection
if ! [[ "$SELECTION" =~ ^[0-9]+$ ]] || [ "$SELECTION" -ge ${#BACKUPS[@]} ]; then
    echo -e "${RED}❌ Invalid selection${NC}"
    exit 1
fi

SELECTED_BACKUP="${BACKUPS[$SELECTION]}"
echo ""
echo -e "${CYAN}Selected: $(basename "$SELECTED_BACKUP")${NC}"
echo ""

# Warning prompt
echo -e "${RED}⚠️  WARNING: This will STOP all DeepKit services and OVERWRITE all database data!${NC}"
echo -e "${YELLOW}Are you sure you want to continue? (type 'YES' to confirm):${NC}"
read -p "> " CONFIRMATION

if [ "$CONFIRMATION" != "YES" ]; then
    echo -e "${YELLOW}Restore cancelled${NC}"
    exit 0
fi

log "========================================="
log "Starting database restore from: $(basename "$SELECTED_BACKUP")"
log "========================================="

# Step 1: Stop all services
echo -e "${CYAN}[1/5] Stopping all DeepKit services...${NC}"
log "Stopping Docker services..."
docker-compose -f "$COMPOSE_FILE" down
log "Services stopped"

# Step 2: Start only PostgreSQL
echo -e "${CYAN}[2/5] Starting PostgreSQL...${NC}"
log "Starting PostgreSQL container..."
docker-compose -f "$COMPOSE_FILE" up -d deepkit-store
sleep 5
log "PostgreSQL started"

# Step 3: Restore backup
echo -e "${CYAN}[3/5] Restoring database...${NC}"
log "Decompressing and restoring backup..."

# Get PostgreSQL credentials from .env
source .env

if gunzip -c "$SELECTED_BACKUP" | docker exec -i deepkit-store psql -U "$POSTGRES_USER" -d postgres; then
    echo -e "${GREEN}✅ Database restored successfully${NC}"
    log "Database restore completed successfully"
else
    echo -e "${RED}❌ Database restore failed!${NC}"
    log "ERROR: Database restore failed"
    exit 1
fi

# Step 4: Verify restore
echo -e "${CYAN}[4/5] Verifying restore...${NC}"
log "Verifying database integrity..."

TABLE_COUNT=$(docker exec deepkit-store psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
log "Found $TABLE_COUNT tables in database"

if [ "$TABLE_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Verification passed: $TABLE_COUNT tables found${NC}"
    log "Database verification successful"
else
    echo -e "${YELLOW}⚠️  Warning: Database appears empty${NC}"
    log "WARNING: No tables found in database"
fi

# Step 5: Restart all services
echo -e "${CYAN}[5/5] Restarting all services...${NC}"
log "Restarting all Docker services..."
docker-compose -f "$COMPOSE_FILE" up -d
sleep 10
log "All services restarted"

# Success message
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ Restore Completed Successfully       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Restored from: $(basename "$SELECTED_BACKUP")${NC}"
echo -e "${CYAN}Tables restored: $TABLE_COUNT${NC}"
echo -e "${CYAN}Log file: $LOG_FILE${NC}"
echo ""
log "========================================="
log "Restore completed successfully"
log "========================================="

exit 0

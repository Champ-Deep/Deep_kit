# DeepKit v0.1 → v0.5 Migration Guide

## Overview

DeepKit has been streamlined from **28 services to 8 services** for v0.5, focusing on core functionality and maintainability.

## What Was Removed

### Services Archived (20 services)
All removed services are available in `archive/services/` for reference.

| Service | Reason | Replacement |
|---------|--------|-------------|
| deepkit-core | Duplicate of messenger | Merged into Core API |
| messenger | Rebuilding as Gateway | Gateway service |
| hub | Rebuilding as Core API | Core API service |
| cowork | Duplicate functionality | Merged into Core API |
| calendar | Use n8n instead | n8n workflows |
| champmail | Use n8n instead | n8n SMTP workflow |
| password-manager | External tool | Bitwarden/Vaultwarden |
| marketing360 | Too complex for v0.5 | External tools |
| invoicing | External tool | FreshBooks/QuickBooks |
| api-testing | External tool | Postman/Insomnia |
| time-tracker | Overlap with task-tracker | Task Tracker |
| file-manager | External tool | SFTP/FTP |
| webhook-manager | n8n handles this | n8n workflows |
| super-admin | Portainer exists | Portainer |
| recorder | External tool | OBS |
| qr-generator | n8n tool or external | n8n workflows |
| link-shortener | External tool | bit.ly/tinyurl |
| utm-tracker | External tool | Google Analytics |
| request-tracker | Use task-tracker | Task Tracker |
| deepkit-forms | n8n handles forms | n8n workflows |

### Documentation Archived (47 files)

All old documentation moved to `archive/docs/`.

Kept:
- README.md
- LICENSE
- ARCHITECTURE.md (new)
- DEPLOYMENT.md (to be created)

## What Was Kept

### Essential Services (8 total)

1. **task-tracker** (Port 7718) - ⭐ Star service
   - Gamified task management
   - Database: PostgreSQL
   - Status: Fully working

2. **n8n** (Port 5678) - Workflow automation
   - Email workflows ready
   - Google Calendar integration
   - Custom workflows

3. **backup** - Backup service
   - Database backups
   - File backups

4. **monitoring** (Port 9000) - Portainer
   - Docker container management
   - Already working

5. **automation** - n8n workflows
   - SMTP email
   - Calendar integration

6. **chat** (Port 8080) - Open WebUI
   - Chat interface for Ollama
   - Alternative to Core API chat

7. **ollama** - AI engine (external)
   - Port 11434
   - Local LLM inference

8. **postgresql/redis** - Infrastructure
   - Core databases

### New Services (Phase 2)

9. **gateway** (Port 3333) - Message gateway
   - Telegram/WhatsApp/Web adapters
   - Unified message routing

10. **core-api** (Port 7777) - Core API
    - AI orchestration
    - Tool execution
    - Web UI

11. **opencode** (Port 4096) - AI agent
    - OpenCode Serve integration
    - Advanced tool calling

## How to Restore Archived Services

If you need any archived service:

```bash
# Restore from archive
cp -r archive/services/[service-name] services/

# Restore module
cp archive/modules/[module-name].yml modules/

# Start with docker compose
docker compose -f docker-compose.yml -f modules/[module-name].yml up -d
```

## Database Migration

### Task Tracker
- Database preserved: `tasktracker` in PostgreSQL
- No migration needed - service kept as-is

### Calendar
- Backup created: `archive/backups/calendar-YYYYMMDD.sql`
- To restore: `psql -U deepkit calendar < calendar-YYYYMMDD.sql`

## Configuration Changes

### New Files to Create

1. `modules/opencode.yml` - OpenCode AI service
2. `modules/gateway.yml` - Message gateway (update existing)
3. `modules/core-api.yml` - Core API service
4. `ARCHITECTURE.md` - New architecture documentation
5. `DEPLOYMENT.md` - Deployment guide

### Environment Variables

Add to `.env`:
```env
# OpenCode
OPENCODE_SERVER_PASSWORD=your-secure-password
DEEPKIT_INTERNAL_TOKEN=your-internal-token

# Gateway
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
```

## Breaking Changes

1. **Port Changes**
   - Old hub (3000) → New core-api (7777)
   - Old messenger (3333) → New gateway (3333) - same port, new implementation
   - Task tracker remains at 7718

2. **API Changes**
   - Old messenger API deprecated
   - New unified API at core-api:7777
   - Gateway normalizes all channels

3. **Service Discovery**
   - Portainer handles service discovery
   - No custom port scanner needed

## Migration Steps

1. **Backup data**
   ```bash
   docker exec deepkit-store pg_dump -U deepkit tasktracker > tasktracker-backup.sql
   ```

2. **Stop old services**
   ```bash
   docker compose -f docker-compose.yml -f modules/messenger.yml -f modules/hub.yml down
   ```

3. **Deploy new services**
   ```bash
   ./install.sh --preset minimal
   ```

4. **Verify Task Tracker**
   ```bash
   curl http://localhost:7718/health
   ```

5. **Configure OpenCode**
   - Copy config: `cp -r config/opencode.example config/opencode`
   - Edit: `config/opencode/.opencode.json`

6. **Start new services**
   ```bash
   docker compose -f docker-compose.yml -f modules/opencode.yml -f modules/gateway.yml -f modules/core-api.yml up -d
   ```

## Troubleshooting

### Task Tracker Not Working
- Check database: `docker exec deepkit-store psql -U deepkit -c "\l"`
- Restore from backup: `psql -U deepkit tasktracker < archive/backups/tasktracker-YYYYMMDD.sql`

### Missing Service
- Check archive: `ls archive/services/`
- Restore: `cp -r archive/services/[service] services/`

### Port Conflicts
- Old services may occupy ports
- Run: `docker ps` to check
- Stop old: `docker stop [container-name]`

## Rollback to v0.1

If needed, restore from git:
```bash
git checkout v0.1
docker compose -f docker-compose.yml -f presets/full.yml up -d
```

## Support

For questions about the migration:
1. Check archive/ folder for old files
2. Review ARCHITECTURE.md for new design
3. See docs/ for preserved documentation

---

**Migration completed: $(date)**
**From: v0.1 (28 services)**
**To: v0.5 (8 services + 3 new)**

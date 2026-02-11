# DeepKit Expansion - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Start Core Infrastructure
```bash
# Start PostgreSQL, Redis, and Ollama
docker compose up -d
```

### Step 2: Start the Hub
```bash
# Start the command center
docker compose -f docker-compose.yml -f modules/hub.yml up -d

# Open the Hub
open http://localhost:3000
```

### Step 3: Start Individual Services
```bash
# Start all expansion services
docker compose -f docker-compose.yml \
  -f modules/api-testing.yml \
  -f modules/calendar.yml \
  -f modules/time-tracker.yml \
  -f modules/file-manager.yml \
  -f modules/task-tracker.yml \
  -f modules/password-manager.yml \
  -f modules/marketing360.yml \
  -f modules/webhook-manager.yml \
  -f modules/invoicing.yml \
  -f modules/super-admin.yml \
  up -d
```

---

## 📍 Service URLs Reference

### Command & Control
- **Hub**: http://localhost:3000 ← **Start here!**
- **Super Admin**: http://localhost:3022

### Productivity Suite
- **Calendar**: http://localhost:3014
- **Task Tracker**: http://localhost:3018
- **Time Tracker**: http://localhost:3019

### Business Tools
- **Marketing 360**: http://localhost:3012
- **Invoicing**: http://localhost:3015

### Developer Tools
- **API Testing**: http://localhost:3017
- **Webhook Manager**: http://localhost:3021
- **File Manager**: http://localhost:3020

### Security
- **Password Manager**: http://localhost:3016

---

## 🔑 Required Environment Variables

Create `.env` file in project root:

```bash
# PostgreSQL (required for all services)
POSTGRES_USER=deepkit
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=deepkit

# Password Manager (required)
ENCRYPTION_KEY=<generate 64-character hex string>

# Marketing 360 (optional - only if using external APIs)
GEMINI_API_KEY=your_gemini_api_key
META_ACCESS_TOKEN=your_meta_token
LINKEDIN_ACCESS_TOKEN=your_linkedin_token
TWITTER_API_KEY=your_twitter_key
TWITTER_API_SECRET=your_twitter_secret
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_id
WHATSAPP_ACCESS_TOKEN=your_whatsapp_token
```

### Generate Encryption Key
```bash
# On macOS/Linux
openssl rand -hex 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🧪 Testing Services

### Check Health
```bash
# Test Hub
curl http://localhost:3000/health

# Test API Testing Tool
curl http://localhost:3017/health

# Test all services
for port in 3000 3012 3014 3015 3016 3017 3018 3019 3020 3021 3022; do
  echo "Port $port: $(curl -s http://localhost:$port/health | jq -r .status)"
done
```

### API Examples

#### API Testing Tool
```bash
# Send a test request
curl -X POST http://localhost:3017/api/send \
  -H "Content-Type: application/json" \
  -d '{
    "method": "GET",
    "url": "https://api.github.com/users/github"
  }'
```

#### Calendar
```bash
# Create an event
curl -X POST http://localhost:3014/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Team Meeting",
    "start_time": "2026-02-01T10:00:00Z",
    "end_time": "2026-02-01T11:00:00Z",
    "description": "Weekly sync"
  }'
```

#### Task Tracker
```bash
# Create a task
curl -X POST http://localhost:3018/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Complete project documentation",
    "priority": "high"
  }'

# Get stats
curl http://localhost:3018/api/stats
```

#### Time Tracker
```bash
# Start a timer
curl -X POST http://localhost:3019/api/timers/start \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Working on documentation"
  }'

# Stop the timer
curl -X POST http://localhost:3019/api/timers/stop
```

#### Password Manager
```bash
# Generate a password
curl -X POST http://localhost:3016/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "length": 16,
    "options": {
      "uppercase": true,
      "lowercase": true,
      "numbers": true,
      "symbols": true
    }
  }'
```

#### Marketing 360
```bash
# Create a campaign
curl -X POST http://localhost:3012/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Launch Campaign",
    "type": "email",
    "content": "Exciting news about our new product!"
  }'

# Generate an AI caption
curl -X POST http://localhost:3012/api/generate-caption \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Product launch",
    "platform": "linkedin"
  }'
```

#### Webhook Manager
```bash
# Create a webhook endpoint
curl -X POST http://localhost:3021/api/endpoints \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Webhook",
    "url": "https://example.com/webhook",
    "events": "task.created,task.completed"
  }'

# Trigger an event
curl -X POST http://localhost:3021/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "task.created",
    "payload": {
      "task_id": 123,
      "title": "New task"
    }
  }'
```

#### Invoicing
```bash
# Create a client
curl -X POST http://localhost:3015/api/clients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corp",
    "email": "billing@acme.com"
  }'

# Create an invoice
curl -X POST http://localhost:3015/api/invoices \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": 1,
    "due_date": "2026-03-01",
    "items": [
      {
        "description": "Consulting services",
        "quantity": 10,
        "unit_price": 150.00
      }
    ],
    "tax_rate": 8.5
  }'
```

#### Super Admin
```bash
# Get all services health
curl http://localhost:3022/api/services

# List Docker containers
curl http://localhost:3022/api/docker/containers

# Get system stats
curl http://localhost:3022/api/system/stats

# Restart a container
curl -X POST http://localhost:3022/api/docker/containers/calendar/restart
```

---

## 🎯 Common Workflows

### Workflow 1: Complete Productivity Setup
```bash
# 1. Start infrastructure
docker compose up -d

# 2. Start productivity services
docker compose -f docker-compose.yml \
  -f modules/calendar.yml \
  -f modules/task-tracker.yml \
  -f modules/time-tracker.yml \
  up -d

# 3. Access services
open http://localhost:3014  # Calendar
open http://localhost:3018  # Tasks
open http://localhost:3019  # Time
```

### Workflow 2: Developer Toolkit
```bash
# Start developer services
docker compose -f docker-compose.yml \
  -f modules/api-testing.yml \
  -f modules/webhook-manager.yml \
  -f modules/file-manager.yml \
  up -d

# Access tools
open http://localhost:3017  # API Testing
open http://localhost:3021  # Webhooks
open http://localhost:3020  # Files
```

### Workflow 3: Business Suite
```bash
# Start business services
docker compose -f docker-compose.yml \
  -f modules/marketing360.yml \
  -f modules/invoicing.yml \
  -f modules/calendar.yml \
  up -d

# Access tools
open http://localhost:3012  # Marketing
open http://localhost:3015  # Invoicing
open http://localhost:3014  # Calendar
```

---

## 🔍 Monitoring & Management

### View Logs
```bash
# Specific service
docker logs -f calendar

# All services
docker compose logs -f

# Last 100 lines
docker logs --tail 100 api-testing
```

### Check Status
```bash
# All containers
docker compose ps

# Specific service
docker compose ps calendar

# Resource usage
docker stats
```

### Restart Services
```bash
# Single service
docker compose restart calendar

# All services
docker compose restart

# Remove and rebuild
docker compose down
docker compose up -d --build
```

---

## 🛠️ Troubleshooting

### Service Won't Start

**Check logs**:
```bash
docker logs calendar
```

**Common issues**:
1. Port already in use → Change port in module YAML
2. Database not ready → Wait 30s for PostgreSQL to initialize
3. Missing env vars → Check `.env` file

### Database Connection Issues

**Check PostgreSQL**:
```bash
docker exec -it deepkit-store psql -U deepkit -c "\l"
```

**Manually create database**:
```bash
docker exec -it deepkit-store psql -U deepkit -c "CREATE DATABASE calendar;"
```

### Reset Everything
```bash
# Stop all services
docker compose down

# Remove volumes (CAUTION: deletes all data)
docker compose down -v

# Rebuild and restart
docker compose up -d --build
```

---

## 📊 Performance Tips

### Optimize Resource Usage
```bash
# Limit container memory
docker compose -f docker-compose.yml \
  -f modules/calendar.yml \
  up -d --scale calendar=1 --memory="512m"
```

### Database Optimization
```bash
# Connect to PostgreSQL
docker exec -it deepkit-store psql -U deepkit

# Check database sizes
SELECT datname, pg_size_pretty(pg_database_size(datname)) FROM pg_database;

# Vacuum databases
VACUUM ANALYZE;
```

### Clean Up
```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove everything unused
docker system prune -a
```

---

## 🎨 Customization

### Change Ports

Edit module YAML files:
```yaml
# modules/calendar.yml
services:
  calendar:
    ports:
      - "3014:3014"  # Change to "8080:3014" for port 8080
```

### Customize Database
```yaml
# modules/calendar.yml
environment:
  - POSTGRES_DB=my_custom_calendar_db
```

### Add Custom Environment Variables
```yaml
# modules/marketing360.yml
environment:
  - CUSTOM_VAR=my_value
```

---

## 🚀 Production Deployment

### Security Checklist
- [ ] Change default PostgreSQL password
- [ ] Generate unique ENCRYPTION_KEY
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall rules
- [ ] Set up automated backups
- [ ] Enable authentication on all services
- [ ] Use secrets management (Docker secrets)

### Backup Strategy
```bash
# Backup PostgreSQL
docker exec deepkit-store pg_dumpall -U deepkit > backup.sql

# Backup all volumes
docker run --rm -v deepkit-store-data:/data \
  -v $(pwd):/backup alpine tar czf /backup/data-backup.tar.gz /data

# Restore
cat backup.sql | docker exec -i deepkit-store psql -U deepkit
```

---

## 📚 Additional Resources

- **Full Documentation**: See [EXPANSION-SUMMARY.md](EXPANSION-SUMMARY.md)
- **Module Details**: See [docs/MODULES.md](docs/MODULES.md)
- **API Reference**: Each service has `/api` prefix
- **Health Checks**: All services have `/health` endpoint

---

## 💬 Support

**Having issues?**
1. Check logs: `docker logs <service-name>`
2. Verify health: `curl http://localhost:<port>/health`
3. Check Hub status: http://localhost:3000
4. Review Super Admin: http://localhost:3022

**Need help?**
- Email: deep@championsmail.com
- Check service-specific logs for detailed error messages

---

**Happy Building!** 🚀

*"Your Personal AI. Locally Contained. Locally Empowered."*

# DeepKit Testing Plan - Phases 1 & 2.1 Foundation

**Status**: 🧪 TESTING IN PROGRESS
**Date**: 2026-01-31
**Goal**: Verify all implemented features before continuing Phase 2

---

## Testing Checklist

### Phase 1.1: Hub Frontend Integration ✅

**What to Test**:
- [ ] Hub frontend builds successfully
- [ ] Hub serves React app at http://localhost:7777
- [ ] Live service discovery displays all running services
- [ ] Hardware metrics (CPU/RAM/GPU) update in real-time
- [ ] Auto-refresh works (30-second interval)
- [ ] Service cards show correct status (ONLINE/OFFLINE)
- [ ] Clicking service card opens service in new tab
- [ ] CRT aesthetic preserved (scanlines, phosphor glow, mascot)

**Test Commands**:
```bash
# 1. Build Hub frontend
cd /Users/champion/DeepKit/services/hub/frontend
npm install
npm run build

# 2. Start Hub service
cd /Users/champion/DeepKit
docker-compose up -d deepkit-hub

# 3. Check logs
docker logs deepkit-hub

# 4. Open Hub in browser
open http://localhost:7777
```

**Expected Results**:
- Frontend builds with no errors
- Hub loads in <2 seconds
- Service cards show real-time status
- Hardware metrics display percentages
- Status updates every 30 seconds

---

### Phase 1.2: Brain Tool Execution 🤖

**What to Test**:
- [ ] Brain service starts successfully
- [ ] Tool executor loaded with registry
- [ ] Ollama connection works
- [ ] Brain can execute task tracker tool calls
- [ ] Multi-turn conversations work
- [ ] Tool execution logs returned in API response

**Test Commands**:
```bash
# 1. Start Brain service
docker-compose up -d deepkit-brain

# 2. Check Brain health
curl http://localhost:11500/health

# 3. Test available tools
curl http://localhost:11500/api/tools | jq

# 4. Test chat with tool execution
curl -X POST http://localhost:11500/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Create a task: Test the new backup system"
  }' | jq
```

**Expected Results**:
```json
{
  "response": "I've created a task for you...",
  "conversationId": 1,
  "toolCalls": [
    {
      "tool": "task_tracker",
      "method": "create_task",
      "params": {"title": "Test the new backup system"}
    }
  ],
  "executionLog": [
    {
      "tool": "task_tracker",
      "method": "create_task",
      "success": true,
      "executionTime": 234
    }
  ]
}
```

---

### Phase 1.3: Backup System 💾

**What to Test**:
- [ ] Backup service starts successfully
- [ ] First backup runs immediately on startup
- [ ] Backup file created in ./backups directory
- [ ] Backup file is gzipped and <100MB
- [ ] Hub dashboard shows backup status
- [ ] Restore script lists available backups
- [ ] Restore script can restore a backup (test on dev only!)

**Test Commands**:
```bash
# 1. Start backup service
docker-compose -f docker-compose.yml -f modules/backup.yml up -d deepkit-backup

# 2. Wait for first backup (runs immediately)
sleep 30

# 3. Check backup created
ls -lh ./backups/

# 4. View backup logs
docker logs deepkit-backup

# 5. Check backup status in Hub
curl http://localhost:7777/api/backups/status | jq

# 6. Verify backup file integrity
gunzip -t ./backups/deepkit-*.sql.gz && echo "✅ Backup file is valid"

# 7. Test restore script (interactive - will prompt)
./scripts/restore-backup.sh
# (Press Ctrl+C to cancel without restoring)
```

**Expected Results**:
- Backup service running with no errors
- Backup file exists: `./backups/deepkit-YYYYMMDD-HHMM.sql.gz`
- Backup logs show success: "✅ Backup successful"
- Hub API returns `"status": "HEALTHY"`
- Backup file passes integrity check
- Restore script lists backups correctly

**Hub Dashboard Check**:
```bash
# Open Hub and check Backup_Status widget
open http://localhost:7777

# Should show:
# - Status: HEALTHY (green)
# - Last backup: "X.Xh ago"
# - Size: XX.XX MB
# - Total backups: X
# - Retention: 7 days
```

---

### Phase 2.1: Task Tracker Migration 📝

**What to Test**:
- [ ] Migration script runs without errors
- [ ] Users table created
- [ ] user_id columns added to tasks/projects/user_stats
- [ ] Recurring task columns added to tasks
- [ ] Default admin user created
- [ ] Existing data migrated to admin user
- [ ] Task tracker dependencies installed

**Test Commands**:
```bash
# 1. Ensure PostgreSQL is running
docker-compose up -d deepkit-store

# 2. Install task tracker dependencies
cd /Users/champion/DeepKit/services/task-tracker
npm install

# 3. Run database migration
cd migrations
./run-migration.sh

# 4. Verify migration success
docker exec deepkit-store psql -U deepkit -d tasktracker -c "\dt"
# Should show: users, projects, tasks, user_stats, achievements, user_achievements

# 5. Check users table
docker exec deepkit-store psql -U deepkit -d tasktracker -c "SELECT username, email FROM users;"
# Should show admin user

# 6. Check tasks schema
docker exec deepkit-store psql -U deepkit -d tasktracker -c "\d tasks"
# Should include: user_id, is_recurring, recurrence_rule, parent_task_id, instance_date

# 7. Verify data migration
docker exec deepkit-store psql -U deepkit -d tasktracker -c "SELECT COUNT(*) as migrated_tasks FROM tasks WHERE user_id = (SELECT id FROM users WHERE username = 'admin');"
```

**Expected Results**:
```
Migration Complete
Users: 1
Projects: X
Tasks: X
```

**Manual Database Verification**:
```sql
-- Check schema
\d tasks
-- Should show new columns:
-- user_id | integer | not null
-- is_recurring | boolean | default false
-- recurrence_rule | text
-- parent_task_id | integer
-- instance_date | date

-- Verify admin user
SELECT * FROM users WHERE username = 'admin';
-- Should return 1 row with email admin@deepkit.local

-- Check user_achievements table
\d user_achievements
-- Should exist with user_id and achievement_id foreign keys
```

---

## Integration Tests

### Test 1: Hub → Brain → Task Tracker Flow

**Scenario**: Create a task via Brain chat, verify in Hub dashboard

```bash
# 1. Create task via Brain
curl -X POST http://localhost:11500/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Create a high priority task: Review deployment checklist"}' | jq

# 2. Verify task created
curl http://localhost:7718/api/tasks | jq '.[] | select(.title | contains("deployment"))'

# 3. Check Hub event bus
curl http://localhost:7777/api/events/recent | jq '.[] | select(.event == "TASK_CREATED")'
```

**Expected**: Task created successfully, visible in task tracker, event published to Hub

### Test 2: Backup → Restore → Verify

**⚠️ WARNING: Only run on development environment!**

```bash
# 1. Create test data
curl -X POST http://localhost:7718/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Test task before backup", "priority": "high"}'

# 2. Trigger backup
docker exec deepkit-backup /usr/local/bin/backup.sh

# 3. Verify backup file created
ls -lh ./backups/ | tail -1

# 4. Delete test data (simulate data loss)
docker exec deepkit-store psql -U deepkit -d tasktracker -c "DELETE FROM tasks WHERE title LIKE 'Test task%';"

# 5. Run restore
./scripts/restore-backup.sh
# Select most recent backup, type YES to confirm

# 6. Verify data restored
curl http://localhost:7718/api/tasks | jq '.[] | select(.title | contains("Test task"))'
```

**Expected**: Test task deleted, then successfully restored from backup

### Test 3: Multi-Service Health Check

```bash
# Check all critical services
echo "=== DeepKit Service Health Check ==="
echo ""

echo "Hub:"
curl -s http://localhost:7777/health | jq -r '.status'

echo "Brain:"
curl -s http://localhost:11500/health | jq -r '.service'

echo "Task Tracker:"
curl -s http://localhost:7718/health | jq -r '.status'

echo "PostgreSQL:"
docker exec deepkit-store pg_isready -U deepkit && echo "✅ Ready" || echo "❌ Not ready"

echo "Redis:"
docker exec deepkit-cache redis-cli ping

echo ""
echo "=== Service Discovery ==="
curl -s http://localhost:7777/api/services/health | jq '.summary'
```

**Expected**: All services return healthy status

---

## Performance Tests

### Hub Load Time
```bash
# Test Hub page load time
time curl -s http://localhost:7777 > /dev/null
# Should complete in < 2 seconds
```

### Brain Tool Execution Time
```bash
# Test Brain response time with tool execution
time curl -s -X POST http://localhost:11500/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the current time?"}' > /dev/null
# Should complete in < 5 seconds (depends on Ollama model)
```

### Backup Creation Time
```bash
# Test backup speed
time docker exec deepkit-backup /usr/local/bin/backup.sh
# Should complete in < 60 seconds for typical install
```

---

## Troubleshooting Guide

### Hub Not Loading

**Symptom**: http://localhost:7777 shows 404 or blank page

**Fix**:
```bash
# Rebuild frontend
cd /Users/champion/DeepKit/services/hub/frontend
npm run build

# Restart Hub
docker restart deepkit-hub

# Check logs
docker logs deepkit-hub
```

### Brain Tool Execution Fails

**Symptom**: Brain responds but doesn't execute tools

**Fix**:
```bash
# Check Brain logs
docker logs deepkit-brain

# Verify tool registry loaded
curl http://localhost:11500/api/tools | jq 'length'
# Should return > 0

# Check Ollama connection
curl http://localhost:11434/api/tags
# Should return list of models

# Restart Brain
docker restart deepkit-brain
```

### Backup Service Not Running

**Symptom**: No backups created

**Fix**:
```bash
# Check service status
docker ps | grep deepkit-backup

# Start backup service
docker-compose -f docker-compose.yml -f modules/backup.yml up -d deepkit-backup

# Check logs
docker logs deepkit-backup

# Verify PostgreSQL connection
docker exec deepkit-backup psql -h deepkit-store -U deepkit -c "SELECT NOW();"
```

### Migration Fails

**Symptom**: run-migration.sh errors out

**Fix**:
```bash
# Check PostgreSQL is running
docker ps | grep deepkit-store

# Verify database exists
docker exec deepkit-store psql -U deepkit -l | grep tasktracker

# Manual migration
cd /Users/champion/DeepKit/services/task-tracker/migrations
cat 001_add_multiuser_and_recurring.sql | docker exec -i deepkit-store psql -U deepkit -d tasktracker

# Check for errors
echo $?  # Should be 0
```

---

## Success Criteria

### Phase 1 Complete When:
- ✅ Hub loads with live service data in <2s
- ✅ Brain executes at least 1 tool successfully
- ✅ Backup service creates backups every 6 hours
- ✅ Hub dashboard shows all 3 widgets (System Status, Hardware Pulse, Backup Status)
- ✅ All services show HEALTHY in service discovery

### Phase 2.1 Foundation Complete When:
- ✅ Migration runs without errors
- ✅ Users table exists with admin user
- ✅ All tables have user_id columns
- ✅ Tasks table has recurring fields
- ✅ Dependencies installed (jwt, bcrypt, rrule)

---

## Next Steps After Testing

**If All Tests Pass**:
- Continue with Phase 2.1 full implementation (database functions, API updates)
- OR move to Phase 2.2 (Calendar) or 2.3 (Marketing360)

**If Tests Fail**:
- Review error logs
- Fix issues
- Re-test
- Update documentation with findings

---

## Test Execution Log

Run these tests and document results:

```
[ ] Phase 1.1: Hub Frontend - Status: _____
[ ] Phase 1.2: Brain Tools - Status: _____
[ ] Phase 1.3: Backups - Status: _____
[ ] Phase 2.1: Migration - Status: _____
[ ] Integration Test 1 - Status: _____
[ ] Integration Test 2 - Status: _____
[ ] Integration Test 3 - Status: _____
```

**Testing Started**: ___________
**Testing Completed**: ___________
**Overall Status**: ___________

---

*The Silent Admin // Testing Protocol Engaged*

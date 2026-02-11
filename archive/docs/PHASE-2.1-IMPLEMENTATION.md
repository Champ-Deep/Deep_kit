# Phase 2.1 Implementation: Multi-User & Recurring Tasks

**Status**: 🚧 IN PROGRESS
**Target**: Transform task tracker from single-user to multi-tenant with recurring task support

---

## Implementation Progress

### ✅ Completed

1. **Dependency Updates** ([package.json](./package.json))
   - Added `jsonwebtoken` (^9.0.2) for JWT authentication
   - Added `bcrypt` (^5.1.1) for password hashing
   - Added `rrule` (^2.7.2) for recurrence rule parsing
   - Added `uuid` (^9.0.1) for unique identifiers
   - Added TypeScript type definitions for all new packages

2. **Database Migration** ([migrations/001_add_multiuser_and_recurring.sql](./migrations/001_add_multiuser_and_recurring.sql))
   - Created `users` table with authentication fields
   - Added `user_id` foreign keys to: `projects`, `tasks`, `user_stats`
   - Created `user_achievements` junction table (many-to-many)
   - Added recurring task fields to `tasks`:
     - `is_recurring` (BOOLEAN)
     - `recurrence_rule` (TEXT, stores rrule)
     - `parent_task_id` (INTEGER, links instances)
     - `instance_date` (DATE, for specific occurrences)
   - Migrated existing data to default admin user
   - Created migration runner script

### 🚧 In Progress

3. **Authentication System**
   - JWT middleware for protected routes
   - User registration/login endpoints
   - Password hashing with bcrypt
   - Token generation and validation

4. **Multi-User Database Functions**
   - User CRUD operations
   - Scoped queries (filter by user_id)
   - Per-user stats tracking
   - Per-user achievement unlocking

5. **Recurring Task Engine**
   - rrule parsing and instance generation
   - Skip/complete instance logic
   - Future occurrence calculation
   - Parent task management

6. **Event Bus Enhancements**
   - `TASK_COMPLETED` event (for streaks)
   - `ACHIEVEMENT_UNLOCKED` event (for notifications)
   - `TASK_DUE` event (1 hour before deadline)

### 📋 Pending

7. **API Route Updates**
   - Add auth middleware to protected endpoints
   - User registration: `POST /api/auth/register`
   - User login: `POST /api/auth/login`
   - Recurring task endpoints:
     - `POST /api/tasks/:id/skip` (skip next occurrence)
     - `GET /api/tasks/:id/instances` (list future occurrences)
   - Update all queries to filter by `req.user.id`

8. **Frontend UI Updates**
   - Login/register form
   - Recurrence rule UI (frequency, interval, until date)
   - User profile display
   - Per-user task isolation

---

## Architecture Changes

### Before (Single-User)
```
tasks (no user_id)
  └─ Hardcoded to user_stats.id = 1
  └─ Global queries (SELECT * FROM tasks)
  └─ No authentication
```

### After (Multi-User)
```
users
  ├─ projects (user_id FK)
  ├─ tasks (user_id FK)
  │   ├─ Recurring parent tasks (is_recurring=true)
  │   └─ Recurring instances (parent_task_id FK)
  ├─ user_stats (user_id FK)
  └─ user_achievements (many-to-many junction)

Authentication: JWT Bearer Tokens
Queries: Scoped by req.user.id from JWT
```

---

## Database Schema Changes

### New `users` Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Updated `tasks` Table
```sql
ALTER TABLE tasks ADD COLUMN:
  - user_id INTEGER NOT NULL REFERENCES users(id)
  - is_recurring BOOLEAN DEFAULT false
  - recurrence_rule TEXT
  - parent_task_id INTEGER REFERENCES tasks(id)
  - instance_date DATE
```

### New `user_achievements` Table
```sql
CREATE TABLE user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    achievement_id INTEGER NOT NULL REFERENCES achievements(id),
    unlocked_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);
```

---

## Authentication Flow

### Registration
```
POST /api/auth/register
{
  "username": "john",
  "email": "john@example.com",
  "password": "secure_password",
  "full_name": "John Doe"
}

Response:
{
  "user": { id, username, email, full_name },
  "token": "eyJhbGciOiJIUzI1..."
}
```

### Login
```
POST /api/auth/login
{
  "username": "john",
  "password": "secure_password"
}

Response:
{
  "user": { id, username, email, full_name },
  "token": "eyJhbGciOiJIUzI1..."
}
```

### Protected Routes
```
GET /api/tasks
Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1...

Middleware extracts user_id from token
Query: SELECT * FROM tasks WHERE user_id = <extracted_id>
```

---

## Recurring Tasks Implementation

### rrule Format
```javascript
import { RRule } from 'rrule';

// Daily task
const rule = new RRule({
  freq: RRule.DAILY,
  interval: 1,
  dtstart: new Date('2026-01-31')
});

// Stored in DB as string:
"FREQ=DAILY;INTERVAL=1;DTSTART=20260131T000000Z"
```

### Create Recurring Task
```
POST /api/tasks
{
  "title": "Daily Standup",
  "priority": "high",
  "is_recurring": true,
  "recurrence_rule": "FREQ=DAILY;INTERVAL=1"
}

Response creates parent task (is_recurring=true)
Instances generated on-demand when queried
```

### Skip Instance
```
POST /api/tasks/123/skip
{
  "instance_date": "2026-02-01"
}

Creates a task instance with status='skipped'
Future queries exclude this date
```

### List Future Instances
```
GET /api/tasks/123/instances?from=2026-02-01&to=2026-02-28

Response:
{
  "parent": { task object },
  "instances": [
    { "date": "2026-02-01", "status": "pending" },
    { "date": "2026-02-02", "status": "pending" },
    ...
  ]
}
```

---

## Event Bus Enhancements

### New Events

**TASK_COMPLETED**
```json
{
  "event": "TASK_COMPLETED",
  "source": "task-tracker",
  "timestamp": "2026-01-31T12:00:00Z",
  "payload": {
    "task_id": 123,
    "user_id": 1,
    "points_earned": 3,
    "streak": 5
  }
}
```

**ACHIEVEMENT_UNLOCKED**
```json
{
  "event": "ACHIEVEMENT_UNLOCKED",
  "source": "task-tracker",
  "timestamp": "2026-01-31T12:00:00Z",
  "payload": {
    "achievement_id": 2,
    "user_id": 1,
    "name": "Getting Started",
    "description": "Complete 10 tasks"
  }
}
```

**TASK_DUE** (cron job checks every hour)
```json
{
  "event": "TASK_DUE",
  "source": "task-tracker",
  "timestamp": "2026-01-31T12:00:00Z",
  "payload": {
    "task_id": 123,
    "user_id": 1,
    "title": "Submit report",
    "due_in_minutes": 60
  }
}
```

---

## Migration Instructions

### 1. Run Database Migration
```bash
cd /Users/champion/DeepKit/services/task-tracker/migrations
./run-migration.sh
```

### 2. Rebuild Docker Container
```bash
cd /Users/champion/DeepKit
docker-compose build deepkit-task-tracker
docker-compose up -d deepkit-task-tracker
```

### 3. Verify Migration
```bash
# Check users table
docker exec deepkit-store psql -U deepkit -d tasktracker -c "SELECT * FROM users;"

# Check updated schema
docker exec deepkit-store psql -U deepkit -d tasktracker -c "\d tasks"
```

### 4. Test Authentication
```bash
# Login as admin (password: admin)
curl -X POST http://localhost:7718/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'

# Use token for authenticated requests
curl http://localhost:7718/api/tasks \
  -H "Authorization: Bearer <token_from_login>"
```

---

## Default Admin User

**Credentials** (for testing):
- Username: `admin`
- Password: `admin`
- Email: `admin@deepkit.local`

**⚠️ SECURITY**: Change password immediately in production!

```bash
# Change admin password via API (after login)
curl -X PATCH http://localhost:7718/api/users/me/password \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"current_password":"admin","new_password":"secure_password_here"}'
```

---

## Testing Checklist

### Multi-User
- [ ] Register new user
- [ ] Login returns valid JWT
- [ ] User A cannot see User B's tasks
- [ ] User stats tracked separately
- [ ] Achievements unlocked per-user

### Recurring Tasks
- [ ] Create daily recurring task
- [ ] Generate future instances (next 30 days)
- [ ] Complete instance marks only that occurrence
- [ ] Skip instance excludes from future queries
- [ ] Parent task updates cascade to instances

### Event Bus
- [ ] TASK_COMPLETED published on completion
- [ ] ACHIEVEMENT_UNLOCKED published on unlock
- [ ] TASK_DUE published 1 hour before deadline
- [ ] Events visible in Hub dashboard firehose

---

## Next Files to Implement

1. **src/middleware/auth.ts** - JWT authentication middleware
2. **src/services/database.ts** - Update with user functions
3. **src/services/recurrence.ts** - NEW: rrule instance generator
4. **src/routes/api-routes.ts** - Add auth middleware, new endpoints
5. **src/routes/auth-routes.ts** - NEW: registration/login
6. **src/types/index.ts** - Add User interface

---

## Success Criteria

Phase 2.1 complete when:
- ✅ Multi-user authentication working
- ✅ All queries scoped by user_id
- ✅ Recurring tasks create instances correctly
- ✅ Skip/complete instance logic functional
- ✅ Achievement notifications publish to event bus
- ✅ Frontend UI updated for multi-user
- ✅ Default admin user accessible

---

*Status: Ready for Core Implementation*
*Next: Create auth middleware and update database functions*

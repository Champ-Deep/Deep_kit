# DeepKit Messenger — Tool Reference

Complete guide to all 9 available tools and their usage patterns.

---

## Tool Execution Model

DeepKit uses **pattern matching** for instant tool routing:

1. User sends message → AgentCore analyzes intent
2. Pattern match found → Execute tool directly (4-300ms)
3. No pattern match → LLM chat fallback (30-60s)

**Pattern matching rules** are defined in `src/core/AgentCore.js` (`detectToolIntent` method).

---

## 1. task_tracker

**Purpose**: Create, list, update, and complete tasks

**Storage**: PostgreSQL (`agent_tasks` table)

**Pattern Examples**:
- `"List my tasks"`
- `"Show all tasks"`
- `"Create a task called Deploy to production"`
- `"Add a task: Write documentation"`
- `"New task titled Fix bug in auth"`

**Actions**:
- **list**: Show all tasks
- **create**: Add new task with title
- **update**: Modify task status/priority (future)
- **complete**: Mark task as done (future)

**Response Format**:
```
2 task(s) in the Arsenal:
- [8fcaa0dd] Deploy WhatsApp agent (medium, pending)
- [732879cb] First Message Tool Test (medium, pending)
```

**Implementation**: `src/tools/deepkit/task_tracker.js`

---

## 2. notes

**Purpose**: Save, search, and list quick notes

**Storage**: PostgreSQL (`agent_notes` table)

**Pattern Examples**:
- `"Save a note: Meeting at 3pm tomorrow"`
- `"Remember: API keys are in .env file"`
- `"Jot down: Call John about the project"`
- `"List my notes"`
- `"Search notes for meeting"`

**Actions**:
- **save**: Create new note with title + content
- **list**: Show all notes
- **search**: Find notes by keyword (future)

**Response Format**:
```
1 note(s):
- [abc123] Meeting at 3pm: Meeting at 3pm tomorrow
```

**Implementation**: `src/tools/deepkit/notes.js`

---

## 3. system_info

**Purpose**: Report CPU, memory, disk, and uptime stats

**Data Source**: Node.js `os` module (host system metrics)

**Pattern Examples**:
- `"System status"`
- `"How's the server"`
- `"CPU usage"`
- `"Memory stats"`
- `"Disk space"`

**Response Format**:
```json
{
  "cpu": {
    "cores": 8,
    "load_avg": [1.95, 2.12, 2.05],
    "model": "Apple M1"
  },
  "memory": {
    "total": 16384,
    "used": 8500,
    "percent": "52%"
  },
  "disk": {
    "total": 500,
    "used": 250,
    "free": 250,
    "percent": "50%"
  },
  "uptime": "5h 23m 45s"
}
```

**Implementation**: `src/tools/deepkit/system_info.js`

---

## 4. health_check

**Purpose**: Check service status (Postgres, Ollama, n8n, AgentCore)

**Pattern Examples**:
- `"Health check"`
- `"Is Postgres running"`
- `"What's running"`
- `"Service status"`

**Response Format**:
```json
{
  "postgres": true,
  "ollama": true,
  "n8n": false,
  "agentCore": "enabled",
  "status": "degraded"  // healthy, degraded, or unhealthy
}
```

**Status Logic**:
- **healthy**: All services connected
- **degraded**: Some services offline (n8n optional)
- **unhealthy**: Critical services down (Postgres or Ollama)

**Implementation**: `src/tools/deepkit/health_check.js`

---

## 5. calendar

**Purpose**: Manage events and schedule

**Storage**: External Calendar service (`deepkit-calendar:7714`)

**Pattern Examples**:
- `"Today's schedule"`
- `"This week's events"`
- `"Schedule a meeting: Team standup tomorrow at 10am"`

**Actions**:
- **today**: Show today's events
- **week**: Show this week's events
- **create**: Add new event

**Response Format**:
```
2 event(s):
- Team standup (2026-02-04 10:00)
- Code review session (2026-02-04 14:00)
```

**Implementation**: `src/tools/deepkit/calendar.js`

---

## 6. n8n_trigger

**Purpose**: Fire n8n workflow webhooks

**Pattern Examples**:
- `"Trigger workflow send-email"`
- `"Run automation backup-database"`
- `"Execute n8n workflow weekly-report"`

**Actions**:
- **trigger**: Fire webhook with workflow ID

**Response Format**:
```
Triggered n8n workflow: send-email
Webhook URL: http://n8n:5678/webhook/send-email
Status: 200 OK
```

**Implementation**: `src/tools/deepkit/n8n_trigger.js`

**Note**: Requires n8n container to be running with webhooks configured.

---

## 7. file_ops

**Purpose**: Read, write, list, and delete files on host system

**Security**: Whitelist-based access control

**Allowed Directories**:
- `/tmp`
- `/app` (container workspace)
- User home directory
- `/Users/champion/DeepKit`

**Blocked Paths**:
- `/etc/passwd`, `/etc/shadow`
- `/.ssh`
- `/root`

**Pattern Examples**:
- `"Read file /tmp/test.txt"`
- `"List files in /tmp"`
- `"Write to file /tmp/output.txt Hello World"`

**Actions**:
- **read**: Read file content (truncated at 1000 chars for utf8)
- **write**: Write content to file
- **list**: List directory contents (files + directories)
- **delete**: Remove file or directory
- **stat**: Get file metadata (size, dates, permissions)

**Response Format** (read):
```json
{
  "path": "/tmp/test.txt",
  "content": "Hello World",
  "size": 11,
  "encoding": "utf8",
  "truncated": false
}
```

**Response Format** (list):
```json
{
  "path": "/tmp",
  "files": [
    {"name": "test.txt", "size": 11, "modified": "2026-02-04T01:00:00Z"}
  ],
  "directories": [],
  "total": 1
}
```

**Implementation**: `src/tools/deepkit/file_ops.js`

---

## 8. web_fetch

**Purpose**: Download content from URLs (HTML, JSON, text)

**Pattern Examples**:
- `"Fetch https://api.github.com/users/octocat"`
- `"Get https://httpbin.org/json"`
- `"Download https://example.com"`

**Supported Methods**:
- GET (default)
- POST (with body parameter)
- PUT, DELETE

**Limits**:
- Max timeout: 60 seconds
- Max content size: 10MB
- Response truncation: 5000 chars

**Response Format**:
```json
{
  "url": "https://httpbin.org/json",
  "method": "GET",
  "status": 200,
  "statusText": "OK",
  "contentType": "application/json",
  "contentLength": 429,
  "body": "{...json content...}",
  "truncated": false,
  "duration": "1297ms"
}
```

**Implementation**: `src/tools/deepkit/web_fetch.js`

---

## 9. process_control

**Purpose**: List processes, execute commands, Docker management

**Security**: Whitelist-based command execution

**Allowed Commands**:
- `docker`
- `npm`, `node`
- `python`, `python3`
- `git`

**Blocked Patterns**:
- `rm -rf`
- `sudo`
- `shutdown`, `reboot`
- Fork bombs

**Pattern Examples**:
- `"docker ps"`
- `"docker logs deepkit-messenger"`
- `"list processes"`

**Actions**:
- **list**: Show running processes (`ps aux`)
- **exec**: Execute whitelisted command
- **docker_ps**: List running containers
- **docker_logs**: Show container logs (last 20 lines)
- **docker_stats**: Show container resource usage

**Response Format** (docker_ps):
```json
{
  "count": 3,
  "containers": [
    {"name": "deepkit-messenger", "status": "Up 2 hours", "ports": "0.0.0.0:51000->3333/tcp"},
    {"name": "deepkit-engine", "status": "Up 2 hours", "ports": "0.0.0.0:51434->11434/tcp"},
    {"name": "deepkit-store", "status": "Up 2 hours", "ports": "0.0.0.0:5432->5432/tcp"}
  ]
}
```

**Implementation**: `src/tools/deepkit/process_control.js`

**Note**: Docker CLI must be available inside the container (currently not installed, tool will return "command not found").

---

## Tool Development Guide

### Adding a New Tool

1. **Create tool file** in `src/tools/deepkit/`

```javascript
// src/tools/deepkit/my_tool.js
module.exports = {
  definition: {
    type: 'function',
    function: {
      name: 'my_tool',
      description: 'What it does',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['action1', 'action2'],
            description: 'Action to perform'
          }
        },
        required: ['action']
      }
    }
  },

  async execute(args, context) {
    const { action } = args;
    const { storage, userId, channel } = context;

    try {
      // Implementation
      return {
        success: true,
        message: 'Action completed',
        data: { /* results */ }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};
```

2. **Add pattern matching** in `src/core/AgentCore.js` (`detectToolIntent` method)

```javascript
// In detectToolIntent()
if (msg.match(/(?:pattern|keywords)/i)) {
  return { tool: 'my_tool', args: { action: 'action1' } };
}
```

3. **Rebuild and test**

```bash
docker compose build --no-cache
docker compose up -d

# Test
curl -X POST http://localhost:51000/api/chat \
  -d '{"message":"trigger pattern","from":"test"}'
```

### Tool Response Format

All tools should return:
```javascript
{
  success: true,      // boolean
  message: "...",     // string (summary)
  data: { ... }       // object (details)
}
```

Or on error:
```javascript
{
  success: false,
  error: "Error message"
}
```

### Tool Context

Tools receive a `context` object:
```javascript
{
  storage: DeepKitStorage,  // Postgres access
  userId: string,            // User ID
  channel: string            // Channel (api, whatsapp, cli)
}
```

---

## Performance Benchmarks

| Tool | Average Response Time |
|------|----------------------|
| task_tracker (list) | 20-35ms |
| task_tracker (create) | 5-10ms |
| notes (save) | 20-25ms |
| system_info | 15-20ms |
| health_check | 250-300ms |
| file_ops (list) | 30-40ms |
| web_fetch | 1-5 seconds |
| process_control | 1-2 seconds |
| LLM chat fallback | 30-60 seconds |

**Why pattern matching is fast**: No LLM inference, direct regex match → instant tool execution.

---

## Future Tools (Planned)

- **email**: Send emails via SMTP/SendGrid
- **sms**: Send SMS via Twilio
- **slack**: Post to Slack channels
- **notion**: Create/update Notion pages
- **github**: Create issues, PRs
- **calendar_sync**: Sync with Google Calendar
- **reminder**: Set time-based reminders
- **search**: Web search via SearxNG

---

**Tool Count**: 9 | **Pattern Match Rate**: ~90% | **Avg Response**: 20-300ms

# DeepKit Messenger — Deployment Guide

**The Sovereign Agent Stack**: Local AI agent controllable via WhatsApp or web chat

---

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd deepkit-messenger
   ```

2. **Start core services** (Postgres + Ollama + Messenger)
   ```bash
   docker compose up -d
   ```

3. **Access the web UI**
   ```
   Open: http://localhost:51000
   ```

4. **Test the agent**
   - Type: `"List my tasks"`
   - Type: `"System status"`
   - Type: `"Save a note: Testing DeepKit"`

---

## System Requirements

- **Docker Desktop** (Mac/Linux/Windows)
- **RAM**: 8GB minimum, 16GB recommended
- **Disk**: 20GB free space
- **CPU**: 4 cores minimum (8 cores recommended for Ollama)

---

## Architecture

### 3-Container Stack

| Container | Purpose | Port | Internal Port |
|-----------|---------|------|---------------|
| **deepkit-messenger** | Agent + Web UI | 51000 | 3333 |
| **deepkit-engine** (Ollama) | Local LLM (llama3.2) | 51434 | 11434 |
| **deepkit-store** (Postgres) | Data persistence | 5432 | 5432 |

**Design Philosophy**: Minimal footprint, maximum functionality. Only 3 containers running perpetually.

---

## Tool Arsenal (9 Tools)

### Core Productivity
- **task_tracker**: Create, list, update tasks (Postgres-backed)
- **notes**: Save, search, list notes
- **calendar**: Manage events and schedule

### System Management
- **system_info**: CPU, memory, disk stats
- **health_check**: Service status monitoring
- **process_control**: List processes, Docker management

### External Integration
- **n8n_trigger**: Fire automation workflows (n8n webhooks)
- **web_fetch**: Download content from URLs
- **file_ops**: Read/write/list files (with security whitelist)

---

## Usage

### Web Chat UI

Access: `http://localhost:51000`

**Features**:
1. **Chat Interface**: Message input + response display
2. **Tool Execution Log**: Live view of which tools fire
3. **Service Dashboard**: Real-time health indicators (Postgres/Ollama/n8n/AgentCore)
4. **Conversation History**: Persistent storage in localStorage

**Keyboard Shortcuts**:
- `Enter`: Send message
- `Ctrl+L`: Clear conversation history

### API Endpoint

```bash
# Send a message
curl -X POST http://localhost:51000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"List my tasks","from":"user-id"}'

# Response format
{
  "success": true,
  "response": "1 task found: Deploy WhatsApp agent",
  "metadata": {
    "duration": "35ms",
    "tool_used": "task_tracker",
    "tool_args": {"action":"list"},
    "tools_available": ["task_tracker", "system_info", ...]
  }
}
```

### WhatsApp Integration (Optional)

**Webhook endpoint**: `POST /webhook/whatsapp`

See [WhatsApp Integration Guide](#whatsapp-setup) below for setup instructions.

---

## Tool Execution: Pattern Matching

DeepKit uses **pattern matching** (not LLM-based tool calling) for instant response times:

| User Input | Detected Tool | Response Time |
|------------|---------------|---------------|
| "List my tasks" | task_tracker | ~20-30ms |
| "System status" | system_info | ~15-20ms |
| "Save a note: ..." | notes | ~20-25ms |
| "Fetch https://..." | web_fetch | ~1-3s |
| "What can you do?" | LLM chat | ~30-60s |

**Architecture**:
1. Pattern matching → Instant tool execution (4-300ms)
2. No match → LLM chat fallback (30-60s)

Result: **1000x faster** than LLM-based tool calling.

---

## Configuration

### Environment Variables

Edit `.env` or set in `docker-compose.yml`:

```env
# Server
PORT=3333  # Internal container port
NODE_ENV=production
LOG_LEVEL=info

# Postgres (THE VAULT)
DEEPKIT_POSTGRES_HOST=deepkit-store
DEEPKIT_POSTGRES_PORT=5432
DEEPKIT_POSTGRES_DB=messenger
DEEPKIT_POSTGRES_USER=deepkit
DEEPKIT_POSTGRES_PASSWORD=<your-password>

# Ollama (THE BRAIN)
OLLAMA_BASE_URL=http://deepkit-engine:11434
OLLAMA_MODEL=llama3.2:latest

# Optional: WhatsApp (via Whatomate)
WHATOMATE_API_KEY=<your-key>
WHATOMATE_VERIFY_TOKEN=deepkit-verify
```

---

## Testing

Run the E2E test suite:

```bash
cd deepkit-messenger
./test-suite.sh
```

**Tests covered**:
- Health endpoint (Postgres, Ollama, AgentCore status)
- All 9 tools execution
- Pattern matching accuracy
- LLM chat fallback
- Database persistence
- Response time benchmarks

Expected result: **13-14 tests passed**

---

## WhatsApp Setup

### Option A: Using Whatomate (Recommended)

1. **Deploy Whatomate container**
   ```bash
   docker run -d --name whatomate \
     -p 8080:8080 \
     --network deepkit-network \
     gaogao/whatomate:latest
   ```

2. **Configure Meta Cloud API**
   - Get WhatsApp Business API credentials from Meta Developer Portal
   - Add to Whatomate settings:
     - Access Token
     - Phone Number ID
     - Webhook URL: `http://deepkit-messenger:51000/webhook/whatsapp`
     - Verify Token: `deepkit-verify`

3. **Test webhook**
   ```bash
   curl -X POST http://localhost:51000/webhook/whatsapp \
     -H "Content-Type: application/json" \
     -d '<WhatsApp webhook payload>'
   ```

### Option B: Direct Meta Cloud API

1. **Expose messenger publicly** (ngrok/cloudflare tunnel)
   ```bash
   ngrok http 51000
   ```

2. **Configure webhook in Meta Dashboard**
   - Webhook URL: `https://<your-domain>/webhook/whatsapp`
   - Verify Token: `deepkit-verify`

---

## Maintenance

### View Logs

```bash
# Messenger logs
docker logs deepkit-messenger --tail 50 -f

# All containers
docker compose logs -f
```

### Restart Services

```bash
# Restart messenger only
docker compose restart deepkit-messenger

# Restart all
docker compose restart
```

### Database Access

```bash
# Connect to Postgres
docker exec -it deepkit-store psql -U deepkit -d messenger

# Query tasks
SELECT id, title, status FROM agent_tasks ORDER BY created_at DESC LIMIT 10;

# Query notes
SELECT id, title, created_at FROM agent_notes ORDER BY created_at DESC LIMIT 10;
```

### Rebuild After Code Changes

```bash
# Rebuild and restart
docker compose build --no-cache
docker compose up -d

# Verify
docker logs deepkit-messenger --tail 20
```

---

## Port Migration Notes

DeepKit uses **high ports (50000+)** to avoid conflicts on perpetually-running systems:

| Service | External Port | Internal Port | Why High Port? |
|---------|---------------|---------------|----------------|
| Messenger | 51000 | 3333 | Avoid dev server conflicts (3000, 3001, etc.) |
| Ollama | 51434 | 11434 | Standard Ollama port + 40000 offset |
| Postgres | 5432 | 5432 | Shared database (no external exposure needed) |

**Internal Docker networking**: Services communicate via internal DNS names (`deepkit-store`, `deepkit-engine`) on the `deepkit-network` network.

---

## Troubleshooting

### "unable to find user deepkit" Error

**Cause**: Docker build cache is stale.

**Fix**:
```bash
docker compose build --no-cache
docker compose up -d
```

### Messenger Not Responding

1. Check logs: `docker logs deepkit-messenger --tail 50`
2. Verify Ollama: `curl http://localhost:51434/api/tags`
3. Verify Postgres: `docker exec deepkit-store pg_isready -U deepkit`
4. Restart: `docker compose restart deepkit-messenger`

### Slow Response Times

- **Pattern-matched tools** (tasks, notes, system info): Should be <100ms
- **Web fetch**: 1-5 seconds (depends on URL)
- **LLM chat**: 30-60 seconds (normal for llama3.2 3.2B model)

**Optimization**: Upgrade to larger Ollama model (llama3.1:8b) for faster inference with more RAM.

### Database Connection Failed

```bash
# Check Postgres is running
docker ps | grep deepkit-store

# Check network
docker network inspect deepkit-network

# Recreate network if needed
docker network create deepkit-network
docker compose up -d
```

---

## Security Considerations

### File Operations

The `file_ops` tool has **security whitelist**:
- Allowed directories: `/tmp`, `/app`, user home
- Blocked paths: `/etc/passwd`, `/etc/shadow`, `/.ssh`, `/root`

**Production**: Restrict further or disable `file_ops` entirely.

### Process Control

The `process_control` tool allows:
- Whitelisted commands: `docker`, `npm`, `node`, `python`, `git`
- Blocked patterns: `sudo`, `rm -rf`, `shutdown`, fork bombs

**Production**: Review and customize allowed commands.

### Web Fetch

- Max timeout: 60 seconds
- Max content size: 10MB
- User-Agent: `DeepKit-Messenger/1.0`

---

## Roadmap

### Phase 6: CRT Design System (Future)
- Apply "Tactical Monochrome" aesthetic to web UI
- Pure black backgrounds, phosphor green accents
- Scanline overlay, brutalist spacing
- JetBrains Mono font

### Phase 7: Thesys UI Integration (Requested)
- Upgrade web UI to use Thesys UI framework
- Maintain all 4 features (chat, tool log, status, history)

### Phase 8: Service Expansion
- Add back Calendar, File Manager, n8n (if needed)
- Hub redesign with CRT theme
- Additional 20+ services per user priority

---

## Support

- **Logs**: `docker logs deepkit-messenger`
- **Health**: `http://localhost:51000/health`
- **Test Suite**: `./test-suite.sh`
- **Database**: PostgreSQL at `deepkit-store:5432`
- **LLM**: Ollama at `deepkit-engine:11434`

---

**Status**: OPERATIONAL | **Port**: 51000 | **Tools**: 9 | **Response Time**: 20-300ms

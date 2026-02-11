# DeepKit Messenger — Quick Start

Get your sovereign AI agent running in **under 2 minutes**.

**STATUS**: ✅ MVP COMPLETE | 9 Tools | 20-300ms Response Times

---

## Prerequisites

- **Docker Desktop** installed and running
- **8GB+ RAM** recommended
- **10GB+ disk space** free

---

## Installation (3 Commands)

```bash
# 1. Clone (or cd into existing directory)
cd deepkit-messenger

# 2. Start
./start.sh

# 3. Open browser
open http://localhost:51000
```

**That's it!** Your AI agent is now running.

---

## First Steps

### Try These Commands in the Web UI

```
List my tasks
```
→ See your task list (~20ms response)

```
System status
```
→ CPU, memory, disk stats (~15ms)

```
Create a task called Deploy to production
```
→ New task added (~5-10ms)

```
Save a note: API keys are in .env file
```
→ Note saved (~20ms)

```
What can you do?
```
→ LLM chat mode (~30-60s)

---

## Management Commands

```bash
# Check status
./status.sh

# View logs
docker logs deepkit-messenger -f

# Run tests
./test-suite.sh

# Stop services
./stop.sh
```

---

## Port Reference

| Service | URL | Purpose |
|---------|-----|---------|
| **Web UI** | http://localhost:51000 | Chat interface |
| **Health** | http://localhost:51000/health | Status check |
| **Chat API** | http://localhost:51000/api/chat | POST endpoint |

---

## Tool Reference (Quick)

| Command | Tool | Response Time |
|---------|------|---------------|
| "List my tasks" | task_tracker | ~20ms |
| "System status" | system_info | ~15ms |
| "Save a note: ..." | notes | ~20ms |
| "Today's schedule" | calendar | ~50ms |
| "Health check" | health_check | ~250ms |
| "Read file /tmp/test.txt" | file_ops | ~30ms |
| "Fetch https://..." | web_fetch | ~1-5s |

Full list: See [TOOLS.md](TOOLS.md)

---

## Keyboard Shortcuts

- **Enter**: Send message
- **Ctrl+L**: Clear conversation history

---

## Troubleshooting

### Services won't start

```bash
# Rebuild from scratch
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Slow responses

- Pattern-matched tools: Should be <100ms
- LLM chat: 30-60s is normal for llama3.2

### Port conflict

Check if something else is using port 51000:
```bash
lsof -i :51000
```

---

## What's Running?

```
3 Docker Containers:
├── deepkit-messenger (Port 51000) — Agent + Web UI
├── deepkit-engine (Ollama) — Local LLM
└── deepkit-store (Postgres) — Database

9 Tools:
├── task_tracker — Create/list tasks
├── notes — Save/search notes
├── system_info — CPU/memory/disk
├── health_check — Service monitoring
├── calendar — Schedule events
├── n8n_trigger — Fire workflows
├── file_ops — Read/write files
├── web_fetch — Download URLs
└── process_control — Docker/processes
```

---

## Next Steps

- **Read**: [DEPLOYMENT.md](DEPLOYMENT.md) for full guide
- **Learn**: [TOOLS.md](TOOLS.md) for tool patterns
- **Test**: Run `./test-suite.sh`
- **Configure**: Edit `docker-compose.yml` for custom settings

---

## Getting Help

- **Status**: `./status.sh`
- **Logs**: `docker logs deepkit-messenger`
- **Health**: http://localhost:51000/health
- **Documentation**: See `docs/` folder

---

**Welcome to sovereign AI!** You now own your compute cycle. 🚀

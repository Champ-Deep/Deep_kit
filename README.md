# DEEPKIT

> "Your Personal AI. Locally Contained. Locally Empowered."

```
  ██████╗ ███████╗███████╗██████╗    ██╗  ██╗██╗████████╗
  ██╔══██╗██╔════╝██╔════╝██╔══██╗   ██║ ██╔╝██║╚══██╔══╝
  ██║  ██║█████╗  █████╗  ██████╔╝   █████╔╝ ██║   ██║
  ██║  ██║██╔══╝  ██╔══╝  ██╔═══╝    ██╔═██╗ ██║   ██║
  ██████╔╝███████╗███████╗██║        ██║  ██╗██║   ██║
  ╚═════╝ ╚══════╝╚══════╝╚═╝        ╚═╝  ╚═╝╚═╝   ╚═╝

  [ SYSTEM_ONLINE ] ................... [ LOCAL_AI_READY ]
```

## What is DEEPKIT?

DEEPKIT is a **sovereign AI toolkit** — a streamlined collection of AI and automation tools that run entirely on your computer. Your data stays private. No cloud subscriptions. No data harvesting.

**Start chatting with your AI assistant at `http://localhost:7777`**

The AI can:
- List and manage your services ("list my services")
- Check hardware stats ("check hardware stats")
- Create tasks, notes, and workflows
- Execute tools via natural language
- Answer questions using local LLMs
- Chat via Telegram, WhatsApp, or Web UI

## Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- 8GB RAM minimum (16GB recommended)

### Install

```bash
# Interactive installation (recommended)
./install.sh

# Or choose a preset
./install.sh --preset minimal     # Core + Automation (5 services, ~5GB RAM)
./install.sh --preset creator     # + Research + CMS + Marketing (11 services)
./install.sh --preset business    # + CRM + Monitoring + Productivity (15 services)
./install.sh --preset developer   # + Knowledge + Vector + APIs (14 services)
./install.sh --preset full        # Everything (25+ services)
```

The installer will guide you through everything and auto-generate secure secrets.

## After Installation

### Your AI Command Center

| Service | URL | Description |
|---------|-----|-------------|
| **Core API** | http://localhost:7777 | **Web UI + AI chat + service management** |
| **Gateway** | http://localhost:3333 | Telegram/WhatsApp message routing |
| **Task Tracker** | http://localhost:7718 | Gamified task management |

Open `http://localhost:7777` and start chatting. The AI can manage all your services.

### Core Architecture (v0.5)

```
┌─────────────────────────────────────────────────────────────┐
│                    DEEPKIT v0.5                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Telegram] [WhatsApp] [Web UI]                             │
│       ↓          ↓          ↓                               │
│   ┌──────────────────────────────────────┐                 │
│   │  Gateway (Port 3333)                 │                 │
│   │  • Message normalization             │                 │
│   │  • Session management (Redis)        │                 │
│   └──────────────┬───────────────────────┘                 │
│                  ↓                                          │
│   ┌──────────────────────────────────────┐                 │
│   │  Core API (Port 7777)                │                 │
│   │  • AI orchestration (OpenCode)       │                 │
│   │  • Tool execution (Task Tracker)     │                 │
│   │  • React Web UI                      │                 │
│   └──────────────┬───────────────────────┘                 │
│                  ↓                                          │
│  [OpenCode] [Task Tracker] [n8n] [Ollama]                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Core Services (Always Running)

| Service | Port | Description |
|---------|------|-------------|
| **Core API** | 7777 | AI orchestration + Web UI + REST API |
| **Gateway** | 3333 | Message gateway (Telegram/WhatsApp/Web) |
| **Task Tracker** | 7718 | Gamified task management |
| **n8n** | 5678 | Workflow automation |
| **PostgreSQL** | 5432 | Primary database |
| **Redis** | 6379 | Cache, sessions, conversations |
| **Ollama** | 11434 | Local LLM inference |
| **OpenCode** | 4096 | AI agent runtime |

### v0.5 Simplified Architecture

**What we removed (from v0.1):**
- 20+ redundant microservices → Consolidated into Core API
- Duplicate chat interfaces → Unified Gateway
- Complex backend → Replaced by OpenCode
- 50+ documentation files → Archived

**What we kept:**
- ✅ Task Tracker (star service)
- ✅ n8n workflows
- ✅ Core infrastructure (PG, Redis, Ollama)

**What we added:**
- ✅ Gateway service (multi-channel messaging)
- ✅ Core API (AI orchestration + Web UI)
- ✅ OpenCode integration (advanced AI)
- ✅ Modern React Web UI

**Result:** 28 services → 11 services (-61% complexity)

## Presets (v0.5)

| Preset | Services | RAM | Best For |
|--------|----------|-----|----------|
| **Minimal** | 8 | ~4GB | Core AI + Task Tracker |
| **Messaging** | 9 | ~5GB | + Telegram/WhatsApp integration |
| **Full** | 11 | ~6GB | All services + n8n workflows |

### Quick Deploy

```bash
# Start core infrastructure
docker compose up -d

# Add messaging channels (optional)
docker compose -f docker-compose.yml \
  -f modules/gateway.yml \
  -f modules/core-api.yml \
  -f modules/opencode.yml up -d --build

# Add task tracker
docker compose -f modules/task-tracker.yml up -d

# Add n8n for workflows (optional)
docker compose -f modules/automation.yml up -d
```

## Common Commands

```bash
# Check status
docker compose ps

# Stop everything
docker compose stop

# Start everything
docker compose start

# View logs
docker compose logs -f

# Update all services
docker compose pull && docker compose up -d
```

## Documentation

- [Quick Start Guide](docs/QUICKSTART.md) - Get up and running
- [Modules Guide](docs/MODULES.md) - Learn about each service

## Project Structure

```
deepkit/
├── docker-compose.yml    # Core services (Store, Cache, Engine)
├── modules/              # Optional module compose files
│   ├── deepkit-core.yml  # Messenger (always included)
│   ├── automation.yml    # n8n Orchestrator
│   ├── chat.yml          # Open WebUI
│   ├── research.yml      # Document analysis
│   ├── cms.yml           # Strapi CMS
│   ├── crm.yml           # SuiteCRM
│   ├── knowledge.yml     # FalkorDB + Graphiti
│   ├── vector.yml        # Qdrant
│   └── ...               # 20+ more modules
├── presets/              # Pre-configured combinations
├── services/             # Service source code
│   ├── messenger/        # DeepKit Messenger (Core)
│   └── ...               # Other custom services
├── backend/lib/          # Shared libraries
│   └── deepkit-fabric/   # Auth, logging, metrics
├── scripts/              # Helper scripts
├── docs/                 # Documentation
├── install.sh            # Interactive installer
└── .env.example          # Environment template
```

## Troubleshooting

**Docker not running?**
Start Docker Desktop and try again.

**Port already in use?**
Check what's using the port: `lsof -i :PORT_NUMBER`

**AI not responding?**
Ensure Ollama is running: `docker compose logs deepkit-engine`

**Need more help?**
Check the logs: `docker compose logs -f SERVICE_NAME`

## Support

Have questions or need help? Reach out to us:
- Email: deep@championsmail.com

## License

Deep License

Copyright (c) 2025 Deep

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

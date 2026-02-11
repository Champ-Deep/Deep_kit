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

DEEPKIT is a **sovereign AI toolkit** — a modular collection of 25+ AI and automation tools that run entirely on your computer. Your data stays private. No cloud subscriptions. No data harvesting.

**Start chatting with your AI assistant at `http://localhost:7777`**

The AI can:
- List and manage your services ("list my services")
- Check hardware stats ("check hardware stats")
- Create tasks, notes, and workflows
- Execute tools via natural language
- Answer questions using local LLMs

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
| **DeepKit Messenger** | http://localhost:7777 | **Chat with your AI assistant** |

Open `http://localhost:7777` and start chatting. The AI can manage all your services.

### Core Infrastructure (Always Running)

| Service | Port | Description |
|---------|------|-------------|
| DeepKit Messenger | 7777 | AI chat + generative UI + service management |
| DeepKit Orchestrator | 5678 | n8n workflow automation |
| DeepKit Store | 5432 | PostgreSQL database |
| DeepKit Cache | 6379 | Redis event bus |
| DeepKit Engine | 11434 | Ollama local LLM |

### Available Modules

| Category | Services | Ports |
|----------|----------|-------|
| **Chat & Research** | Open WebUI, Document Analysis | 3001, 3002 |
| **Content & CRM** | Strapi CMS, SuiteCRM | 3003, 3004 |
| **Marketing** | Marketing360, Link Shortener, UTM Tracker | 7712, 3013, 3007 |
| **Productivity** | Invoicing, Calendar, Tasks, Time Tracking | 7715, 7714, 7718, 7719 |
| **Knowledge** | FalkorDB, Qdrant Vector | 6378, 6333 |
| **Utilities** | Password Manager, ChampMail, QR Generator | 7716, 3025, 3010 |
| **Admin** | Super Admin, File Manager, Webhook Manager | 7722, 7720, 7721 |
| **Monitoring** | Prometheus, Grafana | 9090, 3000 |

## Presets

| Preset | Services | RAM | Best For |
|--------|----------|-----|----------|
| **Minimal** | 5 | ~5GB | Getting started, lightweight use |
| **Creator** | 11 | ~7GB | Content creators, marketers |
| **Business** | 15 | ~10GB | Business operations, CRM |
| **Developer** | 14 | ~9GB | Building AI applications |
| **Full** | 25+ | ~16GB | Everything included |

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

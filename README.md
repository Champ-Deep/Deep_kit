# Deep Starter Kit

Your personal AI & automation toolkit. No coding required.

```
  ██████╗ ███████╗███████╗██████╗    ██╗  ██╗██╗████████╗
  ██╔══██╗██╔════╝██╔════╝██╔══██╗   ██║ ██╔╝██║╚══██╔══╝
  ██║  ██║█████╗  █████╗  ██████╔╝   █████╔╝ ██║   ██║
  ██║  ██║██╔══╝  ██╔══╝  ██╔═══╝    ██╔═██╗ ██║   ██║
  ██████╔╝███████╗███████╗██║        ██║  ██╗██║   ██║
  ╚═════╝ ╚══════╝╚══════╝╚═╝        ╚═╝  ╚═╝╚═╝   ╚═╝
```

## What is this?

Deep Starter Kit is a modular collection of AI and automation tools that run on your computer. Choose what you need:

- **AI Chat** - ChatGPT-like interface, but private and local
- **Workflow Automation** - Connect apps and automate tasks (like Zapier)
- **PDF Tools** - Merge, split, compress PDFs
- **Document Research** - Upload documents, ask questions, get summaries
- **Content Management** - Manage blog posts and content
- **Customer Management** - Track leads, contacts, and deals
- **And more...**

## Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- 8GB RAM minimum (16GB recommended)

### Install

```bash
# Interactive installation (recommended)
./install.sh

# Or choose a preset
./install.sh --preset minimal     # AI chat + automation + PDF tools
./install.sh --preset creator     # + Document research + CMS
./install.sh --preset business    # + CRM + Monitoring
./install.sh --preset developer   # + Knowledge graphs + Vector DB
```

The installer will guide you through everything.

## Available Modules

| Module | What It Does | Port |
|--------|--------------|------|
| **Core** | Database, caching, local AI, Docker UI | 5432, 6379, 11434, 9000 |
| **Automation** | n8n workflow automation | 5678 |
| **AI Chat** | Open WebUI chat interface | 3001 |
| **Research** | Local NotebookLM for documents | 3002 |
| **CMS** | Strapi content management | 3003 |
| **CRM** | EspoCRM customer management | 3004 |
| **PDF Tools** | chamPDF manipulation | 3005 |
| **Knowledge** | FalkorDB + Graphiti graphs | 6380, 3011, 8000 |
| **Vector** | Qdrant semantic search | 6333 |
| **Monitoring** | Uptime Kuma health checks | 9002 |
| **Admin** | Adminer database UI | 9003 |

## After Installation

Open these URLs in your browser:

| Service | URL |
|---------|-----|
| Portainer (Docker UI) | http://localhost:9000 |
| n8n (Automation) | http://localhost:5678 |
| Open WebUI (AI Chat) | http://localhost:3001 |
| chamPDF (PDF Tools) | http://localhost:3005 |

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
deep-starter-kit/
├── docker-compose.yml    # Core services
├── modules/              # Optional module compose files
│   ├── automation.yml    # n8n
│   ├── chat.yml          # Open WebUI
│   ├── research.yml      # Local NotebookLM
│   ├── cms.yml           # Strapi
│   ├── crm.yml           # EspoCRM
│   ├── pdf.yml           # chamPDF
│   ├── knowledge.yml     # FalkorDB + Graphiti
│   ├── vector.yml        # Qdrant
│   ├── monitoring.yml    # Uptime Kuma
│   └── admin.yml         # Adminer
├── presets/              # Pre-configured combinations
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

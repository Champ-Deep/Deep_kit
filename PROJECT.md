# DEEPKIT - Project Documentation

> **"Your Personal AI. Locally Contained. Locally Empowered."**

```
  ██████╗ ███████╗███████╗██████╗    ██╗  ██╗██╗████████╗
  ██╔══██╗██╔════╝██╔════╝██╔══██╗   ██║ ██╔╝██║╚══██╔══╝
  ██║  ██║█████╗  █████╗  ██████╔╝   █████╔╝ ██║   ██║
  ██║  ██║██╔══╝  ██╔══╝  ██╔═══╝    ██╔═██╗ ██║   ██║
  ██████╔╝███████╗███████╗██║        ██║  ██╗██║   ██║
  ╚═════╝ ╚══════╝╚══════╝╚═╝        ╚═╝  ╚═╝╚═╝   ╚═╝
```

---

## Table of Contents

1. [What is DeepKit?](#what-is-deepkit)
2. [Project Vision](#project-vision)
3. [Current Implementation](#current-implementation)
4. [Architecture Overview](#architecture-overview)
5. [Service Inventory](#service-inventory)
6. [Preset Configurations](#preset-configurations)
7. [Branding System](#branding-system)
8. [Directory Structure](#directory-structure)
9. [Future Roadmap: DeepKit Hub](#future-roadmap-deepkit-hub)
10. [Technical Reference](#technical-reference)

---

## What is DeepKit?

DeepKit is a **sovereign AI toolkit** - a curated, privacy-first ecosystem of 25+ tools that run entirely on your local machine. No cloud dependencies. No data leaving your computer. Complete control.

### Core Philosophy

- **Local-First**: Everything runs on your hardware
- **Privacy by Design**: Your data never leaves your machine
- **Modular Architecture**: Install only what you need
- **Unified Identity**: One consistent CRT/terminal aesthetic across all tools
- **No-Code Friendly**: Interactive installer, visual tools, documentation for everyone

### Who is DeepKit For?

| Audience | Use Case |
|----------|----------|
| **Creators** | AI chat, document research, content management |
| **Business Users** | CRM, workflow automation, PDF tools |
| **Developers** | Knowledge graphs, vector databases, API integrations |
| **Privacy Advocates** | Local AI without cloud dependencies |
| **Automation Enthusiasts** | n8n workflows connecting local services |

---

## Project Vision

### The Problem

Modern AI tools require cloud subscriptions, send your data to external servers, and fragment your workflow across dozens of disconnected services. Users have no central entry point - they need to know ports, tool names, and context-switching is friction.

### The Solution

DeepKit provides:

1. **A Unified Toolchain**: 25+ services with consistent branding and UX
2. **Local AI Runtime**: Ollama-powered LLMs running on your hardware
3. **Modular Composition**: Docker-based architecture with pick-and-choose modules
4. **Central Command Hub** (planned): A single dashboard to access everything

### Long-Term Vision

DeepKit aims to be the **"home screen" for local AI** - a mission control center where users can:
- Launch any tool with one click
- Monitor system resources in real-time
- Manage ports and avoid conflicts
- Record demos and documentation
- Access unified docs without context-switching

---

## Current Implementation

### What We Have Built

#### 1. Core Infrastructure (docker-compose.yml)

Three foundational services that power everything:

| Service | Container | Port | Purpose |
|---------|-----------|------|---------|
| **DEEPKIT_STORE** | `deepkit-store` | 5432 | PostgreSQL 16 database for all apps |
| **DEEPKIT_CACHE** | `deepkit-cache` | 6379 | Redis for caching and job queues |
| **DEEPKIT_ENGINE** | `deepkit-engine` | 11434 | Ollama local AI model runtime |

#### 2. Modular Services (10 modules in `/modules/`)

| Module File | DeepKit Service | Underlying Tool | Port(s) |
|-------------|-----------------|-----------------|---------|
| `automation.yml` | DEEPKIT_ORCHESTRATOR | n8n | 5678 |
| `chat.yml` | DEEPKIT_CHAT | Open WebUI | 3001 |
| `research.yml` | DEEPKIT_RESEARCH | NotebookLM Local | 3002 |
| `cms.yml` | DEEPKIT_CONTENT | Strapi | 3003 |
| `crm.yml` | DEEPKIT_SALES | EspoCRM + MariaDB | 3004, 3306 |
| `pdf.yml` | DEEPKIT_DOCS | Stirling PDF | 3005 |
| `knowledge.yml` | DEEPKIT_GRAPH, DEEPKIT_MEMORY | FalkorDB + Graphiti | 6380, 3011, 8000 |
| `vector.yml` | DEEPKIT_VECTOR | Qdrant | 6333 |
| `monitoring.yml` | DEEPKIT_PULSE | Uptime Kuma | 9002 |
| `admin.yml` | DEEPKIT_DATA | Adminer | 9003 |

#### 3. Preset Configurations (5 presets in `/presets/`)

| Preset | Target User | Services | Total Containers |
|--------|-------------|----------|------------------|
| **Minimal** | Getting started | Core + Orchestrator + Chat + Docs | 6 |
| **Creator** | Content creators | Minimal + Research + Content | 8 |
| **Business** | Business users | Core + Orchestrator + Chat + Content + Sales + Docs + Pulse | 11 |
| **Developer** | Developers | Core + Orchestrator + Chat + Graph + Memory + Vector + Data | 10 |
| **Full** | Power users | Everything | ~17 |

#### 4. Branding System (`/branding/`)

A comprehensive CRT/terminal aesthetic:

**CSS Theme Files:**
- `deepkit-base.css` - Core design system (colors, fonts, animations, scanlines)
- `deepkit-chat.css` - Open WebUI override
- `deepkit-docs.css` - Stirling PDF override
- `deepkit-orchestrator.css` - n8n override
- `deepkit-pulse.css` - Uptime Kuma override
- `deepkit-content.css` - Strapi override
- `deepkit-sales.css` - EspoCRM override
- `deepkit-research.css` - NotebookLM override
- `deepkit-data.css` - Adminer override

**Design Tokens:**
```css
--dk-green: #39FF14       /* Phosphor Green - Primary */
--dk-black: #000000       /* Terminal Black - Background */
--dk-gray: #1A1A1A        /* Charcoal - Cards/Panels */
--dk-amber: #FFB000       /* Amber - Warnings/Highlights */
```

**Typography:**
- Headers: VT323, Press Start 2P (retro terminal)
- Body: JetBrains Mono (modern monospace)

**Effects:**
- CRT scanline overlay (5% opacity)
- Phosphor text glow
- Cursor blink animation
- Boot sequence animation

#### 5. Hardware Pulse Widget (`/branding/components/hardware-pulse.js`)

A vanilla JavaScript widget showing real-time system metrics:
- CPU_LOAD (percentage)
- GPU_COMPUTE (percentage)
- MEM_ALLOC (percentage)

Features segmented bar visualization with the DeepKit aesthetic.

#### 6. Interactive Installer (`install.sh`)

A 700+ line bash script providing:
- ASCII art welcome screen
- Prerequisite checking (Docker, memory)
- Interactive module selection
- Preset shortcuts (`--preset minimal`, etc.)
- Secure password generation
- Service health monitoring
- Completion summary with access URLs

#### 7. Documentation (`/docs/`)

- `QUICKSTART.md` - Getting started guide
- `MODULES.md` - Detailed module documentation
- `PRD-DEEPKIT-HUB.md` - Product requirements for the Hub (future)

---

## Architecture Overview

### Docker Compose Inheritance

DeepKit uses Docker Compose's file merging to build configurations:

```
docker-compose.yml (Core)
       │
       ├── modules/automation.yml
       ├── modules/chat.yml
       ├── modules/research.yml
       └── ... (other modules)
```

**Usage:**
```bash
# Core only
docker compose up -d

# Core + specific modules
docker compose -f docker-compose.yml -f modules/automation.yml -f modules/chat.yml up -d

# Via preset
docker compose -f presets/minimal.yml up -d
```

### Service Dependencies

```
                    ┌─────────────────┐
                    │  DEEPKIT_ENGINE │
                    │   (Ollama)      │
                    │   Port 11434    │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  DEEPKIT_CHAT   │ │ DEEPKIT_RESEARCH│ │ DEEPKIT_MEMORY  │
│  (Open WebUI)   │ │ (NotebookLM)    │ │ (Graphiti)      │
│   Port 3001     │ │   Port 3002     │ │   Port 8000     │
└─────────────────┘ └─────────────────┘ └─────────────────┘

                    ┌─────────────────┐
                    │  DEEPKIT_STORE  │
                    │  (PostgreSQL)   │
                    │   Port 5432     │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│DEEPKIT_ORCHESTR │ │ DEEPKIT_CONTENT │ │   DEEPKIT_DATA  │
│    (n8n)        │ │   (Strapi)      │ │   (Adminer)     │
│   Port 5678     │ │   Port 3003     │ │   Port 9003     │
└─────────────────┘ └─────────────────┘ └─────────────────┘

                    ┌─────────────────┐
                    │  DEEPKIT_CACHE  │
                    │    (Redis)      │
                    │   Port 6379     │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │DEEPKIT_ORCHESTR │
                    │  (Job Queues)   │
                    └─────────────────┘
```

### Port Architecture

Following the Brand Bible port zones:

| Range | Zone Name | Purpose |
|-------|-----------|---------|
| 3000-3999 | THE FACE | User dashboards, front-end tools |
| 5000-5999 | THE ENGINE | Automation, APIs |
| 6000-7999 | THE VAULT | Databases, storage, caching |
| 9000-9999 | THE MONITOR | Admin, monitoring |
| 11000+ | THE BRAIN | AI & LLM runtimes |

### Network Topology

All services connect via `deepkit-network` (Docker bridge network), enabling:
- Service discovery by container name
- Internal communication without port exposure
- Isolation from host network

---

## Service Inventory

### Core Services (Always Installed)

#### DEEPKIT_STORE (PostgreSQL 16)
- **Image**: `postgres:16-alpine`
- **Port**: 5432
- **Purpose**: Shared relational database for n8n, Strapi, and future services
- **Data Volume**: `deepkit-store-data`
- **Initialization**: Runs `/scripts/init-databases.sql` on first start

#### DEEPKIT_CACHE (Redis 7)
- **Image**: `redis:7-alpine`
- **Port**: 6379
- **Purpose**: Caching, session storage, job queues (n8n Bull)
- **Data Volume**: `deepkit-cache-data`
- **Persistence**: AOF (Append Only File) enabled

#### DEEPKIT_ENGINE (Ollama)
- **Image**: `ollama/ollama:latest`
- **Port**: 11434
- **Purpose**: Local LLM inference (llama3.2, mistral, codellama, etc.)
- **Data Volume**: `deepkit-engine-data`
- **GPU Support**: Optional (requires `deploy.resources.reservations.devices`)

### Module Services

#### DEEPKIT_ORCHESTRATOR (n8n)
- **Image**: `n8nio/n8n:latest`
- **Port**: 5678
- **Purpose**: Visual workflow automation (Zapier alternative)
- **Dependencies**: DEEPKIT_STORE, DEEPKIT_CACHE
- **Features**: 400+ integrations, AI nodes, webhook triggers
- **Branding**: CSS injected via volume mount

#### DEEPKIT_CHAT (Open WebUI)
- **Image**: `ghcr.io/open-webui/open-webui:main`
- **Port**: 3001
- **Purpose**: ChatGPT-like interface for local models
- **Dependencies**: DEEPKIT_ENGINE
- **Features**: Multi-model chat, RAG, web search
- **Branding**: `WEBUI_NAME=DEEPKIT_CHAT`

#### DEEPKIT_RESEARCH (NotebookLM Local)
- **Image**: `ghcr.io/notebooklm-local/notebooklm:latest`
- **Port**: 3002
- **Purpose**: Upload documents, ask questions, get AI summaries
- **Dependencies**: DEEPKIT_ENGINE
- **Features**: PDF/document upload, citation tracking

#### DEEPKIT_CONTENT (Strapi)
- **Image**: `strapi/strapi:latest`
- **Port**: 3003
- **Purpose**: Headless CMS for blogs, pages, content
- **Dependencies**: DEEPKIT_STORE
- **Features**: Content types, REST/GraphQL API, media library

#### DEEPKIT_SALES (EspoCRM)
- **Image**: `espocrm/espocrm:latest`
- **Port**: 3004
- **Purpose**: Customer relationship management
- **Dependencies**: MariaDB (included in module)
- **Features**: Contacts, deals, calendar, email integration

#### DEEPKIT_DOCS (Stirling PDF)
- **Image**: `frooodle/s-pdf:latest`
- **Port**: 3005
- **Purpose**: PDF manipulation toolkit
- **Dependencies**: None
- **Features**: Merge, split, compress, OCR, convert formats
- **Branding**: `APP_NAME=DEEPKIT_DOCS`

#### DEEPKIT_GRAPH (FalkorDB)
- **Image**: `falkordb/falkordb:latest`
- **Port**: 6380
- **Purpose**: Graph database for knowledge relationships
- **Dependencies**: None
- **Features**: Cypher queries, Redis-compatible protocol

#### DEEPKIT_GRAPH_EXPLORER (FalkorDB Browser)
- **Image**: `falkordb/falkordb-browser:latest`
- **Port**: 3011
- **Purpose**: Visual graph exploration UI
- **Dependencies**: DEEPKIT_GRAPH

#### DEEPKIT_MEMORY (Graphiti)
- **Image**: `getzep/graphiti:latest`
- **Port**: 8000
- **Purpose**: Knowledge graph framework for AI memory
- **Dependencies**: DEEPKIT_GRAPH
- **Features**: Entity extraction, relationship mapping

#### DEEPKIT_VECTOR (Qdrant)
- **Image**: `qdrant/qdrant:latest`
- **Port**: 6333
- **Purpose**: Vector database for semantic search
- **Dependencies**: None
- **Features**: Embedding storage, similarity search, filtering

#### DEEPKIT_PULSE (Uptime Kuma)
- **Image**: `louislam/uptime-kuma:1`
- **Port**: 9002
- **Purpose**: Service health monitoring
- **Dependencies**: None
- **Features**: Uptime tracking, notifications, status pages

#### DEEPKIT_DATA (Adminer)
- **Image**: `adminer:latest`
- **Port**: 9003
- **Purpose**: Universal database admin UI
- **Dependencies**: DEEPKIT_STORE
- **Features**: PostgreSQL, MySQL, SQLite support

---

## Preset Configurations

### Minimal (6 services)
**For**: Getting started quickly
**Includes**: Core + DEEPKIT_ORCHESTRATOR + DEEPKIT_CHAT + DEEPKIT_DOCS
**Memory**: ~4GB
**Ports**: 5432, 6379, 11434, 5678, 3001, 3005

### Creator (8 services)
**For**: Content creators, marketers
**Includes**: Minimal + DEEPKIT_RESEARCH + DEEPKIT_CONTENT
**Memory**: ~6GB
**Ports**: + 3002, 3003

### Business (11 services)
**For**: Small business, sales teams
**Includes**: Core + Orchestrator + Chat + Content + Sales + Docs + Pulse
**Memory**: ~8GB
**Ports**: + 3004, 3306, 9002

### Developer (10 services)
**For**: AI/ML developers, engineers
**Includes**: Core + Orchestrator + Chat + Graph + Memory + Vector + Data
**Memory**: ~8GB
**Ports**: + 6380, 3011, 8000, 6333, 9003

### Full (~17 services)
**For**: Power users who want everything
**Includes**: All modules
**Memory**: ~12GB+
**Ports**: All of the above

---

## Branding System

### Design Philosophy

The DeepKit brand evokes **nostalgic CRT terminals** with a modern twist:
- **Phosphor green** text on pure black backgrounds
- **Scanline overlays** for authentic CRT feel
- **No rounded corners** - sharp, terminal-like edges
- **Monospace typography** throughout
- **Subtle glow effects** on interactive elements

### Color Modes (Planned for Hub)

| Mode | Primary Color | Use Case |
|------|---------------|----------|
| **CORE** | Cyber Teal `#00F0FF` | Dashboard, Hub UI |
| **OG_RETRO** | Phosphor Green `#39FF14` | LLM/terminal outputs |
| **UTILITY** | Bright Amber `#FFB000` | Docs, warnings |
| **STEALTH** | Ghost Mono `#A0A0A0` | Low-strain night mode |

### CSS Injection Strategy

Each service receives custom CSS via Docker volume mounts:

```yaml
volumes:
  - ./branding/css/deepkit-chat.css:/app/backend/static/css/custom.css:ro
```

This allows theming without modifying upstream images.

### Audio Cues (Planned)

| Cue | Duration | Use |
|-----|----------|-----|
| `TACTILE_CLICK` | 0.05s | Button interactions |
| `SUCCESS_CHIME` | 0.2s | Tool launch, completion |
| `PAGE_TRANSITION` | 0.1s | Navigation |
| `ALERT_BUZZ` | 0.1s | Conflicts, errors |

---

## Directory Structure

```
DeepKit/
├── docker-compose.yml          # Core services (Store, Cache, Engine)
├── install.sh                  # Interactive installer (700+ lines)
├── .env.example                # Environment variable template
├── LICENSE                     # Deep License
├── README.md                   # Project overview
├── PROJECT.md                  # This documentation
│
├── modules/                    # Service module compose files
│   ├── admin.yml               # DEEPKIT_DATA (Adminer)
│   ├── automation.yml          # DEEPKIT_ORCHESTRATOR (n8n)
│   ├── chat.yml                # DEEPKIT_CHAT (Open WebUI)
│   ├── cms.yml                 # DEEPKIT_CONTENT (Strapi)
│   ├── crm.yml                 # DEEPKIT_SALES (EspoCRM)
│   ├── knowledge.yml           # DEEPKIT_GRAPH + DEEPKIT_MEMORY
│   ├── monitoring.yml          # DEEPKIT_PULSE (Uptime Kuma)
│   ├── pdf.yml                 # DEEPKIT_DOCS (Stirling PDF)
│   ├── research.yml            # DEEPKIT_RESEARCH (NotebookLM)
│   └── vector.yml              # DEEPKIT_VECTOR (Qdrant)
│
├── presets/                    # Pre-configured module combinations
│   ├── minimal.yml             # 6 services
│   ├── creator.yml             # 8 services
│   ├── business.yml            # 11 services
│   ├── developer.yml           # 10 services
│   └── full.yml                # ~17 services
│
├── branding/                   # DeepKit visual identity
│   ├── css/                    # Theme stylesheets
│   │   ├── deepkit-base.css    # Core design system
│   │   ├── deepkit-chat.css    # Open WebUI override
│   │   ├── deepkit-content.css # Strapi override
│   │   ├── deepkit-data.css    # Adminer override
│   │   ├── deepkit-docs.css    # Stirling PDF override
│   │   ├── deepkit-orchestrator.css  # n8n override
│   │   ├── deepkit-pulse.css   # Uptime Kuma override
│   │   ├── deepkit-research.css # NotebookLM override
│   │   └── deepkit-sales.css   # EspoCRM override
│   ├── components/
│   │   └── hardware-pulse.js   # System metrics widget
│   ├── assets/
│   │   └── mascot/             # The Deep mascot graphics
│   └── fonts/                  # Custom fonts (placeholder)
│
├── scripts/
│   └── init-databases.sql      # PostgreSQL initialization
│
├── docs/
│   ├── QUICKSTART.md           # Getting started guide
│   ├── MODULES.md              # Module documentation
│   └── PRD-DEEPKIT-HUB.md      # Hub product requirements
│
├── services/                   # Service-specific configs (placeholder)
│   ├── espocrm/
│   ├── graphiti/
│   ├── monitoring/
│   ├── n8n/
│   │   └── workflows/          # Pre-built n8n workflows
│   ├── nginx/
│   │   └── certs/
│   ├── ollama/
│   ├── strapi/
│   │   └── config/
│   └── supabase/
│
├── templates/                  # Config templates (placeholder)
│   ├── nginx/
│   ├── strapi/
│   └── workflows/
│
├── cli/                        # CLI tool (placeholder)
│   ├── bin/
│   ├── commands/
│   └── lib/
│
├── dashboard/                  # Dashboard app (placeholder)
│   ├── app/
│   └── components/
│
├── mcp/                        # MCP integrations (placeholder)
│   ├── deep-kit-mcp/
│   └── n8n-mcp/
│
└── tutorials/                  # User tutorials (placeholder)
```

---

## Future Roadmap: DeepKit Hub

### Vision

The **DeepKit Hub** will be a unified command center - a single CRT-styled web dashboard that serves as the "home screen" for all tools.

### Planned Components

#### 1. Hub Dashboard (`localhost:7777`)
- Quick-access card grid for all 25+ tools
- Hardware Pulse widget (CPU, RAM, disk, network)
- Recent activity log
- Service status indicators

#### 2. Harbor Dock (Port Manager)
- Real-time port scanner
- Port heatmap visualization
- Conflict detection and resolution
- Smart port suggestions by project type
- Gamification (port personalities, achievements)

#### 3. DeepKit Recorder
- Screen recording with annotations
- Project association
- Metadata sidecar files
- Archive to `~/DeepKit/Recordings/`

#### 4. Docs Wiki
- Searchable documentation
- Integrated with tool context
- Markdown-based content

### Technical Stack (Planned)

**Frontend:**
- React + TypeScript
- Vite bundler
- CSS-in-JS with design tokens
- D3.js for visualizations
- Web Audio API for haptic cues

**Backend:**
- Node.js + Express/Fastify
- Docker API integration
- OS-level port scanning (`lsof`, `netstat`)
- SQLite for preferences

### Development Phases

| Phase | Timeline | Deliverables |
|-------|----------|--------------|
| **Phase 1** | Weeks 1-2 | Hub landing, mode switching, Dock scanner |
| **Phase 2** | Week 3 | Recorder UI, Docs wiki |
| **Phase 3** | Week 4 | Polish, gamification, achievements |
| **Phase 4+** | Future | IDE extensions, mobile, clustering |

---

## Technical Reference

### Environment Variables

```bash
# Core (Required)
POSTGRES_USER=deepkit
POSTGRES_PASSWORD=<generated>
POSTGRES_DB=deepkit
TIMEZONE=UTC

# Automation (n8n)
N8N_ENCRYPTION_KEY=<generated>

# CMS (Strapi)
STRAPI_JWT_SECRET=<generated>
STRAPI_ADMIN_JWT_SECRET=<generated>
STRAPI_APP_KEYS=<generated>

# CRM (EspoCRM)
MARIADB_ROOT_PASSWORD=<generated>
ESPOCRM_DB_PASSWORD=<generated>
ESPOCRM_ADMIN_USERNAME=admin
ESPOCRM_ADMIN_PASSWORD=<generated>
ESPOCRM_SITE_URL=http://localhost:3004

# AI APIs (Optional)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

### Port Reference

| Port | Service | Protocol |
|------|---------|----------|
| 3001 | DEEPKIT_CHAT | HTTP |
| 3002 | DEEPKIT_RESEARCH | HTTP |
| 3003 | DEEPKIT_CONTENT | HTTP |
| 3004 | DEEPKIT_SALES | HTTP |
| 3005 | DEEPKIT_DOCS | HTTP |
| 3011 | DEEPKIT_GRAPH_EXPLORER | HTTP |
| 3306 | MariaDB (CRM) | MySQL |
| 5432 | DEEPKIT_STORE | PostgreSQL |
| 5678 | DEEPKIT_ORCHESTRATOR | HTTP |
| 6333 | DEEPKIT_VECTOR | HTTP/gRPC |
| 6379 | DEEPKIT_CACHE | Redis |
| 6380 | DEEPKIT_GRAPH | Redis |
| 8000 | DEEPKIT_MEMORY | HTTP |
| 9002 | DEEPKIT_PULSE | HTTP |
| 9003 | DEEPKIT_DATA | HTTP |
| 11434 | DEEPKIT_ENGINE | HTTP |

### Common Commands

```bash
# Start core services
docker compose up -d

# Start with modules
docker compose -f docker-compose.yml -f modules/chat.yml up -d

# Start preset
docker compose -f presets/minimal.yml up -d

# Stop all
docker compose down

# View logs
docker compose logs -f [service-name]

# Check status
docker compose ps

# Pull updates
docker compose pull

# Reset (delete data)
docker compose down -v
```

### Health Checks

All core services include Docker health checks:

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U deepkit"]
  interval: 10s
  timeout: 5s
  retries: 5
```

Services that depend on healthy parents use:

```yaml
depends_on:
  deepkit-store:
    condition: service_healthy
```

---

## Contributing

DeepKit is a personal project by Sreedeep. For questions or feedback:

- **Email**: deep@championsmail.com
- **GitHub**: https://github.com/Champ-Deep/Deep_kit

---

## License

Deep License - See LICENSE file for details.

Copyright (c) 2025 Deep

---

*"Your Personal AI. Locally Contained. Locally Empowered."*

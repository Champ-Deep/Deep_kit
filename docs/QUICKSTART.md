# DEEPKIT Quick Start Guide

> "Your Personal AI. Locally Contained. Locally Empowered."

Welcome to DEEPKIT! This guide will get you up and running in minutes.

## Prerequisites

Before you start, make sure you have:

1. **Docker Desktop** installed and running
   - Download: https://www.docker.com/products/docker-desktop/
   - After installing, make sure Docker is running (you'll see the whale icon in your menu bar)

2. **At least 8GB of RAM** (16GB recommended for full stack)

That's it! No coding experience required.

---

## Installation

### Option 1: Interactive Installation (Recommended)

Open your terminal and run:

```bash
./install.sh
```

Follow the friendly prompts to choose what you want to install.

### Option 2: One-Click Presets

Choose a preset that matches your needs:

```bash
# For beginners - n8n, AI Chat, PDF tools
./install.sh --preset minimal

# For content creators - adds NotebookLM, Strapi CMS
./install.sh --preset creator

# For business users - adds CRM, Monitoring
./install.sh --preset business

# For developers - adds Knowledge Graphs, Vector DB
./install.sh --preset developer
```

---

## What's Included?

### Core (Always Installed)

| Service | What It Does | URL |
|---------|--------------|-----|
| DEEPKIT_STORE | Stores your data (PostgreSQL) | Internal |
| DEEPKIT_CACHE | Speeds things up (Redis) | Internal |
| DEEPKIT_ENGINE | Runs AI models locally (Ollama) | http://localhost:11434 |

### Optional Modules

| Module | DEEPKIT Service | Best For |
|--------|-----------------|----------|
| **Automation** | DEEPKIT_ORCHESTRATOR | Automating tasks, connecting apps |
| **AI Chat** | DEEPKIT_CHAT | Chatting with AI (like ChatGPT) |
| **Research** | DEEPKIT_RESEARCH | Researching documents, PDFs |
| **CMS** | DEEPKIT_CONTENT | Managing blog posts, content |
| **CRM** | DEEPKIT_SALES | Tracking customers, deals |
| **PDF Tools** | DEEPKIT_DOCS | Merging, splitting PDFs |
| **Knowledge** | DEEPKIT_GRAPH + DEEPKIT_MEMORY | Building AI memory |
| **Vector** | DEEPKIT_VECTOR | Semantic search |
| **Monitoring** | DEEPKIT_PULSE | Checking service health |
| **Admin** | DEEPKIT_DATA | Managing databases |

---

## First Steps After Installation

### 1. Check Everything is Running

Use Docker Desktop to see all your services:
- Open Docker Desktop
- Click on "Containers" to see your DEEPKIT containers
- All containers should show "Running" status

### 2. Chat with AI (DEEPKIT_CHAT)

If you installed the AI Chat module:
- Go to: http://localhost:3001
- Start chatting! The AI runs completely on your computer via DEEPKIT_ENGINE.

### 3. Create Your First Automation (DEEPKIT_ORCHESTRATOR)

If you installed the Automation module:
- Go to: http://localhost:5678
- Click "Add workflow"
- Try a simple automation like "When I send an email, save it to a spreadsheet"

### 4. Work with PDFs (DEEPKIT_DOCS)

If you installed PDF Tools:
- Go to: http://localhost:3005
- Upload PDFs to merge, split, compress, or convert them

---

## Common Commands

```bash
# Check what's running
docker compose ps

# Stop everything
docker compose stop

# Start everything
docker compose start

# View logs (useful for debugging)
docker compose logs -f

# View logs for a specific service
docker compose logs -f n8n

# Restart a service
docker compose restart n8n

# Update to latest versions
docker compose pull
docker compose up -d
```

---

## Adding More Modules Later

Want to add more features after installation? Easy!

```bash
# Add the CMS module
docker compose -f docker-compose.yml -f modules/cms.yml up -d

# Add monitoring
docker compose -f docker-compose.yml -f modules/monitoring.yml up -d
```

---

## Troubleshooting

### "Docker is not running"

Make sure Docker Desktop is open and running. Look for the whale icon in your menu bar.

### Services won't start

1. Check if ports are in use:
   ```bash
   # On Mac/Linux
   lsof -i :5678  # Check if port 5678 is in use
   ```

2. Try restarting:
   ```bash
   docker compose down
   docker compose up -d
   ```

### Out of disk space

Docker images can take up space. Clean up unused images:
```bash
docker system prune -a
```

### Need more help?

Check the logs for specific error messages:
```bash
docker compose logs -f [service-name]
```

---

## Next Steps

- Read the [Modules Guide](MODULES.md) to learn about each DEEPKIT service
- Explore the CRT terminal-themed interfaces
- Check out the Hardware Pulse widget in your apps

## Need Help?

Contact us at: deep@championsmail.com

Happy automating with DEEPKIT!

---

**Deep License** - Copyright (c) 2025 Deep

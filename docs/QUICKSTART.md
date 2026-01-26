# Quick Start Guide

Welcome to Deep Starter Kit! This guide will get you up and running in minutes.

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
| PostgreSQL | Stores your data | Internal |
| Redis | Speeds things up | Internal |
| Ollama | Runs AI models locally | http://localhost:11434 |
| Portainer | Manage Docker containers | http://localhost:9000 |

### Optional Modules

| Module | Services | Best For |
|--------|----------|----------|
| **Automation** | n8n | Automating tasks, connecting apps |
| **AI Chat** | Open WebUI | Chatting with AI (like ChatGPT) |
| **Research** | NotebookLM | Researching documents, PDFs |
| **CMS** | Strapi | Managing blog posts, content |
| **CRM** | EspoCRM | Tracking customers, deals |
| **PDF Tools** | chamPDF | Merging, splitting PDFs |
| **Knowledge** | FalkorDB + Graphiti | Building AI memory |
| **Vector** | Qdrant | Semantic search |
| **Monitoring** | Uptime Kuma | Checking service health |
| **Admin** | Adminer | Managing databases |

---

## First Steps After Installation

### 1. Check Everything is Running

Open Portainer to see all your services:
- Go to: http://localhost:9000
- Create an admin account (first time only)
- Click "Local" to see your containers

### 2. Chat with AI

If you installed the AI Chat module:
- Go to: http://localhost:3001
- Start chatting! The AI runs completely on your computer.

### 3. Create Your First Automation

If you installed the Automation module:
- Go to: http://localhost:5678
- Click "Add workflow"
- Try a simple automation like "When I send an email, save it to a spreadsheet"

### 4. Work with PDFs

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

- Read the [Modules Guide](MODULES.md) to learn about each service
- Watch video tutorials (coming soon)
- Join our community for help and tips

## Need Help?

Contact us at: deep@championsmail.com

Happy automating!

---

**Deep License** - Copyright (c) 2025 Deep

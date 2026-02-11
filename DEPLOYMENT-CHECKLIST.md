# DeepKit Deployment Checklist

> Quick reference for deploying DeepKit on a new system

## System Requirements

| Profile | RAM | Recommended For |
|---------|-----|-----------------|
| **Lite** | 4GB | Testing, resource-constrained machines |
| **Minimal/Standard** | 8GB | Most users, development |
| **Full** | 16GB+ | Production, all modules |

## Pre-Deployment Checklist

### 1. Install Docker
```bash
# macOS
brew install --cask docker

# Ubuntu/Debian
sudo apt update && sudo apt install docker.io docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

### 2. Clone Repository
```bash
git clone <repository-url> DeepKit
cd DeepKit
```

### 3. Create Docker Network
```bash
docker network create deepkit-network
```

### 4. Generate Environment Configuration
```bash
# Copy example environment file
cp .env.example .env

# Generate cryptographic secrets
node scripts/generate-secrets.js
```

### 5. Verify Configuration
```bash
# Validate compose configuration
docker compose -f presets/minimal.yml --env-file .env config --quiet
```

## Deployment Commands

### Option A: Interactive Install (Recommended for first-time)
```bash
./install.sh
```

### Option B: Preset-Based Install
```bash
# Lite (4GB RAM) - Core + Ollama + Postgres + Redis
./install.sh --preset lite

# Minimal/Standard (8GB RAM) - Core + Ollama + Postgres + Redis + n8n
./install.sh --preset minimal

# Business (12GB RAM) - Standard + CRM + CMS
./install.sh --preset business

# Full (16GB+ RAM) - Everything
./install.sh --preset full
```

### Option C: Manual Docker Compose
```bash
# Start minimal stack
docker compose -f presets/minimal.yml --env-file .env up -d

# Or with specific modules
docker compose -f docker-compose.yml -f modules/deepkit-core.yml -f modules/automation.yml up -d
```

## Post-Deployment Verification

### 1. Check Services
```bash
docker compose -f presets/minimal.yml ps
# OR
docker ps --filter "label=com.docker.compose.project=deepkit"
```

### 2. View Logs
```bash
# All services
docker compose -f presets/minimal.yml logs -f

# Specific service
docker logs deepkit-core -f
```

### 3. Access Points

| Service | URL | Description |
|---------|-----|-------------|
| **DeepKit Core** | http://localhost:7777 | Main Command Center |
| **n8n** (if enabled) | http://localhost:5678 | Workflow Automation |
| **Ollama API** | http://localhost:11434 | AI Model API |

### 4. Health Check
```bash
curl http://localhost:7777/health
```

Expected response:
```json
{
  "service": "DeepKit Core",
  "status": "healthy",
  "version": "1.0.0"
}
```

## First-Run Experience

1. Open http://localhost:7777 in your browser
2. The **Welcome Wizard** will appear on first launch
3. Follow the guided setup:
   - Verify Ollama connection
   - See available AI models
   - View running services
   - Try example commands

## Pull AI Model (Required)

```bash
# Pull recommended model (3.2GB, good for 8GB RAM)
docker exec deepkit-engine ollama pull llama3.2:latest

# Smaller model for 4GB RAM machines
docker exec deepkit-engine ollama pull qwen2:1.5b

# Verify model
docker exec deepkit-engine ollama list
```

## Troubleshooting

### Services Not Starting
```bash
# Check logs
docker compose -f presets/minimal.yml logs

# Restart services
docker compose -f presets/minimal.yml restart
```

### Database Connection Failed
```bash
# Verify Postgres is healthy
docker exec deepkit-store pg_isready -U deepkit

# Check init script ran
docker logs deepkit-store | grep "CREATE DATABASE"
```

### Ollama Not Responding
```bash
# Check Ollama status
curl http://localhost:11434/api/tags

# View Ollama logs
docker logs deepkit-engine
```

### Redis Authentication Error
```bash
# Verify Redis password is set in .env
grep REDIS_PASSWORD .env

# Test Redis connection
docker exec deepkit-cache redis-cli -a <password> ping
```

## Stop Services

```bash
# Stop all services (preserves data)
docker compose -f presets/minimal.yml stop

# Stop and remove containers (data preserved in volumes)
docker compose -f presets/minimal.yml down

# DANGER: Remove everything including data
docker compose -f presets/minimal.yml down -v
```

## Environment Variables Quick Reference

### Required Variables (auto-generated)
- `POSTGRES_PASSWORD` - Database password
- `REDIS_PASSWORD` - Cache password
- `DEEPKIT_INTERNAL_TOKEN` - Service-to-service auth

### Optional API Keys (for enhanced features)
- `GEMINI_API_KEY` - Google Gemini for advanced AI
- `OPENAI_API_KEY` - OpenAI models
- `WHATOMATE_API_KEY` - WhatsApp integration

## File Locations

| Path | Purpose |
|------|---------|
| `.env` | Environment configuration |
| `presets/*.yml` | Stack profiles |
| `modules/*.yml` | Individual service modules |
| `services/messenger/` | Core service source |
| `scripts/` | Utility scripts |
| `~/.deepkit/` | Persistent user data (mounted in container) |

---

## Quick Start Summary

```bash
# 1. Clone and navigate
cd DeepKit

# 2. Create network (first time only)
docker network create deepkit-network

# 3. Setup environment
cp .env.example .env
node scripts/generate-secrets.js

# 4. Deploy
./install.sh --preset minimal

# 5. Pull AI model
docker exec deepkit-engine ollama pull llama3.2:latest

# 6. Access
open http://localhost:7777
```

---

*Last Updated: 2026-02-06 (Merged Session)*

## Session Merge Summary

This deployment has been verified with merged work from two parallel development sessions:
- **Session 1**: Phases 3-7 (Messenger integration, security, first-run, resource optimization, docs)
- **Session 2**: Phases 4-6 (Welcome wizard, lite preset, intelligence tools)

### What Was Merged:
- 3 new AI tools: `content_extract`, `doc_generate`, `docker_discovery`
- 2 new UI templates: `WelcomeWizardTemplate`, `ServiceGridTemplate`
- Setup wizard backend endpoints (`/api/setup/status`, `/api/setup/complete`)
- Lite preset for 4GB RAM machines

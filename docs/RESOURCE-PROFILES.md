# DeepKit Resource Profiles

DeepKit is designed to run on a variety of hardware configurations. Choose the profile that matches your available resources.

## Profile Overview

| Profile | RAM | Containers | What's Included |
|---------|-----|------------|-----------------|
| **Lite** | 4GB | 4 | Core + Ollama + Postgres + Redis |
| **Standard** | 8GB | 5 | Lite + n8n workflow automation |
| **Full** | 16GB+ | 10+ | Standard + CRM + CMS + monitoring + all modules |

## Detailed RAM Budget

### Lite Profile (~3.5GB)

| Service | Container | Expected RAM |
|---------|-----------|-------------|
| Ollama | deepkit-engine | ~3 GB (llama3.2:3b) |
| PostgreSQL | deepkit-store | ~200 MB |
| Redis | deepkit-cache | ~50 MB |
| DeepKit Core | deepkit-core | ~150 MB |
| **Total** | | **~3.4 GB** |

**Model recommendations for Lite:**
- `llama3.2:3b` - Good balance of capability and memory
- `qwen2:1.5b` - Lower memory, faster responses
- `phi3:mini` - Efficient for simple tasks

### Standard Profile (~5.5GB)

| Service | Container | Expected RAM |
|---------|-----------|-------------|
| Ollama | deepkit-engine | ~3 GB (llama3.2:3b) |
| PostgreSQL | deepkit-store | ~200 MB |
| Redis | deepkit-cache | ~50 MB |
| n8n | deepkit-automation | ~300 MB |
| DeepKit Core | deepkit-core | ~150 MB |
| OS/Headroom | - | ~1.5 GB |
| **Total** | | **~5.2 GB** |

This profile leaves ~2.8GB headroom for multitasking on an 8GB machine.

### Full Profile (~12GB+)

| Service | Container | Expected RAM |
|---------|-----------|-------------|
| Ollama | deepkit-engine | ~5 GB (larger models) |
| PostgreSQL | deepkit-store | ~500 MB |
| Redis | deepkit-cache | ~100 MB |
| n8n | deepkit-automation | ~300 MB |
| DeepKit Core | deepkit-core | ~200 MB |
| CRM | deepkit-crm | ~300 MB |
| CMS | deepkit-cms | ~200 MB |
| Monitoring | prometheus + grafana | ~500 MB |
| Gateway | traefik | ~100 MB |
| Additional modules | varies | ~1-2 GB |
| **Total** | | **~10-12 GB** |

## Installation

```bash
# Lite profile (4GB machines)
./install.sh --preset lite

# Standard profile (8GB machines) - recommended
./install.sh --preset minimal

# Full profile (16GB+ machines)
./install.sh --preset full
```

## Memory Limits

DeepKit modules include Docker memory limits to prevent runaway consumption:

| Service | Limit | Reservation |
|---------|-------|-------------|
| deepkit-core | 512M | 256M |
| deepkit-automation (n8n) | 1G | 512M |

To adjust memory limits, edit the relevant module file in `modules/`.

## Optimizing for Low Memory

1. **Use smaller models:**
   ```bash
   ollama pull qwen2:1.5b
   ```
   Then set `OLLAMA_MODEL=qwen2:1.5b` in your `.env`

2. **Disable unused services:**
   Use the Lite preset or comment out modules in your preset file

3. **Limit conversation context:**
   Shorter conversations use less memory during inference

4. **Monitor usage:**
   ```bash
   docker stats
   ```

## GPU Acceleration

If you have an NVIDIA GPU, models run in VRAM instead of system RAM:

```bash
# Use GPU-enabled Ollama image
# Edit docker-compose.yml to use:
# image: ollama/ollama:rocm  # AMD
# or enable nvidia runtime for NVIDIA
```

See the [Ollama documentation](https://ollama.com/docs) for GPU setup details.

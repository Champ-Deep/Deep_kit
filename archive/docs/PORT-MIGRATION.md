# Port Migration: 3333 → 51000

## Rationale
Moving to high ports (50000+ range) to avoid conflicts with common development ports. DeepKit services are designed to run perpetually on systems, so they need dedicated, conflict-free ports.

## Changes Made

| Service | Old Port | New Port | Internal Port |
|---------|----------|----------|---------------|
| Messenger (HTTP/WebSocket) | 3333 | 51000 | 3333 (container) |
| Postgres (DeepKit Store) | 5432 | 55432 | 5432 (container) |
| Ollama (DeepKit Engine) | 11434 | 51434 | 11434 (container) |

**Note**: Internal container ports remain unchanged. Only host-to-container port mappings are modified.

## Updated URLs

### Before:
- Messenger: `http://localhost:3333`
- Health check: `http://localhost:3333/health`
- Web chat: `http://localhost:3333` (coming in Phase 2)
- API endpoint: `http://localhost:3333/api/chat`

### After:
- Messenger: `http://localhost:51000`
- Health check: `http://localhost:51000/health`
- Web chat: `http://localhost:51000` (coming in Phase 2)
- API endpoint: `http://localhost:51000/api/chat`

## Docker Compose Changes

### messenger/docker-compose.yml
```yaml
ports:
  - "51000:3333"  # was "3333:3333"
```

### Environment Variables
No changes needed — internal Docker network uses container names and internal ports:
- `OLLAMA_BASE_URL=http://deepkit-engine:11434` (unchanged)
- `DEEPKIT_POSTGRES_HOST=deepkit-store` (port 5432 internal, unchanged)

## Testing After Migration

```bash
# 1. Restart Docker Desktop (if needed)

# 2. Start core services
cd "/Users/champion/DeepKit/CEO WhatsApp assistant/deepkit-messenger"
docker compose up -d

# 3. Wait for startup
sleep 10

# 4. Test new port
curl http://localhost:51000/health

# Expected: {"service":"DeepKit Messenger","status":"healthy",...}

# 5. Test tool execution
curl -X POST http://localhost:51000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"List my tasks","from":"test"}'

# Expected: Instant response (~20ms) with task list
```

## Rollback (if needed)

To revert to old ports:
```bash
cd "/Users/champion/DeepKit/CEO WhatsApp assistant/deepkit-messenger"
git checkout docker-compose.yml
docker compose up -d
```

## Next Steps

After successful migration:
- [ ] Update any bookmarks/scripts that referenced port 3333
- [ ] Build web chat UI on port 51000 (Phase 2)
- [ ] Configure WhatsApp webhook to use port 51000 (Phase 3)
- [ ] Update documentation/diagrams with new port numbers

#!/bin/bash

# =============================================================================
# DeepKit Test Deploy - Smoke test for the fabric-wired stack
# =============================================================================
# Builds the fabric bundle, starts core + fabric-wired services, and validates
# that health + metrics endpoints respond correctly.
#
# Usage:
#   ./scripts/test-deploy.sh              # Test core + Hub + 2 services
#   ./scripts/test-deploy.sh --full       # Test all fabric-wired services
#   ./scripts/test-deploy.sh --dry-run    # Just build + validate config (no Docker)
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
DIM='\033[2m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

PASSED=0
FAILED=0
SKIPPED=0

# Parse args
MODE="quick"
for arg in "$@"; do
    case $arg in
        --full) MODE="full" ;;
        --dry-run) MODE="dry-run" ;;
    esac
done

pass() { echo -e "  ${GREEN}PASS${NC} $1"; PASSED=$((PASSED + 1)); }
fail() { echo -e "  ${RED}FAIL${NC} $1"; FAILED=$((FAILED + 1)); }
skip() { echo -e "  ${YELLOW}SKIP${NC} $1"; SKIPPED=$((SKIPPED + 1)); }
info() { echo -e "  ${CYAN}>>>${NC} $1"; }

# =============================================================================
# STEP 1: Build fabric bundle
# =============================================================================

echo ""
echo -e "${WHITE}[ STEP 1 ] Building deepkit-fabric bundle${NC}"
echo ""

if [ -f backend/lib/deepkit-fabric/package.json ]; then
    cd backend/lib/deepkit-fabric
    npm run build 2>&1 | while read -r line; do
        echo -e "  ${DIM}$line${NC}"
    done

    if [ -f bundle/index.js ]; then
        BUNDLE_SIZE=$(wc -c < bundle/index.js | tr -d ' ')
        pass "Fabric bundle built (${BUNDLE_SIZE} bytes)"
    else
        fail "Fabric bundle not found at bundle/index.js"
    fi
    cd "$PROJECT_DIR"
else
    fail "deepkit-fabric package.json not found"
fi

# =============================================================================
# STEP 2: Validate compose configs
# =============================================================================

echo ""
echo -e "${WHITE}[ STEP 2 ] Validating Docker Compose configs${NC}"
echo ""

# Check that all preset YMLs parse (env vars may not be set, so we provide dummy values)
for preset in presets/*.yml; do
    preset_name=$(basename "$preset" .yml)
    # Provide dummy env vars so compose can validate structure
    DUMMY_ENV="POSTGRES_PASSWORD=test REDIS_PASSWORD=test N8N_ENCRYPTION_KEY=test \
       DEEPKIT_INTERNAL_TOKEN=test GATEWAY_AUTH_USERS=test GRAFANA_PASSWORD=test \
       STRAPI_APP_KEYS=test STRAPI_JWT_SECRET=test STRAPI_ADMIN_JWT_SECRET=test \
       ESPOCRM_ADMIN_PASSWORD=test FALKORDB_PASSWORD=test"
    if eval "$DUMMY_ENV docker compose -f '$preset' config --quiet" 2>/dev/null; then
        pass "Preset: $preset_name"
    else
        ERR=$(eval "$DUMMY_ENV docker compose -f '$preset' config" 2>&1 | grep -i "error" | head -1)
        if [ -z "$ERR" ]; then
            # Only warnings, not errors — treat as pass
            pass "Preset: $preset_name (with warnings)"
        else
            fail "Preset: $preset_name ($ERR)"
        fi
    fi
done

# Check that all referenced module YMLs exist
for preset in presets/*.yml; do
    while IFS= read -r line; do
        # Extract module path from "- path: ../modules/xxx.yml"
        if [[ "$line" =~ path:\ \.\./(modules/[a-z0-9_-]+\.yml) ]]; then
            module_path="${BASH_REMATCH[1]}"
            if [ -f "$module_path" ]; then
                pass "Module exists: $module_path"
            else
                fail "Module missing: $module_path (referenced in $(basename $preset))"
            fi
        fi
    done < "$preset"
done

# =============================================================================
# STEP 3: Validate init-databases.sql
# =============================================================================

echo ""
echo -e "${WHITE}[ STEP 3 ] Checking database initialization${NC}"
echo ""

# Cross-reference: every module with POSTGRES_DB should have a matching CREATE DATABASE
for module in modules/*.yml; do
    # Match both "POSTGRES_DB=name" and "POSTGRES_DB: name" patterns in YAML
    db_name=$(grep -o 'POSTGRES_DB[=:][[:space:]]*[a-z_]*' "$module" 2>/dev/null | head -1 | sed 's/POSTGRES_DB[=:][[:space:]]*//')
    if [ -n "$db_name" ] && [ "$db_name" != '${POSTGRES_DB' ]; then
        if grep -q "CREATE DATABASE $db_name" scripts/init-databases.sql 2>/dev/null; then
            pass "DB '$db_name' in init script ($(basename $module))"
        else
            fail "DB '$db_name' MISSING from init script ($(basename $module))"
        fi
    fi
done

# =============================================================================
# STEP 4: Dry run stops here
# =============================================================================

if [ "$MODE" = "dry-run" ]; then
    echo ""
    echo -e "${WHITE}[ DRY RUN COMPLETE ]${NC}"
    echo -e "  ${GREEN}Passed: $PASSED${NC}  ${RED}Failed: $FAILED${NC}  ${YELLOW}Skipped: $SKIPPED${NC}"
    [ $FAILED -gt 0 ] && exit 1
    exit 0
fi

# =============================================================================
# STEP 5: Start services
# =============================================================================

echo ""
echo -e "${WHITE}[ STEP 4 ] Starting services${NC}"
echo ""

# Build the compose command
if [ "$MODE" = "full" ]; then
    COMPOSE_CMD="docker compose -f docker-compose.yml -f modules/hub.yml -f modules/task-tracker.yml -f modules/invoicing.yml -f modules/calendar.yml -f modules/marketing360.yml -f modules/time-tracker.yml -f modules/deepkit-bridge.yml"
    SERVICES=(
        "hub:7777"
        "task-tracker:7718"
        "invoicing:7715"
        "calendar:7714"
        "marketing360:7712"
        "time-tracker:7719"
        "n8n-bridge:7730"
    )
else
    COMPOSE_CMD="docker compose -f docker-compose.yml -f modules/hub.yml -f modules/task-tracker.yml -f modules/invoicing.yml"
    SERVICES=(
        "hub:7777"
        "task-tracker:7718"
        "invoicing:7715"
    )
fi

info "Compose: $COMPOSE_CMD"
info "Starting services..."

# Create network if it doesn't exist
docker network create deepkit-network 2>/dev/null || true

# Start
$COMPOSE_CMD up -d --build 2>&1 | while read -r line; do
    echo -e "  ${DIM}$line${NC}"
done

# Wait for PostgreSQL
info "Waiting for PostgreSQL..."
for i in $(seq 1 30); do
    if $COMPOSE_CMD exec -T deepkit-store pg_isready -U deepkit 2>/dev/null; then
        pass "PostgreSQL ready"
        break
    fi
    sleep 2
    if [ $i -eq 30 ]; then
        fail "PostgreSQL not ready after 60s"
    fi
done

# Wait for services to boot
info "Waiting 10s for services to initialize..."
sleep 10

# =============================================================================
# STEP 6: Test endpoints
# =============================================================================

echo ""
echo -e "${WHITE}[ STEP 5 ] Testing service endpoints${NC}"
echo ""

for svc_port in "${SERVICES[@]}"; do
    svc="${svc_port%%:*}"
    port="${svc_port##*:}"

    echo -e "  ${CYAN}--- $svc (port $port) ---${NC}"

    # Health check
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${port}/health" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        pass "/health -> $HTTP_CODE"
    else
        fail "/health -> $HTTP_CODE"
    fi

    # Metrics check
    METRICS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${port}/metrics" 2>/dev/null || echo "000")
    if [ "$METRICS_CODE" = "200" ]; then
        pass "/metrics -> $METRICS_CODE"
    else
        fail "/metrics -> $METRICS_CODE"
    fi

    # Health response format check (should be JSON with 'status' field)
    HEALTH_BODY=$(curl -s "http://localhost:${port}/health" 2>/dev/null || echo "{}")
    if echo "$HEALTH_BODY" | grep -q '"status"'; then
        pass "/health returns structured JSON"
    else
        fail "/health response missing 'status' field"
    fi

    echo ""
done

# =============================================================================
# SUMMARY
# =============================================================================

echo ""
echo -e "${WHITE}════════════════════════════════════════════════${NC}"
echo -e "  ${GREEN}Passed: $PASSED${NC}  ${RED}Failed: $FAILED${NC}  ${YELLOW}Skipped: $SKIPPED${NC}"
echo -e "${WHITE}════════════════════════════════════════════════${NC}"

if [ $FAILED -gt 0 ]; then
    echo -e "  ${RED}Some checks failed. Review output above.${NC}"
    echo ""
    echo -e "  ${DIM}To view logs: $COMPOSE_CMD logs --tail=50${NC}"
    echo -e "  ${DIM}To stop:      $COMPOSE_CMD down${NC}"
    exit 1
else
    echo -e "  ${GREEN}All checks passed. Stack is operational.${NC}"
    echo ""
    echo -e "  ${DIM}Hub:     http://localhost:7777${NC}"
    echo -e "  ${DIM}To stop: $COMPOSE_CMD down${NC}"
    exit 0
fi

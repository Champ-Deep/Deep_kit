#!/bin/bash
# DeepKit Quick Test Script
# Tests all Phase 1 & 2.1 foundation components

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}╔════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   DeepKit Quick Test Suite               ║${NC}"
echo -e "${CYAN}║   Testing Phases 1.1, 1.2, 1.3, 2.1       ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════╝${NC}"
echo ""

# Track results
PASS_COUNT=0
FAIL_COUNT=0

# Test function
test_service() {
    local name=$1
    local url=$2
    local expected=$3

    echo -n "Testing $name... "

    if response=$(curl -s -f "$url" 2>/dev/null); then
        if echo "$response" | grep -q "$expected"; then
            echo -e "${GREEN}✅ PASS${NC}"
            ((PASS_COUNT++))
        else
            echo -e "${RED}❌ FAIL${NC} (unexpected response)"
            ((FAIL_COUNT++))
        fi
    else
        echo -e "${RED}❌ FAIL${NC} (connection failed)"
        ((FAIL_COUNT++))
    fi
}

echo -e "${CYAN}=== Phase 1.1: Hub Frontend Integration ===${NC}"
test_service "Hub Health" "http://localhost:7777/health" "healthy"
test_service "Hub Services API" "http://localhost:7777/api/services/health" "services"
test_service "Hub Hardware API" "http://localhost:7777/api/hardware/metrics" "cpu"
test_service "Hub Backup API" "http://localhost:7777/api/backups/status" "enabled"
echo ""

echo -e "${CYAN}=== Phase 1.2: Brain Tool Execution ===${NC}"
test_service "Brain Health" "http://localhost:11500/health" "deepkit-brain"
test_service "Brain Tools API" "http://localhost:11500/api/tools" "tools"
echo ""

echo -e "${CYAN}=== Phase 1.3: Backup System ===${NC}"
echo -n "Checking backup service... "
if docker ps | grep -q deepkit-backup; then
    echo -e "${GREEN}✅ PASS${NC} (running)"
    ((PASS_COUNT++))
else
    echo -e "${YELLOW}⚠️  WARN${NC} (not running - deploy with: docker-compose -f docker-compose.yml -f modules/backup.yml up -d)"
    ((FAIL_COUNT++))
fi

echo -n "Checking backup files... "
if ls ./backups/deepkit-*.sql.gz 1> /dev/null 2>&1; then
    BACKUP_COUNT=$(ls -1 ./backups/deepkit-*.sql.gz | wc -l)
    echo -e "${GREEN}✅ PASS${NC} (found $BACKUP_COUNT backup(s))"
    ((PASS_COUNT++))
else
    echo -e "${YELLOW}⚠️  WARN${NC} (no backups yet - will create on first run)"
    ((FAIL_COUNT++))
fi
echo ""

echo -e "${CYAN}=== Phase 2.1: Task Tracker Foundation ===${NC}"
echo -n "Checking PostgreSQL... "
if docker exec deepkit-store pg_isready -U deepkit > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS_COUNT++))
else
    echo -e "${RED}❌ FAIL${NC} (PostgreSQL not ready)"
    ((FAIL_COUNT++))
fi

echo -n "Checking users table... "
if docker exec deepkit-store psql -U deepkit -d tasktracker -c "\d users" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC} (migration applied)"
    ((PASS_COUNT++))
else
    echo -e "${YELLOW}⚠️  WARN${NC} (migration not run yet - run: ./services/task-tracker/migrations/run-migration.sh)"
    ((FAIL_COUNT++))
fi

echo -n "Checking admin user... "
ADMIN_COUNT=$(docker exec deepkit-store psql -U deepkit -d tasktracker -t -c "SELECT COUNT(*) FROM users WHERE username = 'admin';" 2>/dev/null | xargs)
if [ "$ADMIN_COUNT" = "1" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS_COUNT++))
else
    echo -e "${YELLOW}⚠️  WARN${NC} (admin user not found)"
    ((FAIL_COUNT++))
fi
echo ""

echo -e "${CYAN}=== Service Discovery ===${NC}"
if command -v jq > /dev/null 2>&1; then
    SUMMARY=$(curl -s http://localhost:7777/api/services/health | jq -r '.summary | "Total: \(.total), Online: \(.online), Offline: \(.offline)"')
    echo "Services: $SUMMARY"
else
    echo "Install jq for detailed service info: brew install jq"
fi
echo ""

echo -e "${CYAN}=== Test Summary ===${NC}"
TOTAL=$((PASS_COUNT + FAIL_COUNT))
echo -e "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
if [ $FAIL_COUNT -gt 0 ]; then
    echo -e "${RED}Failed: $FAIL_COUNT${NC}"
else
    echo -e "${GREEN}Failed: $FAIL_COUNT${NC}"
fi
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   ✅ ALL TESTS PASSED!                    ║${NC}"
    echo -e "${GREEN}║   DeepKit is ready for production         ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "${YELLOW}╔════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║   ⚠️  SOME TESTS FAILED                   ║${NC}"
    echo -e "${YELLOW}║   Review errors above                     ║${NC}"
    echo -e "${YELLOW}║   See TEST-PLAN.md for troubleshooting    ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════╝${NC}"
    exit 1
fi

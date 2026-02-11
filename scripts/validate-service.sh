#!/bin/bash
# =============================================================================
# DeepKit Service Validator
# =============================================================================
# Validates a single service's health, metrics, and API endpoints.
#
# Usage:
#   ./scripts/validate-service.sh <service-name> <port>
#   ./scripts/validate-service.sh invoicing 7715
#   ./scripts/validate-service.sh hub 7777
#   ./scripts/validate-service.sh task-tracker 7718
# =============================================================================

set -euo pipefail

SERVICE="${1:-}"
PORT="${2:-}"
HOST="${3:-localhost}"
PASSED=0
FAILED=0
WARNINGS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

if [[ -z "$SERVICE" || -z "$PORT" ]]; then
  echo -e "${RED}Usage: $0 <service-name> <port> [host]${NC}"
  echo "  Example: $0 invoicing 7715"
  exit 1
fi

BASE_URL="http://${HOST}:${PORT}"

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  DEEPKIT SERVICE VALIDATOR${NC}"
echo -e "${CYAN}  Service: ${SERVICE} | Port: ${PORT}${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Helper: test an endpoint
check() {
  local label="$1"
  local method="${2:-GET}"
  local url="$3"
  local expected_status="${4:-200}"
  local body="${5:-}"

  local curl_args=(-s -o /dev/null -w "%{http_code}" --max-time 5)

  if [[ "$method" == "POST" && -n "$body" ]]; then
    curl_args+=(-X POST -H "Content-Type: application/json" -d "$body")
  elif [[ "$method" != "GET" ]]; then
    curl_args+=(-X "$method")
  fi

  local status
  status=$(curl "${curl_args[@]}" "$url" 2>/dev/null || echo "000")

  if [[ "$status" == "$expected_status" ]]; then
    echo -e "  ${GREEN}PASS${NC}  $label (HTTP $status)"
    ((PASSED++))
  elif [[ "$status" == "000" ]]; then
    echo -e "  ${RED}FAIL${NC}  $label (Connection refused)"
    ((FAILED++))
  else
    echo -e "  ${RED}FAIL${NC}  $label (Expected $expected_status, got $status)"
    ((FAILED++))
  fi
}

# Helper: test an endpoint and show response
check_content() {
  local label="$1"
  local url="$2"
  local grep_pattern="${3:-}"

  local response
  response=$(curl -s --max-time 5 "$url" 2>/dev/null || echo "CONNECTION_FAILED")

  if [[ "$response" == "CONNECTION_FAILED" ]]; then
    echo -e "  ${RED}FAIL${NC}  $label (Connection refused)"
    ((FAILED++))
    return
  fi

  if [[ -n "$grep_pattern" ]]; then
    if echo "$response" | grep -q "$grep_pattern"; then
      echo -e "  ${GREEN}PASS${NC}  $label (contains '$grep_pattern')"
      ((PASSED++))
    else
      echo -e "  ${YELLOW}WARN${NC}  $label (missing '$grep_pattern')"
      ((WARNINGS++))
    fi
  else
    echo -e "  ${GREEN}PASS${NC}  $label"
    ((PASSED++))
  fi
}

# ─── 1. Health Check ───
echo -e "${CYAN}[1] Health Check${NC}"
check "GET /health returns 200" GET "${BASE_URL}/health"
check_content "Health response has status field" "${BASE_URL}/health" '"status"'
check_content "Health response has service field" "${BASE_URL}/health" '"service"'
echo ""

# ─── 2. Metrics Endpoint ───
echo -e "${CYAN}[2] Prometheus Metrics${NC}"
check "GET /metrics returns 200" GET "${BASE_URL}/metrics"
check_content "Metrics contains http_requests_total" "${BASE_URL}/metrics" "deepkit_http_requests_total"
echo ""

# ─── 3. API Discovery ───
echo -e "${CYAN}[3] API Endpoints${NC}"
check "GET /api/* returns valid response" GET "${BASE_URL}/api/stats" "200"
echo ""

# ─── 4. Auth Middleware ───
echo -e "${CYAN}[4] Security${NC}"
if [[ -n "${DEEPKIT_INTERNAL_TOKEN:-}" ]]; then
  # If token is set, API should reject without it
  local_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${BASE_URL}/api/stats" 2>/dev/null || echo "000")
  if [[ "$local_status" == "401" ]]; then
    echo -e "  ${GREEN}PASS${NC}  Auth middleware active (returns 401 without token)"
    ((PASSED++))
  else
    echo -e "  ${YELLOW}WARN${NC}  Auth middleware may not be active (got $local_status)"
    ((WARNINGS++))
  fi
else
  echo -e "  ${YELLOW}WARN${NC}  DEEPKIT_INTERNAL_TOKEN not set - auth middleware in passthrough mode"
  ((WARNINGS++))
fi
echo ""

# ─── Summary ───
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
TOTAL=$((PASSED + FAILED + WARNINGS))
echo -e "  Results: ${GREEN}${PASSED} passed${NC} | ${RED}${FAILED} failed${NC} | ${YELLOW}${WARNINGS} warnings${NC} | ${TOTAL} total"

if [[ $FAILED -eq 0 ]]; then
  echo -e "  ${GREEN}SERVICE VALIDATED SUCCESSFULLY${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 0
else
  echo -e "  ${RED}SERVICE HAS ISSUES${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 1
fi

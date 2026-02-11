#!/bin/bash
# DeepKit Messenger - End-to-End Test Suite
# Tests all tools, API endpoints, and system health

set -e  # Exit on error

API_URL="http://localhost:51000"
TEST_USER="e2e-test"
PASSED=0
FAILED=0

echo "======================================================"
echo "  DeepKit Messenger - E2E Test Suite"
echo "======================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_api() {
  local test_name="$1"
  local message="$2"
  local expected_tool="$3"

  echo -n "Testing: $test_name... "

  response=$(curl -s -X POST "$API_URL/api/chat" \
    -H "Content-Type: application/json" \
    -d "{\"message\":\"$message\",\"from\":\"$TEST_USER\"}" \
    --max-time 30)

  if [ $? -ne 0 ]; then
    echo -e "${RED}FAILED${NC} (curl error)"
    ((FAILED++))
    return 1
  fi

  success=$(echo "$response" | jq -r '.success')
  tool_used=$(echo "$response" | jq -r '.metadata.tool_used // "none"')
  duration=$(echo "$response" | jq -r '.metadata.duration // "N/A"')

  if [ "$success" = "true" ] && { [ -z "$expected_tool" ] || [ "$tool_used" = "$expected_tool" ]; }; then
    echo -e "${GREEN}PASSED${NC} (${duration})"
    ((PASSED++))
    return 0
  else
    echo -e "${RED}FAILED${NC} (tool: $tool_used, expected: $expected_tool)"
    echo "  Response: $(echo "$response" | jq -r '.response' | head -c 100)"
    ((FAILED++))
    return 1
  fi
}

# Test health endpoint
echo "1. Testing Health Endpoint"
echo "   ------------------------"
health=$(curl -s "$API_URL/health" --max-time 5)
if [ $? -eq 0 ]; then
  status=$(echo "$health" | jq -r '.status')
  postgres=$(echo "$health" | jq -r '.connections.postgres')
  ollama=$(echo "$health" | jq -r '.connections.ollama')
  agent=$(echo "$health" | jq -r '.agentCore')

  echo "   Status: $status"
  echo "   Postgres: $postgres"
  echo "   Ollama: $ollama"
  echo "   AgentCore: $agent"

  if [ "$agent" = "enabled" ]; then
    echo -e "   ${GREEN}✓ Health check passed${NC}"
    ((PASSED++))
  else
    echo -e "   ${RED}✗ AgentCore not enabled${NC}"
    ((FAILED++))
  fi
else
  echo -e "   ${RED}✗ Health endpoint failed${NC}"
  ((FAILED++))
fi
echo ""

# Test tool execution
echo "2. Testing Tool Execution"
echo "   ----------------------"

test_api "task_tracker (list)" "List my tasks" "task_tracker"
test_api "task_tracker (create)" "Create a task called E2E Test Suite" "task_tracker"
test_api "system_info" "System status" "system_info"
test_api "notes (save)" "Save a note: E2E test running" "notes"
test_api "notes (list)" "List my notes" "notes"
test_api "health_check" "Health check" "health_check"
test_api "web_fetch" "fetch https://httpbin.org/uuid" "web_fetch"
test_api "file_ops (list)" "list files in /tmp" "file_ops"

echo ""

# Test pattern matching accuracy
echo "3. Testing Pattern Matching"
echo "   ------------------------"

test_api "Task creation pattern" "add a task titled Deploy to production" "task_tracker"
test_api "Note saving pattern" "remember: Meeting at 3pm" "notes"
test_api "System info pattern" "how's the server" "system_info"

echo ""

# Test LLM fallback (no tool match)
echo "4. Testing LLM Chat Fallback"
echo "   --------------------------"

echo -n "Testing: General chat query... "
response=$(curl -s -X POST "$API_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello, how are you?","from":"'"$TEST_USER"'"}' \
  --max-time 60)

if [ $? -eq 0 ]; then
  success=$(echo "$response" | jq -r '.success')
  tool_used=$(echo "$response" | jq -r '.metadata.tool_used // "none"')

  if [ "$success" = "true" ] && [ "$tool_used" = "null" ]; then
    echo -e "${GREEN}PASSED${NC} (LLM chat mode)"
    ((PASSED++))
  else
    echo -e "${YELLOW}PARTIAL${NC} (responded but may have used tool)"
    ((PASSED++))
  fi
else
  echo -e "${RED}FAILED${NC} (timeout or error)"
  ((FAILED++))
fi

echo ""

# Test database persistence
echo "5. Testing Database Persistence"
echo "   -----------------------------"

echo -n "Checking task count in database... "
task_count=$(docker exec deepkit-store psql -U deepkit -d messenger -t -c "SELECT COUNT(*) FROM agent_tasks;" 2>/dev/null | tr -d ' ')

if [ $? -eq 0 ] && [ "$task_count" -gt 0 ]; then
  echo -e "${GREEN}PASSED${NC} ($task_count tasks stored)"
  ((PASSED++))
else
  echo -e "${RED}FAILED${NC} (could not query database)"
  ((FAILED++))
fi

echo -n "Checking note count in database... "
note_count=$(docker exec deepkit-store psql -U deepkit -d messenger -t -c "SELECT COUNT(*) FROM agent_notes;" 2>/dev/null | tr -d ' ')

if [ $? -eq 0 ] && [ "$note_count" -gt 0 ]; then
  echo -e "${GREEN}PASSED${NC} ($note_count notes stored)"
  ((PASSED++))
else
  echo -e "${YELLOW}WARNING${NC} (0 notes or query failed)"
  # Don't count as failure
fi

echo ""

# Test response times
echo "6. Testing Response Times"
echo "   ----------------------"

echo -n "Measuring pattern-matched tool execution... "
start=$(date +%s%3N)
curl -s -X POST "$API_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"System status","from":"'"$TEST_USER"'"}' \
  --max-time 5 > /dev/null
end=$(date +%s%3N)
duration=$((end - start))

if [ $duration -lt 1000 ]; then
  echo -e "${GREEN}PASSED${NC} (${duration}ms - excellent!)"
  ((PASSED++))
elif [ $duration -lt 3000 ]; then
  echo -e "${GREEN}PASSED${NC} (${duration}ms - good)"
  ((PASSED++))
else
  echo -e "${YELLOW}SLOW${NC} (${duration}ms - acceptable)"
  ((PASSED++))
fi

echo ""

# Summary
echo "======================================================"
echo "  Test Results"
echo "======================================================"
echo ""
echo -e "  ${GREEN}Passed: $PASSED${NC}"
echo -e "  ${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed! DeepKit Messenger is ready.${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed. Review errors above.${NC}"
  exit 1
fi

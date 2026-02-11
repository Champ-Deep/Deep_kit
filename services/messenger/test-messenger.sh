#!/bin/bash
# DeepKit Messenger - Quick Test Script

set -e

echo "========================================"
echo "  DeepKit Messenger - Test Suite"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
HEALTH=$(curl -s http://localhost:3333/health)
if echo "$HEALTH" | grep -q "healthy"; then
    echo -e "${GREEN}✓ Health check passed${NC}"
    echo "$HEALTH" | jq '.'
else
    echo -e "${RED}✗ Health check failed${NC}"
    echo "$HEALTH"
    exit 1
fi
echo ""

# Test 2: DeepCard Endpoint
echo -e "${YELLOW}Test 2: DeepCard Endpoint${NC}"
DEEPCARD=$(curl -s http://localhost:3333/api/deepcard)
if echo "$DEEPCARD" | grep -q "DeepKit Messenger"; then
    echo -e "${GREEN}✓ DeepCard endpoint working${NC}"
    echo "$DEEPCARD" | jq '.'
else
    echo -e "${RED}✗ DeepCard endpoint failed${NC}"
    exit 1
fi
echo ""

# Test 3: Channels List
echo -e "${YELLOW}Test 3: Registered Channels${NC}"
CHANNELS=$(curl -s http://localhost:3333/api/channels)
echo "$CHANNELS" | jq '.'
if echo "$CHANNELS" | grep -q "whatsapp"; then
    echo -e "${GREEN}✓ WhatsApp channel registered${NC}"
else
    echo -e "${RED}✗ WhatsApp channel not found${NC}"
    exit 1
fi
echo ""

# Test 4: CLI Message (Health Check)
echo -e "${YELLOW}Test 4: CLI Message - Health Check${NC}"
HEALTH_MSG=$(curl -s -X POST http://localhost:3333/webhook/cli \
  -H "Content-Type: application/json" \
  -d '{"message": "status"}')
echo "$HEALTH_MSG" | jq '.'
if echo "$HEALTH_MSG" | grep -q "success"; then
    echo -e "${GREEN}✓ Health check message processed${NC}"
else
    echo -e "${RED}✗ Health check message failed${NC}"
    exit 1
fi
echo ""

# Test 5: CLI Message (Task Creation)
echo -e "${YELLOW}Test 5: CLI Message - Task Creation${NC}"
TASK_MSG=$(curl -s -X POST http://localhost:3333/webhook/cli \
  -H "Content-Type: application/json" \
  -d '{"message": "create task: Test the messenger system"}')
echo "$TASK_MSG" | jq '.'
if echo "$TASK_MSG" | grep -q "success"; then
    echo -e "${GREEN}✓ Task creation message processed${NC}"
else
    echo -e "${RED}✗ Task creation message failed${NC}"
    exit 1
fi
echo ""

# Test 6: CLI Message (Chat)
echo -e "${YELLOW}Test 6: CLI Message - Chat${NC}"
CHAT_MSG=$(curl -s -X POST http://localhost:3333/webhook/cli \
  -H "Content-Type: application/json" \
  -d '{"message": "What can you help me with?"}')
echo "$CHAT_MSG" | jq '.'
if echo "$CHAT_MSG" | grep -q "success"; then
    echo -e "${GREEN}✓ Chat message processed${NC}"
else
    echo -e "${RED}✗ Chat message failed${NC}"
    exit 1
fi
echo ""

echo "========================================"
echo -e "${GREEN}  All tests passed! ✓${NC}"
echo "========================================"
echo ""
echo "DeepKit Messenger is operational on port 3333."
echo "Try messaging via WhatsApp or use the CLI adapter."

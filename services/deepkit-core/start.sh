#!/bin/bash
# DeepKit Messenger - Smart Startup Script
# Validates prerequisites, starts services, and verifies health

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                      ║${NC}"
echo -e "${CYAN}║         ${GREEN}DeepKit Messenger — THE PROXY${CYAN}            ║${NC}"
echo -e "${CYAN}║                                                      ║${NC}"
echo -e "${CYAN}║  ${YELLOW}The Sovereign AI Agent Stack${CYAN}                    ║${NC}"
echo -e "${CYAN}║  100% Local | 9 Tools | 20-300ms Response          ║${NC}"
echo -e "${CYAN}║                                                      ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Check prerequisites
echo -e "${BLUE}[1/6]${NC} Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker not found${NC}"
    echo "  Please install Docker Desktop: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check Docker daemon
if ! docker info &> /dev/null; then
    echo -e "${RED}✗ Docker daemon not running${NC}"
    echo "  Please start Docker Desktop and try again"
    exit 1
fi

echo -e "${GREEN}✓ Docker installed and running${NC}"

# Check disk space
available_space=$(df -h . | awk 'NR==2 {print $4}' | sed 's/G//')
if (( $(echo "$available_space < 5" | bc -l) )); then
    echo -e "${YELLOW}⚠ Low disk space (${available_space}GB available)${NC}"
    echo "  Recommended: 20GB+ free space"
else
    echo -e "${GREEN}✓ Disk space sufficient (${available_space}GB available)${NC}"
fi

# Check port availability
echo ""
echo -e "${BLUE}[2/6]${NC} Checking port availability..."

check_port() {
    local port=$1
    local service=$2
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠ Port $port ($service) is in use${NC}"
        return 1
    else
        echo -e "${GREEN}✓ Port $port ($service) available${NC}"
        return 0
    fi
}

check_port 51000 "Messenger"
check_port 5432 "Postgres"
check_port 51434 "Ollama"

# Check existing containers
echo ""
echo -e "${BLUE}[3/6]${NC} Checking existing containers..."

existing_containers=$(docker ps -q --filter "name=deepkit-" | wc -l | tr -d ' ')
if [ "$existing_containers" -gt 0 ]; then
    echo -e "${YELLOW}⚠ Found $existing_containers running DeepKit container(s)${NC}"
    echo -n "  Stop them and rebuild? [y/N] "
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "  Stopping containers..."
        docker compose down
        echo "  Building fresh..."
        docker compose build --no-cache
    fi
else
    echo -e "${GREEN}✓ No conflicting containers${NC}"
fi

# Start services
echo ""
echo -e "${BLUE}[4/6]${NC} Starting DeepKit services..."
echo ""

docker compose up -d

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Services started${NC}"
else
    echo -e "${RED}✗ Failed to start services${NC}"
    echo "  Check logs: docker logs deepkit-messenger"
    exit 1
fi

# Wait for services to initialize
echo ""
echo -e "${BLUE}[5/6]${NC} Waiting for services to initialize..."
echo -n "  "

max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -s http://localhost:51000/health > /dev/null 2>&1; then
        echo ""
        echo -e "${GREEN}✓ Services ready${NC}"
        break
    fi
    echo -n "."
    sleep 1
    ((attempt++))
done

if [ $attempt -eq $max_attempts ]; then
    echo ""
    echo -e "${RED}✗ Services failed to start within 30 seconds${NC}"
    echo "  Check logs: docker logs deepkit-messenger"
    exit 1
fi

# Verify health
echo ""
echo -e "${BLUE}[6/6]${NC} Verifying system health..."

health_response=$(curl -s http://localhost:51000/health)
postgres_status=$(echo "$health_response" | jq -r '.connections.postgres // "unknown"')
ollama_status=$(echo "$health_response" | jq -r '.connections.ollama // "unknown"')
agent_status=$(echo "$health_response" | jq -r '.agentCore // "unknown"')

echo ""
echo "  Service Status:"
if [ "$postgres_status" = "true" ]; then
    echo -e "    ${GREEN}● Postgres${NC}"
else
    echo -e "    ${RED}○ Postgres (offline)${NC}"
fi

if [ "$ollama_status" = "true" ]; then
    echo -e "    ${GREEN}● Ollama${NC}"
else
    echo -e "    ${RED}○ Ollama (offline)${NC}"
fi

if [ "$agent_status" = "enabled" ]; then
    echo -e "    ${GREEN}● AgentCore${NC}"
else
    echo -e "    ${RED}○ AgentCore (disabled)${NC}"
fi

# Get tool count
tool_count=$(curl -s -X POST http://localhost:51000/api/chat \
    -H "Content-Type: application/json" \
    -d '{"message":"test","from":"startup"}' 2>/dev/null | \
    jq -r '.metadata.tools_available | length' 2>/dev/null || echo "0")

echo ""
echo "  Tool Arsenal: ${tool_count}/9 tools loaded"

# Success banner
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║           ✓ DeepKit Messenger is ONLINE             ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Display access info
echo -e "${CYAN}Access Points:${NC}"
echo ""
echo -e "  ${YELLOW}Web UI:${NC}      http://localhost:51000/"
echo -e "  ${YELLOW}Health:${NC}      http://localhost:51000/health"
echo -e "  ${YELLOW}Chat API:${NC}    curl -X POST http://localhost:51000/api/chat \\"
echo "                     -H \"Content-Type: application/json\" \\"
echo "                     -d '{\"message\":\"List my tasks\",\"from\":\"user\"}'"
echo ""

# Quick test suggestions
echo -e "${CYAN}Try these commands in the Web UI:${NC}"
echo ""
echo "  • \"List my tasks\"          → See your task list (~20ms)"
echo "  • \"System status\"          → CPU/memory/disk stats (~15ms)"
echo "  • \"Save a note: Test 123\"  → Quick note taking (~20ms)"
echo "  • \"What can you do?\"       → LLM chat mode (~30-60s)"
echo ""

# Keyboard shortcuts
echo -e "${CYAN}Keyboard Shortcuts:${NC}"
echo "  • Enter      Send message"
echo "  • Ctrl+L     Clear conversation history"
echo ""

# Next steps
echo -e "${CYAN}Next Steps:${NC}"
echo "  • Open web UI: ${BLUE}open http://localhost:51000${NC}"
echo "  • Run tests:   ${BLUE}./test-suite.sh${NC}"
echo "  • View logs:   ${BLUE}docker logs deepkit-messenger -f${NC}"
echo "  • Stop:        ${BLUE}docker compose down${NC}"
echo ""

# Documentation
echo -e "${CYAN}Documentation:${NC}"
echo "  • README.md         → Project overview"
echo "  • DEPLOYMENT.md     → Full deployment guide"
echo "  • TOOLS.md          → Tool reference with patterns"
echo "  • MVP-SUMMARY.md    → Complete project summary"
echo ""

echo -e "${GREEN}Happy chatting with your sovereign AI agent! 🚀${NC}"
echo ""

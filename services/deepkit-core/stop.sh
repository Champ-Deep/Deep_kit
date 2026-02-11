#!/bin/bash
# DeepKit Messenger - Clean Shutdown Script

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                      ║${NC}"
echo -e "${CYAN}║         ${YELLOW}DeepKit Messenger — Shutdown${CYAN}                ║${NC}"
echo -e "${CYAN}║                                                      ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if containers are running
running_containers=$(docker ps -q --filter "name=deepkit-" | wc -l | tr -d ' ')

if [ "$running_containers" -eq 0 ]; then
    echo -e "${YELLOW}No DeepKit containers currently running${NC}"
    echo ""
    exit 0
fi

echo -e "${BLUE}Found $running_containers running container(s)${NC}"
echo ""

# Show what will be stopped
echo "Containers to stop:"
docker ps --filter "name=deepkit-" --format "  • {{.Names}} ({{.Status}})"
echo ""

# Confirm shutdown
echo -n "Stop all DeepKit services? [Y/n] "
read -r response

if [[ "$response" =~ ^[Nn]$ ]]; then
    echo -e "${YELLOW}Shutdown cancelled${NC}"
    echo ""
    exit 0
fi

# Stop services
echo ""
echo -e "${BLUE}Stopping services...${NC}"

docker compose down

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ All services stopped${NC}"
else
    echo -e "${RED}✗ Error stopping services${NC}"
    echo "  Try manually: docker compose down"
    exit 1
fi

# Optionally remove volumes
echo ""
echo -n "Remove data volumes (deletes tasks/notes)? [y/N] "
read -r remove_volumes

if [[ "$remove_volumes" =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${YELLOW}Removing volumes...${NC}"
    docker compose down -v
    echo -e "${GREEN}✓ Volumes removed${NC}"
fi

# Show status
echo ""
echo -e "${CYAN}Status:${NC}"
echo "  • Web UI:     ${RED}Offline${NC}"
echo "  • Messenger:  ${RED}Stopped${NC}"
echo "  • Postgres:   ${RED}Stopped${NC}"
echo "  • Ollama:     ${RED}Stopped${NC}"
echo ""

echo -e "${GREEN}DeepKit Messenger shutdown complete${NC}"
echo ""
echo "To restart: ${BLUE}./start.sh${NC}"
echo ""

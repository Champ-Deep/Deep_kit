#!/bin/bash
# DeepKit Messenger - Status Check Script

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
echo -e "${CYAN}║         ${YELLOW}DeepKit Messenger — Status${CYAN}                 ║${NC}"
echo -e "${CYAN}║                                                      ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Check containers
echo -e "${BLUE}Container Status:${NC}"
echo ""

containers=("deepkit-messenger" "deepkit-engine" "deepkit-store")
all_running=true

for container in "${containers[@]}"; do
    if docker ps --filter "name=$container" --format "{{.Names}}" | grep -q "$container"; then
        status=$(docker ps --filter "name=$container" --format "{{.Status}}")
        echo -e "  ${GREEN}● $container${NC} ($status)"
    else
        echo -e "  ${RED}○ $container${NC} (not running)"
        all_running=false
    fi
done

echo ""

# If all running, check health
if [ "$all_running" = true ]; then
    echo -e "${BLUE}Health Check:${NC}"
    echo ""

    health_response=$(curl -s http://localhost:51000/health 2>/dev/null)

    if [ $? -eq 0 ]; then
        # Parse health response
        status=$(echo "$health_response" | jq -r '.status // "unknown"')
        postgres=$(echo "$health_response" | jq -r '.connections.postgres // "unknown"')
        ollama=$(echo "$health_response" | jq -r '.connections.ollama // "unknown"')
        n8n=$(echo "$health_response" | jq -r '.connections.n8n // "unknown"')
        agent=$(echo "$health_response" | jq -r '.agentCore // "unknown"')
        uptime=$(echo "$health_response" | jq -r '.uptime // 0')

        # Display status
        case $status in
            "healthy")
                echo -e "  Overall: ${GREEN}● Healthy${NC}"
                ;;
            "degraded")
                echo -e "  Overall: ${YELLOW}◐ Degraded${NC}"
                ;;
            *)
                echo -e "  Overall: ${RED}○ Unhealthy${NC}"
                ;;
        esac

        echo ""
        echo "  Services:"
        [ "$postgres" = "true" ] && echo -e "    ${GREEN}● Postgres${NC}" || echo -e "    ${RED}○ Postgres${NC}"
        [ "$ollama" = "true" ] && echo -e "    ${GREEN}● Ollama${NC}" || echo -e "    ${RED}○ Ollama${NC}"
        [ "$n8n" = "true" ] && echo -e "    ${GREEN}● n8n${NC}" || echo -e "    ${YELLOW}○ n8n (optional)${NC}"
        [ "$agent" = "enabled" ] && echo -e "    ${GREEN}● AgentCore${NC}" || echo -e "    ${RED}○ AgentCore${NC}"

        echo ""

        # Metrics
        memory_used=$(echo "$health_response" | jq -r '.metrics.memory.used // 0')
        memory_total=$(echo "$health_response" | jq -r '.metrics.memory.total // 0')
        requests=$(echo "$health_response" | jq -r '.metrics.requests.total // 0')

        echo "  Metrics:"
        echo "    Uptime: ${uptime}s"
        echo "    Memory: ${memory_used}MB / ${memory_total}MB"
        echo "    Requests: $requests"

        echo ""

        # Database stats
        task_count=$(echo "$health_response" | jq -r '.storage.stats.task_count // 0' | tr -d '"')
        note_count=$(echo "$health_response" | jq -r '.storage.stats.note_count // 0' | tr -d '"')
        conv_count=$(echo "$health_response" | jq -r '.storage.stats.conversation_count // 0' | tr -d '"')

        echo "  Storage:"
        echo "    Tasks: $task_count"
        echo "    Notes: $note_count"
        echo "    Conversations: $conv_count"

        echo ""

        # Tools
        tool_response=$(curl -s -X POST http://localhost:51000/api/chat \
            -H "Content-Type: application/json" \
            -d '{"message":"test","from":"status-check"}' 2>/dev/null)

        tool_count=$(echo "$tool_response" | jq -r '.metadata.tools_available | length' 2>/dev/null || echo "0")

        echo "  Tools: ${tool_count}/9 available"

    else
        echo -e "  ${RED}✗ Cannot reach health endpoint${NC}"
        echo "  URL: http://localhost:51000/health"
    fi
else
    echo -e "${YELLOW}Some services are not running${NC}"
    echo "Start them with: ${BLUE}./start.sh${NC}"
fi

echo ""

# Port status
echo -e "${BLUE}Port Status:${NC}"
echo ""

check_port() {
    local port=$1
    local service=$2
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        process=$(lsof -Pi :$port -sTCP:LISTEN -t | head -1)
        echo -e "  ${GREEN}● Port $port${NC} ($service) - PID: $process"
    else
        echo -e "  ${RED}○ Port $port${NC} ($service) - not in use"
    fi
}

check_port 51000 "Messenger"
check_port 5432 "Postgres"
check_port 51434 "Ollama"

echo ""

# Quick actions
echo -e "${CYAN}Quick Actions:${NC}"
echo ""
echo "  View logs:    ${BLUE}docker logs deepkit-messenger -f${NC}"
echo "  Restart:      ${BLUE}docker compose restart${NC}"
echo "  Stop:         ${BLUE}./stop.sh${NC}"
echo "  Test:         ${BLUE}./test-suite.sh${NC}"
echo ""

# Access points
if [ "$all_running" = true ]; then
    echo -e "${CYAN}Access:${NC}"
    echo ""
    echo "  Web UI:    ${BLUE}http://localhost:51000/${NC}"
    echo "  Health:    ${BLUE}http://localhost:51000/health${NC}"
    echo ""
fi

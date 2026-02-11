#!/bin/bash

# =============================================================================
# DEEPKIT - Interactive Installer
# =============================================================================
# "Your Personal AI. Locally Contained. Locally Empowered."
#
# A friendly, guided installation for your AI & Automation toolkit.
# Designed for no-code users - just follow the prompts!
#
# Usage:
#   ./install.sh              # Interactive guided setup
#   ./install.sh --preset minimal   # One-click minimal install
#   ./install.sh --preset creator   # One-click creator install
#   ./install.sh --preset business  # One-click business install
#   ./install.sh --preset developer # One-click developer install
# =============================================================================

set -e

# Colors for beautiful output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
DIM='\033[2m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Installation state
SELECTED_MODULES=()
SELECTED_PRESET=""

# =============================================================================
# DISPLAY FUNCTIONS
# =============================================================================

clear_screen() {
    printf "\033c"
}

print_banner() {
    echo ""
    echo -e "${GREEN}${BOLD}"
    echo "  ╔═══════════════════════════════════════════════════════════════╗"
    echo "  ║                                                               ║"
    echo "  ║   ██████╗ ███████╗███████╗██████╗    ██╗  ██╗██╗████████╗    ║"
    echo "  ║   ██╔══██╗██╔════╝██╔════╝██╔══██╗   ██║ ██╔╝██║╚══██╔══╝    ║"
    echo "  ║   ██║  ██║█████╗  █████╗  ██████╔╝   █████╔╝ ██║   ██║       ║"
    echo "  ║   ██║  ██║██╔══╝  ██╔══╝  ██╔═══╝    ██╔═██╗ ██║   ██║       ║"
    echo "  ║   ██████╔╝███████╗███████╗██║        ██║  ██╗██║   ██║       ║"
    echo "  ║   ╚═════╝ ╚══════╝╚══════╝╚═╝        ╚═╝  ╚═╝╚═╝   ╚═╝       ║"
    echo "  ║                                                               ║"
    echo "  ║   [ SYSTEM_READY ] .. Your Personal AI. Locally Empowered.    ║"
    echo "  ║                                                               ║"
    echo "  ╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}${BOLD}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_success() {
    echo -e "  ${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "  ${YELLOW}!${NC} $1"
}

print_error() {
    echo -e "  ${RED}✗${NC} $1"
}

print_info() {
    echo -e "  ${CYAN}→${NC} $1"
}

print_dim() {
    echo -e "  ${DIM}$1${NC}"
}

# Progress bar
show_progress() {
    local current=$1
    local total=$2
    local width=40
    local percent=$((current * 100 / total))
    local filled=$((width * current / total))
    local empty=$((width - filled))

    printf "\r  ${CYAN}["
    printf "%${filled}s" | tr ' ' '█'
    printf "%${empty}s" | tr ' ' '░'
    printf "]${NC} %3d%%" $percent
}

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

generate_password() {
    openssl rand -hex 16 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1
}

generate_key() {
    openssl rand -hex 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 64 | head -n 1
}

wait_for_key() {
    echo ""
    echo -e "  ${DIM}Press Enter to continue...${NC}"
    read -r
}

# =============================================================================
# PREREQUISITE CHECKS
# =============================================================================

check_prerequisites() {
    print_step "Checking Your System"

    local all_good=true

    # Check Docker
    if command -v docker &> /dev/null; then
        local docker_version=$(docker --version | cut -d ' ' -f3 | tr -d ',')
        print_success "Docker is installed (v$docker_version)"
    else
        print_error "Docker is not installed"
        echo ""
        echo -e "  ${YELLOW}Please install Docker Desktop first:${NC}"
        echo -e "  ${BLUE}https://www.docker.com/products/docker-desktop/${NC}"
        echo ""
        all_good=false
    fi

    # Check Docker Compose
    if docker compose version &> /dev/null; then
        print_success "Docker Compose is ready"
    else
        print_error "Docker Compose is not available"
        all_good=false
    fi

    # Check if Docker is running
    if docker info &> /dev/null; then
        print_success "Docker is running"
    else
        print_error "Docker is not running"
        echo ""
        echo -e "  ${YELLOW}Please start Docker Desktop and try again.${NC}"
        echo ""
        all_good=false
    fi

    if [ "$all_good" = false ]; then
        echo ""
        print_error "Please fix the issues above and run the installer again."
        exit 1
    fi

    # Check memory (informational)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        local total_mem=$(sysctl -n hw.memsize 2>/dev/null || echo "0")
        local total_mem_gb=$((total_mem / 1024 / 1024 / 1024))
    else
        local total_mem_gb=$(free -g 2>/dev/null | awk '/^Mem:/{print $2}' || echo "8")
    fi

    if [ "$total_mem_gb" -ge 16 ]; then
        print_success "Memory: ${total_mem_gb}GB (excellent!)"
    elif [ "$total_mem_gb" -ge 8 ]; then
        print_info "Memory: ${total_mem_gb}GB (good for most setups)"
    else
        print_warning "Memory: ${total_mem_gb}GB (may be limited)"
    fi

    echo ""
    print_success "Your system is ready!"
}

# =============================================================================
# INTERACTIVE MENU SYSTEM
# =============================================================================

show_welcome() {
    clear_screen
    print_banner

    echo ""
    echo -e "  ${WHITE}${BOLD}Welcome to DEEPKIT!${NC}"
    echo ""
    echo -e "  ${DIM}This installer will help you set up your own AI & automation"
    echo -e "  toolkit. We'll guide you through every step.${NC}"
    echo ""
    echo -e "  ${GREEN}What you'll get:${NC}"
    echo -e "    • DEEPKIT_CHAT - Local AI chat (like ChatGPT, but private)"
    echo -e "    • DEEPKIT_ORCHESTRATOR - Workflow automation"
    echo -e "    • DEEPKIT_DOCS - PDF tools (merge, split, convert)"
    echo -e "    • And more based on your needs..."
    echo ""

    wait_for_key
}

show_preset_menu() {
    clear_screen
    print_banner

    echo ""
    echo -e "  ${WHITE}${BOLD}How would you like to install?${NC}"
    echo ""
    echo -e "  ${DIM}Choose a preset that matches your needs, or customize your own.${NC}"
    echo ""
    echo ""
    echo -e "  ${GREEN}${BOLD}[1]${NC} ${WHITE}Minimal${NC} ${GREEN}(Recommended for beginners)${NC}"
    echo -e "      ${DIM}DEEPKIT_ORCHESTRATOR + DEEPKIT_CHAT + DEEPKIT_DOCS${NC}"
    echo -e "      ${DIM}6 services • Perfect for getting started${NC}"
    echo ""
    echo -e "  ${CYAN}${BOLD}[2]${NC} ${WHITE}Creator${NC}"
    echo -e "      ${DIM}+ DEEPKIT_RESEARCH + DEEPKIT_CONTENT${NC}"
    echo -e "      ${DIM}8 services • Great for content creators & marketers${NC}"
    echo ""
    echo -e "  ${PURPLE}${BOLD}[3]${NC} ${WHITE}Business${NC}"
    echo -e "      ${DIM}+ DEEPKIT_SALES + DEEPKIT_PULSE${NC}"
    echo -e "      ${DIM}11 services • For managing customers & operations${NC}"
    echo ""
    echo -e "  ${YELLOW}${BOLD}[4]${NC} ${WHITE}Developer${NC}"
    echo -e "      ${DIM}+ DEEPKIT_GRAPH + DEEPKIT_VECTOR${NC}"
    echo -e "      ${DIM}10 services • For building AI applications${NC}"
    echo ""
    echo -e "  ${BLUE}${BOLD}[5]${NC} ${WHITE}Custom${NC}"
    echo -e "      ${DIM}Choose exactly which modules to install${NC}"
    echo ""
    echo ""

    while true; do
        echo -ne "  ${CYAN}Enter your choice [1-5]:${NC} "
        read -r choice

        case $choice in
            1)
                SELECTED_PRESET="minimal"
                SELECTED_MODULES=("automation" "chat" "pdf")
                return
                ;;
            2)
                SELECTED_PRESET="creator"
                SELECTED_MODULES=("automation" "chat" "research" "cms" "pdf" "marketing360" "link-shortener")
                return
                ;;
            3)
                SELECTED_PRESET="business"
                SELECTED_MODULES=("automation" "chat" "cms" "crm" "pdf" "monitoring" "champmail" "cowork" "invoicing" "calendar" "marketing360" "task-tracker" "time-tracker")
                return
                ;;
            4)
                SELECTED_PRESET="developer"
                SELECTED_MODULES=("automation" "chat" "knowledge" "vector" "admin" "cowork" "api-testing" "webhook-manager" "task-tracker")
                return
                ;;
            5)
                SELECTED_PRESET="custom"
                show_custom_menu
                return
                ;;
            *)
                echo -e "  ${RED}Please enter a number between 1 and 5${NC}"
                ;;
        esac
    done
}

show_custom_menu() {
    clear_screen
    print_banner

    echo ""
    echo -e "  ${WHITE}${BOLD}Custom Module Selection${NC}"
    echo ""
    echo -e "  ${DIM}Core services are always installed:${NC}"
    echo -e "  ${GREEN}✓${NC} DEEPKIT_STORE (PostgreSQL)"
    echo -e "  ${GREEN}✓${NC} DEEPKIT_CACHE (Redis)"
    echo -e "  ${GREEN}✓${NC} DEEPKIT_ENGINE (Ollama)"
    echo ""
    echo -e "  ${WHITE}Select additional modules (enter letters, e.g., 'a b f'):${NC}"
    echo ""
    echo -e "  ${CYAN}[A]${NC} DEEPKIT_ORCHESTRATOR (Workflow Automation)"
    echo -e "      ${DIM}Automate tasks, connect apps, build workflows${NC}"
    echo ""
    echo -e "  ${CYAN}[B]${NC} DEEPKIT_CHAT (AI Conversation)"
    echo -e "      ${DIM}ChatGPT-like interface for your local AI${NC}"
    echo ""
    echo -e "  ${CYAN}[C]${NC} DEEPKIT_RESEARCH (Document Analysis)"
    echo -e "      ${DIM}Upload PDFs, ask questions, generate summaries${NC}"
    echo ""
    echo -e "  ${CYAN}[D]${NC} DEEPKIT_CONTENT (CMS)"
    echo -e "      ${DIM}Manage blog posts, pages, and content${NC}"
    echo ""
    echo -e "  ${CYAN}[E]${NC} DEEPKIT_SALES (CRM)"
    echo -e "      ${DIM}Track contacts, deals, and customers${NC}"
    echo ""
    echo -e "  ${CYAN}[F]${NC} DEEPKIT_DOCS (PDF Tools)"
    echo -e "      ${DIM}Merge, split, convert, and edit PDFs${NC}"
    echo ""
    echo -e "  ${CYAN}[G]${NC} DEEPKIT_GRAPH + DEEPKIT_MEMORY (Knowledge)"
    echo -e "      ${DIM}AI memory and relationship tracking${NC}"
    echo ""
    echo -e "  ${CYAN}[H]${NC} DEEPKIT_VECTOR (Semantic Search)"
    echo -e "      ${DIM}Semantic search and RAG capabilities${NC}"
    echo ""
    echo -e "  ${CYAN}[I]${NC} DEEPKIT_PULSE (Monitoring)"
    echo -e "      ${DIM}Monitor service uptime and health${NC}"
    echo ""
    echo -e "  ${CYAN}[J]${NC} DEEPKIT_DATA (Database Admin)"
    echo -e "      ${DIM}Visual interface to manage databases${NC}"
    echo ""
    echo -e "  ${CYAN}[K]${NC} CHAMPMAIL (Email Automation)"
    echo -e "      ${DIM}Send emails with templates and queue system${NC}"
    echo ""
    echo -e "  ${CYAN}[L]${NC} COWORK (Unified AI Workspace)"
    echo -e "      ${DIM}AI assistant with access to all 26 tools${NC}"
    echo ""
    echo -e "  ${WHITE}${BOLD}── Productivity Suite ──${NC}"
    echo ""
    echo -e "  ${CYAN}[M]${NC} INVOICING (Invoice & Billing)"
    echo -e "      ${DIM}Create invoices, track payments${NC}"
    echo ""
    echo -e "  ${CYAN}[N]${NC} CALENDAR (Smart Scheduling)"
    echo -e "      ${DIM}Events, reminders, scheduling${NC}"
    echo ""
    echo -e "  ${CYAN}[O]${NC} MARKETING360 (AI Marketing)"
    echo -e "      ${DIM}Campaigns, contacts, analytics${NC}"
    echo ""
    echo -e "  ${CYAN}[P]${NC} TASK_TRACKER (Gamified Tasks)"
    echo -e "      ${DIM}Task management with XP and levels${NC}"
    echo ""
    echo -e "  ${CYAN}[Q]${NC} TIME_TRACKER (Time Tracking)"
    echo -e "      ${DIM}Track time entries and projects${NC}"
    echo ""
    echo -e "  ${WHITE}${BOLD}── Security & Utilities ──${NC}"
    echo ""
    echo -e "  ${CYAN}[R]${NC} PASSWORD_MANAGER (Encrypted Vault)"
    echo -e "      ${DIM}AES-256 encrypted password storage${NC}"
    echo ""
    echo -e "  ${CYAN}[S]${NC} WEBHOOK_MANAGER (Webhook Hub)"
    echo -e "      ${DIM}Manage and route webhooks${NC}"
    echo ""
    echo ""

    echo -ne "  ${CYAN}Enter module letters (e.g., 'a b f k m o') or 'all':${NC} "
    read -r selection

    # Parse selection
    SELECTED_MODULES=()
    selection=$(echo "$selection" | tr '[:upper:]' '[:lower:]')

    if [[ "$selection" == "all" ]]; then
        SELECTED_MODULES=("automation" "chat" "research" "cms" "crm" "pdf" "knowledge" "vector" "monitoring" "admin" "champmail" "cowork" "invoicing" "calendar" "marketing360" "task-tracker" "time-tracker" "password-manager" "webhook-manager")
    else
        for letter in $selection; do
            case $letter in
                a) SELECTED_MODULES+=("automation") ;;
                b) SELECTED_MODULES+=("chat") ;;
                c) SELECTED_MODULES+=("research") ;;
                d) SELECTED_MODULES+=("cms") ;;
                e) SELECTED_MODULES+=("crm") ;;
                f) SELECTED_MODULES+=("pdf") ;;
                g) SELECTED_MODULES+=("knowledge") ;;
                h) SELECTED_MODULES+=("vector") ;;
                i) SELECTED_MODULES+=("monitoring") ;;
                j) SELECTED_MODULES+=("admin") ;;
                k) SELECTED_MODULES+=("champmail") ;;
                l) SELECTED_MODULES+=("cowork") ;;
                m) SELECTED_MODULES+=("invoicing") ;;
                n) SELECTED_MODULES+=("calendar") ;;
                o) SELECTED_MODULES+=("marketing360") ;;
                p) SELECTED_MODULES+=("task-tracker") ;;
                q) SELECTED_MODULES+=("time-tracker") ;;
                r) SELECTED_MODULES+=("password-manager") ;;
                s) SELECTED_MODULES+=("webhook-manager") ;;
            esac
        done
    fi

    # Always recommend at least automation and chat
    if [ ${#SELECTED_MODULES[@]} -eq 0 ]; then
        echo ""
        echo -e "  ${YELLOW}No modules selected. Adding recommended: DEEPKIT_ORCHESTRATOR + DEEPKIT_CHAT + DEEPKIT_DOCS${NC}"
        SELECTED_MODULES=("automation" "chat" "pdf")
    fi
}

show_confirmation() {
    clear_screen
    print_banner

    echo ""
    echo -e "  ${WHITE}${BOLD}Ready to Install!${NC}"
    echo ""
    echo -e "  ${DIM}Here's what will be installed:${NC}"
    echo ""
    echo -e "  ${GREEN}Core Services (always included):${NC}"
    echo -e "    • DEEPKIT_STORE (PostgreSQL)"
    echo -e "    • DEEPKIT_CACHE (Redis)"
    echo -e "    • DEEPKIT_ENGINE (Ollama)"
    echo -e "    • DEEPKIT_MESSENGER (AI Command Center)"
    echo ""

    if [ ${#SELECTED_MODULES[@]} -gt 0 ]; then
        echo -e "  ${CYAN}Selected Modules:${NC}"
        for module in "${SELECTED_MODULES[@]}"; do
            case $module in
                automation) echo -e "    • DEEPKIT_ORCHESTRATOR (workflow automation)" ;;
                chat) echo -e "    • DEEPKIT_CHAT (AI conversation)" ;;
                research) echo -e "    • DEEPKIT_RESEARCH (document analysis)" ;;
                cms) echo -e "    • DEEPKIT_CONTENT (CMS)" ;;
                crm) echo -e "    • DEEPKIT_SALES (CRM)" ;;
                pdf) echo -e "    • DEEPKIT_DOCS (PDF tools)" ;;
                knowledge) echo -e "    • DEEPKIT_GRAPH + DEEPKIT_MEMORY (knowledge)" ;;
                vector) echo -e "    • DEEPKIT_VECTOR (semantic search)" ;;
                monitoring) echo -e "    • DEEPKIT_PULSE (monitoring)" ;;
                admin) echo -e "    • DEEPKIT_DATA (database admin)" ;;
                champmail) echo -e "    • CHAMPMAIL (email automation)" ;;
                cowork) echo -e "    • COWORK (unified AI workspace)" ;;
                invoicing) echo -e "    • INVOICING (invoice & billing)" ;;
                calendar) echo -e "    • CALENDAR (smart scheduling)" ;;
                marketing360) echo -e "    • MARKETING360 (AI marketing)" ;;
                task-tracker) echo -e "    • TASK_TRACKER (gamified tasks)" ;;
                time-tracker) echo -e "    • TIME_TRACKER (time tracking)" ;;
                password-manager) echo -e "    • PASSWORD_MANAGER (encrypted vault)" ;;
                webhook-manager) echo -e "    • WEBHOOK_MANAGER (webhook hub)" ;;
                api-testing) echo -e "    • API_TESTING (API tester)" ;;
                link-shortener) echo -e "    • LINK_SHORTENER (URL management)" ;;
                qr-generator) echo -e "    • QR_GENERATOR (QR codes)" ;;
                utm-tracker) echo -e "    • UTM_TRACKER (marketing analytics)" ;;
                request-tracker) echo -e "    • REQUEST_TRACKER (support tickets)" ;;
                gateway) echo -e "    • GATEWAY (Traefik reverse proxy)" ;;
                observability) echo -e "    • OBSERVABILITY (Loki + Prometheus + Grafana)" ;;
                deepkit-bridge) echo -e "    • N8N_BRIDGE (event bus → n8n)" ;;
                super-admin) echo -e "    • SUPER_ADMIN (admin panel)" ;;
                deepkit-forms) echo -e "    • DEEPKIT_FORMS (form builder)" ;;
                recorder) echo -e "    • RECORDER (screen capture)" ;;
            esac
        done
        echo ""
    fi

    local total_services=$((3 + ${#SELECTED_MODULES[@]}))
    # Adjust for modules that have multiple services
    for module in "${SELECTED_MODULES[@]}"; do
        case $module in
            crm) total_services=$((total_services + 1)) ;; # MariaDB
            knowledge) total_services=$((total_services + 2)) ;; # FalkorDB Browser + Graphiti
        esac
    done

    echo -e "  ${DIM}Total: ~${total_services} services${NC}"
    echo ""
    echo ""

    while true; do
        echo -ne "  ${CYAN}Start installation? [Y/n]:${NC} "
        read -r confirm
        confirm=${confirm:-Y}

        case $confirm in
            [Yy]*)
                return 0
                ;;
            [Nn]*)
                echo ""
                echo -e "  ${YELLOW}Installation cancelled.${NC}"
                exit 0
                ;;
            *)
                echo -e "  ${RED}Please enter Y or N${NC}"
                ;;
        esac
    done
}

# =============================================================================
# ENVIRONMENT SETUP
# =============================================================================

setup_environment() {
    print_step "Setting Up Configuration"

    # Generate .env.example from registry
    node scripts/generate-env-template.js > .env.example
    print_success "Generated configuration template"

    if [ -f .env ]; then
        print_info "Found existing configuration (.env)"
        echo ""
        echo -ne "  ${CYAN}Keep existing settings? [Y/n]:${NC} "
        read -r keep
        keep=${keep:-Y}

        if [[ "$keep" =~ ^[Yy]$ ]]; then
            print_info "Validating existing configuration..."
            if node scripts/validate-env.js; then
                print_success "Existing configuration is valid"
                # Still try to generate missing secrets if any
                node scripts/generate-secrets.js
                return
            else
                print_warning "Existing configuration has issues"
                cp .env ".env.backup.$(date +%Y%m%d_%H%M%S)"
                print_info "Backed up existing configuration"
            fi
        else
            cp .env ".env.backup.$(date +%Y%m%d_%H%M%S)"
            print_info "Backed up existing configuration"
        fi
    fi

    print_info "Creating secure configuration from registry..."
    cp .env.example .env

    # Generate all secrets from registry
    node scripts/generate-secrets.js
    print_success "Generated secure secrets"

    # Validate final .env
    if node scripts/validate-env.js; then
        print_success "Configuration complete and validated!"
    else
        print_error "Configuration validation failed. Please check .env manually."
        exit 1
    fi
}

# =============================================================================
# DOCKER OPERATIONS
# =============================================================================

build_compose_command() {
    # DeepKit Core (Messenger) is always included as the command center
    local cmd="docker compose -f docker-compose.yml -f modules/deepkit-core.yml"

    for module in "${SELECTED_MODULES[@]}"; do
        cmd="$cmd -f modules/${module}.yml"
    done

    echo "$cmd"
}

start_services() {
    print_step "Starting Your Services"

    local compose_cmd=$(build_compose_command)

    print_info "Pulling Docker images (this may take a few minutes)..."
    echo ""

    # Pull images
    $compose_cmd pull 2>&1 | while read -r line; do
        if [[ "$line" == *"Pull"* ]] || [[ "$line" == *"Download"* ]]; then
            echo -e "  ${DIM}$line${NC}"
        fi
    done

    print_success "Images downloaded"
    echo ""

    print_info "Starting services..."

    # Start services
    $compose_cmd up -d 2>&1 | while read -r line; do
        if [[ "$line" == *"Started"* ]] || [[ "$line" == *"Created"* ]]; then
            echo -e "  ${GREEN}$line${NC}"
        fi
    done

    print_success "Services started"
    echo ""

    # Wait for services to be ready
    print_info "Waiting for services to be ready..."
    local attempts=0
    local max_attempts=30

    while [ $attempts -lt $max_attempts ]; do
        if docker compose exec -T deepkit-store pg_isready -U deepkit &>/dev/null 2>&1; then
            break
        fi
        attempts=$((attempts + 1))
        show_progress $attempts $max_attempts
        sleep 2
    done
    echo ""

    if [ $attempts -eq $max_attempts ]; then
        print_warning "Some services may still be starting..."
    else
        print_success "Services are ready!"
    fi

    # DeepKit Core (Messenger) always needs an AI model
    echo ""
    print_info "Downloading AI model (llama3.2)..."
    echo -e "  ${DIM}This is a one-time download and may take a few minutes.${NC}"

    sleep 5  # Wait for DEEPKIT_ENGINE to be ready

    # Pull the model with progress feedback
    local pull_attempts=0
    local max_pull_attempts=3
    while [ $pull_attempts -lt $max_pull_attempts ]; do
        if docker compose exec -T deepkit-engine ollama pull llama3.2:latest 2>&1 | tail -10; then
            print_success "AI model ready!"
            break
        fi
        pull_attempts=$((pull_attempts + 1))
        if [ $pull_attempts -lt $max_pull_attempts ]; then
            print_warning "Retrying model download (attempt $((pull_attempts + 1))/$max_pull_attempts)..."
            sleep 3
        fi
    done

    if [ $pull_attempts -eq $max_pull_attempts ]; then
        print_warning "Model download may not have completed. You can manually run:"
        echo -e "  ${YELLOW}docker exec deepkit-engine ollama pull llama3.2:latest${NC}"
    fi

    # Import starter n8n workflows if automation module is included
    if [[ " ${SELECTED_MODULES[*]} " =~ " automation " ]]; then
        echo ""
        print_info "Setting up automation workflows..."

        # Wait for n8n to be ready
        sleep 10

        # Import workflows will be handled by n8n's import on first run
        # The workflow templates are in config/n8n-workflows/
        if [ -d "config/n8n-workflows" ]; then
            print_success "Automation workflow templates available"
            echo -e "  ${DIM}Import them from n8n: Settings → Import from File${NC}"
        fi
    fi
}

# =============================================================================
# COMPLETION
# =============================================================================

show_completion() {
    clear_screen
    print_banner

    echo ""
    echo -e "  ${GREEN}${BOLD}[ INSTALLATION_COMPLETE ]${NC}"
    echo ""
    echo -e "  ${WHITE}Your DEEPKIT services are now running. Here's how to access them:${NC}"
    echo ""

    # Show module-specific services
    for module in "${SELECTED_MODULES[@]}"; do
        case $module in
            automation)
                echo -e "  ${CYAN}${BOLD}DEEPKIT_ORCHESTRATOR:${NC}"
                echo -e "    Workflow Automation    ${GREEN}http://localhost:5678${NC}"
                echo ""
                ;;
            chat)
                echo -e "  ${CYAN}${BOLD}DEEPKIT_CHAT:${NC}"
                echo -e "    AI Conversation        ${GREEN}http://localhost:3001${NC}"
                echo ""
                ;;
            research)
                echo -e "  ${CYAN}${BOLD}DEEPKIT_RESEARCH:${NC}"
                echo -e "    Document Analysis      ${GREEN}http://localhost:3002${NC}"
                echo ""
                ;;
            cms)
                echo -e "  ${CYAN}${BOLD}DEEPKIT_CONTENT:${NC}"
                echo -e "    Content Management     ${GREEN}http://localhost:3003${NC}"
                echo ""
                ;;
            crm)
                echo -e "  ${CYAN}${BOLD}DEEPKIT_SALES:${NC}"
                echo -e "    CRM                    ${GREEN}http://localhost:3004${NC}"
                echo -e "    ${DIM}Login: admin / (see .env for password)${NC}"
                echo ""
                ;;
            pdf)
                echo -e "  ${CYAN}${BOLD}DEEPKIT_DOCS:${NC}"
                echo -e "    PDF Tools              ${GREEN}http://localhost:3005${NC}"
                echo ""
                ;;
            knowledge)
                echo -e "  ${CYAN}${BOLD}DEEPKIT_GRAPH:${NC}"
                echo -e "    Graph Explorer         ${GREEN}http://localhost:3011${NC}"
                echo -e "  ${CYAN}${BOLD}DEEPKIT_MEMORY:${NC}"
                echo -e "    Knowledge API          ${GREEN}http://localhost:8000${NC}"
                echo ""
                ;;
            vector)
                echo -e "  ${CYAN}${BOLD}DEEPKIT_VECTOR:${NC}"
                echo -e "    Semantic Search        ${GREEN}http://localhost:6333${NC}"
                echo ""
                ;;
            monitoring)
                echo -e "  ${CYAN}${BOLD}DEEPKIT_PULSE:${NC}"
                echo -e "    System Monitoring      ${GREEN}http://localhost:9002${NC}"
                echo ""
                ;;
            admin)
                echo -e "  ${CYAN}${BOLD}DEEPKIT_DATA:${NC}"
                echo -e "    Database Admin         ${GREEN}http://localhost:9003${NC}"
                echo ""
                ;;
            champmail)
                echo -e "  ${CYAN}${BOLD}CHAMPMAIL:${NC}"
                echo -e "    Email Automation       ${GREEN}http://localhost:3025${NC}"
                echo -e "    ${DIM}Send emails with templates and queue system${NC}"
                echo ""
                ;;
            cowork)
                echo -e "  ${CYAN}${BOLD}COWORK:${NC}"
                echo -e "    Unified AI Workspace   ${GREEN}http://localhost:3030${NC}"
                echo -e "    ${DIM}AI assistant with access to all 26 tools${NC}"
                echo ""
                ;;
            invoicing)
                echo -e "  ${CYAN}${BOLD}INVOICING:${NC}"
                echo -e "    Invoice & Billing      ${GREEN}http://localhost:7715${NC}"
                echo ""
                ;;
            calendar)
                echo -e "  ${CYAN}${BOLD}CALENDAR:${NC}"
                echo -e "    Smart Scheduling       ${GREEN}http://localhost:7714${NC}"
                echo ""
                ;;
            marketing360)
                echo -e "  ${CYAN}${BOLD}MARKETING360:${NC}"
                echo -e "    AI Marketing           ${GREEN}http://localhost:7712${NC}"
                echo ""
                ;;
            task-tracker)
                echo -e "  ${CYAN}${BOLD}TASK_TRACKER:${NC}"
                echo -e "    Gamified Tasks         ${GREEN}http://localhost:7718${NC}"
                echo ""
                ;;
            time-tracker)
                echo -e "  ${CYAN}${BOLD}TIME_TRACKER:${NC}"
                echo -e "    Time Tracking          ${GREEN}http://localhost:7719${NC}"
                echo ""
                ;;
            password-manager)
                echo -e "  ${CYAN}${BOLD}PASSWORD_MANAGER:${NC}"
                echo -e "    Encrypted Vault        ${GREEN}http://localhost:7716${NC}"
                echo ""
                ;;
            webhook-manager)
                echo -e "  ${CYAN}${BOLD}WEBHOOK_MANAGER:${NC}"
                echo -e "    Webhook Hub            ${GREEN}http://localhost:7721${NC}"
                echo ""
                ;;
            api-testing)
                echo -e "  ${CYAN}${BOLD}API_TESTING:${NC}"
                echo -e "    API Tester             ${GREEN}http://localhost:7717${NC}"
                echo ""
                ;;
            link-shortener)
                echo -e "  ${CYAN}${BOLD}LINK_SHORTENER:${NC}"
                echo -e "    URL Management         ${GREEN}http://localhost:3013${NC}"
                echo ""
                ;;
        esac
    done

    # Messenger (DeepKit Core) is always included
    echo -e "  ${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  ${GREEN}${BOLD}YOUR AI COMMAND CENTER:${NC}"
    echo ""
    echo -e "    ${CYAN}${BOLD}DEEPKIT MESSENGER${NC}"
    echo -e "    ${GREEN}→ http://localhost:7777${NC}"
    echo ""
    echo -e "    ${DIM}Chat with your sovereign AI assistant. Ask it to:${NC}"
    echo -e "    ${DIM}• \"list my services\" — see your arsenal${NC}"
    echo -e "    ${DIM}• \"check hardware stats\" — monitor resources${NC}"
    echo -e "    ${DIM}• \"system status\" — overall health check${NC}"
    echo ""
    echo -e "  ${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # Arsenal summary
    local total_services=$((4 + ${#SELECTED_MODULES[@]}))
    echo ""
    echo -e "  ${WHITE}${BOLD}Arsenal Summary:${NC}"
    echo -e "    Services deployed: ${CYAN}~${total_services}${NC}"
    echo -e "    Core: PostgreSQL, Redis, Ollama, Messenger"
    echo -e "    Modules: ${#SELECTED_MODULES[@]} selected"
    echo ""

    echo ""
    echo -e "  ${WHITE}${BOLD}Quick Commands:${NC}"
    echo ""
    echo -e "    ${YELLOW}docker compose ps${NC}          Check service status"
    echo -e "    ${YELLOW}docker compose logs -f${NC}     View logs"
    echo -e "    ${YELLOW}docker compose stop${NC}        Stop all services"
    echo -e "    ${YELLOW}docker compose start${NC}       Start all services"
    echo ""
    echo -e "  ${WHITE}${BOLD}Need Help?${NC}"
    echo ""
    echo -e "    Read the docs:         ${BLUE}docs/QUICKSTART.md${NC}"
    echo -e "    Module guide:          ${BLUE}docs/MODULES.md${NC}"
    echo ""
    echo -e "  ${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# =============================================================================
# MAIN
# =============================================================================

main() {
    # Parse command line arguments
    local preset_mode=""
    local skip_interactive=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --preset)
                preset_mode="$2"
                skip_interactive=true
                shift 2
                ;;
            --help|-h)
                echo "DEEPKIT Installer"
                echo ""
                echo "Usage: ./install.sh [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --preset NAME    Install a preset (minimal, creator, business, developer, full)"
                echo "  --help           Show this help message"
                echo ""
                echo "Examples:"
                echo "  ./install.sh                    # Interactive installation"
                echo "  ./install.sh --preset minimal   # Quick minimal install"
                echo ""
                exit 0
                ;;
            *)
                shift
                ;;
        esac
    done

    # Handle preset mode
    if [ -n "$preset_mode" ]; then
        case $preset_mode in
            minimal)
                SELECTED_PRESET="minimal"
                SELECTED_MODULES=("automation" "chat" "pdf")
                ;;
            creator)
                SELECTED_PRESET="creator"
                SELECTED_MODULES=("automation" "chat" "research" "cms" "pdf" "marketing360" "link-shortener")
                ;;
            business)
                SELECTED_PRESET="business"
                SELECTED_MODULES=("automation" "chat" "cms" "crm" "pdf" "monitoring" "champmail" "cowork" "invoicing" "calendar" "marketing360" "task-tracker" "time-tracker")
                ;;
            developer)
                SELECTED_PRESET="developer"
                SELECTED_MODULES=("automation" "chat" "knowledge" "vector" "admin" "cowork" "api-testing" "webhook-manager" "task-tracker")
                ;;
            full)
                SELECTED_PRESET="full"
                SELECTED_MODULES=("automation" "chat" "research" "cms" "crm" "pdf" "knowledge" "vector" "monitoring" "admin" "champmail" "cowork" "gateway" "observability" "deepkit-bridge" "invoicing" "calendar" "marketing360" "task-tracker" "time-tracker" "password-manager" "file-manager" "webhook-manager" "link-shortener" "qr-generator" "utm-tracker" "request-tracker" "super-admin" "deepkit-forms" "api-testing" "recorder")
                ;;
            *)
                echo "Unknown preset: $preset_mode"
                echo "Available presets: minimal, creator, business, developer, full"
                exit 1
                ;;
        esac

        print_banner
        echo ""
        echo -e "  ${CYAN}Installing preset: ${WHITE}${BOLD}$preset_mode${NC}"
        echo ""
    else
        # Interactive mode
        show_welcome
        show_preset_menu
        show_confirmation
    fi

    # Run installation
    check_prerequisites
    setup_environment
    start_services
    show_completion
}

# Run main
main "$@"

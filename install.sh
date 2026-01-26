#!/bin/bash

# =============================================================================
# DEEP STARTER KIT - Interactive Installer
# =============================================================================
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
    echo -e "${PURPLE}${BOLD}"
    echo "  ╔═══════════════════════════════════════════════════════════════╗"
    echo "  ║                                                               ║"
    echo "  ║   ██████╗ ███████╗███████╗██████╗    ██╗  ██╗██╗████████╗    ║"
    echo "  ║   ██╔══██╗██╔════╝██╔════╝██╔══██╗   ██║ ██╔╝██║╚══██╔══╝    ║"
    echo "  ║   ██║  ██║█████╗  █████╗  ██████╔╝   █████╔╝ ██║   ██║       ║"
    echo "  ║   ██║  ██║██╔══╝  ██╔══╝  ██╔═══╝    ██╔═██╗ ██║   ██║       ║"
    echo "  ║   ██████╔╝███████╗███████╗██║        ██║  ██╗██║   ██║       ║"
    echo "  ║   ╚═════╝ ╚══════╝╚══════╝╚═╝        ╚═╝  ╚═╝╚═╝   ╚═╝       ║"
    echo "  ║                                                               ║"
    echo "  ║         Your AI & Automation Toolkit                          ║"
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
    echo -e "  ${WHITE}${BOLD}Welcome to Deep Starter Kit!${NC}"
    echo ""
    echo -e "  ${DIM}This installer will help you set up your own AI & automation"
    echo -e "  toolkit. We'll guide you through every step.${NC}"
    echo ""
    echo -e "  ${CYAN}What you'll get:${NC}"
    echo -e "    • Local AI chat (like ChatGPT, but private)"
    echo -e "    • Workflow automation (connect apps, automate tasks)"
    echo -e "    • PDF tools (merge, split, convert)"
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
    echo -e "      ${DIM}n8n automation + AI chat + PDF tools${NC}"
    echo -e "      ${DIM}7 services • Perfect for getting started${NC}"
    echo ""
    echo -e "  ${CYAN}${BOLD}[2]${NC} ${WHITE}Creator${NC}"
    echo -e "      ${DIM}+ Document research + Content management${NC}"
    echo -e "      ${DIM}9 services • Great for content creators & marketers${NC}"
    echo ""
    echo -e "  ${PURPLE}${BOLD}[3]${NC} ${WHITE}Business${NC}"
    echo -e "      ${DIM}+ CRM + Monitoring${NC}"
    echo -e "      ${DIM}12 services • For managing customers & operations${NC}"
    echo ""
    echo -e "  ${YELLOW}${BOLD}[4]${NC} ${WHITE}Developer${NC}"
    echo -e "      ${DIM}+ Knowledge graphs + Vector database${NC}"
    echo -e "      ${DIM}11 services • For building AI applications${NC}"
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
                SELECTED_MODULES=("automation" "chat" "research" "cms" "pdf")
                return
                ;;
            3)
                SELECTED_PRESET="business"
                SELECTED_MODULES=("automation" "chat" "cms" "crm" "pdf" "monitoring")
                return
                ;;
            4)
                SELECTED_PRESET="developer"
                SELECTED_MODULES=("automation" "chat" "knowledge" "vector" "admin")
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
    echo -e "  ${GREEN}✓${NC} PostgreSQL (database)"
    echo -e "  ${GREEN}✓${NC} Redis (caching)"
    echo -e "  ${GREEN}✓${NC} Ollama (local AI)"
    echo -e "  ${GREEN}✓${NC} Portainer (Docker management)"
    echo ""
    echo -e "  ${WHITE}Select additional modules (enter letters, e.g., 'a b f'):${NC}"
    echo ""
    echo -e "  ${CYAN}[A]${NC} Workflow Automation (n8n)"
    echo -e "      ${DIM}Automate tasks, connect apps, build workflows${NC}"
    echo ""
    echo -e "  ${CYAN}[B]${NC} AI Chat Interface (Open WebUI)"
    echo -e "      ${DIM}ChatGPT-like interface for your local AI${NC}"
    echo ""
    echo -e "  ${CYAN}[C]${NC} Document Research (Local NotebookLM)"
    echo -e "      ${DIM}Upload PDFs, ask questions, generate summaries${NC}"
    echo ""
    echo -e "  ${CYAN}[D]${NC} Content Management (Strapi CMS)"
    echo -e "      ${DIM}Manage blog posts, pages, and content${NC}"
    echo ""
    echo -e "  ${CYAN}[E]${NC} Customer Management (EspoCRM)"
    echo -e "      ${DIM}Track contacts, deals, and customers${NC}"
    echo ""
    echo -e "  ${CYAN}[F]${NC} PDF Tools (chamPDF)"
    echo -e "      ${DIM}Merge, split, convert, and edit PDFs${NC}"
    echo ""
    echo -e "  ${CYAN}[G]${NC} Knowledge Graphs (FalkorDB + Graphiti)"
    echo -e "      ${DIM}AI memory and relationship tracking${NC}"
    echo ""
    echo -e "  ${CYAN}[H]${NC} Vector Search (Qdrant)"
    echo -e "      ${DIM}Semantic search and RAG capabilities${NC}"
    echo ""
    echo -e "  ${CYAN}[I]${NC} Monitoring (Uptime Kuma)"
    echo -e "      ${DIM}Monitor service uptime and health${NC}"
    echo ""
    echo -e "  ${CYAN}[J]${NC} Database Admin (Adminer)"
    echo -e "      ${DIM}Visual interface to manage databases${NC}"
    echo ""
    echo ""

    echo -ne "  ${CYAN}Enter module letters (e.g., 'a b f') or 'all':${NC} "
    read -r selection

    # Parse selection
    SELECTED_MODULES=()
    selection=$(echo "$selection" | tr '[:upper:]' '[:lower:]')

    if [[ "$selection" == "all" ]]; then
        SELECTED_MODULES=("automation" "chat" "research" "cms" "crm" "pdf" "knowledge" "vector" "monitoring" "admin")
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
            esac
        done
    fi

    # Always recommend at least automation and chat
    if [ ${#SELECTED_MODULES[@]} -eq 0 ]; then
        echo ""
        echo -e "  ${YELLOW}No modules selected. Adding recommended: n8n + Open WebUI + chamPDF${NC}"
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
    echo -e "  ${GREEN}Core Services:${NC}"
    echo -e "    • PostgreSQL (database)"
    echo -e "    • Redis (caching)"
    echo -e "    • Ollama (local AI)"
    echo -e "    • Portainer (Docker management)"
    echo ""

    if [ ${#SELECTED_MODULES[@]} -gt 0 ]; then
        echo -e "  ${CYAN}Selected Modules:${NC}"
        for module in "${SELECTED_MODULES[@]}"; do
            case $module in
                automation) echo -e "    • n8n (workflow automation)" ;;
                chat) echo -e "    • Open WebUI (AI chat)" ;;
                research) echo -e "    • Local NotebookLM (document research)" ;;
                cms) echo -e "    • Strapi CMS (content management)" ;;
                crm) echo -e "    • EspoCRM (customer management)" ;;
                pdf) echo -e "    • chamPDF (PDF tools)" ;;
                knowledge) echo -e "    • FalkorDB + Graphiti (knowledge graphs)" ;;
                vector) echo -e "    • Qdrant (vector search)" ;;
                monitoring) echo -e "    • Uptime Kuma (monitoring)" ;;
                admin) echo -e "    • Adminer (database admin)" ;;
            esac
        done
        echo ""
    fi

    local total_services=$((4 + ${#SELECTED_MODULES[@]}))
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

    if [ -f .env ]; then
        print_info "Found existing configuration"
        echo ""
        echo -ne "  ${CYAN}Keep existing settings? [Y/n]:${NC} "
        read -r keep
        keep=${keep:-Y}

        if [[ "$keep" =~ ^[Yy]$ ]]; then
            print_success "Keeping existing configuration"
            return
        else
            cp .env ".env.backup.$(date +%Y%m%d_%H%M%S)"
            print_info "Backed up existing configuration"
        fi
    fi

    print_info "Creating secure configuration..."
    cp .env.example .env

    # Generate core passwords
    local postgres_pwd=$(generate_password)
    sed -i.bak "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$postgres_pwd/" .env
    print_success "Generated database password"

    # Generate n8n encryption key (if automation module selected)
    if [[ " ${SELECTED_MODULES[*]} " =~ " automation " ]]; then
        local n8n_key=$(generate_key)
        sed -i.bak "s/^N8N_ENCRYPTION_KEY=.*/N8N_ENCRYPTION_KEY=$n8n_key/" .env
        print_success "Generated n8n encryption key"
    fi

    # Generate Strapi secrets (if cms module selected)
    if [[ " ${SELECTED_MODULES[*]} " =~ " cms " ]]; then
        local strapi_jwt=$(generate_key)
        local strapi_admin=$(generate_key)
        local strapi_keys="$(generate_key),$(generate_key)"
        sed -i.bak "s/^STRAPI_JWT_SECRET=.*/STRAPI_JWT_SECRET=$strapi_jwt/" .env
        sed -i.bak "s/^STRAPI_ADMIN_JWT_SECRET=.*/STRAPI_ADMIN_JWT_SECRET=$strapi_admin/" .env
        sed -i.bak "s/^STRAPI_APP_KEYS=.*/STRAPI_APP_KEYS=$strapi_keys/" .env
        print_success "Generated Strapi secrets"
    fi

    # Generate CRM passwords (if crm module selected)
    if [[ " ${SELECTED_MODULES[*]} " =~ " crm " ]]; then
        local maria_root=$(generate_password)
        local maria_pwd=$(generate_password)
        local espo_pwd=$(generate_password)
        sed -i.bak "s/^MARIADB_ROOT_PASSWORD=.*/MARIADB_ROOT_PASSWORD=$maria_root/" .env
        sed -i.bak "s/^ESPOCRM_DB_PASSWORD=.*/ESPOCRM_DB_PASSWORD=$maria_pwd/" .env
        sed -i.bak "s/^ESPOCRM_ADMIN_PASSWORD=.*/ESPOCRM_ADMIN_PASSWORD=$espo_pwd/" .env
        print_success "Generated CRM passwords"
    fi

    # Clean up backup files
    rm -f .env.bak

    print_success "Configuration complete!"
}

# =============================================================================
# DOCKER OPERATIONS
# =============================================================================

build_compose_command() {
    local cmd="docker compose -f docker-compose.yml"

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
        if docker compose exec -T postgres pg_isready -U deepkit &>/dev/null 2>&1; then
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

    # Download an AI model if chat module is selected
    if [[ " ${SELECTED_MODULES[*]} " =~ " chat " ]]; then
        echo ""
        print_info "Downloading AI model (llama3.2)..."
        echo -e "  ${DIM}This is a one-time download and may take a few minutes.${NC}"

        sleep 5  # Wait for Ollama to be ready
        docker compose exec -T ollama ollama pull llama3.2:latest 2>&1 | tail -5 || true

        print_success "AI model ready!"
    fi
}

# =============================================================================
# COMPLETION
# =============================================================================

show_completion() {
    clear_screen
    print_banner

    echo ""
    echo -e "  ${GREEN}${BOLD}Installation Complete!${NC}"
    echo ""
    echo -e "  ${WHITE}Your services are now running. Here's how to access them:${NC}"
    echo ""

    # Always show core
    echo -e "  ${PURPLE}${BOLD}Core Services:${NC}"
    echo -e "    Portainer (Docker UI)  ${BLUE}http://localhost:9000${NC}"
    echo ""

    # Show module-specific services
    for module in "${SELECTED_MODULES[@]}"; do
        case $module in
            automation)
                echo -e "  ${CYAN}${BOLD}Workflow Automation:${NC}"
                echo -e "    n8n                    ${BLUE}http://localhost:5678${NC}"
                echo ""
                ;;
            chat)
                echo -e "  ${CYAN}${BOLD}AI Chat:${NC}"
                echo -e "    Open WebUI             ${BLUE}http://localhost:3001${NC}"
                echo ""
                ;;
            research)
                echo -e "  ${CYAN}${BOLD}Document Research:${NC}"
                echo -e "    Local NotebookLM       ${BLUE}http://localhost:3002${NC}"
                echo ""
                ;;
            cms)
                echo -e "  ${CYAN}${BOLD}Content Management:${NC}"
                echo -e "    Strapi CMS             ${BLUE}http://localhost:3003${NC}"
                echo ""
                ;;
            crm)
                echo -e "  ${CYAN}${BOLD}Customer Management:${NC}"
                echo -e "    EspoCRM                ${BLUE}http://localhost:3004${NC}"
                echo -e "    ${DIM}Login: admin / (see .env for password)${NC}"
                echo ""
                ;;
            pdf)
                echo -e "  ${CYAN}${BOLD}PDF Tools:${NC}"
                echo -e "    chamPDF                ${BLUE}http://localhost:3005${NC}"
                echo ""
                ;;
            knowledge)
                echo -e "  ${CYAN}${BOLD}Knowledge Graphs:${NC}"
                echo -e "    FalkorDB Browser       ${BLUE}http://localhost:3011${NC}"
                echo -e "    Graphiti API           ${BLUE}http://localhost:8000${NC}"
                echo ""
                ;;
            vector)
                echo -e "  ${CYAN}${BOLD}Vector Search:${NC}"
                echo -e "    Qdrant                 ${BLUE}http://localhost:6333${NC}"
                echo ""
                ;;
            monitoring)
                echo -e "  ${CYAN}${BOLD}Monitoring:${NC}"
                echo -e "    Uptime Kuma            ${BLUE}http://localhost:9002${NC}"
                echo ""
                ;;
            admin)
                echo -e "  ${CYAN}${BOLD}Database Admin:${NC}"
                echo -e "    Adminer                ${BLUE}http://localhost:9003${NC}"
                echo ""
                ;;
        esac
    done

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
                echo "Deep Starter Kit Installer"
                echo ""
                echo "Usage: ./install.sh [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --preset NAME    Install a preset (minimal, creator, business, developer)"
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
                SELECTED_MODULES=("automation" "chat" "research" "cms" "pdf")
                ;;
            business)
                SELECTED_PRESET="business"
                SELECTED_MODULES=("automation" "chat" "cms" "crm" "pdf" "monitoring")
                ;;
            developer)
                SELECTED_PRESET="developer"
                SELECTED_MODULES=("automation" "chat" "knowledge" "vector" "admin")
                ;;
            full)
                SELECTED_PRESET="full"
                SELECTED_MODULES=("automation" "chat" "research" "cms" "crm" "pdf" "knowledge" "vector" "monitoring" "admin")
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

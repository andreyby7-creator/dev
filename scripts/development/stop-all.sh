#!/bin/bash
# Использование: ./scripts/devops/stop-all.sh
# Command: cd /home/boss/Projects/dev && ./scripts/stop-all.sh

# Stop All Services Script
# Usage: ./scripts/stop-all.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_PORT=3001
WEB_PORT=3000

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

stop_process_on_port() {
    local port=$1
    local service_name=$2
    
    if lsof -ti:$port > /dev/null 2>&1; then
        log "Stopping $service_name on port $port..."
        lsof -ti:$port | xargs kill -9
        success "$service_name stopped on port $port"
    else
        warning "$service_name is not running on port $port"
    fi
}

stop_pnpm_processes() {
    log "Stopping all pnpm processes..."
    
    # Stop pnpm processes
    if pgrep -f "pnpm" > /dev/null; then
        pkill -f "pnpm"
        success "All pnpm processes stopped"
    else
        warning "No pnpm processes found"
    fi
    
    # Stop node processes related to our project
    if pgrep -f "nest start" > /dev/null; then
        pkill -f "nest start"
        success "NestJS processes stopped"
    fi
    
    if pgrep -f "next dev" > /dev/null; then
        pkill -f "next dev"
        success "Next.js processes stopped"
    fi
}

cleanup_pid_files() {
    log "Cleaning up PID files..."
    
    # Remove PID files if they exist
    rm -f /tmp/api.pid
    rm -f /tmp/web.pid
    rm -f /tmp/dev.pid
    
    success "PID files cleaned up"
}

show_status() {
    log "Services Status:"
    echo "----------------------------------------"
    
    if lsof -ti:$API_PORT > /dev/null 2>&1; then
        error "API Server: Still running on port $API_PORT"
    else
        success "API Server: Stopped"
    fi
    
    if lsof -ti:$WEB_PORT > /dev/null 2>&1; then
        error "Web Server: Still running on port $WEB_PORT"
    else
        success "Web Server: Stopped"
    fi
    
    echo "----------------------------------------"
}

# Main execution
log "🛑 Stopping all SaleSpot BY services..."

# Stop services on specific ports
stop_process_on_port $API_PORT "API Server"
stop_process_on_port $WEB_PORT "Web Server"

# Stop pnpm processes
stop_pnpm_processes

# Cleanup
cleanup_pid_files

# Show final status
show_status

success "All services stopped successfully!"

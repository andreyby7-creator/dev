#!/bin/bash
# Использование: ./scripts/devops/status.sh [--detailed]
# Command: cd /home/boss/Projects/dev && ./scripts/status.sh

# Status Check Script
# Usage: ./scripts/status.sh

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

check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

check_health() {
    local port=$1
    local service=$2
    
    if check_port $port; then
        # Try to get health status
        if curl -s "http://localhost:$port/api/v1/health" > /dev/null 2>&1; then
            success "$service: Running and healthy on port $port"
        else
            warning "$service: Running on port $port but health check failed"
        fi
    else
        error "$service: Not running on port $port"
    fi
}

show_detailed_status() {
    log "📊 Detailed Services Status:"
    echo "========================================"
    
    # API Status
    check_health $API_PORT "API Server"
    
    # Web Status
    if check_port $WEB_PORT; then
        success "Web Server: Running on port $WEB_PORT"
    else
        error "Web Server: Not running on port $WEB_PORT"
    fi
    
    echo "========================================"
    echo "Process Information:"
    
    # Show pnpm processes
    if pgrep -f "pnpm" > /dev/null; then
        log "PNPM Processes:"
        pgrep -f "pnpm" | xargs ps -o pid,ppid,cmd --no-headers
    else
        warning "No PNPM processes found"
    fi
    
    # Show Node processes
    if pgrep -f "nest start\|next dev" > /dev/null; then
        log "Node.js Processes:"
        pgrep -f "nest start\|next dev" | xargs ps -o pid,ppid,cmd --no-headers
    else
        warning "No Node.js processes found"
    fi
    
    echo "========================================"
    echo "Port Usage:"
    
    # Check all ports
    for port in 3000 3001 3002 3003 3004 3005; do
        if lsof -ti:$port > /dev/null 2>&1; then
            local process=$(lsof -ti:$port | xargs ps -o cmd --no-headers | head -1)
            log "Port $port: In use by $process"
        fi
    done
    
    echo "========================================"
}

show_quick_status() {
    log "📋 Quick Status:"
    echo "----------------------------------------"
    
    if check_port $API_PORT; then
        success "API: Running on port $API_PORT"
    else
        error "API: Not running"
    fi
    
    if check_port $WEB_PORT; then
        success "Web: Running on port $WEB_PORT"
    else
        error "Web: Not running"
    fi
    
    echo "----------------------------------------"
}

# Main execution
if [ "$1" = "--detailed" ] || [ "$1" = "-d" ]; then
    show_detailed_status
else
    show_quick_status
fi

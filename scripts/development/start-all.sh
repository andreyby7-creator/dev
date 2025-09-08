#!/bin/bash
# Использование: ./scripts/devops/start-all.sh
# Command: cd /home/boss/Projects/dev && ./scripts/start-all.sh

# Start All Services Script
# Usage: ./scripts/start-all.sh

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

wait_for_service() {
    local port=$1
    local service=$2
    local max_attempts=30
    local attempt=1
    
    log "Waiting for $service to be ready on port $port..."
    
    while [ $attempt -le $max_attempts ]; do
        if check_port $port; then
            success "$service is ready on port $port"
            return 0
        fi
        
        log "Attempt $attempt/$max_attempts: $service not ready yet..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    error "$service failed to start on port $port after $max_attempts attempts"
    return 1
}

start_services() {
    log "🚀 Starting all SaleSpot BY services..."
    
    # Change to project directory
    cd /home/boss/Projects/dev
    
    # Check if services are already running
    if check_port $API_PORT; then
        warning "API is already running on port $API_PORT"
    else
        log "Starting API server on port $API_PORT..."
        pnpm run dev:parallel > /dev/null 2>&1 &
        echo $! > /tmp/dev.pid
        wait_for_service $API_PORT "API"
    fi
    
    if check_port $WEB_PORT; then
        warning "Web is already running on port $WEB_PORT"
    else
        log "Starting Web server on port $WEB_PORT..."
        # Web will start automatically with dev:parallel
        wait_for_service $WEB_PORT "Web"
    fi
    
    success "All services started successfully!"
    
    # Show status
    show_status
}

show_status() {
    log "Services Status:"
    echo "----------------------------------------"
    
    if check_port $API_PORT; then
        success "API Server: Running on port $API_PORT"
        echo "  - Health: http://localhost:$API_PORT/api/v1/health"
        echo "  - Swagger: http://localhost:$API_PORT/docs"
    else
        error "API Server: Not running"
    fi
    
    if check_port $WEB_PORT; then
        success "Web Server: Running on port $WEB_PORT"
        echo "  - Frontend: http://localhost:$WEB_PORT"
    else
        error "Web Server: Not running"
    fi
    
    echo "----------------------------------------"
    echo "Observability Endpoints:"
    echo "  - System Dashboard: http://localhost:$API_PORT/api/v1/observability/dashboard/system"
    echo "  - Business Dashboard: http://localhost:$API_PORT/api/v1/observability/dashboard/business"
    echo "  - Metrics: http://localhost:$API_PORT/api/v1/observability/metrics"
    echo "  - Logs: http://localhost:$API_PORT/api/v1/observability/logs"
    echo "  - Traces: http://localhost:$API_PORT/api/v1/observability/traces"
    echo "----------------------------------------"
}

# Main execution
start_services

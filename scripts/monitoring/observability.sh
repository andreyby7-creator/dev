#!/bin/bash
# Использование: ./scripts/monitoring/observability.sh

# Observability Management Script
# Usage: ./scripts/observability.sh [start|stop|restart|status|test|cleanup]

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
ELASTICSEARCH_PORT=9200
KIBANA_PORT=5601
JAEGER_PORT=16686
PROMETHEUS_PORT=9090
GRAFANA_PORT=3000

# Log file
LOG_FILE="/tmp/observability.log"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
}

check_port() {
    local port=$1
    local service=$2
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
        if check_port $port $service; then
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

start_observability() {
    log "Starting Observability Stack..."
    
    # Check if already running
    if check_port $API_PORT "API"; then
        warning "API is already running on port $API_PORT"
    else
        log "Starting API server..."
        cd /home/boss/Projects/dev
        npm run start:api > /dev/null 2>&1 &
        echo $! > /tmp/api.pid
        wait_for_service $API_PORT "API"
    fi
    
    # Check if web is running
    if check_port $WEB_PORT "Web"; then
        warning "Web is already running on port $WEB_PORT"
    else
        log "Starting Web server..."
        cd /home/boss/Projects/dev
        npm run start:web > /dev/null 2>&1 &
        echo $! > /tmp/web.pid
        wait_for_service $WEB_PORT "Web"
    fi
    
    success "Observability stack started successfully!"
    
    # Display status
    show_status
}

stop_observability() {
    log "Stopping Observability Stack..."
    
    # Stop API
    if [ -f /tmp/api.pid ]; then
        local api_pid=$(cat /tmp/api.pid)
        if kill -0 $api_pid 2>/dev/null; then
            log "Stopping API server (PID: $api_pid)..."
            kill $api_pid
            rm /tmp/api.pid
            success "API server stopped"
        else
            warning "API server not running"
            rm -f /tmp/api.pid
        fi
    fi
    
    # Stop Web
    if [ -f /tmp/web.pid ]; then
        local web_pid=$(cat /tmp/web.pid)
        if kill -0 $web_pid 2>/dev/null; then
            log "Stopping Web server (PID: $web_pid)..."
            kill $web_pid
            rm /tmp/web.pid
            success "Web server stopped"
        else
            warning "Web server not running"
            rm -f /tmp/web.pid
        fi
    fi
    
    # Kill any remaining processes on our ports
    for port in $API_PORT $WEB_PORT; do
        local pids=$(lsof -ti:$port 2>/dev/null || true)
        if [ ! -z "$pids" ]; then
            log "Killing remaining processes on port $port..."
            echo $pids | xargs kill -9
        fi
    done
    
    success "Observability stack stopped successfully!"
}

restart_observability() {
    log "Restarting Observability Stack..."
    stop_observability
    sleep 2
    start_observability
}

show_status() {
    log "Observability Stack Status:"
    echo "----------------------------------------"
    
    # API Status
    if check_port $API_PORT "API"; then
        success "API Server: Running on port $API_PORT"
        echo "  - Health: http://localhost:$API_PORT/observability/health"
        echo "  - Metrics: http://localhost:$API_PORT/observability/metrics"
        echo "  - Prometheus: http://localhost:$API_PORT/observability/metrics/prometheus"
        echo "  - Swagger: http://localhost:$API_PORT/api"
    else
        error "API Server: Not running"
    fi
    
    # Web Status
    if check_port $WEB_PORT "Web"; then
        success "Web Server: Running on port $WEB_PORT"
        echo "  - Frontend: http://localhost:$WEB_PORT"
    else
        error "Web Server: Not running"
    fi
    
    echo "----------------------------------------"
    echo "Observability Endpoints:"
    echo "  - System Dashboard: http://localhost:$API_PORT/observability/dashboard/system"
    echo "  - Business Dashboard: http://localhost:$API_PORT/observability/dashboard/business"
    echo "  - Logs: http://localhost:$API_PORT/observability/logs"
    echo "  - Traces: http://localhost:$API_PORT/observability/traces"
    echo "  - Jaeger Health: http://localhost:$API_PORT/observability/jaeger/health"
    echo "  - Elasticsearch Health: http://localhost:$API_PORT/observability/elasticsearch/health"
    echo "  - System Status: http://localhost:$API_PORT/observability/test/status"
    echo "----------------------------------------"
}

run_tests() {
    log "Running Observability Tests..."
    
    if ! check_port $API_PORT "API"; then
        error "API server is not running. Please start it first."
        return 1
    fi
    
    local base_url="http://localhost:$API_PORT/observability"
    
    # Test health endpoint
    log "Testing health endpoint..."
    if curl -s "$base_url/health" > /dev/null; then
        success "Health endpoint: OK"
    else
        error "Health endpoint: FAILED"
    fi
    
    # Test metrics endpoint
    log "Testing metrics endpoint..."
    if curl -s "$base_url/metrics" > /dev/null; then
        success "Metrics endpoint: OK"
    else
        error "Metrics endpoint: FAILED"
    fi
    
    # Test comprehensive test
    log "Running comprehensive test..."
    if curl -s -X POST "$base_url/test/comprehensive" > /dev/null; then
        success "Comprehensive test: OK"
    else
        error "Comprehensive test: FAILED"
    fi
    
    # Test system status
    log "Testing system status..."
    if curl -s "$base_url/test/status" > /dev/null; then
        success "System status: OK"
    else
        error "System status: FAILED"
    fi
    
    success "All tests completed!"
}

cleanup_data() {
    log "Cleaning up observability data..."
    
    if ! check_port $API_PORT "API"; then
        error "API server is not running. Please start it first."
        return 1
    fi
    
    local base_url="http://localhost:$API_PORT/observability"
    
    # Clear logs
    log "Clearing logs..."
    if curl -s -X DELETE "$base_url/logs" > /dev/null; then
        success "Logs cleared"
    else
        error "Failed to clear logs"
    fi
    
    # Clear traces
    log "Clearing traces..."
    if curl -s -X DELETE "$base_url/traces" > /dev/null; then
        success "Traces cleared"
    else
        error "Failed to clear traces"
    fi
    
    # Clear Elasticsearch logs
    log "Clearing Elasticsearch logs..."
    if curl -s -X DELETE "$base_url/elasticsearch/cleanup?daysToKeep=0" > /dev/null; then
        success "Elasticsearch logs cleared"
    else
        error "Failed to clear Elasticsearch logs"
    fi
    
    # Clear Jaeger traces
    log "Clearing Jaeger traces..."
    if curl -s -X DELETE "$base_url/jaeger/cleanup?maxAge=0" > /dev/null; then
        success "Jaeger traces cleared"
    else
        error "Failed to clear Jaeger traces"
    fi
    
    success "Data cleanup completed!"
}

generate_test_data() {
    log "Generating test data..."
    
    if ! check_port $API_PORT "API"; then
        error "API server is not running. Please start it first."
        return 1
    fi
    
    local base_url="http://localhost:$API_PORT/observability"
    
    # Generate metrics
    log "Generating test metrics..."
    if curl -s -X POST "$base_url/test/metrics-generation?users=100&transactions=200" > /dev/null; then
        success "Test metrics generated"
    else
        error "Failed to generate test metrics"
    fi
    
    # Simulate load
    log "Simulating load..."
    if curl -s -X POST "$base_url/test/load-simulation?requests=50&delay=50" > /dev/null; then
        success "Load simulation completed"
    else
        error "Failed to simulate load"
    fi
    
    success "Test data generation completed!"
}

show_help() {
    echo "Observability Management Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start     - Start the observability stack (API + Web)"
    echo "  stop      - Stop the observability stack"
    echo "  restart   - Restart the observability stack"
    echo "  status    - Show status of all services"
    echo "  test      - Run observability tests"
    echo "  cleanup   - Clean up all observability data"
    echo "  generate  - Generate test data"
    echo "  help      - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start      # Start all services"
    echo "  $0 status     # Check service status"
    echo "  $0 test       # Run tests"
    echo "  $0 cleanup    # Clean up data"
}

# Main script logic
case "${1:-help}" in
    start)
        start_observability
        ;;
    stop)
        stop_observability
        ;;
    restart)
        restart_observability
        ;;
    status)
        show_status
        ;;
    test)
        run_tests
        ;;
    cleanup)
        cleanup_data
        ;;
    generate)
        generate_test_data
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac

#!/bin/bash
# Использование: ./scripts/monitoring/monitor.sh

# System Monitoring Script
# Usage: ./scripts/monitor.sh [status|metrics|alerts|logs|performance]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
API_PORT=3001
WEB_PORT=3000
LOG_FILE="/tmp/monitor.log"

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

info() {
    echo -e "${CYAN}ℹ️  $1${NC}" | tee -a "$LOG_FILE"
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

get_system_metrics() {
    log "Collecting system metrics..."
    
    # CPU Usage
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    info "CPU Usage: ${cpu_usage}%"
    
    # Memory Usage
    local mem_info=$(free -m | grep Mem)
    local mem_total=$(echo $mem_info | awk '{print $2}')
    local mem_used=$(echo $mem_info | awk '{print $3}')
    local mem_usage=$((mem_used * 100 / mem_total))
    info "Memory Usage: ${mem_usage}% (${mem_used}MB / ${mem_total}MB)"
    
    # Disk Usage
    local disk_usage=$(df -h / | tail -1 | awk '{print $5}' | cut -d'%' -f1)
    info "Disk Usage: ${disk_usage}%"
    
    # Load Average
    local load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | cut -d',' -f1)
    info "Load Average: ${load_avg}"
    
    # Network Connections
    local connections=$(netstat -an | grep ESTABLISHED | wc -l)
    info "Active Connections: ${connections}"
    
    # Process Count
    local processes=$(ps aux | wc -l)
    info "Running Processes: ${processes}"
}

get_application_metrics() {
    log "Collecting application metrics..."
    
    if ! check_port $API_PORT "API"; then
        error "API server is not running"
        return 1
    fi
    
    local base_url="http://localhost:$API_PORT/observability"
    
    # Get health status
    log "Fetching health status..."
    local health_response=$(curl -s "$base_url/health" 2>/dev/null || echo "{}")
    if [ "$health_response" != "{}" ]; then
        success "Health endpoint accessible"
        echo "Health Status: $health_response" | head -c 100
        echo "..."
    else
        error "Health endpoint not accessible"
    fi
    
    # Get metrics
    log "Fetching metrics..."
    local metrics_response=$(curl -s "$base_url/metrics" 2>/dev/null || echo "{}")
    if [ "$metrics_response" != "{}" ]; then
        success "Metrics endpoint accessible"
        echo "Metrics available"
    else
        error "Metrics endpoint not accessible"
    fi
    
    # Get system dashboard
    log "Fetching system dashboard..."
    local dashboard_response=$(curl -s "$base_url/dashboard/system" 2>/dev/null || echo "{}")
    if [ "$dashboard_response" != "{}" ]; then
        success "System dashboard accessible"
    else
        error "System dashboard not accessible"
    fi
}

check_alerts() {
    log "Checking for alerts..."
    
    # CPU Alert
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    if (( $(echo "$cpu_usage > 80" | bc -l) )); then
        warning "High CPU usage: ${cpu_usage}%"
    fi
    
    # Memory Alert
    local mem_info=$(free -m | grep Mem)
    local mem_total=$(echo $mem_info | awk '{print $2}')
    local mem_used=$(echo $mem_info | awk '{print $3}')
    local mem_usage=$((mem_used * 100 / mem_total))
    if [ $mem_usage -gt 80 ]; then
        warning "High memory usage: ${mem_usage}%"
    fi
    
    # Disk Alert
    local disk_usage=$(df -h / | tail -1 | awk '{print $5}' | cut -d'%' -f1)
    if [ $disk_usage -gt 80 ]; then
        warning "High disk usage: ${disk_usage}%"
    fi
    
    # Service Alerts
    if ! check_port $API_PORT "API"; then
        error "ALERT: API server is down!"
    fi
    
    if ! check_port $WEB_PORT "Web"; then
        error "ALERT: Web server is down!"
    fi
    
    # Check for error logs
    local error_count=$(tail -n 100 /tmp/observability.log 2>/dev/null | grep -c "ERROR\|error" || echo "0")
    if [ $error_count -gt 10 ]; then
        warning "High error count in logs: ${error_count} errors in last 100 lines"
    fi
}

show_logs() {
    log "Recent logs:"
    echo "----------------------------------------"
    
    # System logs
    echo "System Logs (last 10 lines):"
    journalctl -n 10 --no-pager 2>/dev/null || echo "No system logs available"
    echo ""
    
    # Application logs
    if [ -f /tmp/observability.log ]; then
        echo "Application Logs (last 20 lines):"
        tail -n 20 /tmp/observability.log
    else
        echo "No application logs available"
    fi
    
    echo "----------------------------------------"
}

show_performance() {
    log "Performance Analysis:"
    echo "----------------------------------------"
    
    # Response time test
    if check_port $API_PORT "API"; then
        log "Testing API response time..."
        local start_time=$(date +%s%N)
        curl -s "http://localhost:$API_PORT/observability/health" > /dev/null
        local end_time=$(date +%s%N)
        local response_time=$(( (end_time - start_time) / 1000000 ))
        info "API Response Time: ${response_time}ms"
        
        if [ $response_time -gt 1000 ]; then
            warning "Slow response time detected"
        fi
    fi
    
    # Process analysis
    echo "Top processes by CPU usage:"
    ps aux --sort=-%cpu | head -6
    
    echo ""
    echo "Top processes by memory usage:"
    ps aux --sort=-%mem | head -6
    
    echo "----------------------------------------"
}

show_status() {
    log "System Status Overview:"
    echo "========================================"
    
    # Service Status
    echo "Service Status:"
    if check_port $API_PORT "API"; then
        success "API Server: Running on port $API_PORT"
    else
        error "API Server: Not running"
    fi
    
    if check_port $WEB_PORT "Web"; then
        success "Web Server: Running on port $WEB_PORT"
    else
        error "Web Server: Not running"
    fi
    
    echo ""
    
    # System Metrics
    get_system_metrics
    
    echo ""
    
    # Application Metrics
    get_application_metrics
    
    echo "========================================"
}

continuous_monitoring() {
    log "Starting continuous monitoring (Ctrl+C to stop)..."
    echo "Press Ctrl+C to stop monitoring"
    echo ""
    
    while true; do
        clear
        show_status
        check_alerts
        echo ""
        echo "Next update in 30 seconds..."
        sleep 30
    done
}

show_help() {
    echo "System Monitoring Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  status     - Show system status overview"
    echo "  metrics    - Show detailed system metrics"
    echo "  alerts     - Check for system alerts"
    echo "  logs       - Show recent logs"
    echo "  performance - Show performance analysis"
    echo "  watch      - Start continuous monitoring"
    echo "  help       - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 status      # Show system status"
    echo "  $0 metrics     # Show metrics"
    echo "  $0 alerts      # Check alerts"
    echo "  $0 watch       # Start monitoring"
}

# Main script logic
case "${1:-help}" in
    status)
        show_status
        ;;
    metrics)
        get_system_metrics
        echo ""
        get_application_metrics
        ;;
    alerts)
        check_alerts
        ;;
    logs)
        show_logs
        ;;
    performance)
        show_performance
        ;;
    watch)
        continuous_monitoring
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

#!/bin/bash

# Blue-Green Deployment Script for SaleSpot BY
# Usage: ./scripts/deployment/blue-green-deploy.sh [blue|green] [api|web|all]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCKER_COMPOSE_FILE="infrastructure/docker/docker-compose.blue-green.yml"
HEALTH_CHECK_TIMEOUT=300  # 5 minutes
ROLLBACK_TIMEOUT=60       # 1 minute

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Check if Docker and Docker Compose are available
check_prerequisites() {
    log "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
        exit 1
    fi
    
    if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
        error "Docker Compose file not found: $DOCKER_COMPOSE_FILE"
        exit 1
    fi
    
    log "Prerequisites check passed"
}

# Get current active environment
get_active_environment() {
    local api_status=$(docker-compose -f "$DOCKER_COMPOSE_FILE" ps -q api-blue 2>/dev/null | wc -l)
    local web_status=$(docker-compose -f "$DOCKER_COMPOSE_FILE" ps -q web-blue 2>/dev/null | wc -l)
    
    if [ "$api_status" -gt 0 ] && [ "$web_status" -gt 0 ]; then
        echo "blue"
    else
        echo "green"
    fi
}

# Health check function
health_check() {
    local service=$1
    local port=$2
    local timeout=$3
    local start_time=$(date +%s)
    
    log "Performing health check for $service on port $port..."
    
    while [ $(($(date +%s) - start_time)) -lt $timeout ]; do
        if curl -f -s "http://localhost:$port/health" > /dev/null 2>&1; then
            log "Health check passed for $service"
            return 0
        fi
        
        warn "Health check failed for $service, retrying in 5 seconds..."
        sleep 5
    done
    
    error "Health check failed for $service after $timeout seconds"
    return 1
}

# Deploy to specific environment
deploy_to_environment() {
    local environment=$1
    local service=$2
    
    log "Deploying to $environment environment..."
    
    case $service in
        "api")
            deploy_api "$environment"
            ;;
        "web")
            deploy_web "$environment"
            ;;
        "all")
            deploy_api "$environment"
            deploy_web "$environment"
            ;;
        *)
            error "Invalid service: $service. Use: api, web, or all"
            exit 1
            ;;
    esac
}

# Deploy API service
deploy_api() {
    local environment=$1
    
    log "Deploying API to $environment environment..."
    
    # Build new image
    docker-compose -f "$DOCKER_COMPOSE_FILE" build "api-$environment"
    
    # Scale up new environment
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d --scale "api-$environment=2" --no-deps "api-$environment"
    
    # Health check
    local port
    if [ "$environment" = "blue" ]; then
        port=3001
    else
        port=3002
    fi
    
    if health_check "api-$environment" "$port" "$HEALTH_CHECK_TIMEOUT"; then
        log "API deployment to $environment successful"
        
        # Update nginx configuration
        update_nginx_config "$environment" "api"
        
        # Scale down old environment
        local old_env
        if [ "$environment" = "blue" ]; then
            old_env="green"
        else
            old_env="blue"
        fi
        
        docker-compose -f "$DOCKER_COMPOSE_FILE" up -d --scale "api-$old_env=0" --no-deps "api-$old_env"
        log "Switched API traffic to $environment environment"
    else
        error "API deployment to $environment failed"
        rollback_deployment "$environment" "api"
        exit 1
    fi
}

# Deploy Web service
deploy_web() {
    local environment=$1
    
    log "Deploying Web to $environment environment..."
    
    # Build new image
    docker-compose -f "$DOCKER_COMPOSE_FILE" build "web-$environment"
    
    # Scale up new environment
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d --scale "web-$environment=2" --no-deps "web-$environment"
    
    # Health check
    local port
    if [ "$environment" = "blue" ]; then
        port=3000
    else
        port=3003
    fi
    
    if health_check "web-$environment" "$port" "$HEALTH_CHECK_TIMEOUT"; then
        log "Web deployment to $environment successful"
        
        # Update nginx configuration
        update_nginx_config "$environment" "web"
        
        # Scale down old environment
        local old_env
        if [ "$environment" = "blue" ]; then
            old_env="green"
        else
            old_env="blue"
        fi
        
        docker-compose -f "$DOCKER_COMPOSE_FILE" up -d --scale "web-$old_env=0" --no-deps "web-$old_env"
        log "Switched Web traffic to $environment environment"
    else
        error "Web deployment to $environment failed"
        rollback_deployment "$environment" "web"
        exit 1
    fi
}

# Update nginx configuration
update_nginx_config() {
    local environment=$1
    local service=$2
    
    log "Updating nginx configuration for $service to $environment..."
    
    # Reload nginx configuration
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec nginx nginx -s reload
    
    log "Nginx configuration updated"
}

# Rollback deployment
rollback_deployment() {
    local environment=$1
    local service=$2
    
    warn "Rolling back $service deployment from $environment environment..."
    
    # Scale down failed environment
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d --scale "$service-$environment=0" --no-deps "$service-$environment"
    
    # Scale up previous environment
    local old_env
    if [ "$environment" = "blue" ]; then
        old_env="green"
    else
        old_env="blue"
    fi
    
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d --scale "$service-$old_env=2" --no-deps "$service-$old_env"
    
    # Update nginx configuration back
    update_nginx_config "$old_env" "$service"
    
    log "Rollback completed for $service"
}

# Main deployment function
main() {
    local target_env=$1
    local service=${2:-"all"}
    
    log "Starting Blue-Green deployment..."
    log "Target environment: $target_env"
    log "Service: $service"
    
    # Check prerequisites
    check_prerequisites
    
    # Get current active environment
    local current_env=$(get_active_environment)
    log "Current active environment: $current_env"
    
    # Validate target environment
    if [ "$target_env" != "blue" ] && [ "$target_env" != "green" ]; then
        error "Invalid environment: $target_env. Use: blue or green"
        exit 1
    fi
    
    # Check if we're already on target environment
    if [ "$current_env" = "$target_env" ]; then
        warn "Already on $target_env environment"
        exit 0
    fi
    
    # Perform deployment
    deploy_to_environment "$target_env" "$service"
    
    log "Blue-Green deployment completed successfully!"
    log "Active environment: $target_env"
}

# Script entry point
if [ $# -lt 1 ]; then
    echo "Usage: $0 [blue|green] [api|web|all]"
    echo "  blue|green: Target environment"
    echo "  api|web|all: Service to deploy (default: all)"
    exit 1
fi

main "$@"

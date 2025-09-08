#!/bin/bash
# Rollback Strategy Script for SaleSpot BY
# Usage: ./scripts/deployment/rollback.sh [api|web|all] [version]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Configuration
DOCKER_COMPOSE_FILE="infrastructure/docker/docker-compose.blue-green.yml"
BACKUP_DIR="/backups/deployments"
MAX_ROLLBACK_VERSIONS=10

# Check if service is provided
if [ $# -lt 1 ]; then
    error "Usage: $0 [api|web|all] [version]"
    error "Example: $0 api v1.2.3"
    exit 1
fi

SERVICE=$1
VERSION=${2:-"latest"}

# Validate service
if [[ ! "$SERVICE" =~ ^(api|web|all)$ ]]; then
    error "Invalid service: $SERVICE"
    error "Valid services: api, web, all"
    exit 1
fi

log "Starting rollback for service: $SERVICE, version: $VERSION"

# Function to check current deployment status
check_current_status() {
    log "Checking current deployment status..."
    
    # Check which environment is active
    if docker-compose -f "$DOCKER_COMPOSE_FILE" ps | grep -q "api-blue.*Up"; then
        CURRENT_ENV="blue"
    elif docker-compose -f "$DOCKER_COMPOSE_FILE" ps | grep -q "api-green.*Up"; then
        CURRENT_ENV="green"
    else
        error "No active deployment found"
        exit 1
    fi
    
    log "Current active environment: $CURRENT_ENV"
}

# Function to get available versions
get_available_versions() {
    log "Getting available versions for rollback..."
    
    if [ ! -d "$BACKUP_DIR" ]; then
        error "Backup directory not found: $BACKUP_DIR"
        exit 1
    fi
    
    # List available versions
    available_versions=$(find "$BACKUP_DIR" -name "*_${SERVICE}_*.tar.gz" -type f | sort -r | head -$MAX_ROLLBACK_VERSIONS)
    
    if [ -z "$available_versions" ]; then
        error "No backup versions found for service: $SERVICE"
        exit 1
    fi
    
    log "Available versions for rollback:"
    echo "$available_versions"
}

# Function to validate version
validate_version() {
    local version=$1
    
    if [ "$version" = "latest" ]; then
        # Get the latest version
        VERSION_FILE=$(find "$BACKUP_DIR" -name "*_${SERVICE}_*.tar.gz" -type f | sort -r | head -1)
        if [ -z "$VERSION_FILE" ]; then
            error "No backup versions found"
            exit 1
        fi
        VERSION=$(basename "$VERSION_FILE" .tar.gz | sed 's/.*_\([^_]*\)\.tar\.gz/\1/')
    else
        # Check if specific version exists
        VERSION_FILE=$(find "$BACKUP_DIR" -name "*_${SERVICE}_${version}.tar.gz" -type f | head -1)
        if [ -z "$VERSION_FILE" ]; then
            error "Version $version not found in backups"
            get_available_versions
            exit 1
        fi
    fi
    
    log "Rolling back to version: $VERSION"
}

# Function to create backup before rollback
create_pre_rollback_backup() {
    log "Creating backup before rollback..."
    
    local backup_name="pre_rollback_${SERVICE}_$(date +%Y%m%d_%H%M%S).tar.gz"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    # Create backup of current deployment
    if [ "$SERVICE" = "api" ] || [ "$SERVICE" = "all" ]; then
        docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T api-$CURRENT_ENV tar -czf - /app > "$backup_path" 2>/dev/null || true
    fi
    
    if [ "$SERVICE" = "web" ] || [ "$SERVICE" = "all" ]; then
        docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T web-$CURRENT_ENV tar -czf - /app >> "$backup_path" 2>/dev/null || true
    fi
    
    success "Pre-rollback backup created: $backup_path"
}

# Function to perform rollback
perform_rollback() {
    log "Performing rollback..."
    
    # Determine target environment (opposite of current)
    if [ "$CURRENT_ENV" = "blue" ]; then
        TARGET_ENV="green"
    else
        TARGET_ENV="blue"
    fi
    
    log "Rolling back to $TARGET_ENV environment"
    
    # Stop current deployment
    log "Stopping current deployment..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" stop "api-$CURRENT_ENV" "web-$CURRENT_ENV" 2>/dev/null || true
    
    # Restore from backup
    log "Restoring from backup..."
    if [ -f "$VERSION_FILE" ]; then
        # Extract backup to target environment
        if [ "$SERVICE" = "api" ] || [ "$SERVICE" = "all" ]; then
            docker-compose -f "$DOCKER_COMPOSE_FILE" up -d "api-$TARGET_ENV"
            docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T api-$TARGET_ENV tar -xzf - < "$VERSION_FILE"
        fi
        
        if [ "$SERVICE" = "web" ] || [ "$SERVICE" = "all" ]; then
            docker-compose -f "$DOCKER_COMPOSE_FILE" up -d "web-$TARGET_ENV"
            docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T web-$TARGET_ENV tar -xzf - < "$VERSION_FILE"
        fi
    else
        # Use Docker image rollback
        log "Using Docker image rollback..."
        if [ "$SERVICE" = "api" ] || [ "$SERVICE" = "all" ]; then
            docker-compose -f "$DOCKER_COMPOSE_FILE" up -d "api-$TARGET_ENV"
            docker tag "salespot-api:$VERSION" "salespot-api:current"
        fi
        
        if [ "$SERVICE" = "web" ] || [ "$SERVICE" = "all" ]; then
            docker-compose -f "$DOCKER_COMPOSE_FILE" up -d "web-$TARGET_ENV"
            docker tag "salespot-web:$VERSION" "salespot-web:current"
        fi
    fi
    
    # Health check
    log "Performing health check..."
    sleep 10
    
    if health_check "$TARGET_ENV"; then
        success "Rollback successful"
        
        # Update nginx configuration
        update_nginx_config "$TARGET_ENV"
        
        # Stop old environment
        docker-compose -f "$DOCKER_COMPOSE_FILE" stop "api-$CURRENT_ENV" "web-$CURRENT_ENV"
        
    else
        error "Health check failed, rolling back to previous version"
        rollback_to_previous
    fi
}

# Function to perform health check
health_check() {
    local env=$1
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        log "Health check attempt $attempt/$max_attempts for $env environment"
        
        # Check API health
        if [ "$SERVICE" = "api" ] || [ "$SERVICE" = "all" ]; then
            if curl -f -s "http://localhost:3001/health" > /dev/null 2>&1; then
                log "API health check passed"
            else
                log "API health check failed"
                return 1
            fi
        fi
        
        # Check Web health
        if [ "$SERVICE" = "web" ] || [ "$SERVICE" = "all" ]; then
            if curl -f -s "http://localhost:3000/health" > /dev/null 2>&1; then
                log "Web health check passed"
            else
                log "Web health check failed"
                return 1
            fi
        fi
        
        success "All health checks passed"
        return 0
        
        sleep 2
        ((attempt++))
    done
    
    return 1
}

# Function to update nginx configuration
update_nginx_config() {
    local active_env=$1
    
    log "Updating nginx configuration to use $active_env environment"
    
    # Update nginx configuration
    sed -i "s/server api-blue:3001.*;/server api-$active_env:3001 max_fails=3 fail_timeout=30s;/g" infrastructure/docker/nginx.conf
    sed -i "s/server web-blue:3000.*;/server web-$active_env:3000 max_fails=3 fail_timeout=30s;/g" infrastructure/docker/nginx.conf
    
    # Reload nginx
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec nginx nginx -s reload
    
    success "Nginx configuration updated"
}

# Function to rollback to previous version
rollback_to_previous() {
    warn "Rollback failed, attempting to restore previous version"
    
    # Get previous version
    PREVIOUS_VERSION=$(find "$BACKUP_DIR" -name "*_${SERVICE}_*.tar.gz" -type f | sort -r | head -2 | tail -1)
    
    if [ -n "$PREVIOUS_VERSION" ]; then
        log "Rolling back to previous version: $PREVIOUS_VERSION"
        VERSION_FILE="$PREVIOUS_VERSION"
        perform_rollback
    else
        error "No previous version available for rollback"
        exit 1
    fi
}

# Function to send rollback notification
send_rollback_notification() {
    log "Sending rollback notification..."
    
    # TODO: Implement notification logic (Slack, email, etc.)
    # curl -X POST -H 'Content-type: application/json' \
    #     --data "{\"text\":\"Rollback completed for $SERVICE to version $VERSION\"}" \
    #     https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
}

# Main rollback process
log "Starting rollback process..."

# Check current status
check_current_status

# Validate version
validate_version "$VERSION"

# Create backup before rollback
create_pre_rollback_backup

# Perform rollback
perform_rollback

# Send notification
send_rollback_notification

success "Rollback completed successfully"
log "Service: $SERVICE"
log "Version: $VERSION"
log "Active environment: $TARGET_ENV"

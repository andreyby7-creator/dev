#!/bin/bash
# Docker Volumes Restoration Script for SaleSpot BY
# Usage: ./scripts/disaster-recovery/restore-volumes.sh [backup_file] [volume_name]

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
BACKUP_DIR="/backups/volumes"
RESTORE_DIR="/tmp/restore"
DOCKER_COMPOSE_FILE="infrastructure/docker/docker-compose.yml"

# Check if backup file is provided
if [ $# -lt 1 ]; then
    error "Usage: $0 [backup_file] [volume_name]"
    error "Example: $0 /backups/volumes/salespot_volumes_2024-01-15_10-30-00.tar.gz salespot_postgres_data"
    exit 1
fi

BACKUP_FILE=$1
VOLUME_NAME=${2:-""}

# Validate backup file
if [ ! -f "$BACKUP_FILE" ]; then
    error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

log "Starting Docker volumes restoration from: $BACKUP_FILE"

# Check if Docker is installed and running
if ! command -v docker &> /dev/null; then
    error "Docker is not installed"
    error "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! docker info &> /dev/null; then
    error "Docker is not running"
    error "Please start Docker daemon"
    exit 1
fi

# Create restore directory
mkdir -p "$RESTORE_DIR"
cd "$RESTORE_DIR"

# Function to list available volumes in backup
list_backup_volumes() {
    local backup_file=$1
    
    log "Listing volumes in backup..."
    
    if [[ "$backup_file" == *.tar.gz ]] || [[ "$backup_file" == *.tgz ]]; then
        tar -tzf "$backup_file" | grep -E "^[^/]+/$" | sed 's|/$||'
    elif [[ "$backup_file" == *.tar ]]; then
        tar -tf "$backup_file" | grep -E "^[^/]+/$" | sed 's|/$||'
    else
        error "Unsupported backup format: $backup_file"
        exit 1
    fi
}

# Function to extract specific volume
extract_volume() {
    local backup_file=$1
    local volume_name=$2
    
    log "Extracting volume: $volume_name"
    
    if [[ "$backup_file" == *.tar.gz ]] || [[ "$backup_file" == *.tgz ]]; then
        tar -xzf "$backup_file" "$volume_name/"
    elif [[ "$backup_file" == *.tar ]]; then
        tar -xf "$backup_file" "$volume_name/"
    else
        error "Unsupported backup format: $backup_file"
        exit 1
    fi
    
    success "Volume extracted successfully"
}

# Function to extract all volumes
extract_all_volumes() {
    local backup_file=$1
    
    log "Extracting all volumes..."
    
    if [[ "$backup_file" == *.tar.gz ]] || [[ "$backup_file" == *.tgz ]]; then
        tar -xzf "$backup_file"
    elif [[ "$backup_file" == *.tar ]]; then
        tar -xf "$backup_file"
    else
        error "Unsupported backup format: $backup_file"
        exit 1
    fi
    
    success "All volumes extracted successfully"
}

# Function to check if volume exists
volume_exists() {
    local volume_name=$1
    docker volume ls -q | grep -q "^$volume_name$"
}

# Function to create volume
create_volume() {
    local volume_name=$1
    
    if volume_exists "$volume_name"; then
        warn "Volume $volume_name already exists"
        read -p "Do you want to remove it? (y/N): " remove_existing
        if [[ $remove_existing =~ ^[Yy]$ ]]; then
            log "Removing existing volume: $volume_name"
            docker volume rm "$volume_name"
        else
            error "Restoration cancelled"
            exit 1
        fi
    fi
    
    log "Creating volume: $volume_name"
    docker volume create "$volume_name"
    success "Volume $volume_name created"
}

# Function to restore volume data
restore_volume_data() {
    local volume_name=$1
    local source_path=$2
    
    log "Restoring data to volume: $volume_name"
    
    # Create temporary container to copy data
    local temp_container="temp_restore_$(date +%s)"
    
    # Run temporary container with volume mounted
    docker run --rm -v "$volume_name:/data" -v "$(pwd)/$source_path:/backup" \
        alpine sh -c "cd /data && tar -xzf /backup/*.tar.gz --strip-components=1"
    
    success "Volume data restored successfully"
}

# Function to verify volume restoration
verify_volume_restoration() {
    local volume_name=$1
    
    log "Verifying volume restoration: $volume_name"
    
    # Create temporary container to check volume contents
    local temp_container="temp_verify_$(date +%s)"
    
    # Check if volume has data
    local file_count=$(docker run --rm -v "$volume_name:/data" alpine sh -c "find /data -type f | wc -l")
    
    if [ "$file_count" -gt 0 ]; then
        success "Volume $volume_name restored successfully: $file_count files"
    else
        warn "Volume $volume_name appears to be empty"
    fi
    
    # Check volume size
    local volume_size=$(docker run --rm -v "$volume_name:/data" alpine sh -c "du -sh /data | cut -f1")
    log "Volume size: $volume_size"
}

# Function to get volumes from docker-compose
get_compose_volumes() {
    if [ -f "$DOCKER_COMPOSE_FILE" ]; then
        log "Extracting volume names from docker-compose.yml..."
        grep -A 10 "volumes:" "$DOCKER_COMPOSE_FILE" | grep -E "^\s+[a-zA-Z_][a-zA-Z0-9_]*:" | sed 's/^\s*//' | sed 's/:$//'
    else
        warn "docker-compose.yml not found, cannot extract volume names"
    fi
}

# Main restoration process
if [ -z "$VOLUME_NAME" ]; then
    # Restore all volumes
    log "No specific volume specified, restoring all volumes"
    
    # List available volumes
    available_volumes=$(list_backup_volumes "$BACKUP_FILE")
    log "Available volumes in backup:"
    echo "$available_volumes"
    
    # Extract all volumes
    extract_all_volumes "$BACKUP_FILE"
    
    # Restore each volume
    for volume in $available_volumes; do
        log "Processing volume: $volume"
        
        if [ -d "$volume" ]; then
            create_volume "$volume"
            restore_volume_data "$volume" "$volume"
            verify_volume_restoration "$volume"
        else
            warn "Volume directory not found: $volume"
        fi
    done
    
else
    # Restore specific volume
    log "Restoring specific volume: $VOLUME_NAME"
    
    # Check if volume exists in backup
    available_volumes=$(list_backup_volumes "$BACKUP_FILE")
    if echo "$available_volumes" | grep -q "^$VOLUME_NAME$"; then
        extract_volume "$BACKUP_FILE" "$VOLUME_NAME"
        create_volume "$VOLUME_NAME"
        restore_volume_data "$VOLUME_NAME" "$VOLUME_NAME"
        verify_volume_restoration "$VOLUME_NAME"
    else
        error "Volume $VOLUME_NAME not found in backup"
        error "Available volumes:"
        echo "$available_volumes"
        exit 1
    fi
fi

# Cleanup
cd /
rm -rf "$RESTORE_DIR"

success "Docker volumes restoration completed successfully"

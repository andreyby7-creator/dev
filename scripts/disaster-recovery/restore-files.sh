#!/bin/bash
# Files Restoration Script for SaleSpot BY
# Usage: ./scripts/disaster-recovery/restore-files.sh [backup_file] [target_path]

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
BACKUP_DIR="/backups/files"
RESTORE_DIR="/tmp/restore"
DEFAULT_TARGET="/home/boss/Projects/dev"

# Check if backup file is provided
if [ $# -lt 1 ]; then
    error "Usage: $0 [backup_file] [target_path]"
    error "Example: $0 /backups/files/salespot_files_2024-01-15_10-30-00.tar.gz /home/boss/Projects/dev"
    exit 1
fi

BACKUP_FILE=$1
TARGET_PATH=${2:-"$DEFAULT_TARGET"}

# Validate backup file
if [ ! -f "$BACKUP_FILE" ]; then
    error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Validate target path
if [ ! -d "$(dirname "$TARGET_PATH")" ]; then
    error "Target directory does not exist: $(dirname "$TARGET_PATH")"
    exit 1
fi

log "Starting files restoration from: $BACKUP_FILE"
log "Target path: $TARGET_PATH"

# Create restore directory
mkdir -p "$RESTORE_DIR"
cd "$RESTORE_DIR"

# Function to check available disk space
check_disk_space() {
    local backup_size=$(stat -c%s "$BACKUP_FILE")
    local available_space=$(df "$TARGET_PATH" | awk 'NR==2 {print $4}')
    local required_space=$((backup_size * 3)) # Estimate 3x for extraction
    
    if [ "$available_space" -lt "$required_space" ]; then
        error "Insufficient disk space"
        error "Available: $available_space bytes"
        error "Required: $required_space bytes (estimated)"
        exit 1
    fi
    
    log "Disk space check passed"
}

# Function to extract backup
extract_backup() {
    local backup_file=$1
    
    log "Extracting backup file..."
    
    if [[ "$backup_file" == *.tar.gz ]] || [[ "$backup_file" == *.tgz ]]; then
        tar -xzf "$backup_file"
    elif [[ "$backup_file" == *.tar ]]; then
        tar -xf "$backup_file"
    elif [[ "$backup_file" == *.zip ]]; then
        unzip "$backup_file"
    else
        error "Unsupported backup format: $backup_file"
        error "Supported formats: .tar.gz, .tgz, .tar, .zip"
        exit 1
    fi
    
    success "Backup extracted successfully"
}

# Function to verify extracted content
verify_extracted_content() {
    log "Verifying extracted content..."
    
    # List extracted files
    extracted_files=$(find . -type f | wc -l)
    log "Found $extracted_files files in backup"
    
    # Check for key directories
    if [ -d "apps" ]; then
        log "✅ apps directory found"
    else
        warn "⚠️  apps directory not found"
    fi
    
    if [ -d "infrastructure" ]; then
        log "✅ infrastructure directory found"
    else
        warn "⚠️  infrastructure directory not found"
    fi
    
    if [ -d "scripts" ]; then
        log "✅ scripts directory found"
    else
        warn "⚠️  scripts directory not found"
    fi
    
    if [ -f "package.json" ]; then
        log "✅ package.json found"
    else
        warn "⚠️  package.json not found"
    fi
}

# Function to restore files
restore_files() {
    local target_path=$1
    
    log "Restoring files to: $target_path"
    
    # Create backup of existing files if they exist
    if [ -d "$target_path" ] && [ "$(ls -A "$target_path" 2>/dev/null)" ]; then
        warn "Target directory is not empty"
        read -p "Do you want to backup existing files? (y/N): " backup_existing
        if [[ $backup_existing =~ ^[Yy]$ ]]; then
            local backup_name="existing_files_$(date +%Y%m%d_%H%M%S).tar.gz"
            log "Creating backup of existing files: $backup_name"
            tar -czf "$backup_name" -C "$target_path" .
            success "Existing files backed up to: $backup_name"
        fi
        
        read -p "Do you want to overwrite existing files? (y/N): " overwrite
        if [[ ! $overwrite =~ ^[Yy]$ ]]; then
            error "Restoration cancelled"
            exit 1
        fi
    fi
    
    # Restore files
    log "Copying files to target directory..."
    cp -r . "$target_path/"
    
    success "Files restored successfully"
}

# Function to verify restoration
verify_restoration() {
    local target_path=$1
    
    log "Verifying restoration..."
    
    # Check if key files exist
    local checks=(
        "package.json"
        "apps/api/package.json"
        "apps/web/package.json"
        "infrastructure/docker/docker-compose.yml"
        "scripts/quality/check-errors.sh"
    )
    
    local passed=0
    local total=${#checks[@]}
    
    for check in "${checks[@]}"; do
        if [ -f "$target_path/$check" ]; then
            log "✅ $check"
            ((passed++))
        else
            warn "❌ $check"
        fi
    done
    
    if [ $passed -eq $total ]; then
        success "All key files restored successfully"
    else
        warn "Some key files missing: $passed/$total"
    fi
    
    # Check file permissions
    log "Checking file permissions..."
    if [ -x "$target_path/scripts/quality/check-errors.sh" ]; then
        log "✅ Scripts are executable"
    else
        warn "⚠️  Some scripts may not be executable"
        log "Run: chmod +x $target_path/scripts/**/*.sh"
    fi
}

# Function to cleanup
cleanup() {
    log "Cleaning up temporary files..."
    cd /
    rm -rf "$RESTORE_DIR"
    success "Cleanup completed"
}

# Main restoration process
log "Checking disk space..."
check_disk_space

log "Extracting backup..."
extract_backup "$BACKUP_FILE"

log "Verifying extracted content..."
verify_extracted_content

log "Restoring files..."
restore_files "$TARGET_PATH"

log "Verifying restoration..."
verify_restoration "$TARGET_PATH"

log "Cleaning up..."
cleanup

success "Files restoration completed successfully"
log "Restored to: $TARGET_PATH"

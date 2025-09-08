#!/bin/bash

# Automated Backup Script for SaleSpot BY
# Usage: ./scripts/backup/automated-backup.sh [full|incremental|database|files]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_TYPE=${1:-"full"}
BACKUP_DIR="/backups"
RETENTION_DAYS=30
COMPRESSION_LEVEL=6
VERIFY_BACKUP=true
SEND_NOTIFICATIONS=true

# Database configuration
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}
DB_NAME=${DB_NAME:-"salespot"}
DB_USER=${DB_USER:-"salespot"}
DB_PASSWORD=${DB_PASSWORD:-""}

# S3 configuration (optional)
S3_BUCKET=${S3_BUCKET:-""}
S3_REGION=${S3_REGION:-"eu-west-1"}

# Notification configuration
SLACK_WEBHOOK=${SLACK_WEBHOOK:-""}
TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN:-""}
TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID:-""}

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

# Send notification
send_notification() {
    local message="$1"
    local status="$2"
    
    if [ "$SEND_NOTIFICATIONS" != "true" ]; then
        return
    fi
    
    # Slack notification
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            "$SLACK_WEBHOOK" > /dev/null 2>&1 || warn "Failed to send Slack notification"
    fi
    
    # Telegram notification
    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
        curl -X POST \
            "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
            -d "chat_id=$TELEGRAM_CHAT_ID&text=$message&parse_mode=HTML" \
            > /dev/null 2>&1 || warn "Failed to send Telegram notification"
    fi
}

# Create backup directory
create_backup_dir() {
    local backup_date=$(date +'%Y-%m-%d_%H-%M-%S')
    local backup_path="$BACKUP_DIR/$BACKUP_TYPE/$backup_date"
    
    mkdir -p "$backup_path"
    echo "$backup_path"
}

# Database backup
backup_database() {
    local backup_path="$1"
    local db_backup_file="$backup_path/database.sql.gz"
    
    log "Starting database backup..."
    
    # Set PGPASSWORD environment variable
    export PGPASSWORD="$DB_PASSWORD"
    
    # Create database backup
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --verbose --clean --no-owner --no-privileges \
        | gzip -$COMPRESSION_LEVEL > "$db_backup_file"
    
    # Verify backup
    if [ "$VERIFY_BACKUP" = "true" ]; then
        log "Verifying database backup..."
        if gunzip -t "$db_backup_file"; then
            log "Database backup verification successful"
        else
            error "Database backup verification failed"
            return 1
        fi
    fi
    
    log "Database backup completed: $db_backup_file"
    echo "$db_backup_file"
}

# Files backup
backup_files() {
    local backup_path="$1"
    local files_backup_file="$backup_path/files.tar.gz"
    
    log "Starting files backup..."
    
    # Create files backup
    tar -czf "$files_backup_file" \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='.next' \
        --exclude='dist' \
        --exclude='build' \
        --exclude='*.log' \
        --exclude='*.tmp' \
        --exclude='backups' \
        -C /home/boss/Projects/dev .
    
    # Verify backup
    if [ "$VERIFY_BACKUP" = "true" ]; then
        log "Verifying files backup..."
        if tar -tzf "$files_backup_file" > /dev/null 2>&1; then
            log "Files backup verification successful"
        else
            error "Files backup verification failed"
            return 1
        fi
    fi
    
    log "Files backup completed: $files_backup_file"
    echo "$files_backup_file"
}

# Configuration backup
backup_config() {
    local backup_path="$1"
    local config_backup_file="$backup_path/config.tar.gz"
    
    log "Starting configuration backup..."
    
    # Create configuration backup
    tar -czf "$config_backup_file" \
        -C /home/boss/Projects/dev \
        infrastructure/ \
        scripts/ \
        docs/ \
        .env* \
        package.json \
        pnpm-lock.yaml \
        tsconfig.json \
        .eslintrc.js \
        .prettierrc
    
    # Verify backup
    if [ "$VERIFY_BACKUP" = "true" ]; then
        log "Verifying configuration backup..."
        if tar -tzf "$config_backup_file" > /dev/null 2>&1; then
            log "Configuration backup verification successful"
        else
            error "Configuration backup verification failed"
            return 1
        fi
    fi
    
    log "Configuration backup completed: $config_backup_file"
    echo "$config_backup_file"
}

# Docker volumes backup
backup_docker_volumes() {
    local backup_path="$1"
    local volumes_backup_file="$backup_path/docker-volumes.tar.gz"
    
    log "Starting Docker volumes backup..."
    
    # Get list of Docker volumes
    local volumes=$(docker volume ls -q --filter "label=com.docker.compose.project=salespot")
    
    if [ -n "$volumes" ]; then
        # Create temporary directory for volume data
        local temp_dir=$(mktemp -d)
        
        # Copy volume data
        for volume in $volumes; do
            log "Backing up volume: $volume"
            docker run --rm -v "$volume:/data" -v "$temp_dir:/backup" \
                alpine tar -czf "/backup/$volume.tar.gz" -C /data .
        done
        
        # Create combined backup
        tar -czf "$volumes_backup_file" -C "$temp_dir" .
        
        # Cleanup
        rm -rf "$temp_dir"
        
        # Verify backup
        if [ "$VERIFY_BACKUP" = "true" ]; then
            log "Verifying Docker volumes backup..."
            if tar -tzf "$volumes_backup_file" > /dev/null 2>&1; then
                log "Docker volumes backup verification successful"
            else
                error "Docker volumes backup verification failed"
                return 1
            fi
        fi
        
        log "Docker volumes backup completed: $volumes_backup_file"
        echo "$volumes_backup_file"
    else
        warn "No Docker volumes found for backup"
    fi
}

# Upload to S3
upload_to_s3() {
    local backup_file="$1"
    
    if [ -n "$S3_BUCKET" ]; then
        log "Uploading backup to S3: $backup_file"
        
        if aws s3 cp "$backup_file" "s3://$S3_BUCKET/backups/$(basename "$backup_file")" \
            --region "$S3_REGION" --quiet; then
            log "S3 upload completed successfully"
        else
            error "S3 upload failed"
            return 1
        fi
    fi
}

# Create backup manifest
create_manifest() {
    local backup_path="$1"
    local manifest_file="$backup_path/manifest.json"
    
    local backup_files=()
    for file in "$backup_path"/*.gz; do
        if [ -f "$file" ]; then
            local file_size=$(stat -c%s "$file")
            local file_checksum=$(sha256sum "$file" | cut -d' ' -f1)
            
            backup_files+=("{\"file\":\"$(basename "$file")\",\"size\":$file_size,\"checksum\":\"$file_checksum\"}")
        fi
    done
    
    cat > "$manifest_file" << EOF
{
  "backup_type": "$BACKUP_TYPE",
  "timestamp": "$(date -Iseconds)",
  "environment": "${NODE_ENV:-development}",
  "files": [$(IFS=,; echo "${backup_files[*]}")],
  "total_size": $(du -sb "$backup_path" | cut -f1),
  "compression_level": $COMPRESSION_LEVEL,
  "verified": $VERIFY_BACKUP
}
EOF
    
    log "Backup manifest created: $manifest_file"
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    
    local deleted_count=0
    while IFS= read -r -d '' backup_dir; do
        if [ -d "$backup_dir" ]; then
            rm -rf "$backup_dir"
            deleted_count=$((deleted_count + 1))
            log "Deleted old backup: $backup_dir"
        fi
    done < <(find "$BACKUP_DIR" -type d -name "*" -mtime +$RETENTION_DAYS -print0)
    
    log "Cleanup completed: $deleted_count old backups deleted"
}

# Health check
health_check() {
    log "Performing health check..."
    
    # Check disk space
    local available_space=$(df "$BACKUP_DIR" | awk 'NR==2 {print $4}')
    local required_space=10485760  # 10GB in KB
    
    if [ "$available_space" -lt "$required_space" ]; then
        error "Insufficient disk space for backup"
        return 1
    fi
    
    # Check database connectivity
    if [ -n "$DB_PASSWORD" ]; then
        export PGPASSWORD="$DB_PASSWORD"
        if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" > /dev/null 2>&1; then
            error "Database is not accessible"
            return 1
        fi
    fi
    
    # Check Docker
    if ! docker info > /dev/null 2>&1; then
        error "Docker is not accessible"
        return 1
    fi
    
    log "Health check passed"
}

# Main backup function
main() {
    local start_time=$(date +%s)
    local backup_path=""
    local backup_files=()
    local success=true
    
    log "Starting $BACKUP_TYPE backup..."
    
    # Health check
    if ! health_check; then
        error "Health check failed, aborting backup"
        send_notification "❌ Backup failed: Health check failed" "error"
        exit 1
    fi
    
    # Create backup directory
    backup_path=$(create_backup_dir)
    
    # Perform backup based on type
    case $BACKUP_TYPE in
        "full")
            log "Performing full backup..."
            
            # Database backup
            if db_file=$(backup_database "$backup_path"); then
                backup_files+=("$db_file")
            else
                success=false
            fi
            
            # Files backup
            if files_file=$(backup_files "$backup_path"); then
                backup_files+=("$files_file")
            else
                success=false
            fi
            
            # Configuration backup
            if config_file=$(backup_config "$backup_path"); then
                backup_files+=("$config_file")
            else
                success=false
            fi
            
            # Docker volumes backup
            if volumes_file=$(backup_docker_volumes "$backup_path"); then
                backup_files+=("$volumes_file")
            else
                success=false
            fi
            ;;
            
        "database")
            log "Performing database backup..."
            if db_file=$(backup_database "$backup_path"); then
                backup_files+=("$db_file")
            else
                success=false
            fi
            ;;
            
        "files")
            log "Performing files backup..."
            if files_file=$(backup_files "$backup_path"); then
                backup_files+=("$files_file")
            else
                success=false
            fi
            ;;
            
        "incremental")
            log "Performing incremental backup..."
            # TODO: Implement incremental backup logic
            warn "Incremental backup not yet implemented, performing full backup"
            main "full"
            return
            ;;
            
        *)
            error "Invalid backup type: $BACKUP_TYPE"
            error "Valid types: full, incremental, database, files"
            exit 1
            ;;
    esac
    
    # Create manifest
    create_manifest "$backup_path"
    
    # Upload to S3 if configured
    for backup_file in "${backup_files[@]}"; do
        if [ -f "$backup_file" ]; then
            upload_to_s3 "$backup_file"
        fi
    done
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Calculate duration
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Send notification
    if [ "$success" = "true" ]; then
        local total_size=$(du -sh "$backup_path" | cut -f1)
        local message="✅ Backup completed successfully\nType: $BACKUP_TYPE\nDuration: ${duration}s\nSize: $total_size\nPath: $backup_path"
        send_notification "$message" "success"
        log "Backup completed successfully in ${duration}s"
    else
        local message="❌ Backup failed\nType: $BACKUP_TYPE\nDuration: ${duration}s"
        send_notification "$message" "error"
        error "Backup failed after ${duration}s"
        exit 1
    fi
}

# Script entry point
if [ $# -eq 0 ]; then
    echo "Usage: $0 [full|incremental|database|files]"
    echo "  full: Complete backup of all data"
    echo "  incremental: Incremental backup (not yet implemented)"
    echo "  database: Database backup only"
    echo "  files: Files backup only"
    exit 1
fi

main "$@"

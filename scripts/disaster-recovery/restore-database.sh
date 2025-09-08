#!/bin/bash
# Database Restoration Script for SaleSpot BY
# Usage: ./scripts/disaster-recovery/restore-database.sh [backup_file] [target_db]

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
BACKUP_DIR="/backups/database"
RESTORE_DIR="/tmp/restore"
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="postgres"
DB_NAME="salespot"

# Check if backup file is provided
if [ $# -lt 1 ]; then
    error "Usage: $0 [backup_file] [target_db]"
    error "Example: $0 /backups/database/salespot_2024-01-15_10-30-00.sql.gz salespot_restored"
    exit 1
fi

BACKUP_FILE=$1
TARGET_DB=${2:-"salespot_restored"}

# Validate backup file
if [ ! -f "$BACKUP_FILE" ]; then
    error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    error "PostgreSQL client is not installed"
    error "Please install PostgreSQL client"
    exit 1
fi

# Check if pg_restore is available (for custom format)
if ! command -v pg_restore &> /dev/null; then
    error "pg_restore is not installed"
    error "Please install PostgreSQL client tools"
    exit 1
fi

log "Starting database restoration from: $BACKUP_FILE"
log "Target database: $TARGET_DB"

# Create restore directory
mkdir -p "$RESTORE_DIR"
cd "$RESTORE_DIR"

# Function to check database connection
check_db_connection() {
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
        error "Cannot connect to PostgreSQL database"
        error "Please check connection parameters:"
        error "  Host: $DB_HOST"
        error "  Port: $DB_PORT"
        error "  User: $DB_USER"
        exit 1
    fi
}

# Function to check if database exists
database_exists() {
    local db_name=$1
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname = '$db_name';" | grep -q 1
}

# Function to drop database if exists
drop_database() {
    local db_name=$1
    
    if database_exists "$db_name"; then
        warn "Database $db_name already exists"
        read -p "Do you want to drop it? (y/N): " confirm
        if [[ $confirm =~ ^[Yy]$ ]]; then
            log "Dropping database $db_name..."
            psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE \"$db_name\";"
            success "Database $db_name dropped"
        else
            error "Restoration cancelled"
            exit 1
        fi
    fi
}

# Function to create database
create_database() {
    local db_name=$1
    
    log "Creating database $db_name..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE \"$db_name\";"
    success "Database $db_name created"
}

# Function to restore from SQL dump
restore_sql_dump() {
    local backup_file=$1
    local target_db=$2
    
    log "Restoring from SQL dump..."
    
    if [[ "$backup_file" == *.gz ]]; then
        # Compressed SQL dump
        gunzip -c "$backup_file" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$target_db"
    else
        # Plain SQL dump
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$target_db" < "$backup_file"
    fi
}

# Function to restore from custom format
restore_custom_format() {
    local backup_file=$1
    local target_db=$2
    
    log "Restoring from custom format..."
    
    if [[ "$backup_file" == *.gz ]]; then
        # Compressed custom format
        gunzip -c "$backup_file" | pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$target_db" --clean --if-exists
    else
        # Plain custom format
        pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$target_db" --clean --if-exists "$backup_file"
    fi
}

# Function to verify restoration
verify_restoration() {
    local target_db=$1
    
    log "Verifying restoration..."
    
    # Check if database exists
    if ! database_exists "$target_db"; then
        error "Database $target_db was not created"
        return 1
    fi
    
    # Check table count
    table_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$target_db" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
    
    if [ "$table_count" -gt 0 ]; then
        success "Restoration verified: $table_count tables found"
    else
        warn "No tables found in restored database"
    fi
    
    # Check data count for key tables
    log "Checking data in key tables..."
    
    # Users table
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$target_db" -t -c "SELECT COUNT(*) FROM users;" > /dev/null 2>&1; then
        user_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$target_db" -t -c "SELECT COUNT(*) FROM users;" | tr -d ' ')
        log "Users table: $user_count records"
    fi
    
    # Profiles table
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$target_db" -t -c "SELECT COUNT(*) FROM profiles;" > /dev/null 2>&1; then
        profile_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$target_db" -t -c "SELECT COUNT(*) FROM profiles;" | tr -d ' ')
        log "Profiles table: $profile_count records"
    fi
}

# Main restoration process
log "Checking database connection..."
check_db_connection

log "Preparing for restoration..."
drop_database "$TARGET_DB"
create_database "$TARGET_DB"

# Determine backup format and restore
if [[ "$BACKUP_FILE" == *.sql* ]] || [[ "$BACKUP_FILE" == *.dump ]]; then
    restore_sql_dump "$BACKUP_FILE" "$TARGET_DB"
elif [[ "$BACKUP_FILE" == *.custom* ]] || [[ "$BACKUP_FILE" == *.backup ]]; then
    restore_custom_format "$BACKUP_FILE" "$TARGET_DB"
else
    error "Unknown backup format: $BACKUP_FILE"
    error "Supported formats: .sql, .sql.gz, .custom, .custom.gz, .backup"
    exit 1
fi

# Verify restoration
verify_restoration "$TARGET_DB"

# Cleanup
cd /
rm -rf "$RESTORE_DIR"

success "Database restoration completed successfully"
log "Restored database: $TARGET_DB"
log "Connection string: postgresql://$DB_USER@$DB_HOST:$DB_PORT/$TARGET_DB"

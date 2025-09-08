#!/bin/bash
# Использование: ./scripts/devops/restart-all.sh
# Command: cd /home/boss/Projects/dev && ./scripts/restart-all.sh

# Restart All Services Script
# Usage: ./scripts/restart-all.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Main execution
log "🔄 Restarting all SaleSpot BY services..."

# Stop all services first
log "Step 1: Stopping all services..."
./scripts/stop-all.sh

# Wait a moment for processes to fully stop
sleep 3

# Start all services
log "Step 2: Starting all services..."
./scripts/start-all.sh

success "All services restarted successfully!"

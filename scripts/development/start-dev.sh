#!/bin/bash
# Использование: ./scripts/devops/start-dev.sh
# Command: cd /home/boss/Projects/dev && ./scripts/start-dev.sh

# Quick Start Development Script
# Usage: ./scripts/start-dev.sh

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting SaleSpot BY development servers...${NC}"

# Change to project directory
cd /home/boss/Projects/dev

# Stop any existing services
echo "Stopping existing services..."
pkill -f "pnpm.*dev" || true
pkill -f "next.*dev" || true
sleep 1

# Start API server
echo "Starting API server..."
cd apps/api
pnpm run dev > /tmp/api.log 2>&1 &
API_PID=$!
echo $API_PID > /tmp/api.pid
cd ../..

# Start Web server
echo "Starting Web server..."
cd apps/web
pnpm dev > /tmp/web.log 2>&1 &
WEB_PID=$!
echo $WEB_PID > /tmp/web.pid
cd ../..

# Wait a moment
sleep 3

echo -e "${GREEN}✅ Both servers started!${NC}"
echo "----------------------------------------"
echo "API Server (PID: $API_PID):"
echo "  - Health: http://localhost:3001/api/v1/health"
echo "  - Swagger: http://localhost:3001/docs"
echo ""
echo "Web Server (PID: $WEB_PID):"
echo "  - Frontend: http://localhost:3000"
echo "----------------------------------------"
echo ""
echo "To stop all services: ./scripts/stop-all.sh"
echo "To view logs: tail -f /tmp/api.log | tail -f /tmp/web.log"
echo ""
echo -e "${GREEN}🎉 Ready for development!${NC}"

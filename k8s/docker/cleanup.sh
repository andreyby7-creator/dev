#!/bin/bash

# Docker Cleanup Script for SaleSpot BY
# Complete cleanup to free up disk space

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧹 Docker Cleanup Script for SaleSpot BY${NC}"

# Show current disk usage
echo -e "${YELLOW}📊 Current disk usage:${NC}"
df -h

# Show Docker disk usage
echo -e "${YELLOW}🐳 Docker disk usage:${NC}"
docker system df

# Show current images
echo -e "${YELLOW}📦 Current images:${NC}"
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"

# Stop all containers
echo -e "${YELLOW}🛑 Stopping all containers...${NC}"
docker stop $(docker ps -aq) 2>/dev/null || true

# Remove all containers
echo -e "${YELLOW}🗑️ Removing all containers...${NC}"
docker rm $(docker ps -aq) 2>/dev/null || true

# Remove all images
echo -e "${YELLOW}🗑️ Removing all images...${NC}"
docker rmi $(docker images -aq) 2>/dev/null || true

# Remove all volumes
echo -e "${YELLOW}🗑️ Removing all volumes...${NC}"
docker volume rm $(docker volume ls -q) 2>/dev/null || true

# Remove all networks
echo -e "${YELLOW}🗑️ Removing all networks...${NC}"
docker network rm $(docker network ls -q) 2>/dev/null || true

# Full system prune
echo -e "${YELLOW}🧹 Full system prune...${NC}"
docker system prune -a -f --volumes

# Builder prune
echo -e "${YELLOW}🧹 Builder prune...${NC}"
docker builder prune -a -f

# Show final disk usage
echo -e "${GREEN}✅ Cleanup completed!${NC}"
echo -e "${YELLOW}📊 Final disk usage:${NC}"
df -h

echo -e "${YELLOW}🐳 Final Docker disk usage:${NC}"
docker system df

echo -e "${GREEN}🎉 All done!${NC}"

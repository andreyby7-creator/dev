#!/bin/bash

# Docker Build Script for SaleSpot BY
# Multi-stage builds with optimization

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐳 Building Docker images for SaleSpot BY...${NC}"

# Clean up old images to save space
echo -e "${YELLOW}🧹 Cleaning up old images...${NC}"
docker image prune -f
docker system prune -f
docker builder prune -f

# Build API image
echo -e "${YELLOW}📦 Building API image...${NC}"
docker build \
  --file k8s/docker/Dockerfile.api \
  --tag salespot-api:latest \
  --tag salespot-api:$(date +%Y%m%d-%H%M%S) \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  --progress=plain \
  .

# Build Web image
echo -e "${YELLOW}📦 Building Web image...${NC}"
docker build \
  --file k8s/docker/Dockerfile.web \
  --tag salespot-web:latest \
  --tag salespot-web:$(date +%Y%m%d-%H%M%S) \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  --progress=plain \
  .

# Show image sizes
echo -e "${GREEN}✅ Build completed!${NC}"
echo -e "${BLUE}📊 Image sizes:${NC}"
docker images salespot-api:latest --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
docker images salespot-web:latest --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

# Optional: Push to registry
if [ "$1" = "--push" ]; then
  echo -e "${YELLOW}🚀 Pushing images to registry...${NC}"
  # Add your registry push commands here
  # docker push salespot-api:latest
  # docker push salespot-web:latest
fi

echo -e "${GREEN}🎉 All done!${NC}"

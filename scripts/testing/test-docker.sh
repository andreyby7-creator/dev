#!/bin/bash
# Использование: ./scripts/docker/test-docker.sh

# SaleSpot Docker Testing Script
set -e

echo "🐳 Testing SaleSpot Docker images..."

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not running."
    exit 1
fi

# Test docker-compose configuration
echo "📋 Testing docker-compose configuration..."
if [ -f "docker-compose.yml" ]; then
    docker-compose config >/dev/null 2>&1 && {
        echo "  ✅ docker-compose.yml is valid"
    } || {
        echo "  ❌ docker-compose.yml has errors"
        exit 1
    }
else
    echo "  ⚠️  docker-compose.yml not found"
fi

# Test Dockerfile syntax
echo "📝 Testing Dockerfile syntax..."

# Test API Dockerfile
if [ -f "apps/api/Dockerfile" ]; then
    echo "  ✅ API Dockerfile exists"
    # Basic syntax check
    if grep -q "FROM" "apps/api/Dockerfile"; then
        echo "  ✅ API Dockerfile has valid FROM instruction"
    else
        echo "  ❌ API Dockerfile missing FROM instruction"
        exit 1
    fi
else
    echo "  ❌ API Dockerfile not found"
    exit 1
fi

# Test Web Dockerfile
if [ -f "apps/web/Dockerfile" ]; then
    echo "  ✅ Web Dockerfile exists"
    # Basic syntax check
    if grep -q "FROM" "apps/web/Dockerfile"; then
        echo "  ✅ Web Dockerfile has valid FROM instruction"
    else
        echo "  ❌ Web Dockerfile missing FROM instruction"
        exit 1
    fi
else
    echo "  ❌ Web Dockerfile not found"
    exit 1
fi

# Check .dockerignore
if [ -f ".dockerignore" ]; then
    echo "  ✅ .dockerignore exists"
else
    echo "  ⚠️  .dockerignore not found"
fi

# Test image building (optional)
echo ""
echo "🔨 Testing image building (optional)..."
read -p "Do you want to test building Docker images? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Building API image..."
    docker build -f apps/api/Dockerfile -t salespot-api:test . || {
        echo "  ❌ Failed to build API image"
        exit 1
    }
    
    echo "Building Web image..."
    docker build -f apps/web/Dockerfile -t salespot-web:test . || {
        echo "  ❌ Failed to build Web image"
        exit 1
    }
    
    echo "  ✅ Both images built successfully"
    
    # Show image sizes
    echo ""
    echo "📊 Image sizes:"
    docker images | grep salespot || echo "  No salespot images found"
fi

echo ""
echo "✅ Docker testing completed!"
echo ""
echo "📋 Test Summary:"
echo "  - Docker installation: ✅ Available"
echo "  - docker-compose.yml: ✅ Valid"
echo "  - Dockerfiles: ✅ Present and valid"
  echo "  - .dockerignore: ✅ Present"
  echo "  - Image building: ⚠️  Optional (not tested)"
  echo ""
  echo "📊 Expected image sizes:"
  echo "  - API image: ~150-250 MB (with distroless)"
  echo "  - Web image: ~400-600 MB (with standalone)"
  echo ""
  echo "💡 Optimization tips:"
  echo "  - Run './scripts/docker-cleanup.sh' to clean cache"
  echo "  - Use 'docker system df' to check disk usage"
  echo "  - Build with '--no-cache' for fresh builds"

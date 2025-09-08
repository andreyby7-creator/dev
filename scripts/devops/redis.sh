#!/bin/bash
# Использование: ./scripts/devops/redis.sh

# Redis Management Script for SaleSpot BY
# Usage: ./scripts/redis.sh [start|stop|restart|status|logs]

REDIS_CONTAINER="salespot-redis"
REDIS_PORT="6379"
REDIS_IMAGE="redis:7-alpine"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Error function
error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Success function
success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Warning function
warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        error "Docker is not running. Please start Docker first."
        exit 1
    fi
}

# Start Redis
start_redis() {
    log "Starting Redis container..."
    
    if docker ps -q -f name=$REDIS_CONTAINER | grep -q .; then
        warning "Redis container is already running"
        return 0
    fi
    
    if docker ps -aq -f name=$REDIS_CONTAINER | grep -q .; then
        log "Removing existing stopped container..."
        docker rm $REDIS_CONTAINER
    fi
    
    docker run -d \
        --name $REDIS_CONTAINER \
        -p $REDIS_PORT:6379 \
        --restart unless-stopped \
        -v redis_data:/data \
        $REDIS_IMAGE \
        redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    
    if [ $? -eq 0 ]; then
        success "Redis container started successfully"
        log "Redis is available at localhost:$REDIS_PORT"
    else
        error "Failed to start Redis container"
        exit 1
    fi
}

# Stop Redis
stop_redis() {
    log "Stopping Redis container..."
    
    if docker ps -q -f name=$REDIS_CONTAINER | grep -q .; then
        docker stop $REDIS_CONTAINER
        success "Redis container stopped"
    else
        warning "Redis container is not running"
    fi
}

# Restart Redis
restart_redis() {
    log "Restarting Redis container..."
    stop_redis
    sleep 2
    start_redis
}

# Check Redis status
status_redis() {
    log "Checking Redis status..."
    
    if docker ps -q -f name=$REDIS_CONTAINER | grep -q .; then
        success "Redis container is running"
        echo "Container ID: $(docker ps -q -f name=$REDIS_CONTAINER)"
        echo "Port: localhost:$REDIS_PORT"
        echo "Memory: $(docker stats --no-stream --format 'table {{.MemUsage}}' $REDIS_CONTAINER | tail -1)"
    else
        if docker ps -aq -f name=$REDIS_CONTAINER | grep -q .; then
            warning "Redis container exists but is not running"
        else
            warning "Redis container does not exist"
        fi
    fi
}

# Show Redis logs
logs_redis() {
    log "Showing Redis logs..."
    
    if docker ps -q -f name=$REDIS_CONTAINER | grep -q .; then
        docker logs -f $REDIS_CONTAINER
    else
        error "Redis container is not running"
        exit 1
    fi
}

# Test Redis connection
test_redis() {
    log "Testing Redis connection..."
    
    if docker ps -q -f name=$REDIS_CONTAINER | grep -q .; then
        if docker exec $REDIS_CONTAINER redis-cli ping | grep -q "PONG"; then
            success "Redis connection test successful"
        else
            error "Redis connection test failed"
            exit 1
        fi
    else
        error "Redis container is not running"
        exit 1
    fi
}

# Clean up Redis
cleanup_redis() {
    log "Cleaning up Redis container and data..."
    
    if docker ps -q -f name=$REDIS_CONTAINER | grep -q .; then
        docker stop $REDIS_CONTAINER
    fi
    
    if docker ps -aq -f name=$REDIS_CONTAINER | grep -q .; then
        docker rm $REDIS_CONTAINER
    fi
    
    if docker volume ls -q -f name=redis_data | grep -q .; then
        docker volume rm redis_data
    fi
    
    success "Redis cleanup completed"
}

# Main script logic
main() {
    check_docker
    
    case "$1" in
        start)
            start_redis
            ;;
        stop)
            stop_redis
            ;;
        restart)
            restart_redis
            ;;
        status)
            status_redis
            ;;
        logs)
            logs_redis
            ;;
        test)
            test_redis
            ;;
        cleanup)
            cleanup_redis
            ;;
        *)
            echo "Usage: $0 {start|stop|restart|status|logs|test|cleanup}"
            echo ""
            echo "Commands:"
            echo "  start    - Start Redis container"
            echo "  stop     - Stop Redis container"
            echo "  restart  - Restart Redis container"
            echo "  status   - Show Redis status"
            echo "  logs     - Show Redis logs"
            echo "  test     - Test Redis connection"
            echo "  cleanup  - Remove Redis container and data"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"

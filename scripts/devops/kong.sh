#!/bin/bash
# Использование: ./scripts/devops/kong.sh

# Kong API Gateway Management Script
# Usage: ./kong.sh [start|stop|restart|status|logs|setup]

KONG_VERSION="3.4.0"
KONG_ADMIN_PORT="8001"
KONG_PROXY_PORT="8000"
KONG_DB_NAME="kong"
KONG_DB_USER="kong"
KONG_DB_PASSWORD="kong"

case "$1" in
    start)
        echo "🚀 Starting Kong API Gateway..."
        
        # Check if Kong is already running
        if docker ps | grep -q kong; then
            echo "✅ Kong is already running"
            exit 0
        fi
        
        # Start PostgreSQL for Kong
        docker run -d --name kong-database \
            -p 5432:5432 \
            -e "POSTGRES_USER=$KONG_DB_USER" \
            -e "POSTGRES_DB=$KONG_DB_NAME" \
            -e "POSTGRES_PASSWORD=$KONG_DB_PASSWORD" \
            postgres:13
        
        echo "⏳ Waiting for PostgreSQL to be ready..."
        sleep 10
        
        # Run Kong migrations
        docker run --rm \
            --link kong-database:kong-database \
            -e "KONG_DATABASE=postgres" \
            -e "KONG_PG_HOST=kong-database" \
            -e "KONG_PG_USER=$KONG_DB_USER" \
            -e "KONG_PG_PASSWORD=$KONG_DB_PASSWORD" \
            -e "KONG_PG_DATABASE=$KONG_DB_NAME" \
            kong:$KONG_VERSION kong migrations bootstrap
        
        # Start Kong
        docker run -d --name kong \
            --link kong-database:kong-database \
            -e "KONG_DATABASE=postgres" \
            -e "KONG_PG_HOST=kong-database" \
            -e "KONG_PG_USER=$KONG_DB_USER" \
            -e "KONG_PG_PASSWORD=$KONG_DB_PASSWORD" \
            -e "KONG_PG_DATABASE=$KONG_DB_NAME" \
            -e "KONG_PROXY_ACCESS_LOG=/dev/stdout" \
            -e "KONG_ADMIN_ACCESS_LOG=/dev/stdout" \
            -e "KONG_PROXY_ERROR_LOG=/dev/stderr" \
            -e "KONG_ADMIN_ERROR_LOG=/dev/stderr" \
            -e "KONG_ADMIN_LISTEN=0.0.0.0:8001" \
            -e "KONG_ADMIN_GUI_URL=http://localhost:8002" \
            -p 8000:8000 \
            -p 8443:8443 \
            -p 8001:8001 \
            -p 8444:8444 \
            -p 8002:8002 \
            -p 8445:8445 \
            kong:$KONG_VERSION
        
        echo "✅ Kong API Gateway started successfully!"
        echo "📊 Admin API: http://localhost:$KONG_ADMIN_PORT"
        echo "🌐 Proxy: http://localhost:$KONG_PROXY_PORT"
        echo "🎛️  Admin GUI: http://localhost:8002"
        ;;
        
    stop)
        echo "🛑 Stopping Kong API Gateway..."
        docker stop kong kong-database 2>/dev/null || true
        docker rm kong kong-database 2>/dev/null || true
        echo "✅ Kong stopped"
        ;;
        
    restart)
        echo "🔄 Restarting Kong API Gateway..."
        $0 stop
        sleep 2
        $0 start
        ;;
        
    status)
        echo "📊 Kong API Gateway Status:"
        if docker ps | grep -q kong; then
            echo "✅ Kong is running"
            echo "📊 Admin API: http://localhost:$KONG_ADMIN_PORT"
            echo "🌐 Proxy: http://localhost:$KONG_PROXY_PORT"
            echo "🎛️  Admin GUI: http://localhost:8002"
        else
            echo "❌ Kong is not running"
        fi
        ;;
        
    logs)
        echo "📋 Kong logs:"
        docker logs kong --tail 50 -f
        ;;
        
    setup)
        echo "🔧 Setting up Kong API Gateway..."
        
        # Check if Kong is running
        if ! docker ps | grep -q kong; then
            echo "❌ Kong is not running. Please start it first: ./kong.sh start"
            exit 1
        fi
        
        echo "⏳ Setting up Kong configuration..."
        
        # Create service for our API
        curl -i -X POST http://localhost:$KONG_ADMIN_PORT/services/ \
            -d name=salespot-api \
            -d url=http://host.docker.internal:3001/api/v1
        
        # Create route for the service
        curl -i -X POST http://localhost:$KONG_ADMIN_PORT/services/salespot-api/routes \
            -d name=salespot-api-route \
            -d paths[]=/api/v1
        
        # Enable rate limiting plugin
        curl -i -X POST http://localhost:$KONG_ADMIN_PORT/services/salespot-api/plugins \
            -d name=rate-limiting \
            -d config.minute=100 \
            -d config.hour=1000 \
            -d config.policy=local
        
        # Enable key authentication plugin
        curl -i -X POST http://localhost:$KONG_ADMIN_PORT/services/salespot-api/plugins \
            -d name=key-auth \
            -d config.key_names[]=x-api-key \
            -d config.hide_credentials=true
        
        # Enable CORS plugin
        curl -i -X POST http://localhost:$KONG_ADMIN_PORT/services/salespot-api/plugins \
            -d name=cors \
            -d config.origins=* \
            -d config.methods=GET,POST,PUT,DELETE,OPTIONS \
            -d config.headers=Content-Type,Authorization,X-API-Key \
            -d config.exposed_headers=X-Total-Count \
            -d config.credentials=true \
            -d config.max_age=3600
        
        echo "✅ Kong setup completed!"
        echo "📊 Test the API: curl -H 'X-API-Key: saas-api-key-12345' http://localhost:8000/api/v1/health"
        ;;
        
    test)
        echo "🧪 Testing Kong API Gateway..."
        
        if ! docker ps | grep -q kong; then
            echo "❌ Kong is not running"
            exit 1
        fi
        
        echo "📊 Testing Admin API..."
        curl -s http://localhost:$KONG_ADMIN_PORT/status | jq .
        
        echo "📊 Testing Proxy..."
        curl -s -H "X-API-Key: saas-api-key-12345" http://localhost:8000/api/v1/health | jq .
        
        echo "✅ Kong tests completed!"
        ;;
        
    clean)
        echo "🧹 Cleaning up Kong containers and data..."
        docker stop kong kong-database 2>/dev/null || true
        docker rm kong kong-database 2>/dev/null || true
        docker volume prune -f
        echo "✅ Cleanup completed"
        ;;
        
    *)
        echo "Usage: $0 {start|stop|restart|status|logs|setup|test|clean}"
        echo ""
        echo "Commands:"
        echo "  start   - Start Kong API Gateway"
        echo "  stop    - Stop Kong API Gateway"
        echo "  restart - Restart Kong API Gateway"
        echo "  status  - Show Kong status"
        echo "  logs    - Show Kong logs"
        echo "  setup   - Configure Kong for SaleSpot API"
        echo "  test    - Test Kong configuration"
        echo "  clean   - Clean up Kong containers and data"
        exit 1
        ;;
esac

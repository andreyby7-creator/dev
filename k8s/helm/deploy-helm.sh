#!/bin/bash

# SaleSpot Helm Deployment Script
set -e

echo "🚀 Starting SaleSpot Helm deployment..."

# Check if helm is installed
if ! command -v helm &> /dev/null; then
    echo "❌ Helm is not installed. Please install Helm first."
    exit 1
fi

# Check if we're connected to a cluster
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Not connected to a Kubernetes cluster. Please configure kubectl."
    exit 1
fi

# Add required repositories
echo "📚 Adding Helm repositories..."
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Install dependencies
echo "📦 Installing dependencies..."
helm dependency build

# Create namespace if it doesn't exist
kubectl create namespace salespot --dry-run=client -o yaml | kubectl apply -f -

# Install/Upgrade the chart
echo "🏗️ Installing/Upgrading SaleSpot..."
helm upgrade --install salespot . \
  --namespace salespot \
  --create-namespace \
  --set redis.auth.password="$(openssl rand -base64 32)" \
  --set kong.postgresql.auth.postgresPassword="$(openssl rand -base64 32)" \
  --set secrets.SUPABASE_URL="$(echo -n "https://your-project.supabase.co" | base64)" \
  --set secrets.SUPABASE_ANON_KEY="$(echo -n "your-anon-key" | base64)" \
  --set secrets.SUPABASE_SERVICE_ROLE_KEY="$(echo -n "your-service-role-key" | base64)" \
  --set secrets.JWT_SECRET="$(echo -n "your-jwt-secret" | base64)" \
  --set secrets.DEFAULT_API_KEY="$(echo -n "saas-api-key-12345" | base64)" \
  --set secrets.REDIS_PASSWORD="$(echo -n "redis-password" | base64)" \
  --set secrets.SENTRY_DSN="$(echo -n "https://your-sentry-dsn" | base64)" \
  --set secrets.BETTERSTACK_TOKEN="$(echo -n "your-betterstack-token" | base64)"

# Wait for deployments to be ready
echo "⏳ Waiting for deployments to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/salespot-api -n salespot
kubectl wait --for=condition=available --timeout=300s deployment/salespot-web -n salespot

# Show deployment status
echo "📊 Deployment Status:"
kubectl get pods -n salespot
kubectl get services -n salespot
kubectl get ingress -n salespot

echo "✅ SaleSpot Helm deployment completed successfully!"
echo "🌍 Access your application at:"
echo "   - Web: https://salespot.by"
echo "   - API: https://api.salespot.by"
echo ""
echo "📋 Useful commands:"
echo "   - View logs: kubectl logs -f deployment/salespot-api -n salespot"
echo "   - Scale API: kubectl scale deployment salespot-api --replicas=5 -n salespot"
echo "   - Port forward: kubectl port-forward svc/salespot-api-service 3001:80 -n salespot"

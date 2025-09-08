#!/bin/bash

# SaleSpot Kubernetes Deployment Script
set -e

echo "🚀 Starting SaleSpot Kubernetes deployment..."

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed. Please install kubectl first."
    exit 1
fi

# Check if we're connected to a cluster
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Not connected to a Kubernetes cluster. Please configure kubectl."
    exit 1
fi

# Create namespace
echo "📦 Creating namespace..."
kubectl apply -f namespace.yaml

# Apply ConfigMap and Secrets
echo "🔧 Applying ConfigMap and Secrets..."
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml

# Apply Persistent Volumes
echo "💾 Applying Persistent Volumes..."
kubectl apply -f persistent-volumes.yaml

# Apply Deployments
echo "🏗️ Applying Deployments..."
kubectl apply -f deployment-redis.yaml
kubectl apply -f deployment-api.yaml
kubectl apply -f deployment-web.yaml

# Apply Services
echo "🔌 Applying Services..."
kubectl apply -f services.yaml

# Apply Network Policies
echo "🛡️ Applying Network Policies..."
kubectl apply -f network-policies.yaml

# Apply HPA
echo "📈 Applying Horizontal Pod Autoscalers..."
kubectl apply -f hpa.yaml

# Apply Ingress
echo "🌐 Applying Ingress..."
kubectl apply -f ingress.yaml

# Wait for deployments to be ready
echo "⏳ Waiting for deployments to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/salespot-redis -n salespot
kubectl wait --for=condition=available --timeout=300s deployment/salespot-api -n salespot
kubectl wait --for=condition=available --timeout=300s deployment/salespot-web -n salespot

# Show deployment status
echo "📊 Deployment Status:"
kubectl get pods -n salespot
kubectl get services -n salespot
kubectl get ingress -n salespot

echo "✅ SaleSpot deployment completed successfully!"
echo "🌍 Access your application at:"
echo "   - Web: https://salespot.by"
echo "   - API: https://api.salespot.by"

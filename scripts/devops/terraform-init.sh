#!/bin/bash
# Terraform Initialization Script for SaleSpot BY
# Usage: ./scripts/devops/terraform-init.sh [dev|staging|production]

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
TERRAFORM_DIR="infrastructure/terraform"
ENVIRONMENTS_DIR="$TERRAFORM_DIR/environments"

# Check if environment is provided
if [ $# -eq 0 ]; then
    error "Usage: $0 [dev|staging|production]"
    exit 1
fi

ENVIRONMENT=$1

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|production)$ ]]; then
    error "Invalid environment: $ENVIRONMENT"
    error "Valid environments: dev, staging, production"
    exit 1
fi

ENV_DIR="$ENVIRONMENTS_DIR/$ENVIRONMENT"

# Check if environment directory exists
if [ ! -d "$ENV_DIR" ]; then
    error "Environment directory not found: $ENV_DIR"
    exit 1
fi

log "Initializing Terraform for environment: $ENVIRONMENT"

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    error "Terraform is not installed"
    error "Please install Terraform: https://www.terraform.io/downloads.html"
    exit 1
fi

# Check Terraform version
TERRAFORM_VERSION=$(terraform version -json | jq -r '.terraform_version')
log "Terraform version: $TERRAFORM_VERSION"

# Navigate to environment directory
cd "$ENV_DIR"

# Initialize Terraform
log "Running terraform init..."
terraform init

if [ $? -eq 0 ]; then
    success "Terraform initialized successfully for $ENVIRONMENT"
else
    error "Failed to initialize Terraform"
    exit 1
fi

# Validate configuration
log "Validating Terraform configuration..."
terraform validate

if [ $? -eq 0 ]; then
    success "Terraform configuration is valid"
else
    error "Terraform configuration validation failed"
    exit 1
fi

# Show planned changes
log "Running terraform plan..."
terraform plan -out=tfplan

if [ $? -eq 0 ]; then
    success "Terraform plan completed successfully"
    log "Plan saved to: $ENV_DIR/tfplan"
    log "To apply changes, run: terraform apply tfplan"
else
    error "Terraform plan failed"
    exit 1
fi

success "Terraform initialization completed for $ENVIRONMENT"

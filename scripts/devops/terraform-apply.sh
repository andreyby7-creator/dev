#!/bin/bash
# Terraform Apply Script for SaleSpot BY
# Usage: ./scripts/devops/terraform-apply.sh [dev|staging|production] [--auto-approve]

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

# Parse arguments
ENVIRONMENT=""
AUTO_APPROVE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --auto-approve)
            AUTO_APPROVE=true
            shift
            ;;
        dev|staging|production)
            ENVIRONMENT=$1
            shift
            ;;
        *)
            error "Unknown option: $1"
            error "Usage: $0 [dev|staging|production] [--auto-approve]"
            exit 1
            ;;
    esac
done

# Check if environment is provided
if [ -z "$ENVIRONMENT" ]; then
    error "Usage: $0 [dev|staging|production] [--auto-approve]"
    exit 1
fi

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

# Safety check for production
if [ "$ENVIRONMENT" = "production" ] && [ "$AUTO_APPROVE" = false ]; then
    warn "⚠️  PRODUCTION ENVIRONMENT DETECTED ⚠️"
    warn "This will apply changes to PRODUCTION infrastructure"
    echo
    read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirmation
    if [ "$confirmation" != "yes" ]; then
        error "Deployment cancelled"
        exit 1
    fi
fi

log "Applying Terraform changes for environment: $ENVIRONMENT"

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    error "Terraform is not installed"
    error "Please install Terraform: https://www.terraform.io/downloads.html"
    exit 1
fi

# Navigate to environment directory
cd "$ENV_DIR"

# Check if tfplan exists
if [ ! -f "tfplan" ]; then
    warn "No tfplan found. Running terraform plan first..."
    terraform plan -out=tfplan
fi

# Apply changes
log "Applying Terraform changes..."
if [ "$AUTO_APPROVE" = true ]; then
    terraform apply -auto-approve tfplan
else
    terraform apply tfplan
fi

if [ $? -eq 0 ]; then
    success "Terraform changes applied successfully for $ENVIRONMENT"
    
    # Show outputs
    log "Terraform outputs:"
    terraform output
    
    # Clean up plan file
    rm -f tfplan
    log "Plan file cleaned up"
    
else
    error "Failed to apply Terraform changes"
    exit 1
fi

success "Terraform deployment completed for $ENVIRONMENT"

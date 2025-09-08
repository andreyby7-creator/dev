#!/bin/bash
# Environment Parity Management Script for SaleSpot BY
# Usage: ./scripts/deployment/environment-parity.sh [dev|staging|production] [sync|validate|report]

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
ENVIRONMENTS=("dev" "staging" "production")
BASE_ENVIRONMENT="staging"
CONFIG_DIR="infrastructure/terraform/environments"
PARITY_REPORT_DIR="reports/environment-parity"

# Check if environment is provided
if [ $# -lt 1 ]; then
    error "Usage: $0 [dev|staging|production] [sync|validate|report]"
    error "Example: $0 production validate"
    exit 1
fi

TARGET_ENV=$1
ACTION=${2:-"validate"}

# Validate environment
if [[ ! " ${ENVIRONMENTS[@]} " =~ " ${TARGET_ENV} " ]]; then
    error "Invalid environment: $TARGET_ENV"
    error "Valid environments: ${ENVIRONMENTS[*]}"
    exit 1
fi

# Validate action
if [[ ! "$ACTION" =~ ^(sync|validate|report)$ ]]; then
    error "Invalid action: $ACTION"
    error "Valid actions: sync, validate, report"
    exit 1
fi

log "Starting environment parity management for: $TARGET_ENV, action: $ACTION"

# Function to compare Terraform configurations
compare_terraform_configs() {
    local env1=$1
    local env2=$2
    
    log "Comparing Terraform configurations: $env1 vs $env2"
    
    local config1="$CONFIG_DIR/$env1/main.tf"
    local config2="$CONFIG_DIR/$env2/main.tf"
    
    if [ ! -f "$config1" ] || [ ! -f "$config2" ]; then
        error "Configuration files not found"
        return 1
    fi
    
    # Compare module configurations
    local differences=$(diff -u <(grep -E "^[[:space:]]*[a-zA-Z_]" "$config1" | sort) \
                                <(grep -E "^[[:space:]]*[a-zA-Z_]" "$config2" | sort) || true)
    
    if [ -n "$differences" ]; then
        warn "Differences found in Terraform configurations:"
        echo "$differences"
        return 1
    else
        success "Terraform configurations are identical"
        return 0
    fi
}

# Function to validate environment variables
validate_environment_variables() {
    local env=$1
    
    log "Validating environment variables for: $env"
    
    local env_file=".env.$env"
    local required_vars=(
        "DATABASE_URL"
        "REDIS_URL"
        "JWT_SECRET"
        "SUPABASE_URL"
        "SUPABASE_ANON_KEY"
        "NODE_ENV"
        "PORT"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" "$env_file" 2>/dev/null; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        error "Missing environment variables in $env_file:"
        printf '%s\n' "${missing_vars[@]}"
        return 1
    else
        success "All required environment variables present in $env_file"
        return 0
    fi
}

# Function to validate Docker configurations
validate_docker_configs() {
    local env=$1
    
    log "Validating Docker configurations for: $env"
    
    local docker_compose_file="infrastructure/docker/docker-compose.$env.yml"
    
    if [ ! -f "$docker_compose_file" ]; then
        warn "Docker Compose file not found: $docker_compose_file"
        return 1
    fi
    
    # Validate Docker Compose syntax
    if docker-compose -f "$docker_compose_file" config > /dev/null 2>&1; then
        success "Docker Compose configuration is valid"
        return 0
    else
        error "Docker Compose configuration is invalid"
        return 1
    fi
}

# Function to validate Kubernetes configurations
validate_kubernetes_configs() {
    local env=$1
    
    log "Validating Kubernetes configurations for: $env"
    
    local k8s_dir="infrastructure/kubernetes/$env"
    
    if [ ! -d "$k8s_dir" ]; then
        warn "Kubernetes directory not found: $k8s_dir"
        return 1
    fi
    
    local validation_errors=0
    
    # Validate all YAML files
    for yaml_file in "$k8s_dir"/*.yml "$k8s_dir"/*.yaml; do
        if [ -f "$yaml_file" ]; then
            if kubectl apply --dry-run=client -f "$yaml_file" > /dev/null 2>&1; then
                log "✅ Validated: $(basename "$yaml_file")"
            else
                error "❌ Invalid: $(basename "$yaml_file")"
                ((validation_errors++))
            fi
        fi
    done
    
    if [ $validation_errors -eq 0 ]; then
        success "All Kubernetes configurations are valid"
        return 0
    else
        error "Found $validation_errors validation errors"
        return 1
    fi
}

# Function to validate database schemas
validate_database_schemas() {
    local env=$1
    
    log "Validating database schemas for: $env"
    
    # This would typically connect to the database and validate schema
    # For now, we'll check if migration files exist and are consistent
    
    local migrations_dir="apps/api/src/database/migrations"
    
    if [ ! -d "$migrations_dir" ]; then
        warn "Migrations directory not found: $migrations_dir"
        return 1
    fi
    
    # Check if all migration files are properly formatted
    local migration_errors=0
    
    for migration_file in "$migrations_dir"/*.sql; do
        if [ -f "$migration_file" ]; then
            # Basic SQL syntax check
            if sqlparse --check "$migration_file" > /dev/null 2>&1; then
                log "✅ Validated: $(basename "$migration_file")"
            else
                warn "⚠️  Potential issue: $(basename "$migration_file")"
                ((migration_errors++))
            fi
        fi
    done
    
    if [ $migration_errors -eq 0 ]; then
        success "Database schema validation passed"
        return 0
    else
        warn "Found $migration_errors potential schema issues"
        return 1
    fi
}

# Function to validate API endpoints
validate_api_endpoints() {
    local env=$1
    
    log "Validating API endpoints for: $env"
    
    # Load environment variables
    if [ -f ".env.$env" ]; then
        export $(cat ".env.$env" | grep -v '^#' | xargs)
    fi
    
    local base_url="http://localhost:3001"
    local endpoints=(
        "/health"
        "/api/v1/status"
        "/api/v1/version"
    )
    
    local validation_errors=0
    
    for endpoint in "${endpoints[@]}"; do
        if curl -f -s "$base_url$endpoint" > /dev/null 2>&1; then
            log "✅ Endpoint accessible: $endpoint"
        else
            error "❌ Endpoint not accessible: $endpoint"
            ((validation_errors++))
        fi
    done
    
    if [ $validation_errors -eq 0 ]; then
        success "All API endpoints are accessible"
        return 0
    else
        error "Found $validation_errors endpoint issues"
        return 1
    fi
}

# Function to sync configurations
sync_configurations() {
    local source_env=$1
    local target_env=$2
    
    log "Syncing configurations from $source_env to $target_env"
    
    # Sync Terraform configurations
    log "Syncing Terraform configurations..."
    cp "$CONFIG_DIR/$source_env/main.tf" "$CONFIG_DIR/$target_env/main.tf"
    
    # Update environment-specific values
    sed -i "s/environment = \"$source_env\"/environment = \"$target_env\"/g" "$CONFIG_DIR/$target_env/main.tf"
    sed -i "s/domain_name = \"$source_env\./domain_name = \"$target_env\./g" "$CONFIG_DIR/$target_env/main.tf"
    
    # Sync Docker configurations
    log "Syncing Docker configurations..."
    cp "infrastructure/docker/docker-compose.$source_env.yml" "infrastructure/docker/docker-compose.$target_env.yml"
    
    # Sync environment variables (with appropriate modifications)
    log "Syncing environment variables..."
    cp ".env.$source_env" ".env.$target_env"
    
    # Update environment-specific values
    sed -i "s/NODE_ENV=$source_env/NODE_ENV=$target_env/g" ".env.$target_env"
    
    success "Configuration sync completed"
}

# Function to generate parity report
generate_parity_report() {
    local env=$1
    
    log "Generating parity report for: $env"
    
    # Create reports directory
    mkdir -p "$PARITY_REPORT_DIR"
    
    local report_file="$PARITY_REPORT_DIR/parity-report-$env-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << EOF
# Environment Parity Report - $env
Generated: $(date)

## Summary
Environment: $env
Base Environment: $BASE_ENVIRONMENT
Status: $(if [ $? -eq 0 ]; then echo "✅ PASSED"; else echo "❌ FAILED"; fi)

## Configuration Comparison

### Terraform Configurations
$(compare_terraform_configs "$BASE_ENVIRONMENT" "$env" 2>&1)

### Environment Variables
$(validate_environment_variables "$env" 2>&1)

### Docker Configurations
$(validate_docker_configs "$env" 2>&1)

### Kubernetes Configurations
$(validate_kubernetes_configs "$env" 2>&1)

### Database Schemas
$(validate_database_schemas "$env" 2>&1)

### API Endpoints
$(validate_api_endpoints "$env" 2>&1)

## Recommendations
- Ensure all configurations are consistent across environments
- Update environment-specific values appropriately
- Test deployments in staging before production
- Monitor for configuration drift

## Next Steps
1. Review any differences found
2. Update configurations as needed
3. Re-run validation
4. Deploy to target environment
EOF
    
    success "Parity report generated: $report_file"
}

# Main execution
case $ACTION in
    "sync")
        if [ "$TARGET_ENV" = "$BASE_ENVIRONMENT" ]; then
            error "Cannot sync $BASE_ENVIRONMENT to itself"
            exit 1
        fi
        
        sync_configurations "$BASE_ENVIRONMENT" "$TARGET_ENV"
        ;;
        
    "validate")
        log "Validating environment parity for: $TARGET_ENV"
        
        local validation_errors=0
        
        # Compare with base environment
        if [ "$TARGET_ENV" != "$BASE_ENVIRONMENT" ]; then
            compare_terraform_configs "$BASE_ENVIRONMENT" "$TARGET_ENV" || ((validation_errors++))
        fi
        
        # Validate individual components
        validate_environment_variables "$TARGET_ENV" || ((validation_errors++))
        validate_docker_configs "$TARGET_ENV" || ((validation_errors++))
        validate_kubernetes_configs "$TARGET_ENV" || ((validation_errors++))
        validate_database_schemas "$TARGET_ENV" || ((validation_errors++))
        validate_api_endpoints "$TARGET_ENV" || ((validation_errors++))
        
        if [ $validation_errors -eq 0 ]; then
            success "Environment parity validation passed"
        else
            error "Environment parity validation failed with $validation_errors errors"
            exit 1
        fi
        ;;
        
    "report")
        generate_parity_report "$TARGET_ENV"
        ;;
esac

success "Environment parity management completed"
log "Environment: $TARGET_ENV"
log "Action: $ACTION"

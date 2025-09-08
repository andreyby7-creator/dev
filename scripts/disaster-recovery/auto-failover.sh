#!/bin/bash
# Automatic Failover Script for SaleSpot BY
# Usage: ./scripts/disaster-recovery/auto-failover.sh [primary|secondary]

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
PRIMARY_REGION="eu-west-1"
SECONDARY_REGION="eu-central-1"
DOMAIN_NAME="salespot.by"
API_DOMAIN="api.salespot.by"

# Health check endpoints
PRIMARY_API_HEALTH="https://api.salespot.by/health"
SECONDARY_API_HEALTH="https://api-eu-central.salespot.by/health"

# AWS CLI configuration
AWS_PROFILE="salespot-prod"

# Check if target is provided
if [ $# -eq 0 ]; then
    error "Usage: $0 [primary|secondary]"
    exit 1
fi

TARGET=$1

# Validate target
if [[ ! "$TARGET" =~ ^(primary|secondary)$ ]]; then
    error "Invalid target: $TARGET"
    error "Valid targets: primary, secondary"
    exit 1
fi

log "Starting automatic failover to $TARGET datacenter"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    error "AWS CLI is not installed"
    error "Please install AWS CLI: https://aws.amazon.com/cli/"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity --profile "$AWS_PROFILE" &> /dev/null; then
    error "AWS credentials not configured or invalid"
    error "Please configure AWS credentials for profile: $AWS_PROFILE"
    exit 1
fi

# Function to check health endpoint
check_health() {
    local url=$1
    local timeout=10
    
    if curl -f -s --max-time $timeout "$url" > /dev/null; then
        return 0
    else
        return 1
    fi
}

# Function to update Route53 records
update_route53() {
    local target_region=$1
    local target_ip=$2
    
    log "Updating Route53 records to point to $target_region"
    
    # Update main domain
    aws route53 change-resource-record-sets \
        --profile "$AWS_PROFILE" \
        --hosted-zone-id "$(aws route53 list-hosted-zones --profile "$AWS_PROFILE" --query 'HostedZones[?Name==`'$DOMAIN_NAME'.`].Id' --output text)" \
        --change-batch '{
            "Changes": [
                {
                    "Action": "UPSERT",
                    "ResourceRecordSet": {
                        "Name": "'$DOMAIN_NAME'",
                        "Type": "A",
                        "TTL": 300,
                        "ResourceRecords": [
                            {
                                "Value": "'$target_ip'"
                            }
                        ]
                    }
                },
                {
                    "Action": "UPSERT",
                    "ResourceRecordSet": {
                        "Name": "'$API_DOMAIN'",
                        "Type": "A",
                        "TTL": 300,
                        "ResourceRecords": [
                            {
                                "Value": "'$target_ip'"
                            }
                        ]
                    }
                }
            ]
        }'
}

# Function to scale EKS cluster
scale_eks_cluster() {
    local region=$1
    local action=$2
    
    log "Scaling EKS cluster in $region to $action"
    
    # Get cluster name
    local cluster_name=$(aws eks list-clusters --region "$region" --profile "$AWS_PROFILE" --query 'clusters[0]' --output text)
    
    if [ "$action" = "up" ]; then
        # Scale up node groups
        aws eks update-nodegroup-config \
            --cluster-name "$cluster_name" \
            --nodegroup-name "salespot-nodegroup" \
            --region "$region" \
            --profile "$AWS_PROFILE" \
            --scaling-config minSize=2,maxSize=10,desiredSize=4
    else
        # Scale down node groups
        aws eks update-nodegroup-config \
            --cluster-name "$cluster_name" \
            --nodegroup-name "salespot-nodegroup" \
            --region "$region" \
            --profile "$AWS_PROFILE" \
            --scaling-config minSize=0,maxSize=2,desiredSize=0
    fi
}

# Function to promote RDS read replica
promote_rds_replica() {
    local region=$1
    
    log "Promoting RDS read replica in $region"
    
    # Get read replica identifier
    local replica_id=$(aws rds describe-db-instances \
        --region "$region" \
        --profile "$AWS_PROFILE" \
        --query 'DBInstances[?ReadReplicaSourceDBInstanceIdentifier].DBInstanceIdentifier' \
        --output text)
    
    if [ -n "$replica_id" ]; then
        aws rds promote-read-replica \
            --db-instance-identifier "$replica_id" \
            --region "$region" \
            --profile "$AWS_PROFILE"
    else
        warn "No read replica found in $region"
    fi
}

# Main failover logic
if [ "$TARGET" = "secondary" ]; then
    log "Initiating failover to secondary datacenter"
    
    # Check secondary health
    if ! check_health "$SECONDARY_API_HEALTH"; then
        error "Secondary datacenter is not healthy"
        exit 1
    fi
    
    # Get secondary ALB IP
    SECONDARY_ALB_IP=$(aws elbv2 describe-load-balancers \
        --region "$SECONDARY_REGION" \
        --profile "$AWS_PROFILE" \
        --query 'LoadBalancers[0].DNSName' \
        --output text)
    
    # Update Route53
    update_route53 "$SECONDARY_REGION" "$SECONDARY_ALB_IP"
    
    # Scale up secondary EKS
    scale_eks_cluster "$SECONDARY_REGION" "up"
    
    # Promote RDS read replica
    promote_rds_replica "$SECONDARY_REGION"
    
    # Scale down primary EKS
    scale_eks_cluster "$PRIMARY_REGION" "down"
    
    success "Failover to secondary datacenter completed"
    
elif [ "$TARGET" = "primary" ]; then
    log "Initiating failback to primary datacenter"
    
    # Check primary health
    if ! check_health "$PRIMARY_API_HEALTH"; then
        error "Primary datacenter is not healthy"
        exit 1
    fi
    
    # Get primary ALB IP
    PRIMARY_ALB_IP=$(aws elbv2 describe-load-balancers \
        --region "$PRIMARY_REGION" \
        --profile "$AWS_PROFILE" \
        --query 'LoadBalancers[0].DNSName' \
        --output text)
    
    # Update Route53
    update_route53 "$PRIMARY_REGION" "$PRIMARY_ALB_IP"
    
    # Scale up primary EKS
    scale_eks_cluster "$PRIMARY_REGION" "up"
    
    # Scale down secondary EKS
    scale_eks_cluster "$SECONDARY_REGION" "down"
    
    success "Failback to primary datacenter completed"
fi

# Send notification
log "Sending failover notification..."
# TODO: Implement notification logic (Slack, email, etc.)

success "Automatic failover completed successfully"

# AWS Configuration
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-west-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "development"
  
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production."
  }
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "salespot"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "salespot.by"
}

# VPC Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["eu-west-1a", "eu-west-1b", "eu-west-1c"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

# EKS Configuration
variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "salespot-cluster"
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28"
}

variable "node_group_instance_types" {
  description = "Instance types for EKS node groups"
  type        = list(string)
  default     = ["t3.medium", "t3.large"]
}

variable "node_group_desired_size" {
  description = "Desired size for EKS node groups"
  type        = number
  default     = 2
}

variable "node_group_max_size" {
  description = "Maximum size for EKS node groups"
  type        = number
  default     = 4
}

variable "node_group_min_size" {
  description = "Minimum size for EKS node groups"
  type        = number
  default     = 1
}

variable "spot_node_group_instance_types" {
  description = "Instance types for EKS spot node groups"
  type        = list(string)
  default     = ["t3.medium", "t3.large", "t3.xlarge"]
}

variable "spot_node_group_desired_size" {
  description = "Desired size for EKS spot node groups"
  type        = number
  default     = 1
}

variable "spot_node_group_max_size" {
  description = "Maximum size for EKS spot node groups"
  type        = number
  default     = 3
}

variable "spot_node_group_min_size" {
  description = "Minimum size for EKS spot node groups"
  type        = number
  default     = 0
}

# RDS Configuration
variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "rds_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "database_name" {
  description = "Database name"
  type        = string
  default     = "salespot"
}

variable "database_username" {
  description = "Database username"
  type        = string
  default     = "salespot"
  sensitive   = true
}

variable "database_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

# Redis Configuration
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"
}

# Monitoring Configuration
variable "enable_monitoring" {
  description = "Enable monitoring and alerting"
  type        = bool
  default     = true
}

variable "monitoring_retention_days" {
  description = "CloudWatch log retention days"
  type        = number
  default     = 30
}

# Backup Configuration
variable "backup_retention_days" {
  description = "Backup retention days"
  type        = number
  default     = 7
}

variable "enable_automated_backups" {
  description = "Enable automated backups"
  type        = bool
  default     = true
}

# Security Configuration
variable "enable_encryption" {
  description = "Enable encryption at rest"
  type        = bool
  default     = true
}

variable "enable_ssl" {
  description = "Enable SSL/TLS"
  type        = bool
  default     = true
}

# Scaling Configuration
variable "enable_autoscaling" {
  description = "Enable autoscaling"
  type        = bool
  default     = true
}

variable "min_capacity" {
  description = "Minimum capacity for autoscaling"
  type        = number
  default     = 1
}

variable "max_capacity" {
  description = "Maximum capacity for autoscaling"
  type        = number
  default     = 10
}

# Cost Optimization
variable "enable_spot_instances" {
  description = "Enable spot instances for cost optimization"
  type        = bool
  default     = true
}

variable "spot_max_price" {
  description = "Maximum price for spot instances"
  type        = string
  default     = "0.10"
}

# Tags
variable "common_tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default = {
    Project     = "SaleSpot"
    ManagedBy   = "Terraform"
    Environment = "development"
  }
}

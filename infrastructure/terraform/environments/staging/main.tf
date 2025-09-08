terraform {
  required_version = ">= 1.0"
  
  backend "s3" {
    bucket = "salespot-terraform-state-staging"
    key    = "staging/terraform.tfstate"
    region = "eu-west-1"
  }
}

module "salespot" {
  source = "../../"
  
  environment = "staging"
  project_name = "salespot"
  domain_name = "staging.salespot.by"
  
  # Staging-specific configurations
  vpc_cidr = "10.1.0.0/16"
  availability_zones = ["eu-west-1a", "eu-west-1b", "eu-west-1c"]
  
  # Medium instance types for staging
  node_group_instance_types = ["t3.large", "t3.medium"]
  rds_instance_class = "db.t3.small"
  redis_node_type = "cache.t3.small"
  
  # Staging-specific settings
  enable_monitoring = true
  enable_automated_backups = true
  enable_encryption = true
  enable_autoscaling = true
  enable_spot_instances = false
  
  # Staging tags
  common_tags = {
    Environment = "staging"
    Project     = "salespot"
    ManagedBy   = "terraform"
    Owner       = "devops"
  }
}

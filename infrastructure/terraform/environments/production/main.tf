terraform {
  required_version = ">= 1.0"
  
  backend "s3" {
    bucket = "salespot-terraform-state-prod"
    key    = "production/terraform.tfstate"
    region = "eu-west-1"
  }
}

module "salespot" {
  source = "../../"
  
  environment = "production"
  project_name = "salespot"
  domain_name = "salespot.by"
  
  # Production-specific configurations
  vpc_cidr = "10.2.0.0/16"
  availability_zones = ["eu-west-1a", "eu-west-1b", "eu-west-1c"]
  
  # Production instance types
  node_group_instance_types = ["m5.large", "m5.xlarge"]
  rds_instance_class = "db.r5.large"
  redis_node_type = "cache.r5.large"
  
  # Production-specific settings
  enable_monitoring = true
  enable_automated_backups = true
  enable_encryption = true
  enable_autoscaling = true
  enable_spot_instances = true
  
  # Production tags
  common_tags = {
    Environment = "production"
    Project     = "salespot"
    ManagedBy   = "terraform"
    Owner       = "devops"
    Critical    = "true"
  }
}

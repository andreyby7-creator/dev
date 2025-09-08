terraform {
  required_version = ">= 1.0"
  
  backend "s3" {
    bucket = "salespot-terraform-state-dev"
    key    = "dev/terraform.tfstate"
    region = "eu-west-1"
  }
}

module "salespot" {
  source = "../../"
  
  environment = "dev"
  project_name = "salespot"
  domain_name = "dev.salespot.by"
  
  # Dev-specific configurations
  vpc_cidr = "10.0.0.0/16"
  availability_zones = ["eu-west-1a", "eu-west-1b"]
  
  # Smaller instance types for dev
  node_group_instance_types = ["t3.medium", "t3.small"]
  rds_instance_class = "db.t3.micro"
  redis_node_type = "cache.t3.micro"
  
  # Dev-specific settings
  enable_monitoring = true
  enable_automated_backups = true
  enable_encryption = true
  enable_autoscaling = false
  enable_spot_instances = false
  
  # Dev tags
  common_tags = {
    Environment = "dev"
    Project     = "salespot"
    ManagedBy   = "terraform"
    Owner       = "devops"
  }
}

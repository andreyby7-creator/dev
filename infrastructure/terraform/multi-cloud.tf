# Multi-Cloud and Hybrid Deployment Configuration for SaleSpot BY

# AWS Provider (Primary Cloud)
provider "aws" {
  region = var.aws_region
  alias  = "primary"
  
  assume_role {
    role_arn = var.aws_assume_role_arn
  }
}

# Yandex Cloud Provider
provider "yandex" {
  token     = var.yandex_token
  cloud_id  = var.yandex_cloud_id
  folder_id = var.yandex_folder_id
  zone      = var.yandex_zone
}

# VK Cloud Provider
provider "vkcs" {
  auth_url = var.vkcs_auth_url
  region   = var.vkcs_region
  username = var.vkcs_username
  password = var.vkcs_password
  tenant_id = var.vkcs_tenant_id
}

# HOSTER.BY Cloud Provider (via OpenStack)
provider "openstack" {
  auth_url  = var.hosterby_auth_url
  region    = var.hosterby_region
  username  = var.hosterby_username
  password  = var.hosterby_password
  tenant_id = var.hosterby_tenant_id
  alias     = "hosterby"
}

# Local Data Center Provider (via SSH)
provider "null" {
  # For local data center management
}

# Multi-Cloud Load Balancer Configuration
resource "aws_lb" "multi_cloud" {
  provider = aws.primary
  name     = "${var.project_name}-${var.environment}-multi-cloud"
  
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets           = aws_subnet.public[*].id
  
  enable_deletion_protection = var.environment == "production"
  
  tags = merge(var.common_tags, {
    MultiCloud = "true"
  })
}

# Yandex Cloud Resources
resource "yandex_compute_instance" "api" {
  count = var.enable_yandex_cloud ? 1 : 0
  
  name = "${var.project_name}-${var.environment}-api"
  
  resources {
    cores  = 2
    memory = 4
  }
  
  boot_disk {
    initialize_params {
      image_id = var.yandex_image_id
      size     = 20
    }
  }
  
  network_interface {
    subnet_id = yandex_vpc_subnet.main.id
    nat       = true
  }
  
  metadata = {
    ssh-keys = "ubuntu:${file(var.ssh_public_key_path)}"
  }
  
  tags = merge(var.common_tags, {
    Cloud = "yandex"
  })
}

resource "yandex_vpc_network" "main" {
  count = var.enable_yandex_cloud ? 1 : 0
  
  name = "${var.project_name}-${var.environment}-network"
}

resource "yandex_vpc_subnet" "main" {
  count = var.enable_yandex_cloud ? 1 : 0
  
  name           = "${var.project_name}-${var.environment}-subnet"
  network_id     = yandex_vpc_network.main[0].id
  v4_cidr_blocks = ["10.10.0.0/24"]
  zone           = var.yandex_zone
}

# VK Cloud Resources
resource "vkcs_compute_instance" "api" {
  count = var.enable_vk_cloud ? 1 : 0
  
  name = "${var.project_name}-${var.environment}-api"
  
  flavor_id = var.vkcs_flavor_id
  image_id  = var.vkcs_image_id
  
  network {
    uuid = vkcs_networking_network.main[0].id
  }
  
  key_pair = vkcs_compute_keypair.main[0].name
  
  tags = merge(var.common_tags, {
    Cloud = "vk"
  })
}

resource "vkcs_networking_network" "main" {
  count = var.enable_vk_cloud ? 1 : 0
  
  name = "${var.project_name}-${var.environment}-network"
}

resource "vkcs_compute_keypair" "main" {
  count = var.enable_vk_cloud ? 1 : 0
  
  name = "${var.project_name}-${var.environment}-keypair"
}

# HOSTER.BY Cloud Resources
resource "openstack_compute_instance_v2" "api" {
  provider = openstack.hosterby
  count    = var.enable_hosterby_cloud ? 1 : 0
  
  name      = "${var.project_name}-${var.environment}-api"
  image_id  = var.hosterby_image_id
  flavor_id = var.hosterby_flavor_id
  
  network {
    uuid = openstack_networking_network_v2.main[0].id
  }
  
  key_pair = openstack_compute_keypair_v2.main[0].name
  
  tags = merge(var.common_tags, {
    Cloud = "hosterby"
  })
}

resource "openstack_networking_network_v2" "main" {
  provider = openstack.hosterby
  count    = var.enable_hosterby_cloud ? 1 : 0
  
  name = "${var.project_name}-${var.environment}-network"
}

resource "openstack_compute_keypair_v2" "main" {
  provider = openstack.hosterby
  count    = var.enable_hosterby_cloud ? 1 : 0
  
  name = "${var.project_name}-${var.environment}-keypair"
}

# Global Load Balancer (Route53 with health checks)
resource "aws_route53_zone" "multi_cloud" {
  provider = aws.primary
  name     = var.domain_name
  
  tags = merge(var.common_tags, {
    MultiCloud = "true"
  })
}

resource "aws_route53_health_check" "aws" {
  provider = aws.primary
  fqdn     = aws_lb.main.dns_name
  port     = 443
  type     = "HTTPS"
  protocol = "HTTPS"
  
  request_interval = 30
  failure_threshold = 3
  
  tags = merge(var.common_tags, {
    Cloud = "aws"
  })
}

resource "aws_route53_health_check" "yandex" {
  provider = aws.primary
  count    = var.enable_yandex_cloud ? 1 : 0
  
  fqdn     = yandex_compute_instance.api[0].network_interface[0].nat_ip_address
  port     = 3001
  type     = "HTTP"
  protocol = "HTTP"
  
  request_interval = 30
  failure_threshold = 3
  
  tags = merge(var.common_tags, {
    Cloud = "yandex"
  })
}

resource "aws_route53_health_check" "vk" {
  provider = aws.primary
  count    = var.enable_vk_cloud ? 1 : 0
  
  fqdn     = vkcs_compute_instance.api[0].access_ip_v4
  port     = 3001
  type     = "HTTP"
  protocol = "HTTP"
  
  request_interval = 30
  failure_threshold = 3
  
  tags = merge(var.common_tags, {
    Cloud = "vk"
  })
}

resource "aws_route53_health_check" "hosterby" {
  provider = aws.primary
  count    = var.enable_hosterby_cloud ? 1 : 0
  
  fqdn     = openstack_compute_instance_v2.api[0].access_ip_v4
  port     = 3001
  type     = "HTTP"
  protocol = "HTTP"
  
  request_interval = 30
  failure_threshold = 3
  
  tags = merge(var.common_tags, {
    Cloud = "hosterby"
  })
}

# Route53 Records with Failover
resource "aws_route53_record" "api_primary" {
  provider = aws.primary
  zone_id  = aws_route53_zone.multi_cloud.zone_id
  name     = "api.${var.domain_name}"
  type     = "A"
  
  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
  
  failover_routing_policy {
    type = "PRIMARY"
  }
  
  health_check_id = aws_route53_health_check.aws.id
  set_identifier  = "aws-primary"
}

resource "aws_route53_record" "api_secondary_yandex" {
  provider = aws.primary
  count    = var.enable_yandex_cloud ? 1 : 0
  
  zone_id = aws_route53_zone.multi_cloud.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"
  
  ttl = 60
  
  records = [yandex_compute_instance.api[0].network_interface[0].nat_ip_address]
  
  failover_routing_policy {
    type = "SECONDARY"
  }
  
  health_check_id = aws_route53_health_check.yandex[0].id
  set_identifier  = "yandex-secondary"
}

resource "aws_route53_record" "api_secondary_vk" {
  provider = aws.primary
  count    = var.enable_vk_cloud ? 1 : 0
  
  zone_id = aws_route53_zone.multi_cloud.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"
  
  ttl = 60
  
  records = [vkcs_compute_instance.api[0].access_ip_v4]
  
  failover_routing_policy {
    type = "SECONDARY"
  }
  
  health_check_id = aws_route53_health_check.vk[0].id
  set_identifier  = "vk-secondary"
}

resource "aws_route53_record" "api_secondary_hosterby" {
  provider = aws.primary
  count    = var.enable_hosterby_cloud ? 1 : 0
  
  zone_id = aws_route53_zone.multi_cloud.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"
  
  ttl = 60
  
  records = [openstack_compute_instance_v2.api[0].access_ip_v4]
  
  failover_routing_policy {
    type = "SECONDARY"
  }
  
  health_check_id = aws_route53_health_check.hosterby[0].id
  set_identifier  = "hosterby-secondary"
}

# Data Replication Configuration
resource "aws_s3_bucket" "cross_cloud_sync" {
  provider = aws.primary
  bucket   = "${var.project_name}-${var.environment}-cross-cloud-sync"
  
  versioning {
    enabled = true
  }
  
  tags = merge(var.common_tags, {
    MultiCloud = "true"
    Purpose    = "cross-cloud-sync"
  })
}

# Cross-Cloud Monitoring
resource "aws_cloudwatch_dashboard" "multi_cloud" {
  provider = aws.primary
  dashboard_name = "${var.project_name}-${var.environment}-multi-cloud"
  
  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        
        properties = {
          metrics = [
            ["AWS/Route53", "HealthCheckStatus", "HealthCheckId", aws_route53_health_check.aws.id],
            [".", ".", ".", var.enable_yandex_cloud ? aws_route53_health_check.yandex[0].id : ""],
            [".", ".", ".", var.enable_vk_cloud ? aws_route53_health_check.vk[0].id : ""],
            [".", ".", ".", var.enable_hosterby_cloud ? aws_route53_health_check.hosterby[0].id : ""]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "Multi-Cloud Health Status"
        }
      }
    ]
  })
}

# Local Data Center Configuration (for hybrid deployment)
resource "null_resource" "local_datacenter" {
  count = var.enable_local_datacenter ? 1 : 0
  
  provisioner "local-exec" {
    command = <<-EOT
      echo "Configuring local data center..."
      mkdir -p /opt/salespot/local-dc
      cp -r infrastructure/docker/* /opt/salespot/local-dc/
      chmod +x /opt/salespot/local-dc/*.sh
    EOT
  }
  
  provisioner "local-exec" {
    command = <<-EOT
      echo "Starting local services..."
      cd /opt/salespot/local-dc
      docker-compose up -d
    EOT
  }
  
  triggers = {
    docker_compose_hash = filemd5("infrastructure/docker/docker-compose.yml")
  }
}

# Variables for Multi-Cloud Configuration
variable "enable_yandex_cloud" {
  description = "Enable Yandex Cloud deployment"
  type        = bool
  default     = false
}

variable "enable_vk_cloud" {
  description = "Enable VK Cloud deployment"
  type        = bool
  default     = false
}

variable "enable_hosterby_cloud" {
  description = "Enable HOSTER.BY Cloud deployment"
  type        = bool
  default     = false
}

variable "enable_local_datacenter" {
  description = "Enable local data center deployment"
  type        = bool
  default     = false
}

variable "yandex_token" {
  description = "Yandex Cloud API token"
  type        = string
  sensitive   = true
  default     = ""
}

variable "yandex_cloud_id" {
  description = "Yandex Cloud ID"
  type        = string
  default     = ""
}

variable "yandex_folder_id" {
  description = "Yandex Folder ID"
  type        = string
  default     = ""
}

variable "yandex_zone" {
  description = "Yandex Cloud zone"
  type        = string
  default     = "ru-central1-a"
}

variable "yandex_image_id" {
  description = "Yandex Cloud image ID"
  type        = string
  default     = ""
}

variable "vkcs_auth_url" {
  description = "VK Cloud auth URL"
  type        = string
  default     = ""
}

variable "vkcs_region" {
  description = "VK Cloud region"
  type        = string
  default     = ""
}

variable "vkcs_username" {
  description = "VK Cloud username"
  type        = string
  default     = ""
}

variable "vkcs_password" {
  description = "VK Cloud password"
  type        = string
  sensitive   = true
  default     = ""
}

variable "vkcs_tenant_id" {
  description = "VK Cloud tenant ID"
  type        = string
  default     = ""
}

variable "vkcs_flavor_id" {
  description = "VK Cloud flavor ID"
  type        = string
  default     = ""
}

variable "vkcs_image_id" {
  description = "VK Cloud image ID"
  type        = string
  default     = ""
}

variable "hosterby_auth_url" {
  description = "HOSTER.BY auth URL"
  type        = string
  default     = ""
}

variable "hosterby_region" {
  description = "HOSTER.BY region"
  type        = string
  default     = ""
}

variable "hosterby_username" {
  description = "HOSTER.BY username"
  type        = string
  default     = ""
}

variable "hosterby_password" {
  description = "HOSTER.BY password"
  type        = string
  sensitive   = true
  default     = ""
}

variable "hosterby_tenant_id" {
  description = "HOSTER.BY tenant ID"
  type        = string
  default     = ""
}

variable "hosterby_image_id" {
  description = "HOSTER.BY image ID"
  type        = string
  default     = ""
}

variable "hosterby_flavor_id" {
  description = "HOSTER.BY flavor ID"
  type        = string
  default     = ""
}

variable "ssh_public_key_path" {
  description = "Path to SSH public key"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}

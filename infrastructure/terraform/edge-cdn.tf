# Edge CDN and Local Service Replicas Configuration for SaleSpot BY

# CloudFront Distribution for Global CDN
resource "aws_cloudfront_distribution" "main" {
  provider = aws.primary
  enabled             = true
  is_ipv6_enabled    = true
  default_root_object = "index.html"
  
  aliases = [var.domain_name, "www.${var.domain_name}"]
  
  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "ALB-Origin"
    
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
    
    custom_header {
      name  = "X-Forwarded-Host"
      value = var.domain_name
    }
  }
  
  # Local CDN Origins for Russia and Belarus
  origin {
    domain_name = var.enable_yandex_cloud ? yandex_compute_instance.api[0].network_interface[0].nat_ip_address : "dummy.local"
    origin_id   = "Yandex-Origin"
    
    custom_origin_config {
      http_port              = 3001
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
    
    custom_header {
      name  = "X-Origin-Region"
      value = "russia"
    }
  }
  
  origin {
    domain_name = var.enable_vk_cloud ? vkcs_compute_instance.api[0].access_ip_v4 : "dummy.local"
    origin_id   = "VK-Origin"
    
    custom_origin_config {
      http_port              = 3001
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
    
    custom_header {
      name  = "X-Origin-Region"
      value = "russia"
    }
  }
  
  origin {
    domain_name = var.enable_hosterby_cloud ? openstack_compute_instance_v2.api[0].access_ip_v4 : "dummy.local"
    origin_id   = "HosterBY-Origin"
    
    custom_origin_config {
      http_port              = 3001
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
    
    custom_header {
      name  = "X-Origin-Region"
      value = "belarus"
    }
  }
  
  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "ALB-Origin"
    
    forwarded_values {
      query_string = true
      headers      = ["*"]
      
      cookies {
        forward = "all"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }
  
  # API Cache Behavior
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "ALB-Origin"
    
    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Content-Type", "X-Requested-With"]
      
      cookies {
        forward = "all"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 300
    max_ttl                = 3600
  }
  
  # Static Assets Cache Behavior
  ordered_cache_behavior {
    path_pattern     = "/static/*"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "ALB-Origin"
    
    forwarded_values {
      query_string = false
      headers      = ["Origin"]
      
      cookies {
        forward = "none"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
  }
  
  # Price List Cache Behavior
  ordered_cache_behavior {
    path_pattern     = "/api/price-list/*"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "ALB-Origin"
    
    forwarded_values {
      query_string = true
      headers      = ["Accept-Language", "X-Region"]
      
      cookies {
        forward = "none"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 1800
    max_ttl                = 3600
  }
  
  # Regional Routing
  ordered_cache_behavior {
    path_pattern     = "/api/regional/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "ALB-Origin"
    
    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Content-Type", "X-Requested-With", "X-User-Region"]
      
      cookies {
        forward = "all"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 60
    max_ttl                = 300
  }
  
  # Error Pages
  custom_error_response {
    error_code         = 404
    response_code      = "200"
    response_page_path = "/index.html"
  }
  
  custom_error_response {
    error_code         = 403
    response_code      = "200"
    response_page_path = "/index.html"
  }
  
  # SSL Certificate
  viewer_certificate {
    acm_certificate_arn = aws_acm_certificate.main.arn
    ssl_support_method  = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
  
  # Geographic Restrictions (if needed)
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  
  tags = merge(var.common_tags, {
    Purpose = "global-cdn"
  })
}

# Regional CloudFront Distributions
resource "aws_cloudfront_distribution" "russia" {
  provider = aws.primary
  count    = var.enable_russian_cdn ? 1 : 0
  
  enabled             = true
  is_ipv6_enabled    = true
  default_root_object = "index.html"
  
  aliases = ["ru.${var.domain_name}"]
  
  origin {
    domain_name = var.enable_yandex_cloud ? yandex_compute_instance.api[0].network_interface[0].nat_ip_address : aws_lb.main.dns_name
    origin_id   = "Russian-Origin"
    
    custom_origin_config {
      http_port              = 3001
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }
  
  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "Russian-Origin"
    
    forwarded_values {
      query_string = true
      headers      = ["*"]
      
      cookies {
        forward = "all"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 1800
    max_ttl                = 3600
  }
  
  viewer_certificate {
    acm_certificate_arn = aws_acm_certificate.main.arn
    ssl_support_method  = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
  
  restrictions {
    geo_restriction {
      restriction_type = "whitelist"
      locations        = ["RU", "BY"]
    }
  }
  
  tags = merge(var.common_tags, {
    Purpose = "russian-cdn"
  })
}

resource "aws_cloudfront_distribution" "belarus" {
  provider = aws.primary
  count    = var.enable_belarus_cdn ? 1 : 0
  
  enabled             = true
  is_ipv6_enabled    = true
  default_root_object = "index.html"
  
  aliases = ["by.${var.domain_name}"]
  
  origin {
    domain_name = var.enable_hosterby_cloud ? openstack_compute_instance_v2.api[0].access_ip_v4 : aws_lb.main.dns_name
    origin_id   = "Belarus-Origin"
    
    custom_origin_config {
      http_port              = 3001
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }
  
  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "Belarus-Origin"
    
    forwarded_values {
      query_string = true
      headers      = ["*"]
      
      cookies {
        forward = "all"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 1800
    max_ttl                = 3600
  }
  
  viewer_certificate {
    acm_certificate_arn = aws_acm_certificate.main.arn
    ssl_support_method  = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
  
  restrictions {
    geo_restriction {
      restriction_type = "whitelist"
      locations        = ["BY", "RU"]
    }
  }
  
  tags = merge(var.common_tags, {
    Purpose = "belarus-cdn"
  })
}

# Local CDN Edge Locations
resource "aws_cloudfront_cache_policy" "local_optimized" {
  provider = aws.primary
  name     = "${var.project_name}-${var.environment}-local-optimized"
  
  min_ttl     = 0
  default_ttl = 300
  max_ttl     = 3600
  
  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "all"
    }
    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Authorization", "Content-Type", "X-User-Region"]
      }
    }
    query_strings_config {
      query_string_behavior = "all"
    }
  }
}

# Edge Functions for Regional Routing
resource "aws_cloudfront_function" "regional_routing" {
  provider = aws.primary
  name     = "${var.project_name}-${var.environment}-regional-routing"
  runtime  = "cloudfront-js-1.0"
  comment  = "Regional routing function"
  publish  = true
  code     = file("${path.module}/edge-functions/regional-routing.js")
}

# Lambda@Edge for Advanced Regional Logic
resource "aws_lambda_function" "regional_routing_lambda" {
  provider = aws.primary
  filename         = "edge-functions/regional-routing.zip"
  function_name    = "${var.project_name}-${var.environment}-regional-routing"
  role            = aws_iam_role.lambda_edge.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  publish         = true
  
  tags = merge(var.common_tags, {
    Purpose = "edge-routing"
  })
}

resource "aws_iam_role" "lambda_edge" {
  provider = aws.primary
  name = "${var.project_name}-${var.environment}-lambda-edge"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = [
            "lambda.amazonaws.com",
            "edgelambda.amazonaws.com"
          ]
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_edge_basic" {
  provider = aws.primary
  role       = aws_iam_role.lambda_edge.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Local Service Replicas
resource "aws_ecs_service" "api_russia_replica" {
  provider = aws.primary
  count    = var.enable_russian_replica ? 1 : 0
  
  name            = "${var.project_name}-${var.environment}-api-russia"
  cluster         = aws_eks_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 2
  
  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.ecs_tasks.id]
  }
  
  load_balancer {
    target_group_arn = aws_lb_target_group.api_russia[0].arn
    container_name   = "api"
    container_port   = 3001
  }
  
  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }
  
  tags = merge(var.common_tags, {
    Region = "russia"
    Replica = "true"
  })
}

resource "aws_ecs_service" "api_belarus_replica" {
  provider = aws.primary
  count    = var.enable_belarus_replica ? 1 : 0
  
  name            = "${var.project_name}-${var.environment}-api-belarus"
  cluster         = aws_eks_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 2
  
  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.ecs_tasks.id]
  }
  
  load_balancer {
    target_group_arn = aws_lb_target_group.api_belarus[0].arn
    container_name   = "api"
    container_port   = 3001
  }
  
  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }
  
  tags = merge(var.common_tags, {
    Region = "belarus"
    Replica = "true"
  })
}

# Target Groups for Regional Replicas
resource "aws_lb_target_group" "api_russia" {
  provider = aws.primary
  count    = var.enable_russian_replica ? 1 : 0
  
  name     = "${var.project_name}-${var.environment}-api-russia"
  port     = 3001
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id
  
  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }
  
  tags = merge(var.common_tags, {
    Region = "russia"
  })
}

resource "aws_lb_target_group" "api_belarus" {
  provider = aws.primary
  count    = var.enable_belarus_replica ? 1 : 0
  
  name     = "${var.project_name}-${var.environment}-api-belarus"
  port     = 3001
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id
  
  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }
  
  tags = merge(var.common_tags, {
    Region = "belarus"
  })
}

# Route53 Records for Regional CDNs
resource "aws_route53_record" "cdn_russia" {
  provider = aws.primary
  count    = var.enable_russian_cdn ? 1 : 0
  
  zone_id = aws_route53_zone.main.zone_id
  name    = "ru.${var.domain_name}"
  type    = "A"
  
  alias {
    name                   = aws_cloudfront_distribution.russia[0].domain_name
    zone_id                = aws_cloudfront_distribution.russia[0].hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "cdn_belarus" {
  provider = aws.primary
  count    = var.enable_belarus_cdn ? 1 : 0
  
  zone_id = aws_route53_zone.main.zone_id
  name    = "by.${var.domain_name}"
  type    = "A"
  
  alias {
    name                   = aws_cloudfront_distribution.belarus[0].domain_name
    zone_id                = aws_cloudfront_distribution.belarus[0].hosted_zone_id
    evaluate_target_health = false
  }
}

# Edge Monitoring
resource "aws_cloudwatch_dashboard" "edge_performance" {
  provider = aws.primary
  dashboard_name = "${var.project_name}-${var.environment}-edge-performance"
  
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
            ["AWS/CloudFront", "Requests", "DistributionId", aws_cloudfront_distribution.main.id],
            [".", "BytesDownloaded", ".", "."],
            [".", "BytesUploaded", ".", "."]
          ]
          period = 300
          stat   = "Sum"
          region = "us-east-1"
          title  = "Global CDN Performance"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        
        properties = {
          metrics = [
            ["AWS/CloudFront", "TotalErrorRate", "DistributionId", aws_cloudfront_distribution.main.id],
            [".", "4xxErrorRate", ".", "."],
            [".", "5xxErrorRate", ".", "."]
          ]
          period = 300
          stat   = "Average"
          region = "us-east-1"
          title  = "CDN Error Rates"
        }
      }
    ]
  })
}

# Variables for Edge CDN
variable "enable_russian_cdn" {
  description = "Enable Russian regional CDN"
  type        = bool
  default     = false
}

variable "enable_belarus_cdn" {
  description = "Enable Belarus regional CDN"
  type        = bool
  default     = false
}

variable "enable_russian_replica" {
  description = "Enable Russian service replica"
  type        = bool
  default     = false
}

variable "enable_belarus_replica" {
  description = "Enable Belarus service replica"
  type        = bool
  default     = false
}

variable "cdn_cache_ttl" {
  description = "CDN cache TTL in seconds"
  type        = number
  default     = 3600
}

variable "edge_function_timeout" {
  description = "Edge function timeout in seconds"
  type        = number
  default     = 5
}

# Monitoring and Alerting Configuration for SaleSpot BY

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "api_logs" {
  name              = "/aws/eks/${var.cluster_name}/api"
  retention_in_days = 30

  tags = var.common_tags
}

resource "aws_cloudwatch_log_group" "web_logs" {
  name              = "/aws/eks/${var.cluster_name}/web"
  retention_in_days = 30

  tags = var.common_tags
}

resource "aws_cloudwatch_log_group" "nginx_logs" {
  name              = "/aws/eks/${var.cluster_name}/nginx"
  retention_in_days = 30

  tags = var.common_tags
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "api_high_cpu" {
  alarm_name          = "${var.project_name}-${var.environment}-api-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "API service CPU utilization is high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ServiceName = "api"
    ClusterName = aws_eks_cluster.main.name
  }

  tags = var.common_tags
}

resource "aws_cloudwatch_metric_alarm" "api_high_memory" {
  alarm_name          = "${var.project_name}-${var.environment}-api-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "API service memory utilization is high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ServiceName = "api"
    ClusterName = aws_eks_cluster.main.name
  }

  tags = var.common_tags
}

resource "aws_cloudwatch_metric_alarm" "rds_high_cpu" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "RDS CPU utilization is high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  tags = var.common_tags
}

resource "aws_cloudwatch_metric_alarm" "rds_high_connections" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-high-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "RDS connection count is high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  tags = var.common_tags
}

resource "aws_cloudwatch_metric_alarm" "alb_high_5xx" {
  alarm_name          = "${var.project_name}-${var.environment}-alb-high-5xx"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HTTPCode_ELB_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "ALB 5XX error count is high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = var.common_tags
}

resource "aws_cloudwatch_metric_alarm" "alb_high_target_5xx" {
  alarm_name          = "${var.project_name}-${var.environment}-alb-high-target-5xx"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "Target 5XX error count is high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = var.common_tags
}

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-${var.environment}-alerts"

  tags = var.common_tags
}

resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = "alerts@salespot.by"
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-${var.environment}-dashboard"

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
            ["AWS/ECS", "CPUUtilization", "ServiceName", "api", "ClusterName", aws_eks_cluster.main.name],
            [".", "MemoryUtilization", ".", ".", ".", "."]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "API Service Metrics"
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
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", aws_db_instance.main.id],
            [".", "DatabaseConnections", ".", "."]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "RDS Metrics"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", aws_lb.main.arn_suffix],
            [".", "TargetResponseTime", ".", "."]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "ALB Metrics"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ApplicationELB", "HTTPCode_ELB_5XX_Count", "LoadBalancer", aws_lb.main.arn_suffix],
            [".", "HTTPCode_Target_5XX_Count", ".", "."]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "Error Rates"
        }
      }
    ]
  })
}

# Prometheus Configuration for EKS
resource "kubernetes_config_map" "prometheus_config" {
  metadata {
    name      = "prometheus-config"
    namespace = "monitoring"
  }

  data = {
    "prometheus.yml" = yamlencode({
      global = {
        scrape_interval = "15s"
        evaluation_interval = "15s"
      }
      rule_files = [
        "/etc/prometheus/rules/*.yml"
      ]
      scrape_configs = [
        {
          job_name = "kubernetes-pods"
          kubernetes_sd_configs = [
            {
              role = "pod"
            }
          ]
          relabel_configs = [
            {
              source_labels = ["__meta_kubernetes_pod_annotation_prometheus_io_scrape"]
              action = "keep"
              regex = true
            }
          ]
        },
        {
          job_name = "kubernetes-service-endpoints"
          kubernetes_sd_configs = [
            {
              role = "endpoints"
            }
          ]
          relabel_configs = [
            {
              source_labels = ["__meta_kubernetes_service_annotation_prometheus_io_scrape"]
              action = "keep"
              regex = true
            }
          ]
        }
      ]
    })
  }
}

# Grafana Configuration
resource "kubernetes_config_map" "grafana_datasources" {
  metadata {
    name      = "grafana-datasources"
    namespace = "monitoring"
  }

  data = {
    "datasources.yml" = yamlencode({
      apiVersion = 1
      datasources = [
        {
          name = "Prometheus"
          type = "prometheus"
          url = "http://prometheus:9090"
          access = "proxy"
          isDefault = true
        }
      ]
    })
  }
}

# DR-specific CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "dr_primary_unhealthy" {
  count = var.environment == "production" ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-dr-primary-unhealthy"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "HealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Average"
  threshold           = "0"
  alarm_description   = "Primary datacenter is unhealthy - initiate DR failover"
  alarm_actions       = [aws_sns_topic.dr_alerts[0].arn]

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
    TargetGroup  = aws_lb_target_group.api.arn_suffix
  }

  tags = merge(var.common_tags, {
    DR = "true"
  })
}

resource "aws_sns_topic" "dr_alerts" {
  count = var.environment == "production" ? 1 : 0

  name = "${var.project_name}-${var.environment}-dr-alerts"

  tags = merge(var.common_tags, {
    DR = "true"
  })
}

resource "aws_sns_topic_subscription" "dr_alerts_email" {
  count = var.environment == "production" ? 1 : 0

  topic_arn = aws_sns_topic.dr_alerts[0].arn
  protocol  = "email"
  endpoint  = "dr-alerts@salespot.by"
}

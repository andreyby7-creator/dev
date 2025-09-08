# Data Residency and Compliance Configuration for SaleSpot BY
# Compliant with ФЗ-152 (Russian Federation) and local requirements

# Data Residency Configuration
resource "aws_s3_bucket" "russian_data" {
  provider = aws.primary
  bucket   = "${var.project_name}-${var.environment}-russian-data"
  
  # Ensure data stays in Russian region
  tags = merge(var.common_tags, {
    DataResidency = "russia"
    Compliance    = "fz152"
    Purpose       = "user-data"
  })
}

resource "aws_s3_bucket_versioning" "russian_data" {
  bucket = aws_s3_bucket.russian_data.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "russian_data" {
  bucket = aws_s3_bucket.russian_data.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "russian_data" {
  bucket = aws_s3_bucket.russian_data.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Belarus Data Residency
resource "aws_s3_bucket" "belarus_data" {
  provider = aws.primary
  bucket   = "${var.project_name}-${var.environment}-belarus-data"
  
  tags = merge(var.common_tags, {
    DataResidency = "belarus"
    Compliance    = "local-rb"
    Purpose       = "user-data"
  })
}

resource "aws_s3_bucket_versioning" "belarus_data" {
  bucket = aws_s3_bucket.belarus_data.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "belarus_data" {
  bucket = aws_s3_bucket.belarus_data.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "belarus_data" {
  bucket = aws_s3_bucket.belarus_data.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# RDS with Data Residency
resource "aws_db_instance" "russian_compliant" {
  provider = aws.primary
  count    = var.enable_russian_data_residency ? 1 : 0
  
  identifier = "${var.project_name}-${var.environment}-russian-db"
  
  engine         = "postgres"
  engine_version = "14.7"
  instance_class = var.rds_instance_class
  
  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_type          = "gp3"
  storage_encrypted     = true
  
  db_name  = "salespot_russian"
  username = "postgres"
  password = var.database_password
  
  vpc_security_group_ids = [aws_security_group.rds_russian[0].id]
  db_subnet_group_name   = aws_db_subnet_group.russian[0].name
  
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = false
  final_snapshot_identifier = "${var.project_name}-${var.environment}-russian-final-snapshot"
  
  deletion_protection = var.environment == "production"
  
  tags = merge(var.common_tags, {
    DataResidency = "russia"
    Compliance    = "fz152"
    Purpose       = "user-database"
  })
}

resource "aws_db_instance" "belarus_compliant" {
  provider = aws.primary
  count    = var.enable_belarus_data_residency ? 1 : 0
  
  identifier = "${var.project_name}-${var.environment}-belarus-db"
  
  engine         = "postgres"
  engine_version = "14.7"
  instance_class = var.rds_instance_class
  
  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_type          = "gp3"
  storage_encrypted     = true
  
  db_name  = "salespot_belarus"
  username = "postgres"
  password = var.database_password
  
  vpc_security_group_ids = [aws_security_group.rds_belarus[0].id]
  db_subnet_group_name   = aws_db_subnet_group.belarus[0].name
  
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = false
  final_snapshot_identifier = "${var.project_name}-${var.environment}-belarus-final-snapshot"
  
  deletion_protection = var.environment == "production"
  
  tags = merge(var.common_tags, {
    DataResidency = "belarus"
    Compliance    = "local-rb"
    Purpose       = "user-database"
  })
}

# Security Groups for Data Residency
resource "aws_security_group" "rds_russian" {
  provider = aws.primary
  count    = var.enable_russian_data_residency ? 1 : 0
  
  name        = "${var.project_name}-${var.environment}-rds-russian"
  description = "Security group for Russian RDS instance"
  vpc_id      = aws_vpc.main.id
  
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = merge(var.common_tags, {
    DataResidency = "russia"
    Compliance    = "fz152"
  })
}

resource "aws_security_group" "rds_belarus" {
  provider = aws.primary
  count    = var.enable_belarus_data_residency ? 1 : 0
  
  name        = "${var.project_name}-${var.environment}-rds-belarus"
  description = "Security group for Belarus RDS instance"
  vpc_id      = aws_vpc.main.id
  
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = merge(var.common_tags, {
    DataResidency = "belarus"
    Compliance    = "local-rb"
  })
}

# Subnet Groups for Data Residency
resource "aws_db_subnet_group" "russian" {
  provider = aws.primary
  count    = var.enable_russian_data_residency ? 1 : 0
  
  name       = "${var.project_name}-${var.environment}-russian-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id
  
  tags = merge(var.common_tags, {
    DataResidency = "russia"
    Compliance    = "fz152"
  })
}

resource "aws_db_subnet_group" "belarus" {
  provider = aws.primary
  count    = var.enable_belarus_data_residency ? 1 : 0
  
  name       = "${var.project_name}-${var.environment}-belarus-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id
  
  tags = merge(var.common_tags, {
    DataResidency = "belarus"
    Compliance    = "local-rb"
  })
}

# Compliance Monitoring and Logging
resource "aws_cloudwatch_log_group" "compliance_logs" {
  provider = aws.primary
  name     = "/aws/eks/${var.cluster_name}/compliance"
  
  retention_in_days = 2555 # 7 years for compliance
  
  tags = merge(var.common_tags, {
    Compliance = "fz152"
    Purpose    = "audit-logs"
  })
}

# Data Access Logging
resource "aws_s3_bucket_logging" "russian_data_logging" {
  bucket = aws_s3_bucket.russian_data.id

  target_bucket = aws_s3_bucket.compliance_logs.id
  target_prefix = "russian-data/"
}

resource "aws_s3_bucket_logging" "belarus_data_logging" {
  bucket = aws_s3_bucket.belarus_data.id

  target_bucket = aws_s3_bucket.compliance_logs.id
  target_prefix = "belarus-data/"
}

resource "aws_s3_bucket" "compliance_logs" {
  provider = aws.primary
  bucket   = "${var.project_name}-${var.environment}-compliance-logs"
  
  versioning {
    enabled = true
  }
  
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
  
  tags = merge(var.common_tags, {
    Compliance = "fz152"
    Purpose    = "audit-logs"
  })
}

# Compliance Alerts
resource "aws_cloudwatch_metric_alarm" "data_access_violation" {
  provider = aws.primary
  alarm_name          = "${var.project_name}-${var.environment}-data-access-violation"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "NumberOfObjects"
  namespace           = "AWS/S3"
  period              = "300"
  statistic           = "Sum"
  threshold           = "1000"
  alarm_description   = "Unusual data access pattern detected"
  alarm_actions       = [aws_sns_topic.compliance_alerts.arn]
  
  dimensions = {
    BucketName = aws_s3_bucket.russian_data.bucket
  }
  
  tags = merge(var.common_tags, {
    Compliance = "fz152"
  })
}

resource "aws_sns_topic" "compliance_alerts" {
  provider = aws.primary
  name = "${var.project_name}-${var.environment}-compliance-alerts"
  
  tags = merge(var.common_tags, {
    Compliance = "fz152"
  })
}

resource "aws_sns_topic_subscription" "compliance_email" {
  provider = aws.primary
  topic_arn = aws_sns_topic.compliance_alerts.arn
  protocol  = "email"
  endpoint  = "compliance@salespot.by"
}

# Data Retention Policy
resource "aws_s3_bucket_lifecycle_configuration" "russian_data_retention" {
  bucket = aws_s3_bucket.russian_data.id

  rule {
    id     = "data-retention"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 2555 # 7 years for ФЗ-152 compliance
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "belarus_data_retention" {
  bucket = aws_s3_bucket.belarus_data.id

  rule {
    id     = "data-retention"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 1825 # 5 years for Belarus compliance
    }
  }
}

# Compliance Dashboard
resource "aws_cloudwatch_dashboard" "compliance" {
  provider = aws.primary
  dashboard_name = "${var.project_name}-${var.environment}-compliance"
  
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
            ["AWS/S3", "NumberOfObjects", "BucketName", aws_s3_bucket.russian_data.bucket],
            [".", ".", ".", aws_s3_bucket.belarus_data.bucket]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "Data Objects by Residency"
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
            ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", aws_db_instance.russian_compliant[0].id],
            [".", ".", ".", aws_db_instance.belarus_compliant[0].id]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "Database Connections by Residency"
        }
      }
    ]
  })
}

# Variables for Data Residency
variable "enable_russian_data_residency" {
  description = "Enable Russian data residency (ФЗ-152 compliance)"
  type        = bool
  default     = false
}

variable "enable_belarus_data_residency" {
  description = "Enable Belarus data residency (local compliance)"
  type        = bool
  default     = false
}

variable "data_retention_years_russia" {
  description = "Data retention period in years for Russia (ФЗ-152)"
  type        = number
  default     = 7
}

variable "data_retention_years_belarus" {
  description = "Data retention period in years for Belarus"
  type        = number
  default     = 5
}

variable "compliance_email" {
  description = "Email for compliance alerts"
  type        = string
  default     = "compliance@salespot.by"
}

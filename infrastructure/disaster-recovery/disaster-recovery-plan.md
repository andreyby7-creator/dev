# Disaster Recovery Plan - SaleSpot BY

## Обзор

Данный документ описывает план аварийного восстановления (DRP) для системы SaleSpot BY, включающий процедуры автоматического failover, восстановления данных и обеспечения непрерывности бизнеса.

## Цели восстановления

- **RTO (Recovery Time Objective)**: 15 минут для критических сервисов
- **RPO (Recovery Point Objective)**: 5 минут для базы данных
- **MTTR (Mean Time To Recovery)**: 30 минут для полного восстановления

## Архитектура DR

### Первичный дата-центр (Primary DC)

- **Локация**: AWS eu-west-1 (Ирландия)
- **Сервисы**: EKS кластер, RDS PostgreSQL, ElastiCache Redis, ALB
- **Мониторинг**: CloudWatch, Prometheus, Grafana

### Вторичный дата-центр (Secondary DC)

- **Локация**: AWS eu-central-1 (Франкфурт)
- **Сервисы**: Standby EKS кластер, RDS Read Replica, Redis Replica
- **Активация**: Автоматический failover при недоступности primary

### Локальный дата-центр (Local DC)

- **Локация**: BeCloud (Минск)
- **Сервисы**: Backup сервер, локальные реплики
- **Активация**: Ручной failover при недоступности облачных провайдеров

## Классификация инцидентов

### Уровень 1 - Критический

- Полная недоступность primary DC
- Потеря данных
- Компрометация безопасности

### Уровень 2 - Высокий

- Частичная недоступность сервисов
- Проблемы с производительностью
- Сбои в мониторинге

### Уровень 3 - Средний

- Проблемы с отдельными компонентами
- Временные сбои
- Проблемы с резервными копиями

## Процедуры автоматического failover

### 1. Мониторинг и детекция

```yaml
# prometheus/rules/failover.rules.yml
groups:
  - name: failover
    rules:
      - alert: PrimaryDCDown
        expr: up{job="primary-dc"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: 'Primary DC недоступен'
          description: 'Автоматический failover будет инициирован через 5 минут'

      - alert: DatabaseUnavailable
        expr: pg_up{instance="primary-db"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: 'База данных недоступна'
          description: 'Инициирование failover на standby DB'

      - alert: APIServiceDown
        expr: http_requests_total{job="api"} == 0
        for: 3m
        labels:
          severity: high
        annotations:
          summary: 'API сервис недоступен'
          description: 'Проверка состояния API сервиса'
```

### 2. Автоматический failover скрипт

```bash
#!/bin/bash
# scripts/disaster-recovery/auto-failover.sh

set -e

# Конфигурация
PRIMARY_REGION="eu-west-1"
SECONDARY_REGION="eu-central-1"
CLUSTER_NAME="salespot-cluster"
RDS_IDENTIFIER="salespot-db"
REDIS_CLUSTER_ID="salespot-redis"

# Функции логирования
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
}

# Проверка доступности primary DC
check_primary_health() {
    local health_checks=0

    # Проверка EKS кластера
    if aws eks describe-cluster --region $PRIMARY_REGION --name $CLUSTER_NAME > /dev/null 2>&1; then
        health_checks=$((health_checks + 1))
    fi

    # Проверка RDS
    if aws rds describe-db-instances --region $PRIMARY_REGION --db-instance-identifier $RDS_IDENTIFIER > /dev/null 2>&1; then
        health_checks=$((health_checks + 1))
    fi

    # Проверка Redis
    if aws elasticache describe-cache-clusters --region $PRIMARY_REGION --cache-cluster-id $REDIS_CLUSTER_ID > /dev/null 2>&1; then
        health_checks=$((health_checks + 1))
    fi

    return $health_checks
}

# Инициирование failover
initiate_failover() {
    log "Инициирование автоматического failover..."

    # 1. Активация RDS Read Replica
    log "Активация RDS Read Replica..."
    aws rds promote-read-replica \
        --region $SECONDARY_REGION \
        --db-instance-identifier "${RDS_IDENTIFIER}-replica"

    # 2. Переключение DNS на secondary DC
    log "Обновление DNS записей..."
    aws route53 change-resource-record-sets \
        --hosted-zone-id $HOSTED_ZONE_ID \
        --change-batch file://dns-failover.json

    # 3. Масштабирование secondary EKS кластера
    log "Масштабирование secondary EKS кластера..."
    aws eks update-nodegroup-config \
        --region $SECONDARY_REGION \
        --cluster-name "${CLUSTER_NAME}-secondary" \
        --nodegroup-name general \
        --scaling-config minSize=2,maxSize=6,desiredSize=4

    # 4. Активация Redis Replica
    log "Активация Redis Replica..."
    aws elasticache modify-cache-cluster \
        --region $SECONDARY_REGION \
        --cache-cluster-id "${REDIS_CLUSTER_ID}-replica" \
        --num-cache-nodes 2

    log "Failover завершен успешно"
}

# Основная логика
main() {
    log "Проверка состояния primary DC..."

    if check_primary_health; then
        log "Primary DC доступен, failover не требуется"
        exit 0
    else
        log "Primary DC недоступен, инициирование failover..."
        initiate_failover
    fi
}

main "$@"
```

### 3. DNS failover конфигурация

```json
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.salespot.by",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2IFOLAFXWLO4F",
          "DNSName": "secondary-alb.eu-central-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        },
        "HealthCheckId": "secondary-health-check"
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "salespot.by",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2IFOLAFXWLO4F",
          "DNSName": "secondary-alb.eu-central-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        },
        "HealthCheckId": "secondary-health-check"
      }
    }
  ]
}
```

## Процедуры восстановления

### 1. Восстановление базы данных

```bash
#!/bin/bash
# scripts/disaster-recovery/restore-database.sh

# Восстановление из S3 backup
aws s3 cp s3://salespot-backups/latest/database.sql.gz /tmp/
gunzip /tmp/database.sql.gz

# Восстановление в новую RDS инстанцию
psql -h $NEW_DB_HOST -U $DB_USER -d $DB_NAME < /tmp/database.sql

# Проверка целостности
pg_restore --list /tmp/database.sql | wc -l
```

### 2. Восстановление файлов

```bash
#!/bin/bash
# scripts/disaster-recovery/restore-files.sh

# Восстановление из S3 backup
aws s3 cp s3://salespot-backups/latest/files.tar.gz /tmp/
tar -xzf /tmp/files.tar.gz -C /app/

# Восстановление конфигурации
aws s3 cp s3://salespot-backups/latest/config.tar.gz /tmp/
tar -xzf /tmp/config.tar.gz -C /app/
```

### 3. Восстановление Docker volumes

```bash
#!/bin/bash
# scripts/disaster-recovery/restore-volumes.sh

# Восстановление из S3 backup
aws s3 cp s3://salespot-backups/latest/docker-volumes.tar.gz /tmp/
tar -xzf /tmp/docker-volumes.tar.gz -C /tmp/volumes/

# Восстановление volumes
for volume_file in /tmp/volumes/*.tar.gz; do
    volume_name=$(basename "$volume_file" .tar.gz)
    docker volume create "$volume_name"
    docker run --rm -v "$volume_name:/data" -v "$(dirname "$volume_file"):/backup" \
        alpine tar -xzf "/backup/$(basename "$volume_file")" -C /data
done
```

## Мониторинг и алертинг

### 1. CloudWatch Alarms

```yaml
# infrastructure/terraform/monitoring.tf
resource "aws_cloudwatch_metric_alarm" "primary_dc_health" {
alarm_name          = "primary-dc-health"
comparison_operator = "LessThanThreshold"
evaluation_periods  = "2"
metric_name         = "HealthyHostCount"
namespace           = "AWS/ApplicationELB"
period              = "60"
statistic           = "Average"
threshold           = "1"
alarm_description   = "Primary DC health check"
alarm_actions       = [aws_sns_topic.dr_alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "database_connections" {
alarm_name          = "database-connections"
comparison_operator = "LessThanThreshold"
evaluation_periods  = "1"
metric_name         = "DatabaseConnections"
namespace           = "AWS/RDS"
period              = "300"
statistic           = "Average"
threshold           = "5"
alarm_description   = "Database connection count"
alarm_actions       = [aws_sns_topic.dr_alerts.arn]
}
```

### 2. Prometheus Rules

```yaml
# prometheus/rules/dr.rules.yml
groups:
  - name: disaster-recovery
    rules:
      - alert: DRFailoverRequired
        expr: primary_dc_health == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'Требуется failover'
          description: 'Primary DC недоступен более 5 минут'

      - alert: DataLossRisk
        expr: database_replication_lag > 300
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: 'Риск потери данных'
          description: 'Replication lag превышает 5 минут'
```

## Тестирование DR плана

### 1. План тестирования

```bash
#!/bin/bash
# scripts/disaster-recovery/test-dr-plan.sh

# Тест 1: Симуляция недоступности primary DC
test_primary_dc_failure() {
    log "Тест 1: Симуляция недоступности primary DC"

    # Остановка primary EKS кластера
    aws eks update-cluster-config \
        --region eu-west-1 \
        --name salespot-cluster \
        --resources-vpc-config subnetIds=subnet-nonexistent

    # Ожидание failover
    sleep 300

    # Проверка доступности secondary DC
    check_secondary_health

    # Восстановление primary DC
    aws eks update-cluster-config \
        --region eu-west-1 \
        --name salespot-cluster \
        --resources-vpc-config subnetIds=subnet-original
}

# Тест 2: Тест восстановления данных
test_data_recovery() {
    log "Тест 2: Тест восстановления данных"

    # Создание тестовых данных
    create_test_data

    # Создание backup
    ./scripts/backup/automated-backup.sh full

    # Удаление данных
    delete_test_data

    # Восстановление из backup
    ./scripts/disaster-recovery/restore-database.sh

    # Проверка восстановления
    verify_test_data
}

# Тест 3: Тест DNS failover
test_dns_failover() {
    log "Тест 3: Тест DNS failover"

    # Изменение DNS на secondary DC
    aws route53 change-resource-record-sets \
        --hosted-zone-id $HOSTED_ZONE_ID \
        --change-batch file://dns-failover-test.json

    # Проверка доступности через secondary DC
    curl -f https://api.salespot.by/health

    # Возврат DNS на primary DC
    aws route53 change-resource-record-sets \
        --hosted-zone-id $HOSTED_ZONE_ID \
        --change-batch file://dns-primary.json
}
```

### 2. График тестирования

- **Еженедельно**: Тест мониторинга и алертинга
- **Ежемесячно**: Тест автоматического failover
- **Ежеквартально**: Полный тест DR плана
- **Ежегодно**: Тест восстановления из backup

## Контакты и эскалация

### Уровень 1 - DevOps команда

- **Время реакции**: 5 минут
- **Контакты**: Slack #devops-alerts, Telegram @devops-team

### Уровень 2 - Системные администраторы

- **Время реакции**: 15 минут
- **Контакты**: Slack #sysadmin, Phone: +375-XX-XXX-XXXX

### Уровень 3 - Менеджмент

- **Время реакции**: 30 минут
- **Контакты**: Email: management@salespot.by, Phone: +375-XX-XXX-XXXX

## Документация и обучение

### Обязательная документация

- [Процедуры failover](./procedures/failover-procedures.md)
- [Схемы восстановления](./diagrams/recovery-diagrams.md)
- [Контакты и эскалация](./contacts/escalation-contacts.md)

### Обучение команды

- **Ежемесячно**: Обзор DR процедур
- **Ежеквартально**: Практические тренировки
- **Ежегодно**: Сертификация по DR процедурам

## Метрики и отчетность

### KPI для DR

- **Время восстановления**: < 15 минут
- **Потеря данных**: < 5 минут
- **Доступность**: 99.9%
- **Успешность тестов**: > 95%

### Отчеты

- **Еженедельно**: Отчет о состоянии DR
- **Ежемесячно**: Анализ инцидентов
- **Ежеквартально**: Обзор эффективности DR плана

## Заключение

Данный план обеспечивает надежное аварийное восстановление системы SaleSpot BY с автоматическим failover и минимальным временем простоя. Регулярное тестирование и обновление плана гарантирует его эффективность в реальных условиях.

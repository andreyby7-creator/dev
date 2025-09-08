# Деплоймент и Операции - SaleSpot BY

## Назначение

Инструменты и процедуры для деплоймента и операций в проекте SaleSpot BY.

## Основные компоненты

### 1. Blue-Green Deployments

**Функциональность:**

- Нулевое время простоя при обновлении приложений
- Автоматическое переключение между окружениями
- Проверка здоровья сервисов

**Компоненты:**

- `infrastructure/docker/docker-compose.blue-green.yml` - конфигурация окружений
- `infrastructure/docker/nginx.conf` - конфигурация Nginx
- `scripts/deployment/blue-green-deploy.sh` - скрипт управления

**Использование:**

```bash
# Деплоймент API в blue окружение
./scripts/deployment/blue-green-deploy.sh blue api

# Деплоймент web в green окружение
./scripts/deployment/blue-green-deploy.sh green web

# Полный деплоймент в blue окружение
./scripts/deployment/blue-green-deploy.sh blue all
```

**Процесс деплоймента:**

1. Проверка предварительных условий
2. Определение активного окружения
3. Сборка новых Docker образов
4. Масштабирование целевого окружения
5. Проверка здоровья сервисов
6. Обновление конфигурации Nginx
7. Масштабирование старого окружения

### 2. Feature Flags

**Функциональность:**

- Динамическое управление функциональностью без передеплоймента
- Поддержка различных типов флагов
- Правила активации по пользователям и окружениям

**Компоненты:**

- `apps/api/src/feature-flags/feature-flags.service.ts` - сервис управления
- `apps/api/src/feature-flags/feature-flags.controller.ts` - API контроллер
- `apps/api/src/feature-flags/feature-flags.module.ts` - NestJS модуль

**API Endpoints:**

```bash
# Получить все флаги
GET /feature-flags

# Получить конкретный флаг
GET /feature-flags/{key}

# Проверить значение флага для пользователя
GET /feature-flags/{key}/value?userId=123&role=USER

# Создать новый флаг
POST /feature-flags
{
  "key": "new-feature",
  "type": "boolean",
  "defaultValue": false,
  "description": "New feature flag"
}
```

**Типы флагов:**

- `boolean` - булевые значения
- `string` - строковые значения
- `number` - числовые значения
- `json` - JSON объекты

**Правила активации:**

- `userId` - конкретный пользователь
- `role` - роль пользователя
- `environment` - окружение (dev/staging/prod)
- `percentage` - процент пользователей

### 3. Infrastructure as Code

**Функциональность:**

- Полное описание инфраструктуры в коде с использованием Terraform
- Поддержка множественных окружений
- Автоматическое управление ресурсами

**Структура:**

```
infrastructure/terraform/
├── main.tf                 # Основная конфигурация
├── variables.tf            # Переменные
├── monitoring.tf           # Мониторинг и алерты
└── environments/           # Окружения
    ├── dev/
    ├── staging/
    └── production/
```

**Компоненты инфраструктуры:**

- **VPC** - виртуальная частная сеть
- **EKS** - Kubernetes кластер
- **RDS** - PostgreSQL база данных
- **ElastiCache** - Redis кэш
- **ALB** - Application Load Balancer
- **S3** - хранилище для логов и бэкапов
- **ACM** - SSL сертификаты
- **Route53** - DNS управление

**Использование:**

```bash
# Инициализация Terraform
./scripts/devops/terraform-init.sh dev

# Применение изменений
./scripts/devops/terraform-apply.sh dev

# Применение в production (с подтверждением)
./scripts/devops/terraform-apply.sh production
```

### 4. Automated Backups

**Функциональность:**

- Автоматизированная система резервного копирования
- Поддержка различных типов бэкапов
- Сжатие и верификация бэкапов

**Компоненты:**

- `scripts/backup/automated-backup.sh` - основной скрипт бэкапов

**Типы бэкапов:**

```bash
# Полный бэкап (все компоненты)
./scripts/backup/automated-backup.sh full

# Бэкап только базы данных
./scripts/backup/automated-backup.sh database

# Бэкап только файлов
./scripts/backup/automated-backup.sh files

# Инкрементальный бэкап
./scripts/backup/automated-backup.sh incremental
```

**Особенности:**

- **Сжатие** - автоматическое сжатие бэкапов
- **Верификация** - проверка целостности бэкапов
- **S3 Upload** - загрузка в AWS S3
- **Уведомления** - Slack/Telegram уведомления
- **Манифест** - создание манифеста бэкапа
- **Очистка** - автоматическая очистка старых бэкапов

**Расписание:**

```bash
# Ежедневный полный бэкап в 02:00
0 2 * * * /path/to/scripts/backup/automated-backup.sh full

# Ежечасный бэкап базы данных
0 * * * * /path/to/scripts/backup/automated-backup.sh database
```

### 5. Disaster Recovery

**Функциональность:**

- Комплексная система аварийного восстановления
- Автоматическое переключение на резервный дата-центр
- Восстановление данных из бэкапов

**Компоненты:**

- `infrastructure/disaster-recovery/DR_PLAN.md` - план аварийного восстановления
- `scripts/disaster-recovery/auto-failover.sh` - автоматическое переключение
- `scripts/disaster-recovery/restore-database.sh` - восстановление БД
- `scripts/disaster-recovery/restore-files.sh` - восстановление файлов
- `scripts/disaster-recovery/restore-volumes.sh` - восстановление volumes
- `scripts/disaster-recovery/test-dr-plan.sh` - тестирование DR плана

**Цели восстановления:**

- **RTO (Recovery Time Objective)**: 15 минут
- **RPO (Recovery Point Objective)**: 5 минут
- **MTTR (Mean Time To Recovery)**: 30 минут

**Архитектура DR:**

- **Primary DC**: AWS eu-west-1 (Ирландия)
- **Secondary DC**: AWS eu-central-1 (Франкфурт)
- **Local DC**: Локальный дата-центр для критических данных

**Автоматическое переключение:**

```bash
# Переключение на вторичный дата-центр
./scripts/disaster-recovery/auto-failover.sh secondary

# Возврат к первичному дата-центру
./scripts/disaster-recovery/auto-failover.sh primary
```

**Восстановление данных:**

```bash
# Восстановление базы данных
./scripts/disaster-recovery/restore-database.sh /backups/database/backup.sql.gz

# Восстановление файлов
./scripts/disaster-recovery/restore-files.sh /backups/files/backup.tar.gz

# Восстановление Docker volumes
./scripts/disaster-recovery/restore-volumes.sh /backups/volumes/backup.tar.gz
```

**Тестирование DR плана:**

```bash
# Полное тестирование
./scripts/disaster-recovery/test-dr-plan.sh full

# Частичное тестирование
./scripts/disaster-recovery/test-dr-plan.sh partial

# Тестирование только бэкапов
./scripts/disaster-recovery/test-dr-plan.sh backup

# Тестирование только восстановления
./scripts/disaster-recovery/test-dr-plan.sh restore
```

### 6. Monitoring & Alerting

**Функциональность:**

- Комплексная система мониторинга и алертинга
- Интеграция с CloudWatch, Prometheus и Grafana
- Автоматические уведомления

**Компоненты:**

- `infrastructure/terraform/monitoring.tf` - конфигурация мониторинга
- `prometheus/rules/dr.rules.yml` - правила Prometheus для DR

**CloudWatch Alarms:**

- **API High CPU** - высокая загрузка CPU API
- **API High Memory** - высокая загрузка памяти API
- **RDS High CPU** - высокая загрузка CPU БД
- **RDS High Connections** - много подключений к БД
- **ALB High 5XX** - много 5XX ошибок
- **DR Primary Unhealthy** - нездоровье первичного DC

**Prometheus Rules:**

- **PrimaryDatacenterUnhealthy** - нездоровье первичного DC
- **DatabaseConnectionIssues** - проблемы с подключениями к БД
- **APIResponseTimeDegradation** - деградация времени ответа API
- **BackupFailure** - неудача бэкапа
- **DRFailoverReadiness** - готовность к DR переключению

**Дашборды:**

- **CloudWatch Dashboard** - основные метрики AWS
- **Grafana Dashboard** - детальный мониторинг приложения

**Уведомления:**

- **Email** - alerts@salespot.by
- **DR Alerts** - dr-alerts@salespot.by (только production)
- **SNS Topics** - для интеграции с Slack/Telegram

## Безопасность

### Шифрование

- **TLS/SSL** - шифрование трафика
- **RDS Encryption** - шифрование БД
- **S3 Encryption** - шифрование хранилища
- **EBS Encryption** - шифрование дисков

### Сетевая безопасность

- **VPC** - изоляция сети
- **Security Groups** - правила доступа
- **NACLs** - сетевые ACL
- **WAF** - Web Application Firewall

### Управление секретами

- **AWS Secrets Manager** - управление секретами
- **IAM Roles** - роли для сервисов
- **KMS** - управление ключами

## Масштабирование

### Автоматическое масштабирование

- **EKS HPA** - горизонтальное масштабирование подов
- **EKS VPA** - вертикальное масштабирование подов
- **RDS Scaling** - масштабирование БД
- **ALB Scaling** - масштабирование балансировщика

### Spot Instances

- **EKS Spot** - использование spot инстансов для экономии
- **Auto Scaling** - автоматическое переключение между типами инстансов

## Стоимость

### Оптимизация затрат

- **Spot Instances** - до 90% экономии на compute
- **Reserved Instances** - скидки за предоплату
- **S3 Lifecycle** - автоматическое управление данными
- **RDS Scheduling** - остановка dev/staging в нерабочее время

### Мониторинг затрат

- **AWS Cost Explorer** - анализ затрат
- **Billing Alerts** - уведомления о превышении бюджета
- **Resource Tagging** - тегирование ресурсов для учета

## Поддержка

### Документация

- [AWS Documentation](https://docs.aws.amazon.com/)
- [Terraform Documentation](https://www.terraform.io/docs/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)

### Контакты

- **DevOps Team**: devops@salespot.by
- **Emergency**: +375-XX-XXX-XXXX
- **Slack**: #devops-alerts

### Процедуры

- **Incident Response** - процедуры реагирования на инциденты
- **Change Management** - управление изменениями
- **Capacity Planning** - планирование мощностей

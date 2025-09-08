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

### 2. Feature Flags

**Функциональность:**

- Динамическое управление функциональностью без передеплоймента
- Поддержка различных типов флагов
- Правила активации по пользователям и окружениям

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
├── multi-cloud.tf          # Multi-cloud конфигурация
├── data-residency.tf       # Data residency и compliance
├── edge-cdn.tf             # Edge CDN и локальные реплики
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
- **CloudFront** - CDN для глобального распространения
- **Multi-Cloud** - поддержка Yandex Cloud, VK Cloud, HOSTER.BY

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

### 5. Disaster Recovery

**Функциональность:**

- Комплексная система аварийного восстановления
- Автоматическое переключение на резервный дата-центр
- Восстановление данных из бэкапов

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

### 6. Rollback Strategies

**Функциональность:**

- Автоматические стратегии отката для быстрого восстановления
- Health checks после отката
- Автоматическое создание бэкапа перед откатом

**Использование:**

```bash
# Откат API к последней версии
./scripts/deployment/rollback.sh api latest

# Откат web к конкретной версии
./scripts/deployment/rollback.sh web v1.2.3

# Откат всех сервисов
./scripts/deployment/rollback.sh all v1.2.3
```

### 7. Environment Parity

**Функциональность:**

- Система обеспечения идентичности конфигураций между окружениями
- Валидация и синхронизация конфигураций
- Генерация отчетов о различиях

**Использование:**

```bash
# Валидация parity для production
./scripts/deployment/environment-parity.sh production validate

# Синхронизация конфигураций со staging
./scripts/deployment/environment-parity.sh production sync

# Генерация отчета
./scripts/deployment/environment-parity.sh production report
```

**Проверяемые компоненты:**

- **Terraform конфигурации** - сравнение модулей и переменных
- **Environment variables** - проверка наличия всех переменных
- **Docker конфигурации** - валидация docker-compose файлов
- **Kubernetes конфигурации** - проверка YAML файлов
- **Database schemas** - валидация миграций
- **API endpoints** - проверка доступности сервисов

### 8. Multi-Cloud/Hybrid Deployment

**Функциональность:**

- Поддержка развертывания на множественных облачных платформах
- Автоматический failover между облаками
- Единый мониторинг всех платформ

**Поддерживаемые платформы:**

- **AWS** - основная платформа
- **Yandex Cloud** - российское облако
- **VK Cloud** - российское облако
- **HOSTER.BY Cloud** - белорусское облако
- **Local Data Center** - локальный дата-центр

**Особенности:**

- **Route53 Failover** - автоматическое переключение между облаками
- **Health Checks** - мониторинг состояния каждого облака
- **Data Replication** - синхронизация данных между облаками
- **Cross-Cloud Monitoring** - единый мониторинг всех платформ

### 9. Data Residency & Compliance

**Функциональность:**

- Обеспечение соответствия требованиям по хранению данных в РФ и РБ
- Compliance logging и мониторинг
- Политики хранения данных

**Соответствие:**

- **ФЗ-152** - российский закон о персональных данных
- **Локальные требования РБ** - белорусские требования

**Политики хранения:**

- **Россия**: 7 лет (ФЗ-152)
- **Беларусь**: 5 лет (локальные требования)

### 10. Edge CDN & Local Replicas

**Функциональность:**

- Глобальная сеть доставки контента
- Локальные реплики для ускорения отклика
- Региональная маршрутизация

**CloudFront Distributions:**

- **Global CDN** - основное распределение
- **Russian CDN** - региональное для России
- **Belarus CDN** - региональное для Беларуси

**Cache Behaviors:**

- **Static Assets** - долгосрочное кэширование (1 год)
- **API Responses** - краткосрочное кэширование (5 минут)
- **Price Lists** - среднесрочное кэширование (30 минут)
- **Regional Data** - региональное кэширование (1 минута)

### 11. Monitoring & Alerting

**Функциональность:**

- Комплексная система мониторинга и алертинга
- Интеграция с CloudWatch, Prometheus и Grafana
- Автоматические уведомления

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

## Статус реализации

### ✅ Полностью реализовано (100%)

- Blue-Green Deployments
- Feature Flags
- Infrastructure as Code
- Automated Backups
- Disaster Recovery Plan
- Rollback Strategies
- Environment Parity
- Deployment Monitoring & Alerting
- Multi-Cloud/Hybrid Deployment
- Data Residency & Compliance
- Edge CDN & Local Replicas

### 🎯 Готово к продакшену

Все компоненты блока 0.5.5 полностью реализованы и готовы к использованию в продакшен среде.

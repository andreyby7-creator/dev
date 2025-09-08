# Сетевая архитектура - SaleSpot BY

## Назначение

Комплексная система безопасности, мониторинга и управления сетевыми ресурсами проекта SaleSpot BY.

## Основные компоненты

### 1. VPN для административного доступа

**Сервис:** `VpnAdminService`

**Функциональность:**

- Управление VPN соединениями для административного доступа
- Аутентификация пользователей с поддержкой MFA
- Ограничение доступа по IP адресам и сетям
- Автоматическая очистка неактивных соединений
- Мониторинг и статистика соединений

**Конфигурация:**

```env
VPN_ENABLED=true
VPN_SERVER=vpn.admin.local
VPN_PORT=1194
VPN_PROTOCOL=openvpn
VPN_MAX_CONNECTIONS=50
VPN_IDLE_TIMEOUT=3600
VPN_MFA_REQUIRED=true
VPN_ALLOWED_NETWORKS=10.0.0.0/8,172.16.0.0/12
```

**API Endpoints:**

- `GET /network/vpn/health` - Проверка состояния VPN
- `GET /network/vpn/stats` - Статистика VPN соединений
- `POST /network/vpn/connections` - Создание VPN соединения

### 2. Network Segmentation с VPC/Subnets

**Сервис:** `NetworkSegmentationService`

**Функциональность:**

- Управление виртуальными частными облаками (VPC)
- Создание и управление подсетями
- Настройка правил NACL (Network Access Control Lists)
- Сегментация по назначению (public, private, database, management)
- Проверка доступности подсетей

**Архитектура подсетей:**

- **Public Subnet** (10.0.1.0/24) - Публичные сервисы
- **Private Subnet** (10.0.2.0/24) - Приватные сервисы
- **Database Subnet** (10.0.3.0/24) - Базы данных
- **Management Subnet** (10.0.4.0/24) - Административные сервисы

**API Endpoints:**

- `GET /network/segmentation/stats` - Статистика сегментации
- `GET /network/segmentation/subnets/:id/health` - Проверка состояния подсети

### 3. DDoS Protection

**Сервис:** `DdosProtectionService`

**Функциональность:**

- Защита от DDoS атак
- Rate limiting по IP адресам
- Пользовательские правила блокировки
- Белые и черные списки IP
- Интеграция с Cloudflare и AWS Shield
- Мониторинг и логирование атак

**Правила защиты:**

- Блокировка ботов по User-Agent
- Ограничение запросов к административным путям
- Мониторинг POST запросов
- Блокировка запросов без User-Agent

**Конфигурация:**

```env
DDOS_PROTECTION_ENABLED=true
DDOS_PROTECTION_PROVIDER=cloudflare
DDOS_RATE_LIMIT=100
DDOS_BURST_LIMIT=50
DDOS_BLOCK_DURATION=3600
DDOS_WHITELIST_IPS=192.168.1.1,10.0.0.1
DDOS_BLACKLIST_IPS=
```

**API Endpoints:**

- `GET /network/ddos/stats` - Статистика DDoS защиты
- `POST /network/ddos/whitelist` - Добавление IP в белый список
- `POST /network/ddos/blacklist` - Добавление IP в черный список

### 4. SSL/TLS Termination

**Сервис:** `SslTlsService`

**Функциональность:**

- Управление SSL/TLS сертификатами
- Поддержка современных протоколов (TLS 1.3, TLS 1.2)
- Настройка шифров
- HSTS (HTTP Strict Transport Security)
- OCSP Stapling
- Автоматическая проверка срока действия сертификатов
- Автоматическое обновление сертификатов

**Поддерживаемые протоколы:**

- TLS 1.3 (рекомендуется)
- TLS 1.2 (минимальная версия)

**Поддерживаемые шифры:**

- ECDHE-RSA-AES256-GCM-SHA384
- ECDHE-RSA-AES128-GCM-SHA256
- ECDHE-RSA-AES256-SHA384
- ECDHE-RSA-AES128-SHA256

**Конфигурация:**

```env
SSL_ENABLED=true
SSL_CERT_PATH=/etc/ssl/certs/server.crt
SSL_KEY_PATH=/etc/ssl/private/server.key
SSL_MIN_VERSION=TLSv1.2
SSL_PREFERRED_VERSION=TLSv1.3
SSL_HSTS_ENABLED=true
SSL_HSTS_MAX_AGE=31536000
SSL_OCSP_STAPLING_ENABLED=true
SSL_AUTO_RENEWAL_ENABLED=true
SSL_RENEWAL_THRESHOLD_DAYS=30
```

**API Endpoints:**

- `GET /network/ssl/stats` - Статистика SSL/TLS
- `GET /network/ssl/certificate` - Информация о сертификате
- `GET /network/ssl/certificate/expiry` - Проверка срока действия
- `POST /network/ssl/certificate/renew` - Обновление сертификата

### 5. API Versioning

**Сервис:** `ApiVersioningService`

**Функциональность:**

- Управление версиями API
- Обеспечение обратной совместимости
- Разрешение версий из запросов
- Проверка доступности эндпоинтов
- Управление устаревшими версиями
- Статистика использования версий

**Поддерживаемые версии:**

- v1 (стабильная)
- v2 (стабильная)
- v3 (бета)

**Конфигурация:**

```env
API_VERSIONING_ENABLED=true
API_DEFAULT_VERSION=v1
API_SUPPORTED_VERSIONS=v1,v2,v3
API_DEPRECATION_WARNING_DAYS=90
API_SUNSET_NOTIFICATION_DAYS=30
API_VERSION_HEADER=x-api-version
API_VERSION_QUERY_PARAM=version
```

**API Endpoints:**

- `GET /network/api/versions` - Статистика версионирования
- `GET /network/api/versions/:version/status` - Статус версии
- `POST /network/api/versions` - Добавление новой версии
- `PUT /network/api/versions/:version/deprecate` - Устаревание версии

### 6. Network Monitoring и Traffic Analysis

**Сервис:** `NetworkMonitoringService`

**Функциональность:**

- Сбор метрик сети в реальном времени
- Анализ паттернов трафика
- Создание и управление алертами
- Мониторинг производительности сети
- Выявление аномалий в трафике
- Исторические данные и тренды

**Собираемые метрики:**

- Пропускная способность (bytes in/out)
- Количество пакетов (packets in/out)
- Количество соединений
- Задержка (latency)
- Потери пакетов (packet loss)
- Джиттер (jitter)
- Использование пропускной способности
- Частота ошибок

**Паттерны мониторинга:**

- Высокое использование пропускной способности (>80%)
- Высокая задержка (>200ms)
- Высокая частота ошибок (>5%)
- Спайк соединений (>1000)

**Конфигурация:**

```env
MONITORING_ENABLED=true
MONITORING_INTERVAL=60
MONITORING_MAX_HISTORY=10000
MONITORING_ALERT_THRESHOLDS=80,200,5,1000
MONITORING_RETENTION_DAYS=30
```

**API Endpoints:**

- `GET /network/monitoring/stats` - Статистика мониторинга
- `POST /network/monitoring/metrics/collect` - Сбор метрик
- `GET /network/monitoring/alerts` - Активные алерты
- `POST /network/monitoring/alerts/:alertId/resolve` - Разрешение алерта

### 7. Firewall Rules и Security Groups

**Сервис:** `FirewallService`

**Функциональность:**

- Создание и управление группами безопасности
- Настройка правил файрвола (inbound/outbound)
- Проверка пакетов через правила
- Логирование событий файрвола
- Управление приоритетами правил
- Привязка ресурсов к группам безопасности

**Стандартные группы безопасности:**

- **Web Security Group** - Веб-серверы (HTTP/HTTPS/SSH)
- **Database Security Group** - Базы данных (PostgreSQL/Redis/SSH)
- **Admin Security Group** - Административный доступ (SSH/RDP)

**Правила файрвола:**

- Приоритетная обработка правил
- Поддержка протоколов TCP/UDP/ICMP
- Проверка IP диапазонов (CIDR)
- Действия: allow/deny

**Конфигурация:**

```env
FIREWALL_ENABLED=true
FIREWALL_DEFAULT_ACTION=deny
FIREWALL_LOG_LEVEL=info
FIREWALL_MAX_EVENTS=5000
FIREWALL_RETENTION_DAYS=90
```

**API Endpoints:**

- `GET /network/firewall/stats` - Статистика файрвола
- `POST /network/firewall/packet/check` - Проверка пакета
- `POST /network/firewall/security-groups` - Создание группы безопасности
- `GET /network/firewall/blocked-ips` - Заблокированные IP

### 8. Network Performance Optimization

**Сервис:** `NetworkPerformanceService`

**Функциональность:**

- Сбор метрик производительности сети
- Автоматическое применение правил оптимизации
- Мониторинг пропускной способности и задержек
- Оптимизация маршрутизации
- Управление пулом соединений
- Кэширование и оптимизация

**Типы оптимизации:**

- **Bandwidth Throttling** - Ограничение пропускной способности при превышении 90%
- **Latency Optimization** - Оптимизация маршрутизации при задержке >100ms
- **Packet Loss Recovery** - Включение повторной передачи при потерях >1%
- **Connection Pooling** - Пул соединений при >500 соединений
- **Caching Optimization** - Агрессивное кэширование при низкой частоте ошибок

**Конфигурация:**

```env
PERFORMANCE_ENABLED=true
PERFORMANCE_METRICS_INTERVAL=30
PERFORMANCE_MAX_HISTORY=5000
PERFORMANCE_OPTIMIZATION_THRESHOLDS=90,100,1,500,0.1
PERFORMANCE_RETENTION_DAYS=30
```

**API Endpoints:**

- `GET /network/performance/stats` - Статистика производительности
- `POST /network/performance/metrics/collect` - Сбор метрик производительности
- `GET /network/performance/recommendations` - Рекомендации по оптимизации
- `GET /network/performance/trends` - Тренды производительности

### 9. Zero Trust Network Access (ZTNA)

**Сервис:** `ZtnaService`

**Функциональность:**

- Оценка рисков для каждого запроса доступа
- Политики доступа на основе контекста
- Многофакторная аутентификация (MFA)
- Мониторинг сессий в реальном времени
- Управление доверием устройств и пользователей
- Адаптивные политики безопасности

**Факторы оценки риска:**

- **Устройство:** Версия ОС, статус антивируса, шифрование
- **Пользователь:** Роль, время последнего входа, неудачные попытки
- **Местоположение:** Тип сети, географическое положение
- **Приложение:** Чувствительность, уровень доступа

**Политики доступа:**

- **Admin Access Policy** - Ограничение доступа администраторов
- **Device Compliance Policy** - Требования к устройствам
- **High Risk Location Policy** - Дополнительная безопасность для рискованных мест
- **Application Access Policy** - Контроль доступа к чувствительным приложениям

**Конфигурация:**

```env
ZTNA_ENABLED=true
ZTNA_RISK_THRESHOLD=50
ZTNA_SESSION_TIMEOUT=3600
ZTNA_MFA_REQUIRED=true
ZTNA_MAX_SESSIONS=1000
ZTNA_RETENTION_DAYS=90
```

**API Endpoints:**

- `GET /network/ztna/stats` - Статистика ZTNA
- `POST /network/ztna/sessions` - Создание ZTNA сессии
- `POST /network/ztna/sessions/:sessionId/verify-mfa` - Проверка MFA
- `DELETE /network/ztna/sessions/:sessionId` - Завершение сессии
- `GET /network/ztna/sessions/active` - Активные сессии

### 10. IDS/IPS (Intrusion Detection / Prevention System)

**Сервис:** `IdsIpsService`

**Функциональность:**

- Анализ сетевого трафика на угрозы
- Сигнатурное обнаружение атак
- Поведенческий анализ
- Эвристическое обнаружение
- Автоматическая блокировка подозрительных IP
- Управление правилами IDS/IPS
- Логирование и анализ инцидентов

**Типы обнаружения:**

- **Signature-based** - SQL Injection, XSS, Path Traversal
- **Anomaly-based** - DoS атаки, аномальный трафик
- **Behavior-based** - Brute Force атаки
- **Heuristic-based** - Подозрительные паттерны

**Стандартные правила:**

- SQL Injection Detection
- XSS Attack Detection
- Brute Force Attack Detection
- DoS Attack Detection
- Path Traversal Detection
- Command Injection Detection
- LDAP Injection Detection
- PHP Code Injection Detection

**Конфигурация:**

```env
IDS_ENABLED=true
IPS_ENABLED=true
IDS_SIGNATURE_UPDATE_INTERVAL=3600
IDS_MAX_ALERTS=10000
IDS_RETENTION_DAYS=90
IDS_BLOCK_DURATION=3600
IDS_FALSE_POSITIVE_THRESHOLD=0.1
```

**API Endpoints:**

- `GET /network/ids-ips/stats` - Статистика IDS/IPS
- `POST /network/ids-ips/packet/analyze` - Анализ пакета на угрозы
- `GET /network/ids-ips/alerts/recent` - Последние алерты
- `GET /network/ids-ips/alerts/critical` - Критические алерты
- `GET /network/ids-ips/blocked-ips` - Заблокированные IP
- `POST /network/ids-ips/blocked-ips/:ip/unblock` - Разблокировка IP
- `POST /network/ids-ips/alerts/:alertId/false-positive` - Пометка ложного срабатывания
- `GET /network/ids-ips/recommendations` - Рекомендации по настройке

## Общий мониторинг здоровья сети

**Endpoint:** `GET /network/health`

Предоставляет комплексную информацию о состоянии всех компонентов сетевой архитектуры:

**Ответ включает:**

- Общее состояние здоровья сети
- Статус каждого сервиса
- Критические метрики
- Время последней проверки
- Детальная статистика по компонентам

## Конфигурация

Все сервисы используют переменные окружения для настройки. Пример полной конфигурации:

```env
# VPN Configuration
VPN_ENABLED=true
VPN_MAX_CONNECTIONS=100
VPN_SESSION_TIMEOUT=3600

# DDoS Protection
DDOS_ENABLED=true
DDOS_PROVIDER=cloudflare
DDOS_RATE_LIMIT=100

# SSL/TLS Configuration
SSL_CERT_PATH=/path/to/certificate
SSL_KEY_PATH=/path/to/private/key
SSL_MIN_VERSION=TLSv1.2

# Network Monitoring
MONITORING_ENABLED=true
MONITORING_INTERVAL=60

# Firewall Configuration
FIREWALL_DEFAULT_ACTION=deny
FIREWALL_LOG_LEVEL=info

# Performance Optimization
PERFORMANCE_ENABLED=true
PERFORMANCE_THRESHOLDS=80

# ZTNA Configuration
ZTNA_ENABLED=true
ZTNA_RISK_THRESHOLD=50

# IDS/IPS Configuration
IDS_ENABLED=true
IPS_ENABLED=true
IDS_SIGNATURE_UPDATE_INTERVAL=3600
```

## Безопасность

### Аутентификация и авторизация

- Все API endpoints защищены JWT аутентификацией
- Ролевая модель доступа (ADMIN, MANAGER)
- Многофакторная аутентификация для критических операций

### Шифрование

- TLS 1.3 для всех соединений
- Шифрование данных в состоянии покоя
- Безопасное хранение ключей и сертификатов

### Аудит и логирование

- Подробное логирование всех операций
- Аудит доступа к административным функциям
- Сохранение логов для соответствия требованиям

## Мониторинг и алертинг

### Метрики

- Пропускная способность сети
- Задержка и потери пакетов
- Количество активных соединений
- Статистика атак и блокировок
- Производительность сервисов

### Алерты

- Критические события безопасности
- Превышение порогов производительности
- Сбои в работе сервисов
- Подозрительная активность

## Тестирование

Все компоненты покрыты unit тестами:

```bash
# Запуск тестов
npm run test:network

# Покрытие кода
npm run test:coverage:network
```

## Развертывание

### Требования

- Node.js 18+
- NestJS 10+
- PostgreSQL 14+
- Redis 6+

### Установка

```bash
# Установка зависимостей
npm install

# Настройка переменных окружения
cp .env.example .env

# Запуск миграций
npm run migration:run

# Запуск приложения
npm run start:prod
```

## Поддержка и обслуживание

### Обновления

- Регулярные обновления сигнатур IDS/IPS
- Обновление SSL сертификатов
- Патчи безопасности

### Резервное копирование

- Ежедневное резервное копирование конфигураций
- Резервное копирование логов
- План восстановления после сбоев

## Заключение

Сетевая архитектура обеспечивает комплексную защиту, мониторинг и оптимизацию сетевой инфраструктуры проекта. Все 10 компонентов работают в тесной интеграции, обеспечивая высокий уровень безопасности и производительности. Архитектура спроектирована с учетом принципов Zero Trust и современных стандартов сетевой безопасности.

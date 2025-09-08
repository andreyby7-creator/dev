# Система мониторинга

## Обзор

Комплексное решение для отслеживания состояния приложения, сбора метрик и автоматического восстановления после сбоев.

## Компоненты

### UnifiedMetricsService

Унифицированный сервис для сбора и экспорта метрик.

**Функции:**

- Сбор метрик с поддержкой меток
- Инкрементальные счетчики
- Измерение времени выполнения функций
- Экспорт в Prometheus, OpenTelemetry, пользовательские форматы

**API эндпоинты:**

- `GET /monitoring/metrics` - все метрики
- `POST /monitoring/metrics` - записать метрику
- `GET /monitoring/metrics/export/:format` - экспорт метрик

### SelfHealingService

Сервис автоматического восстановления и мониторинга здоровья.

**Функции:**

- Проверки здоровья системы и сервисов
- Автоматические оповещения при превышении порогов
- Уведомления: Telegram, Slack, Email
- Настраиваемые пороги для CPU, памяти, диска

**API эндпоинты:**

- `GET /monitoring/health/system` - здоровье системы
- `GET /monitoring/health/services` - здоровье всех сервисов
- `GET /monitoring/health/uptime` - время работы

### ConfigCachingService

Сервис кеширования конфигурации с автоматической инвалидацией.

**Функции:**

- Кеширование с настраиваемым TTL
- Автоматическая очистка устаревших записей
- Инвалидация по шаблонам
- Статистика использования кеша

**API эндпоинты:**

- `GET /monitoring/cache/stats` - статистика кеша
- `POST /monitoring/cache/:key` - установить значение
- `DELETE /monitoring/cache` - очистить весь кеш

## Конфигурация

### Переменные окружения

```bash
# Метрики
METRICS_ENABLED=true
METRICS_PROVIDER=prometheus
METRICS_ENDPOINT=http://localhost:9090
METRICS_INTERVAL=60

# Самоисцеление
SELF_HEALING_ENABLED=true
TELEGRAM_BOT_TOKEN=your_token
SLACK_WEBHOOK_URL=your_webhook
ALERT_CPU_THRESHOLD=80
ALERT_MEMORY_THRESHOLD=85
ALERT_DISK_THRESHOLD=90

# Кеширование
CONFIG_CACHE_ENABLED=true
CONFIG_CACHE_TTL=300
CONFIG_CACHE_MAX_SIZE=1000
```

## Примеры использования

### Запись метрик

```typescript
import { UnifiedMetricsService } from './monitoring/services/unified-metrics.service';

const metricsService = new UnifiedMetricsService();

// Простая метрика
metricsService.recordMetric('api.requests', 1);

// Метрика с метками
metricsService.recordMetric('api.response_time', 150, {
  endpoint: '/users',
  method: 'GET',
  status: '200',
});

// Счетчик ошибок
metricsService.incrementCounter('api.errors', { endpoint: '/users' });
```

### Проверки здоровья

```typescript
import { SelfHealingService } from './monitoring/services/self-healing.service';

const healthService = new SelfHealingService();

// Здоровье системы
const systemHealth = healthService.checkSystemHealth();
console.log('Статус системы:', systemHealth.status);

// Здоровье сервиса
const serviceHealth = healthService.checkServiceHealth('user-service');
console.log('Статус сервиса:', serviceHealth.status);
```

### Использование кеша

```typescript
import { ConfigCachingService } from './monitoring/services/config-caching.service';

const cacheService = new ConfigCachingService();

// Кеширование
cacheService.set('app.config', { feature: 'enabled', timeout: 5000 });

// Получение из кеша
const config = cacheService.get('app.config');

// Инвалидация по шаблону
const deletedCount = cacheService.invalidatePattern('^app\\.');
```

## Оповещения и уведомления

### Автоматические оповещения

- Превышение порогов CPU, памяти, диска
- Превышение времени ответа API
- Превышение частоты ошибок
- Изменения статуса сервисов

### Каналы уведомлений

- **Telegram**: Мгновенные уведомления
- **Slack**: Уведомления в командные каналы
- **Email**: Детальные отчеты

### Конфигурация порогов

```typescript
healthService.setAlertThreshold('cpu', 90);
healthService.setAlertThreshold('memory', 95);
```

## Развертывание

### Docker

```dockerfile
ENV METRICS_ENABLED=true
ENV SELF_HEALING_ENABLED=true
ENV CONFIG_CACHE_ENABLED=true
EXPOSE 3000
```

### Kubernetes

```yaml
env:
  - name: METRICS_ENABLED
    value: 'true'
  - name: SELF_HEALING_ENABLED
    value: 'true'
  - name: CONFIG_CACHE_ENABLED
    value: 'true'
```

## Тестирование

```bash
pnpm test monitoring                    # Все тесты мониторинга
pnpm test monitoring-integration.spec.ts # Интеграционные тесты
```

## Функции

- **Производительность**: Автоматическая очистка кеша, эффективное хранение метрик
- **Безопасность**: Логирование через RedactedLogger, защищенные API эндпоинты
- **Масштабирование**: Поддержка больших объемов метрик, быстрый экспорт
- **Интеграция**: Prometheus, Grafana, ELK Stack

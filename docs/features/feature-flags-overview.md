# Feature Flags System - Обзор

## Назначение

Комплексное решение для управления функциональностью приложения, включая динамические флаги, A/B тестирование, hot reload конфигурации и постепенное выкатывание функций.

## Архитектура системы

```
┌─────────────────────────────────────────────────────────────┐
│                    Feature Flags System                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ FeatureFlags    │  │ DynamicFlags    │  │ ABTesting   │ │
│  │ Service         │  │ Storage         │  │ Service     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
│           │                    │                    │       │
│           └────────────────────┼────────────────────┘       │
│                                │                            │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ HotReload       │  │ GradualRollout  │                  │
│  │ Config          │  │ Service         │                  │
│  └─────────────────┘  └─────────────────┘                  │
│           │                    │                            │
│           └────────────────────┼────────────────────────────┘
│                                │                            │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    Redis Service                        │ │
│  │              (Storage & Caching)                       │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Компоненты системы

### 1. FeatureFlagsService

**Основной сервис** для управления feature flags с поддержкой различных типов и правил.

**Возможности:**

- Boolean, string, number, JSON типы флагов
- Правила на основе user_id, role, environment, percentage
- Кеширование и health checks
- API для CRUD операций

**Файл:** `apps/api/src/features/feature-flags.service.ts`

### 2. DynamicFlagsStorageService

**Сервис хранения** feature flags в Redis с поддержкой TTL и автоматической очистки.

**Возможности:**

- Redis интеграция с TTL управлением
- Автоматическая очистка устаревших флагов
- Паттерн поиск по маске
- Статистика использования и сжатие данных

**Файл:** `apps/api/src/features/dynamic-flags-storage.service.ts`

### 3. ABTestingService

**Сервис A/B тестирования** с поддержкой вариантов, метрик и статистической значимости.

**Возможности:**

- Создание и управление A/B тестами
- Консистентное назначение пользователей на варианты
- Запись impressions и конверсий
- Статистическая значимость и аналитика результатов

**Файл:** `apps/api/src/features/ab-testing.service.ts`

### 4. HotReloadConfigService

**Сервис hot reload** конфигурации без перезапуска приложения.

**Возможности:**

- Мониторинг изменений конфигурации
- События через EventEmitter
- Watchers для автоматических действий
- Backup изменений и уведомления

**Файл:** `apps/api/src/features/hot-reload-config.service.ts`

### 5. GradualRolloutService

**Сервис постепенного выкатывания** функций по процентам пользователей.

**Возможности:**

- Постепенное выкатывание с настраиваемыми процентами
- Целевая аудитория по ролям, средам, регионам
- Временные условия и custom правила
- Метрики rollout и аналитика

**Файл:** `apps/api/src/features/gradual-rollout.service.ts`

### 6. RedisService

**Сервис-обертка** для работы с Redis, используемый всеми компонентами.

**Возможности:**

- Единый API для всех Redis операций
- Обработка ошибок и логирование
- Health checks и метрики
- Mock режим для разработки

**Файл:** `apps/api/src/redis/redis.service.ts`

## API Endpoints

### Feature Flags

```typescript
// Получить все feature flags
GET /api/v1/feature-flags

// Получить конкретный flag
GET /api/v1/feature-flags/{key}

// Проверить доступность flag для пользователя
GET /api/v1/feature-flags/{key}/enabled?userId=123&role=USER

// Создать новый flag
POST /api/v1/feature-flags

// Обновить flag
PUT /api/v1/feature-flags/{key}

// Удалить flag
DELETE /api/v1/feature-flags/{key}
```

### A/B Testing

```typescript
// Создать A/B тест
POST / api / v1 / ab - tests;

// Получить все активные тесты
GET / api / v1 / ab - tests;

// Назначить пользователя на вариант
POST / api / v1 / ab - tests / { testId } / assign;

// Записать конверсию
POST / api / v1 / ab - tests / { testId } / conversion;

// Получить результаты теста
GET / api / v1 / ab - tests / { testId } / results;
```

### Hot Reload Configuration

```typescript
// Обновить конфигурацию
PUT / api / v1 / config / { key };

// Получить значение конфигурации
GET / api / v1 / config / { key };

// Получить все ключи
GET / api / v1 / config / keys;

// Перезагрузить конфигурацию
POST / api / v1 / config / reload;

// Получить историю изменений
GET / api / v1 / config / history;
```

### Gradual Rollout

```typescript
// Создать правило rollout
POST /api/v1/rollout/rules

// Проверить доступность функции
GET /api/v1/rollout/{featureKey}/enabled?userId=123

// Приостановить rollout
POST /api/v1/rollout/{featureKey}/pause

// Возобновить rollout
POST /api/v1/rollout/{featureKey}/resume

// Получить аналитику rollout
GET /api/v1/rollout/{featureKey}/analytics
```

## Конфигурация

### Переменные окружения

```bash
# Feature Flags
FEATURE_FLAGS_PROVIDER=custom
FEATURE_FLAGS_CACHE_ENABLED=true
FEATURE_FLAGS_CACHE_TTL=3600

# Dynamic Flags Storage
DYNAMIC_FLAGS_COMPRESSION=true
DYNAMIC_FLAGS_MAX_COUNT=1000
DYNAMIC_FLAGS_DEFAULT_TTL=3600

# A/B Testing
AB_TEST_DEFAULT_DURATION=30
AB_TEST_MIN_SAMPLE_SIZE=100
AB_TEST_CONFIDENCE_LEVEL=0.95

# Hot Reload
HOT_RELOAD_ENABLED=true
HOT_RELOAD_WATCH_INTERVAL=5000
HOT_RELOAD_MAX_FILE_SIZE=1048576

# Gradual Rollout
GRADUAL_ROLLOUT_DEFAULT_DURATION=7
GRADUAL_ROLLOUT_MAX_PERCENTAGE=100
GRADUAL_ROLLOUT_ENABLE_ROLLBACK=true

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### Модули и зависимости

```typescript
// FeatureFlagsModule
@Module({
  imports: [RedisModule, ConfigModule, EventEmitterModule],
  providers: [
    FeatureFlagsService,
    DynamicFlagsStorageService,
    ABTestingService,
    HotReloadConfigService,
    GradualRolloutService,
  ],
  exports: [
    FeatureFlagsService,
    DynamicFlagsStorageService,
    ABTestingService,
    HotReloadConfigService,
    GradualRolloutService,
  ],
})
export class FeatureFlagsModule {}
```

## Примеры использования

### Базовый feature flag

```typescript
// Проверить доступность функции
const hasNewUI = await featureFlagsService.isFeatureEnabled(
  'new-ui-design',
  userId,
  {
    role: user.role,
    environment: process.env.NODE_ENV,
  }
);

if (hasNewUI) {
  renderNewUIDesign();
} else {
  renderOldUIDesign();
}
```

### A/B тест с feature flag

```typescript
// Создать A/B тест
const test = await abTestingService.createTest({
  name: 'Button Color Test',
  variants: [
    { name: 'Blue', weight: 50, config: { color: 'blue' } },
    { name: 'Green', weight: 50, config: { color: 'green' } },
  ],
  targetAudience: { percentage: 20 },
});

// В контроллере
const variant = await abTestingService.assignUserToVariant(test.id, userId);
if (variant) {
  return { buttonColor: variant.config.color };
}
```

### Hot reload конфигурации

```typescript
// Подписаться на изменения конфигурации
hotReloadService.addWatcher('database.*', event => {
  if (event.key === 'database.url') {
    // Перезагрузить подключение к БД
    reloadDatabaseConnection();
  }
});

// Обновить конфигурацию
await hotReloadService.updateConfig('database.maxConnections', 20);
```

### Постепенное выкатывание

```typescript
// Создать правило rollout
const rolloutRule = await gradualRolloutService.createRolloutRule({
  featureKey: 'dark-mode',
  percentage: 25,
  targetAudience: {
    roles: ['premium', 'admin'],
  },
});

// Проверить доступность
const hasDarkMode = await gradualRolloutService.isFeatureEnabled(
  'dark-mode',
  userId,
  {
    role: user.role,
  }
);
```

## Мониторинг и метрики

### Prometheus метрики

```typescript
// Feature Flags
feature_flags_total{type="boolean"} 150
feature_flags_total{type="string"} 75
feature_flags_enabled_total 180

// A/B Testing
ab_tests_active_total 5
ab_tests_users_total{test_id="test_123"} 1500
ab_tests_conversions_total{test_id="test_123",variant_id="variant_a"} 45

// Hot Reload
hot_reload_config_changes_total{source="redis"} 45
hot_reload_watchers_active_total 8
hot_reload_cache_size_total 150

// Gradual Rollout
gradual_rollout_active_total 3
gradual_rollout_percentage{feature_key="new-ui-design"} 25.0
gradual_rollout_users_total{feature_key="new-ui-design",status="enabled"} 1250

// Redis
redis_operations_total{operation="get"} 1250
redis_operations_total{operation="set"} 890
redis_connection_status{status="connected"} 1
```

### Health checks

```typescript
// Общий health check для системы
async healthCheck(): Promise<HealthStatus> {
  const checks = await Promise.all([
    featureFlagsService.healthCheck(),
    abTestingService.healthCheck(),
    hotReloadService.healthCheck(),
    gradualRolloutService.healthCheck(),
    redisService.healthCheck()
  ]);

  const allHealthy = checks.every(check => check.status === 'healthy');

  return {
    status: allHealthy ? 'healthy' : 'unhealthy',
    details: {
      featureFlags: checks[0],
      abTesting: checks[1],
      hotReload: checks[2],
      gradualRollout: checks[3],
      redis: checks[4]
    }
  };
}
```

## Безопасность

### Аутентификация и авторизация

- JWT токены для API доступа
- Проверка ролей пользователей
- Аудит всех операций

### Валидация данных

- Zod схемы для валидации
- Санитизация входных данных
- Проверка типов и ограничений

### Шифрование

- Шифрование чувствительных данных
- SSL/TLS для Redis подключений
- Безопасное хранение паролей

## Производительность

### Оптимизации

- Redis кеширование на всех уровнях
- Batch операции для массовых обновлений
- Асинхронная обработка событий
- Connection pooling для Redis

### Масштабирование

- Горизонтальное масштабирование Redis
- Распределенная обработка метрик
- Автоматическая очистка старых данных
- Load balancing для API endpoints

## Тестирование

### Стратегия тестирования

- Unit тесты для каждого сервиса
- Integration тесты с реальным Redis
- E2E тесты для API endpoints
- Performance тесты для критичных операций

### Mock объекты

- Mock Redis клиент для разработки
- Mock ConfigService для тестов
- Mock EventEmitter для изоляции

## Развертывание

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/main"]
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: feature-flags-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: feature-flags-api
  template:
    metadata:
      labels:
        app: feature-flags-api
    spec:
      containers:
        - name: api
          image: feature-flags-api:latest
          ports:
            - containerPort: 3000
          env:
            - name: REDIS_HOST
              value: 'redis-service'
            - name: NODE_ENV
              value: 'production'
```

## Troubleshooting

### Частые проблемы

1. **Redis connection failed**
   - Проверить доступность Redis сервера
   - Проверить настройки подключения
   - Проверить сетевые настройки

2. **Feature flags не работают**
   - Проверить активность флагов
   - Проверить правила и условия
   - Проверить права доступа пользователей

3. **A/B тесты не назначают варианты**
   - Проверить активность тестов
   - Проверить целевую аудиторию
   - Проверить веса вариантов

4. **Hot reload не работает**
   - Проверить включение сервиса
   - Проверить права на файлы
   - Проверить логи на ошибки

### Логи и отладка

```typescript
// Включить debug логирование для всех сервисов
const loggers = [
  new Logger(FeatureFlagsService.name),
  new Logger(ABTestingService.name),
  new Logger(HotReloadConfigService.name),
  new Logger(GradualRolloutService.name),
  new Logger(RedisService.name),
];

loggers.forEach(logger => logger.setLogLevel('debug'));

// Проверить состояние всех сервисов
const healthChecks = await Promise.all([
  featureFlagsService.healthCheck(),
  abTestingService.healthCheck(),
  hotReloadService.healthCheck(),
  gradualRolloutService.healthCheck(),
  redisService.healthCheck(),
]);

console.log('System health:', healthChecks);
```

## Заключение

Система Feature Flags предоставляет комплексное решение для управления функциональностью приложения, включая:

- **Динамические feature flags** с поддержкой различных типов и правил
- **A/B тестирование** с метриками и статистической значимостью
- **Hot reload конфигурации** для быстрой разработки
- **Постепенное выкатывание** функций с контролем рисков
- **Redis интеграцию** для производительности и масштабируемости

Система спроектирована для высокой производительности, безопасности и удобства использования, что делает ее идеальным решением для современных веб-приложений.

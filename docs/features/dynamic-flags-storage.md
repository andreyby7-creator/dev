# Dynamic Flags Storage Service

## Назначение

Сервис для хранения и управления feature flags в Redis с поддержкой TTL, автоматической очистки и инвалидации.

## Основные возможности

- **Redis интеграция** - хранение feature flags в Redis с TTL
- **Автоматическая очистка** - удаление устаревших flags
- **Паттерн поиск** - поиск flags по маске
- **Статистика** - мониторинг использования хранилища
- **Сжатие** - поддержка сжатия данных для экономии памяти

## Ключевые интерфейсы

```typescript
interface DynamicFlag {
  key: string;
  value: unknown;
  type: 'boolean' | 'string' | 'number' | 'json';
  rules?: Array<{
    userId?: string;
    role?: string;
    environment?: string;
    percentage?: number;
  }>;
  ttl?: number;
  createdAt: Date;
  updatedAt: Date;
}

interface DynamicFlagStorageConfig {
  defaultTtl: number; // Время жизни по умолчанию (секунды)
  maxFlags: number; // Максимальное количество flags
  enableCompression: boolean; // Включить сжатие
}
```

## Основные методы

| Метод                         | Описание                             |
| ----------------------------- | ------------------------------------ |
| `storeFlag(flag)`             | Сохраняет feature flag в Redis с TTL |
| `getFlag(flagKey)`            | Получает feature flag по ключу       |
| `deleteFlag(flagKey)`         | Удаляет feature flag из Redis        |
| `getAllFlags()`               | Получает все feature flags           |
| `getFlagsByPattern(pattern)`  | Поиск flags по маске                 |
| `updateFlagTtl(flagKey, ttl)` | Обновляет время жизни flag           |
| `clearExpiredFlags()`         | Очищает устаревшие flags             |
| `getStorageStats()`           | Получает статистику хранилища        |

## Примеры использования

### Создание временного feature flag

```typescript
await dynamicFlagsStorage.storeFlag({
  key: 'ab-test-variant-a',
  value: { variant: 'A', color: 'blue' },
  type: 'json',
  ttl: 86400, // 24 часа
  createdAt: new Date(),
  updatedAt: new Date(),
});
```

### Поиск по маске

```typescript
// Найти все flags для определенной среды
const devFlags = await dynamicFlagsStorage.getFlagsByPattern('dev-*');
const prodFlags = await dynamicFlagsStorage.getFlagsByPattern('prod-*');

console.log(`Dev flags: ${devFlags.length}, Prod flags: ${prodFlags.length}`);
```

### Мониторинг и очистка

```typescript
// Получить статистику
const stats = await dynamicFlagsStorage.getStorageStats();
console.log(`Storage usage: ${stats.totalFlags}/${stats.maxFlags}`);

// Очистить устаревшие flags
if (stats.totalFlags > stats.maxFlags * 0.8) {
  const cleared = await dynamicFlagsStorage.clearExpiredFlags();
  console.log(`Cleared ${cleared} expired flags`);
}
```

## Конфигурация

### Переменные окружения

```bash
# Включить сжатие
DYNAMIC_FLAGS_COMPRESSION=true

# Максимальное количество flags
DYNAMIC_FLAGS_MAX_COUNT=1000

# TTL по умолчанию (секунды)
DYNAMIC_FLAGS_DEFAULT_TTL=3600
```

### Инициализация

```typescript
import { DynamicFlagsStorageService } from './dynamic-flags-storage.service';

@Injectable()
export class FeatureFlagsModule {
  constructor(
    private readonly dynamicFlagsStorage: DynamicFlagsStorageService
  ) {}
}
```

## Интеграция с Feature Flags

```typescript
@Injectable()
export class FeatureFlagsService {
  constructor(private readonly dynamicStorage: DynamicFlagsStorageService) {}

  async getFeatureFlag(key: string): Promise<unknown> {
    // Сначала проверяем динамическое хранилище
    const dynamicFlag = await this.dynamicStorage.getFlag(key);
    if (dynamicFlag) {
      return dynamicFlag.value;
    }

    // Fallback к статической конфигурации
    return this.getStaticFlag(key);
  }
}
```

## Мониторинг и метрики

### Prometheus метрики

```typescript
// Количество flags в хранилище
dynamic_flags_total{type="boolean"} 150
dynamic_flags_total{type="string"} 75
dynamic_flags_total{type="json"} 25

// Время выполнения операций
dynamic_flags_operation_duration_seconds{operation="store"} 0.002
dynamic_flags_operation_duration_seconds{operation="get"} 0.001
```

### Health checks

```typescript
// Проверка состояния Redis
const isHealthy = await dynamicFlagsStorage.getStorageStats();
if (isHealthy.totalFlags >= 0) {
  return { status: 'healthy', flags: isHealthy.totalFlags };
} else {
  return { status: 'unhealthy', error: 'Redis connection failed' };
}
```

## Безопасность

### Валидация данных

- Проверка типов значений
- Валидация TTL значений
- Санитизация ключей

### Доступ

- Аутентификация через Redis ACL
- Шифрование чувствительных данных
- Аудит всех операций

## Производительность

### Кеширование

- Redis кеширование для быстрого доступа
- Локальный кеш для часто используемых flags
- Автоматическая инвалидация при изменении

### Оптимизация

- Сжатие данных для экономии памяти
- Batch операции для массовых операций
- Асинхронная очистка устаревших flags

## Тестирование

### Unit тесты

```typescript
describe('DynamicFlagsStorageService', () => {
  it('should store and retrieve flag', async () => {
    const flag = createTestFlag();
    await service.storeFlag(flag);

    const retrieved = await service.getFlag(flag.key);
    expect(retrieved).toEqual(flag);
  });

  it('should handle Redis errors gracefully', async () => {
    // Mock Redis error
    jest
      .spyOn(redisService, 'set')
      .mockRejectedValue(new Error('Connection failed'));

    await expect(service.storeFlag(createTestFlag())).rejects.toThrow();
  });
});
```

### Integration тесты

```typescript
describe('DynamicFlagsStorage Integration', () => {
  it('should work with real Redis', async () => {
    const flag = createTestFlag();
    await service.storeFlag(flag);

    // Проверяем, что flag действительно сохранен в Redis
    const redisValue = await redis.get(`feature_flag:${flag.key}`);
    expect(JSON.parse(redisValue)).toEqual(flag);
  });
});
```

## Troubleshooting

### Частые проблемы

1. **Redis connection failed**
   - Проверить доступность Redis
   - Проверить настройки подключения
   - Проверить сетевые настройки

2. **Memory usage high**
   - Уменьшить TTL для flags
   - Включить сжатие
   - Очистить устаревшие flags

3. **Slow performance**
   - Проверить Redis производительность
   - Оптимизировать размер данных
   - Использовать batch операции

### Логи и отладка

```typescript
// Включить debug логирование
const logger = new Logger(DynamicFlagsStorageService.name);
logger.setLogLevel('debug');

// Проверить состояние Redis
const stats = await dynamicFlagsStorage.getStorageStats();
console.log('Storage stats:', stats);
```

## Заключение

`DynamicFlagsStorageService` предоставляет надежное и производительное решение для хранения feature flags с поддержкой Redis, автоматической очистки и мониторинга. Сервис интегрируется с существующей системой feature flags и обеспечивает гибкость для динамической конфигурации приложения.

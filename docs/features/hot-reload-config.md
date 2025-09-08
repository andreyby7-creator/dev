# Hot Reload Configuration Service

## Назначение

Сервис для обновления конфигурации приложения без перезапуска в режиме разработки, с поддержкой мониторинга изменений, событий и автоматической перезагрузки.

## Основные возможности

- **Мониторинг изменений** - отслеживание изменений в конфигурации
- **События** - уведомления о изменениях через EventEmitter
- **Watchers** - регистрация обработчиков для определенных паттернов
- **Автоматическая перезагрузка** - обновление конфигурации в реальном времени
- **Backup изменений** - сохранение истории изменений
- **Уведомления** - интеграция с системами уведомлений

## Ключевые интерфейсы

```typescript
interface ConfigChangeEvent {
  key: string;
  oldValue: unknown;
  newValue: unknown;
  timestamp: Date;
  source: 'redis' | 'file' | 'api';
}

interface HotReloadConfig {
  enabled: boolean;
  watchInterval: number; // миллисекунды
  maxFileSize: number; // байты
  allowedExtensions: string[];
  enableNotifications: boolean;
  backupChanges: boolean;
}

interface ConfigWatcher {
  id: string;
  pattern: string;
  callback: (event: ConfigChangeEvent) => void;
  isActive: boolean;
}
```

## Основные методы

| Метод                              | Описание                                 |
| ---------------------------------- | ---------------------------------------- |
| `updateConfig(key, value)`         | Обновляет значение конфигурации          |
| `getConfig<T>(key, defaultValue?)` | Получает значение конфигурации           |
| `getAllConfigKeys()`               | Получает все ключи конфигурации          |
| `addWatcher(pattern, callback)`    | Добавляет watcher для паттерна           |
| `removeWatcher(watcherId)`         | Удаляет watcher по ID                    |
| `getActiveWatchers()`              | Получает все активные watchers           |
| `getChangeHistory(limit?)`         | Получает историю изменений               |
| `reloadConfiguration()`            | Принудительно перезагружает конфигурацию |
| `validateConfigValue(key, value)`  | Валидирует значение конфигурации         |
| `getServiceStats()`                | Получает статистику сервиса              |

## Примеры использования

### Базовое использование

```typescript
// Обновить конфигурацию
await hotReloadService.updateConfig('app.debug', true);
await hotReloadService.updateConfig('app.logLevel', 'verbose');

// Получить значение
const debugMode = hotReloadService.getConfig<boolean>('app.debug', false);
const logLevel = hotReloadService.getConfig<string>('app.logLevel', 'info');

console.log(`Debug mode: ${debugMode}, Log level: ${logLevel}`);
```

### Watchers для автоматических действий

```typescript
// Watcher для изменений в настройках логирования
hotReloadService.addWatcher('app.logLevel', event => {
  const newLevel = event.newValue as string;
  console.log(`Log level changed to: ${newLevel}`);

  // Обновить уровень логирования
  logger.setLevel(newLevel);
});

// Watcher для изменений в настройках БД
hotReloadService.addWatcher('database.*', event => {
  console.log(`Database config changed: ${event.key}`);

  if (event.key === 'database.url') {
    // Перезагрузить подключение к БД
    reloadDatabaseConnection();
  } else if (event.key === 'database.maxConnections') {
    // Обновить пул соединений
    updateConnectionPool();
  }
});

// Watcher для изменений в настройках Redis
hotReloadService.addWatcher('redis.*', event => {
  console.log(`Redis config changed: ${event.key}`);

  // Перезагрузить Redis клиент
  reloadRedisClient();
});
```

### Интеграция с другими сервисами

```typescript
@Injectable()
export class DatabaseService {
  constructor(private readonly hotReload: HotReloadConfigService) {
    // Подписаться на изменения конфигурации БД
    this.setupConfigWatchers();
  }

  private setupConfigWatchers(): void {
    this.hotReload.addWatcher('database.*', event => {
      this.handleDatabaseConfigChange(event);
    });
  }

  private async handleDatabaseConfigChange(
    event: ConfigChangeEvent
  ): Promise<void> {
    switch (event.key) {
      case 'database.url':
        await this.reconnect(event.newValue as string);
        break;
      case 'database.maxConnections':
        await this.updateConnectionPool(event.newValue as number);
        break;
      case 'database.timeout':
        this.updateQueryTimeout(event.newValue as number);
        break;
    }
  }

  private async reconnect(url: string): Promise<void> {
    console.log(`Reconnecting to database: ${url}`);
    // Логика переподключения
  }
}
```

### Мониторинг изменений

```typescript
// Получить последние изменения
const recentChanges = hotReloadService.getChangeHistory(20);
console.log('Recent configuration changes:');
recentChanges.forEach(change => {
  const timestamp = change.timestamp.toLocaleString();
  const source = change.source.toUpperCase();
  console.log(
    `[${timestamp}] [${source}] ${change.key}: ${change.oldValue} → ${change.newValue}`
  );
});

// Получить статистику
const stats = hotReloadService.getServiceStats();
console.log('Service statistics:');
console.log(`- Enabled: ${stats.enabled}`);
console.log(`- Active watchers: ${stats.watchersCount}`);
console.log(`- Cached configs: ${stats.cachedConfigsCount}`);
console.log(`- Change history: ${stats.changeHistoryCount}`);
if (stats.lastChangeTime) {
  console.log(`- Last change: ${stats.lastChangeTime.toLocaleString()}`);
}
```

## События

### Типы событий

Сервис генерирует следующие события:

- `config.changed` - конфигурация изменена
- `config.reloaded` - конфигурация перезагружена

### Обработка событий

```typescript
// Подписаться на события
hotReloadService.eventEmitter.on(
  'config.changed',
  (event: ConfigChangeEvent) => {
    console.log(`Config changed: ${event.key}`);

    // Отправить уведомление в Slack
    sendSlackNotification(`Configuration changed: ${event.key}`);

    // Обновить метрики
    updateConfigChangeMetrics(event);
  }
);

hotReloadService.eventEmitter.on('config.reloaded', () => {
  console.log('Configuration reloaded');

  // Обновить health check
  updateHealthCheckStatus('config_reloaded');
});
```

## Конфигурация

### Переменные окружения

```bash
# Включить hot reload
HOT_RELOAD_ENABLED=true

# Интервал проверки изменений (мс)
HOT_RELOAD_WATCH_INTERVAL=5000

# Максимальный размер файла (байты)
HOT_RELOAD_MAX_FILE_SIZE=1048576

# Разрешенные расширения файлов
HOT_RELOAD_ALLOWED_EXTENSIONS=json,yaml,yml,env

# Включить уведомления
HOT_RELOAD_NOTIFICATIONS=true

# Включить backup изменений
HOT_RELOAD_BACKUP=true
```

### Инициализация

```typescript
import { HotReloadConfigService } from './hot-reload-config.service';

@Injectable()
export class ConfigModule {
  constructor(private readonly hotReload: HotReloadConfigService) {}
}
```

## Мониторинг и метрики

### Prometheus метрики

```typescript
// Количество изменений конфигурации
hot_reload_config_changes_total{source="redis"} 45
hot_reload_config_changes_total{source="api"} 12
hot_reload_config_changes_total{source="file"} 3

// Время выполнения операций
hot_reload_operation_duration_seconds{operation="update_config"} 0.002
hot_reload_operation_duration_seconds{operation="reload_config"} 0.150

// Количество активных watchers
hot_reload_watchers_active_total 8

// Размер кеша конфигурации
hot_reload_cache_size_total 150
```

### Health checks

```typescript
// Проверка состояния сервиса
const stats = hotReloadService.getServiceStats();
if (stats.enabled && stats.cachedConfigsCount > 0) {
  return {
    status: 'healthy',
    watchers: stats.watchersCount,
    configs: stats.cachedConfigsCount,
  };
} else {
  return {
    status: 'unhealthy',
    error: 'Service not properly initialized',
  };
}
```

## Безопасность

### Валидация данных

- Проверка типов значений
- Валидация размера файлов
- Санитизация ключей конфигурации

### Доступ

- Аутентификация для API операций
- Проверка прав на изменение конфигурации
- Аудит всех изменений

## Производительность

### Оптимизации

- Redis кеширование конфигурации
- Batch операции для массовых обновлений
- Асинхронная обработка изменений

### Масштабирование

- Поддержка множественных источников
- Распределенная обработка событий
- Автоматическая очистка истории

## Тестирование

### Unit тесты

```typescript
describe('HotReloadConfigService', () => {
  it('should update config value', async () => {
    const updated = await service.updateConfig('test.key', 'new-value');
    expect(updated).toBe(true);

    const value = service.getConfig('test.key');
    expect(value).toBe('new-value');
  });

  it('should emit change event', done => {
    service.eventEmitter.once('config.changed', event => {
      expect(event.key).toBe('test.key');
      expect(event.newValue).toBe('new-value');
      done();
    });

    service.updateConfig('test.key', 'new-value');
  });
});
```

### Integration тесты

```typescript
describe('HotReload Integration', () => {
  it('should work with real Redis', async () => {
    await service.updateConfig('integration.test', 'value');

    const value = service.getConfig('integration.test');
    expect(value).toBe('value');

    // Проверить, что значение сохранено в Redis
    const redisValue = await redis.get('config:integration.test');
    expect(JSON.parse(redisValue)).toBe('value');
  });
});
```

## Troubleshooting

### Частые проблемы

1. **Конфигурация не обновляется**
   - Проверить, включен ли сервис
   - Проверить права доступа к Redis
   - Проверить логи на ошибки

2. **Watchers не срабатывают**
   - Проверить активность watcher
   - Проверить паттерн матчинг
   - Проверить callback функции

3. **Медленная работа**
   - Увеличить интервал проверки
   - Оптимизировать Redis запросы
   - Использовать batch операции

### Логи и отладка

```typescript
// Включить debug логирование
const logger = new Logger(HotReloadConfigService.name);
logger.setLogLevel('debug');

// Проверить состояние сервиса
const stats = hotReloadService.getServiceStats();
console.log('Service stats:', stats);

// Проверить активные watchers
const watchers = hotReloadService.getActiveWatchers();
console.log(
  'Active watchers:',
  watchers.map(w => `${w.pattern} (${w.id})`)
);
```

## Заключение

`HotReloadConfigService` предоставляет мощный инструмент для динамического обновления конфигурации приложения без перезапуска. Сервис поддерживает мониторинг изменений, события, watchers и автоматическую перезагрузку, что делает его незаменимым для разработки и отладки.

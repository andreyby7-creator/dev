# Redis сервис

## Обзор

`RedisService` - это обертка для операций Redis, предоставляющая унифицированный API для всех операций Redis, включая обработку ошибок, логирование и проверки здоровья.

## Ключевые функции

- **Унифицированный API** - единый интерфейс для всех операций Redis
- **Обработка ошибок** - корректная обработка ошибок подключения и операций
- **Логирование** - детальное логирование всех операций
- **Проверки здоровья** - мониторинг статуса подключения Redis
- **Метрики** - статистика подключений и производительности
- **Резервный режим** - поддержка мок-режима для разработки

## Интерфейсы

### RedisClient

```typescript
interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<string>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  expire(key: string, ttl: number): Promise<number>;
  ttl(key: string): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  flushall(): Promise<string>;
  ping(): Promise<string>;
  on(event: string, callback: (...args: unknown[]) => void): void;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}
```

## API методы

### Базовые операции

#### `get(key: string): Promise<string | null>`

Получает значение по ключу.

```typescript
const value = await redisService.get('user:123');
if (value) {
  const user = JSON.parse(value);
  console.log('Пользователь:', user.name);
}
```

#### `set(key: string, value: string, ttl?: number): Promise<string>`

Устанавливает значение по ключу с опциональным TTL.

```typescript
// Установить значение без TTL
await redisService.set('user:123', JSON.stringify(userData));

// Установить значение с TTL (1 час)
await redisService.set('session:456', sessionToken, 3600);

// Установить значение с TTL (1 день)
await redisService.set('cache:789', cachedData, 86400);
```

#### `del(key: string): Promise<number>`

Удаляет ключ.

```typescript
const deleted = await redisService.del('user:123');
if (deleted > 0) {
  console.log('Пользователь успешно удален');
}
```

#### `exists(key: string): Promise<number>`

Проверяет существование ключа.

```typescript
const exists = await redisService.exists('user:123');
if (exists > 0) {
  console.log('Пользователь существует');
} else {
  console.log('Пользователь не найден');
}
```

### Управление TTL

#### `expire(key: string, ttl: number): Promise<number>`

Устанавливает TTL для ключа.

```typescript
const set = await redisService.expire('session:456', 3600); // 1 час
if (set > 0) {
  console.log('TTL успешно установлен');
}
```

#### `ttl(key: string): Promise<number>`

Получает оставшееся время TTL для ключа.

```typescript
const remainingTtl = await redisService.ttl('session:456');
if (remainingTtl > 0) {
  console.log(`Сессия истекает через ${remainingTtl} секунд`);
} else if (remainingTtl === -1) {
  console.log('У сессии нет TTL');
} else if (remainingTtl === -2) {
  console.log('Сессия не существует');
}
```

### Массовые операции

#### `keys(pattern: string): Promise<string[]>`

Получает ключи по шаблону.

```typescript
// Получить все ключи пользователей
const userKeys = await redisService.keys('user:*');
console.log(`Найдено ${userKeys.length} ключей пользователей`);

// Получить все сессии
const sessionKeys = await redisService.keys('session:*');
console.log(`Найдено ${sessionKeys.length} ключей сессий`);

// Получить все ключи с определенным суффиксом
const cacheKeys = await redisService.keys('*:cache');
console.log(`Найдено ${cacheKeys.length} ключей кеша`);
```

#### `flushall(): Promise<string>`

Очищает все ключи Redis.

```typescript
// ⚠️ Предупреждение! Очищает все данные
const result = await redisService.flushall();
if (result === 'OK') {
  console.log('Все ключи очищены');
}
```

### Управление подключением

#### `connect(): Promise<void>`

Подключается к Redis.

```typescript
try {
  await redisService.connect();
  console.log('Подключен к Redis');
} catch (error) {
  console.error('Не удалось подключиться к Redis:', error);
}
```

#### `disconnect(): Promise<void>`

Отключается от Redis.

```typescript
try {
  await redisService.disconnect();
  console.log('Отключен от Redis');
} catch (error) {
  console.error('Не удалось отключиться от Redis:', error);
}
```

#### `ping(): Promise<string>`

Проверяет доступность Redis.

```typescript
try {
  const response = await redisService.ping();
  if (response === 'PONG') {
    console.log('Redis отвечает');
  }
} catch (error) {
  console.error('Redis не отвечает:', error);
}
```

### Доступ к клиенту

#### `getClient(): RedisClient`

Получает экземпляр клиента Redis.

```typescript
const client = redisService.getClient();
// Использовать клиент напрямую для специфических операций
```

### Проверки здоровья

#### `healthCheck(): Promise<HealthStatus>`

Проверяет статус подключения Redis.

```typescript
const health = await redisService.healthCheck();
if (health.status === 'healthy') {
  console.log(`Redis здоров, задержка: ${health.latency}мс`);
} else {
  console.log('Redis нездоров');
}
```

### Информация о сервисе

#### `getInfo(): Promise<RedisInfo>`

Получает информацию о сервисе Redis.

```typescript
const info = await redisService.getInfo();
console.log(`Подключен: ${info.connected}`);
console.log(`Тип клиента: ${info.clientType}`);
if (info.version) {
  console.log(`Версия: ${info.version}`);
}
```

## Конфигурация

### Переменные окружения

```bash
# Хост Redis
REDIS_HOST=localhost

# Порт Redis
REDIS_PORT=6379

# Пароль Redis
REDIS_PASSWORD=secret

# База данных Redis
REDIS_DB=0

# Таймаут подключения Redis
REDIS_TIMEOUT=5000

# Количество попыток повторного подключения
REDIS_RETRY_ATTEMPTS=3
```

### Инициализация

```typescript
import { RedisService } from './redis/redis.service';

@Injectable()
export class AppModule {
  constructor(private readonly redisService: RedisService) {}
}
```

## Примеры использования

### Базовые операции

```typescript
// Установить и получить значение
await redisService.set('greeting', 'Привет, мир!');
const greeting = await redisService.get('greeting');
console.log(greeting); // "Привет, мир!"

// Установить значение с TTL
await redisService.set('temp:data', 'временные данные', 300); // 5 минут
const tempData = await redisService.get('temp:data');
console.log(tempData); // "временные данные"

// Проверить TTL
const ttl = await redisService.ttl('temp:data');
console.log(`TTL: ${ttl} секунд`);
```

### Обработка JSON данных

```typescript
// Сохранить объект
const user = { id: 123, name: 'Иван Иванов', email: 'ivan@example.com' };
await redisService.set('user:123', JSON.stringify(user));

// Получить и распарсить объект
const userData = await redisService.get('user:123');
if (userData) {
  const retrievedUser = JSON.parse(userData);
  console.log('Пользователь:', retrievedUser.name);
}

// Обновить часть объекта
if (userData) {
  const currentUser = JSON.parse(userData);
  currentUser.lastLogin = new Date().toISOString();
  await redisService.set('user:123', JSON.stringify(currentUser));
}
```

### Управление сессиями

```typescript
// Создать сессию
const sessionId = 'session_' + Date.now();
const sessionData = {
  userId: 123,
  createdAt: new Date().toISOString(),
  permissions: ['read', 'write'],
};

await redisService.set(sessionId, JSON.stringify(sessionData), 3600); // 1 час

// Проверить существование сессии
const sessionExists = await redisService.exists(sessionId);
if (sessionExists > 0) {
  console.log('Сессия действительна');

  // Получить данные сессии
  const session = await redisService.get(sessionId);
  if (session) {
    const sessionInfo = JSON.parse(session);
    console.log('ID пользователя:', sessionInfo.userId);
  }
}

// Удалить сессию
await redisService.del(sessionId);
```

### Кеширование

```typescript
// Кешировать результат запроса
const cacheKey = 'query:users:active';
const cacheData = await redisService.get(cacheKey);

if (cacheData) {
  // Использовать кешированные данные
  const users = JSON.parse(cacheData);
  console.log('Используем кешированные данные:', users.length, 'пользователей');
} else {
  // Получить данные из БД
  const users = await databaseService.getActiveUsers();

  // Кешировать на 10 минут
  await redisService.set(cacheKey, JSON.stringify(users), 600);
  console.log('Данные закешированы на 10 минут');
}
```

### Пакетные операции

```typescript
// Получить несколько ключей
const userKeys = await redisService.keys('user:*');
const users = [];

for (const key of userKeys) {
  const userData = await redisService.get(key);
  if (userData) {
    users.push(JSON.parse(userData));
  }
}

console.log(`Получено ${users.length} пользователей`);

// Удалить несколько ключей
for (const key of userKeys) {
  await redisService.del(key);
}

console.log('Все ключи пользователей удалены');
```

### Обработка ошибок

```typescript
try {
  const value = await redisService.get('important:key');
  if (value) {
    console.log('Значение получено:', value);
  }
} catch (error) {
  console.error('Не удалось получить значение:', error);

  // Резервный вариант - локальный кеш или БД
  const fallbackValue = await getFallbackValue('important:key');
  console.log('Используем резервное значение:', fallbackValue);
}
```

## Мониторинг и метрики

### Метрики Prometheus

```typescript
// Количество операций
redis_operations_total{operation="get"} 1250
redis_operations_total{operation="set"} 890
redis_operations_total{operation="del"} 45

// Длительность операций
redis_operation_duration_seconds{operation="get"} 0.001
redis_operation_duration_seconds{operation="set"} 0.002
redis_operation_duration_seconds{operation="del"} 0.001

// Ошибки
redis_errors_total{operation="get"} 5
redis_errors_total{operation="set"} 2
redis_errors_total{operation="del"} 0

// Статус подключения
redis_connection_status{status="connected"} 1
redis_connection_latency_ms 2.5
```

### Проверки здоровья

```typescript
// Проверить статус Redis
const health = await redisService.healthCheck();
if (health.status === 'healthy') {
  return {
    status: 'healthy',
    latency: health.latency,
    service: 'redis',
  };
} else {
  return {
    status: 'unhealthy',
    error: 'Подключение к Redis не удалось',
    service: 'redis',
  };
}
```

## Безопасность

### Аутентификация

- Поддержка пароля Redis
- SSL/TLS подключения
- Аутентификация Redis ACL

### Валидация данных

- Проверка типов значений
- Санитизация ключей
- Валидация значений TTL

## Производительность

### Оптимизации

- Пул подключений
- Операции pipeline
- Пакетные операции
- Кеширование результатов

### Мониторинг

- Метрики задержки
- Метрики пропускной способности
- Использование памяти
- Статистика пула подключений

## Тестирование

### Модульные тесты

```typescript
describe('RedisService', () => {
  it('должен получать и устанавливать значения', async () => {
    await service.set('test:key', 'test-value');
    const value = await service.get('test:key');
    expect(value).toBe('test-value');
  });

  it('должен корректно обрабатывать TTL', async () => {
    await service.set('test:ttl', 'value', 1);
    const ttl = await service.ttl('test:ttl');
    expect(ttl).toBeGreaterThan(0);
  });

  it('должен корректно обрабатывать ошибки', async () => {
    // Мок ошибки Redis
    jest
      .spyOn(redisClient, 'get')
      .mockRejectedValue(new Error('Подключение не удалось'));

    const result = await service.get('test:key');
    expect(result).toBeNull();
  });
});
```

### Интеграционные тесты

```typescript
describe('Redis Integration', () => {
  it('должен работать с реальным Redis', async () => {
    await service.set('integration:test', 'value');

    const value = await service.get('integration:test');
    expect(value).toBe('value');

    const exists = await service.exists('integration:test');
    expect(exists).toBe(1);

    await service.del('integration:test');

    const deleted = await service.exists('integration:test');
    expect(deleted).toBe(0);
  });
});
```

## Устранение неполадок

### Распространенные проблемы

1. **Подключение не удалось**
   - Проверить доступность сервера Redis
   - Проверить настройки подключения
   - Проверить сетевые настройки

2. **Медленная производительность**
   - Проверить производительность Redis
   - Оптимизировать запросы
   - Использовать операции pipeline

3. **Проблемы с памятью**
   - Проверить использование памяти Redis
   - Настроить политики вытеснения
   - Очистить неиспользуемые ключи

### Логи и отладка

```typescript
// Включить отладочное логирование
const logger = new Logger(RedisService.name);
logger.setLogLevel('debug');

// Проверить статус подключения
const health = await redisService.healthCheck();
console.log('Статус здоровья:', health);

// Проверить информацию о сервисе
const info = await redisService.getInfo();
console.log('Информация о сервисе:', info);
```

## Мок-режим

### Для разработки

В режиме разработки сервис использует мок-клиент Redis:

```typescript
// Мок-клиент Redis для разработки
const mockRedis = {
  get: async () => null,
  set: async () => 'OK',
  del: async () => 1,
  exists: async () => 0,
  expire: async () => 1,
  ttl: async () => -1,
  keys: async () => [],
  flushall: async () => 'OK',
  ping: async () => 'PONG',
  on: () => {},
  connect: async () => {},
  disconnect: async () => {},
};
```

### Преимущества мок-режима

- Не требуется установка Redis
- Быстрая разработка и тестирование
- Предсказуемое поведение
- Легкая отладка

## Заключение

`RedisService` предоставляет надежный и удобный интерфейс для операций Redis, включая обработку ошибок, логирование и проверки здоровья. Сервис поддерживает как реальные подключения Redis, так и мок-режим для разработки, что делает его универсальным решением для различных случаев использования.

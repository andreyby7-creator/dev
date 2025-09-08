# TestFixturesService

## Назначение

Сервис для автоматической генерации и управления тестовым окружением. Создает тестовые данные (fixtures), настраивает тестовые среды и автоматизирует подготовку тестового окружения.

## Основные функции

- Создание тестовых данных (fixtures) различных типов
- Управление тестовыми средами с переменными окружения
- Автоматическая генерация тестовых данных на основе шаблонов
- Настройка и очистка тестового окружения
- Тегирование и поиск fixtures по категориям

## Ключевые интерфейсы

```typescript
interface ITestFixture {
  id: string;
  name: string;
  data: Record<string, unknown>;
  type: 'json' | 'xml' | 'csv' | 'yaml';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface ITestEnvironment {
  id: string;
  name: string;
  variables: Record<string, string>;
  fixtures: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

## Основные методы

| Метод                                | Описание                   |
| ------------------------------------ | -------------------------- |
| `createFixture(fixtureData)`         | Создает тестовый fixture   |
| `getFixture(fixtureId)`              | Получает fixture по ID     |
| `updateFixture(fixtureId, updates)`  | Обновляет fixture          |
| `createEnvironment(envData)`         | Создает тестовую среду     |
| `setupTestEnvironment(envId)`        | Настраивает тестовую среду |
| `teardownTestEnvironment(envId)`     | Очищает тестовую среду     |
| `generateTestData(fixtureId, count)` | Генерирует тестовые данные |

## Пример использования

```typescript
// Создание fixture
const userFixture = service.createFixture({
  name: 'admin-user',
  data: {
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
    permissions: ['read', 'write', 'delete'],
  },
  type: 'json',
  tags: ['user', 'admin', 'test'],
});

// Создание тестовой среды
const testEnv = service.createEnvironment({
  name: 'e2e-tests',
  variables: {
    NODE_ENV: 'test',
    DB_URL: 'postgresql://test:test@localhost:5432/testdb',
  },
  fixtures: ['user-fixture', 'product-fixture'],
});

// Настройка и очистка среды
const setup = await service.setupTestEnvironment(testEnv.id);
if (setup.status === 'ready') {
  // Выполняем тесты...
  await service.teardownTestEnvironment(testEnv.id);
}
```

## Особенности

- Автоматическая генерация ID
- Поддержка типов: JSON, XML, CSV, YAML
- Система тегов для категоризации
- Автоматическая настройка и очистка сред
- Валидация данных
- Логирование операций

## Интеграция

Интегрирован в `FeatureFlagsModule` для комплексного тестирования приложения. Полезен при интеграционном и end-to-end тестировании.

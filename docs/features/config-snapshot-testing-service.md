# ConfigSnapshotTestingService

## Назначение

Сервис для создания, управления и тестирования снапшотов конфигурации приложения. Позволяет создавать моментальные снимки конфигурации, запускать тесты и отслеживать изменения.

## Основные функции

- Создание снапшотов конфигурации с метаданными
- Валидация целостности через checksum
- Запуск тестов против снапшотов
- Управление жизненным циклом
- Статистика результатов тестирования

## Ключевые интерфейсы

```typescript
interface IConfigSnapshot {
  id: string;
  name: string;
  config: Record<string, unknown>;
  timestamp: Date;
  environment: string;
  checksum: string;
}

interface IConfigSnapshotTest {
  id: string;
  snapshotId: string;
  name: string;
  testFunction: (config: Record<string, unknown>) => boolean | Promise<boolean>;
  expectedResult: boolean;
  timeout?: number;
}
```

## Основные методы

| Метод                                | Описание                       |
| ------------------------------------ | ------------------------------ |
| `createSnapshot(name, description?)` | Создает снапшот конфигурации   |
| `getSnapshot(snapshotId)`            | Получает снапшот по ID         |
| `createTest(testData)`               | Создает тест для снапшота      |
| `runTest(testId)`                    | Запускает конкретный тест      |
| `runAllTests()`                      | Запускает все тесты            |
| `validateSnapshot(snapshotId)`       | Проверяет целостность снапшота |

## Пример использования

```typescript
// Создание и тестирование снапшота
const snapshot = await service.createSnapshot('prod-config');
const test = service.createTest({
  snapshotId: snapshot.id,
  name: 'port-validation',
  testFunction: config => config.port > 0 && config.port < 65536,
  expectedResult: true,
});
const result = await service.runTest(test.id);
```

## Особенности

- Автоматическая генерация ID
- Checksum валидация
- Timeout поддержка
- Retry механизм
- Детальная статистика

## Интеграция

Интегрирован в `FeatureFlagsModule` для комплексного тестирования конфигурации.

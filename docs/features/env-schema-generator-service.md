# EnvSchemaGeneratorService

## Назначение

Сервис для создания, управления и валидации схем переменных окружения. Генерирует `.env.example` файлы, создает Zod схемы и обеспечивает соответствие переменных окружения требованиям.

## Основные функции

- Создание схем переменных окружения с типами и валидацией
- Генерация `.env.example` файлов
- Создание Zod схем для runtime валидации
- Валидация `.env` файлов против схем
- Экспорт схем в различных форматах (JSON, YAML)
- Управление переменными по средам

## Ключевые интерфейсы

```typescript
interface IEnvSchema {
  id: string;
  name: string;
  variables: IEnvVariable[];
  environment: string;
  createdAt: Date;
  updatedAt: Date;
}

interface IEnvVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  default?: unknown;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: unknown[];
  };
}
```

## Основные методы

| Метод                                | Описание                           |
| ------------------------------------ | ---------------------------------- |
| `createSchema(schemaData)`           | Создает схему переменных окружения |
| `getSchema(schemaId)`                | Получает схему по ID               |
| `updateSchema(schemaId, updates)`    | Обновляет схему                    |
| `addVariable(schemaId, variable)`    | Добавляет переменную в схему       |
| `generateEnvExample(schemaId)`       | Генерирует `.env.example` файл     |
| `generateZodSchema(schemaId)`        | Генерирует Zod схему               |
| `validateEnvFile(schemaId, content)` | Валидирует `.env` файл             |

## Пример использования

```typescript
// Создание схемы
const schema = service.createSchema({
  name: 'production-schema',
  variables: [
    { name: 'NODE_ENV', type: 'string', required: true, default: 'production' },
    { name: 'PORT', type: 'number', required: true, default: 3000 },
    { name: 'DEBUG', type: 'boolean', required: false, default: false },
  ],
  environment: 'production',
});

// Генерация .env.example
const envExample = service.generateEnvExample(schema.id);

// Валидация .env файла
const validation = service.validateEnvFile(schema.id, envContent);
if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
}
```

## Особенности

- Поддержка типов: string, number, boolean, array, object
- Валидация с ограничениями (min, max, pattern, enum)
- Автоматическая генерация .env.example и Zod схем
- Runtime валидация .env файлов
- Экспорт в JSON/YAML форматах
- Управление по средам (dev, staging, production)

## Интеграция

Интегрирован в `FeatureFlagsModule` для обеспечения корректности конфигурации при развертывании в различных средах.

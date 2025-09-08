# AST/Code Mod Automation

## Назначение

Система автоматизации массовых изменений кода с использованием Abstract Syntax Tree (AST) трансформаций через ts-morph и jscodeshift.

## Основные возможности

### Массовые трансформации кода

- **Переименование** - массовое переименование классов, методов, переменных
- **Добавление свойств** - автоматическое добавление свойств к классам
- **Удаление свойств** - удаление устаревших свойств
- **Изменение типов** - обновление типизации
- **Добавление методов** - генерация стандартных методов
- **Удаление методов** - очистка устаревших методов
- **Добавление декораторов** - автоматическое добавление декораторов
- **Удаление декораторов** - очистка устаревших декораторов
- **Изменение импортов** - оптимизация и обновление импортов
- **Изменение экспортов** - управление экспортами

### Поддерживаемые инструменты

- **jscodeshift** - для JavaScript/TypeScript трансформаций
- **ts-morph** - для TypeScript AST манипуляций
- **TypeScript Compiler API** - для низкоуровневых операций

## Архитектура

### AstCodeModService

```typescript
interface ITransformationRule {
  id: string;
  name: string;
  type: TransformationType;
  targetType: TargetType;
  pattern: string;
  replacement: string;
  conditions?: Record<string, unknown>;
  description: string;
}

interface IBulkTransformationRequest {
  rules: ITransformationRule[];
  filePatterns: string[];
  dryRun?: boolean;
  backup?: boolean;
}
```

### Типы трансформаций

- **RENAME** - переименование элементов
- **ADD_PROPERTY** - добавление свойств
- **REMOVE_PROPERTY** - удаление свойств
- **CHANGE_TYPE** - изменение типов
- **ADD_METHOD** - добавление методов
- **REMOVE_METHOD** - удаление методов
- **ADD_DECORATOR** - добавление декораторов
- **REMOVE_DECORATOR** - удаление декораторов
- **IMPORT_CHANGE** - изменение импортов
- **EXPORT_CHANGE** - изменение экспортов

## Предопределенные правила

### Добавление Logger в сервисы

```typescript
{
  id: 'add-logger-to-service',
  name: 'Add Logger to Service',
  type: 'ADD_PROPERTY',
  targetType: 'CLASS',
  pattern: 'class\\s+(\\w+)Service\\s*{',
  replacement: 'class $1Service {\n  private readonly logger = new Logger($1Service.name);',
  conditions: { hasLogger: false },
  description: 'Добавляет Logger в сервисы NestJS'
}
```

### Добавление Swagger декораторов

```typescript
{
  id: 'add-swagger-decorators',
  name: 'Add Swagger Decorators',
  type: 'ADD_DECORATOR',
  targetType: 'CLASS',
  pattern: '@Controller\\(([^)]+)\\)',
  replacement: "@ApiTags('$1')\n@Controller($1)",
  conditions: { hasApiTags: false },
  description: 'Добавляет ApiTags декораторы к контроллерам'
}
```

### Добавление валидационных декораторов

```typescript
{
  id: 'add-validation-decorators',
  name: 'Add Validation Decorators',
  type: 'ADD_DECORATOR',
  targetType: 'CLASS',
  pattern: '(\\w+):\\s*(string|number|boolean)',
  replacement: '@Is$2()\n  $1: $2',
  conditions: { hasValidation: false },
  description: 'Добавляет валидационные декораторы к DTO'
}
```

### Добавление обработки ошибок

```typescript
{
  id: 'add-error-handling',
  name: 'Add Error Handling',
  type: 'ADD_METHOD',
  targetType: 'CLASS',
  pattern: 'async\\s+(\\w+)\\([^)]*\\)\\s*{[^}]*}',
  replacement: 'async $1($2) {\n    try {\n      $3\n    } catch (error) {\n      this.logger.error(`Error in $1: ${error.message}`);\n      throw error;\n    }\n  }',
  conditions: { hasErrorHandling: false },
  description: 'Добавляет обработку ошибок в методы'
}
```

## JSCodeshift трансформации

### Оптимизация импортов

```javascript
export default function transformer(file, api, options) {
  const j = api.jscodeshift;
  const root = j(file.source);

  // Группируем импорты по типам
  const builtInImports = [];
  const externalImports = [];
  const internalImports = [];
  const typeImports = [];

  // Сортируем и добавляем импорты в правильном порядке
  // ...
}
```

### Замена any на unknown

```javascript
export default function transformer(file, api, options) {
  const j = api.jscodeshift;
  const root = j(file.source);

  // Находим все TypeAnnotation с any
  root
    .find(j.TSTypeAnnotation)
    .filter(path => {
      return path.value.typeAnnotation.type === 'TSAnyKeyword';
    })
    .forEach(path => {
      // Заменяем any на unknown
      path.value.typeAnnotation = j.tsUnknownKeyword();
    });
}
```

### Добавление типов

```javascript
export default function transformer(file, api, options) {
  const j = api.jscodeshift;
  const root = j(file.source);

  // Добавляем типы для параметров функций без типов
  root.find(j.FunctionDeclaration).forEach(path => {
    const params = path.value.params;
    params.forEach(param => {
      if (!param.typeAnnotation) {
        param.typeAnnotation = j.tsTypeAnnotation(j.tsUnknownKeyword());
      }
    });
  });
}
```

## Использование

### Массовая трансформация

```typescript
const request: IBulkTransformationRequest = {
  rules: [
    {
      id: 'add-logger-to-service',
      name: 'Add Logger to Service',
      type: 'ADD_PROPERTY',
      targetType: 'CLASS',
      pattern: 'class\\s+(\\w+)Service\\s*{',
      replacement:
        'class $1Service {\n  private readonly logger = new Logger($1Service.name);',
      description: 'Добавляет Logger в сервисы',
    },
  ],
  filePatterns: ['src/**/*.service.ts'],
  dryRun: false,
  backup: true,
};

const result = await astCodeModService.performBulkTransformation(request);
```

### Получение предопределенных правил

```typescript
const rules = astCodeModService.getPredefinedRules();
console.log(rules.map(rule => rule.name));
```

### Добавление пользовательского правила

```typescript
const customRule: ITransformationRule = {
  id: 'custom-rule',
  name: 'Custom Rule',
  type: 'ADD_PROPERTY',
  targetType: 'CLASS',
  pattern: 'class\\s+(\\w+)\\s*{',
  replacement: 'class $1 {\n  // Custom property',
  description: 'Custom transformation rule',
};

astCodeModService.addCustomRule(customRule);
```

## CLI инструменты

### Codemods скрипт

```bash
#!/bin/bash

# Исправление any типов
./scripts/codemods.sh --any

# Исправление типизации
./scripts/codemods.sh --typing

# Оптимизация импортов
./scripts/codemods.sh --imports

# Исправление ESLint предупреждений
./scripts/codemods.sh --eslint

# Проверка качества кода
./scripts/codemods.sh --quality

# Выполнить все исправления
./scripts/codemods.sh --all
```

### JSCodeshift команды

```bash
# Замена any на unknown
jscodeshift -t ./scripts/codemods/any-to-unknown.js \
  --parser=ts \
  --extensions=ts,tsx \
  apps/ packages/

# Добавление типов
jscodeshift -t ./scripts/codemods/add-types.js \
  --parser=ts \
  --extensions=ts,tsx \
  apps/ packages/

# Оптимизация импортов
jscodeshift -t ./scripts/codemods/import-optimization.js \
  --parser=ts \
  --extensions=ts,tsx \
  apps/ packages/
```

## API Endpoints

### POST /ai/code-assistant/bulk-transform

```json
{
  "rules": [
    {
      "id": "add-logger-to-service",
      "name": "Add Logger to Service",
      "type": "ADD_PROPERTY",
      "targetType": "CLASS",
      "pattern": "class\\s+(\\w+)Service\\s*{",
      "replacement": "class $1Service {\n  private readonly logger = new Logger($1Service.name);",
      "description": "Добавляет Logger в сервисы"
    }
  ],
  "filePatterns": ["src/**/*.service.ts"],
  "dryRun": false,
  "backup": true
}
```

### GET /ai/code-assistant/transformation-rules

```json
{
  "rules": [
    {
      "id": "add-logger-to-service",
      "name": "Add Logger to Service",
      "type": "ADD_PROPERTY",
      "targetType": "CLASS",
      "description": "Добавляет Logger в сервисы NestJS"
    }
  ]
}
```

### GET /ai/code-assistant/transformation-history

```json
{
  "history": [
    {
      "id": "transformation_1234567890_abc123",
      "ruleId": "add-logger-to-service",
      "filePath": "src/users.service.ts",
      "success": true,
      "changes": [
        {
          "type": "ADD",
          "line": 5,
          "column": 0,
          "originalText": "class UserService {",
          "newText": "class UserService {\n  private readonly logger = new Logger(UserService.name);",
          "description": "Added Logger property"
        }
      ],
      "timestamp": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

## Безопасность и резервное копирование

### Автоматическое резервное копирование

```typescript
// Создание резервной копии перед трансформацией
const backupDir = `backup/codemods/${new Date().toISOString()}`;
await createBackup(backupDir);

// Выполнение трансформации
const result = await performTransformation(request);

// Откат в случае ошибки
if (!result.success) {
  await rollback(backupDir);
}
```

### Dry Run режим

```typescript
const request: IBulkTransformationRequest = {
  rules: rules,
  filePatterns: ['src/**/*.ts'],
  dryRun: true, // Только симуляция, без изменений
  backup: false,
};

const result = await astCodeModService.performBulkTransformation(request);
// result содержит предварительный просмотр изменений
```

## Мониторинг и отчеты

### Статистика трансформаций

```typescript
interface IBulkTransformationResult {
  success: boolean;
  totalFiles: number;
  processedFiles: number;
  successfulFiles: number;
  failedFiles: number;
  transformations: ICodeTransformation[];
  summary: {
    addedLines: number;
    removedLines: number;
    modifiedLines: number;
    renamedItems: number;
  };
  errors: string[];
}
```

### Детальные отчеты

Включают:

- Список всех изменений по файлам
- Статистику по типам изменений
- Ошибки и предупреждения
- Время выполнения трансформаций

## Лучшие практики

### Планирование трансформаций

- Всегда используйте dry run для предварительного просмотра
- Создавайте резервные копии перед массовыми изменениями
- Тестируйте правила на небольших файлах
- Проверяйте результаты после трансформации

### Создание правил

- Используйте точные регулярные выражения
- Добавляйте условия для предотвращения дублирования
- Документируйте назначение каждого правила
- Тестируйте правила на различных типах кода

### Безопасность

- Проверяйте результаты трансформации
- Используйте version control для отслеживания изменений
- Создавайте автоматические тесты для критических изменений
- Документируйте все массовые изменения

## Интеграция с CI/CD

### GitHub Actions

```yaml
name: Code Mod Automation
on: [push, pull_request]

jobs:
  codemods:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Code Mods
        run: |
          ./scripts/codemods.sh --all
      - name: Check Results
        run: |
          pnpm run type-check
          pnpm run lint
```

### Pre-commit hooks

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Запуск автоматических исправлений
./scripts/codemods.sh --typing --imports

# Проверка качества кода
./scripts/quality/code-captain.sh
```

## Расширение функциональности

### Добавление новых типов трансформаций

1. Определите новый `TransformationType`
2. Добавьте обработку в `applyTransformationRule`
3. Реализуйте соответствующий метод трансформации
4. Обновите документацию

### Интеграция с внешними инструментами

- **ESLint** - для автоматических исправлений
- **Prettier** - для форматирования кода
- **TypeScript** - для проверки типов
- **SonarQube** - для анализа качества кода

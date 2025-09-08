# AI-интеграция и подсказки

## Назначение

Система AI-интеграции и подсказок для проекта SaleSpot BY, включающая AI-подсказки в VSCode, анализ коммитов, генерацию docstrings и оптимизацию кода.

## Основные компоненты

### 1. AI-подсказки в VSCode

**Настроенные расширения:**

- **GitHub Copilot**: Основной AI-ассистент для генерации кода
- **GitHub Copilot Chat**: Чат-интерфейс для AI-помощи
- **Microsoft AI Extension Pack**: Комплект AI-инструментов
- **IntelliCode**: AI-подсказки от Microsoft

**Возможности:**

- Автоматическое завершение кода
- Генерация функций и методов
- Предложения по рефакторингу
- Объяснение сложного кода
- Автоматическая генерация тестов

### 2. AI-проверка коммитов

**Сервис:** `AiCommitAnalyzerService`

**Функциональность:**

- Проверка формата conventional commits
- Анализ измененных файлов
- Обнаружение проблем безопасности
- Предложения по улучшению
- Оценка качества коммита

**API методы:**

```typescript
// Анализ коммита
analyzeCommit(request: ICommitValidationRequest): Promise<ICommitValidationResult>

// Получение истории
getCommitHistory(): ICommitAnalysis[]

// Получение статистики
getCommitStatistics(): CommitStatistics
```

### 3. AI-генерация docstrings

**Сервис:** `AiDocstringGeneratorService`

**Поддерживаемые стили:**

- **JSDoc**: Классический JavaScript стиль
- **TSDoc**: TypeScript стиль
- **Google**: Google стиль документации
- **JSDoc Extended**: Расширенный JSDoc

**Поддерживаемые типы:**

- Функции и методы
- Классы и интерфейсы
- Переменные и свойства
- Enum и типы

**API методы:**

```typescript
// Генерация docstring
generateDocstring(request: IDocstringRequest): Promise<IDocstringResult>

// Генерация для NestJS
generateNestJSServiceDocstring(serviceName: string, methods: string[]): Promise<IDocstringResult>
generateNestJSControllerDocstring(controllerName: string, endpoints: string[]): Promise<IDocstringResult>
generateDTODocstring(dtoName: string, properties: Record<string, string>): Promise<IDocstringResult>
```

### 4. AI-подсказки по оптимизации

**Сервис:** `AiCodeOptimizerService`

**Типы оптимизации:**

- **Производительность**: Алгоритмы и паттерны
- **Память**: Использование памяти
- **Читаемость**: Структура и стиль
- **Безопасность**: Уязвимости и риски
- **Поддерживаемость**: Сложность и структура

**Метрики качества:**

- Цикломатическая сложность
- Индекс поддерживаемости
- Оценка производительности
- Оценка безопасности
- Оценка читаемости

**API методы:**

```typescript
// Оптимизация кода
optimizeCode(request: ICodeOptimizationRequest): Promise<ICodeOptimizationResult>

// Получение истории
getOptimizationHistory(): ICodeOptimizationResult[]

// Получение статистики
getOptimizationStatistics(): OptimizationStatistics
```

## Интеграция с VSCode

### Настройки workspace

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit"
  },
  "github.copilot.enable": {
    "*": true,
    "typescript": true,
    "javascript": true
  },
  "github.copilot.chat.enable": true,
  "ai.codeActions.enabled": true
}
```

### Рекомендуемые расширения

1. **GitHub Copilot** - основной AI-ассистент
2. **GitHub Copilot Chat** - чат с AI
3. **Microsoft AI Extension Pack** - комплект AI-инструментов
4. **IntelliCode** - AI-подсказки от Microsoft

### Горячие клавиши

- `Ctrl+Enter` - принять предложение Copilot
- `Alt+[` / `Alt+]` - переключение между предложениями
- `Ctrl+Shift+I` - открыть чат Copilot
- `Ctrl+Shift+P` - команды AI

## AI-анализ коммитов

### Правила conventional commits

```bash
# Формат
type(scope): description

# Примеры
feat(auth): add JWT authentication
fix(api): resolve CORS issue
docs(readme): update installation guide
style(ui): improve button styling
refactor(core): simplify user service
test(auth): add authentication tests
chore(deps): update dependencies
```

### Автоматические проверки

1. **Формат сообщения**: Соответствие conventional commits
2. **Длина сообщения**: Максимум 72 символа
3. **Тип коммита**: Валидные типы (feat, fix, docs, etc.)
4. **Измененные файлы**: Анализ количества и типов
5. **Безопасность**: Проверка на hardcoded значения

### Интеграция с Git hooks

```bash
#!/bin/sh
# .husky/pre-commit

# AI-анализ коммита
./scripts/ai/analyze-commit.sh

# Проверка качества
./scripts/quality/code-captain.sh
```

## AI-генерация документации

### Шаблоны docstrings

#### JSDoc для функций

```typescript
/**
 * Описание функции
 *
 * @param {string} paramName - Описание параметра
 * @returns {string} Описание возвращаемого значения
 * @throws {Error} Описание исключения
 * @example
 * Пример использования
 */
```

#### TSDoc для классов

```typescript
/**
 * Описание класса
 *
 * @class ClassName
 * @description Подробное описание
 * @example
 * Пример использования
 */
```

#### Google стиль

```typescript
/**
 * Описание функции
 *
 * Args:
 *   paramName: Описание параметра
 *
 * Returns:
 *   Описание возвращаемого значения
 *
 * Raises:
 *   Описание исключения
 *
 * Example:
 *   Пример использования
 */
```

### Автоматическая генерация

```typescript
// Генерация для NestJS сервиса
const docstring = await docstringService.generateNestJSServiceDocstring(
  'UserService',
  ['create', 'findAll', 'findOne', 'update', 'remove']
);

// Генерация для DTO
const dtoDocstring = await docstringService.generateDTODocstring(
  'CreateUserDto',
  { name: 'string', email: 'string', age: 'number' }
);
```

## AI-оптимизация кода

### Метрики качества

#### Цикломатическая сложность

- **1-5**: Отличная сложность
- **6-10**: Хорошая сложность
- **11-15**: Средняя сложность
- **16-20**: Высокая сложность
- **>20**: Критическая сложность

#### Индекс поддерживаемости

- **80-100**: Отличная поддерживаемость
- **65-79**: Хорошая поддерживаемость
- **50-64**: Средняя поддерживаемость
- **<50**: Плохая поддерживаемость

#### Оценка производительности

- **90-100**: Отличная производительность
- **80-89**: Хорошая производительность
- **70-79**: Средняя производительность
- **<70**: Плохая производительность

### Типы оптимизации

#### Производительность

- Замена `forEach` на `for...of`
- Оптимизация алгоритмов
- Кэширование результатов
- Ленивая загрузка

#### Безопасность

- Удаление `eval`
- Замена `innerHTML` на `textContent`
- Валидация входных данных
- Безопасные API вызовы

#### Читаемость

- Разбиение сложных функций
- Добавление комментариев
- Упрощение логики
- Улучшение именования

## Интеграция с CI/CD

### GitHub Actions

```yaml
name: AI Code Analysis

on: [push, pull_request]

jobs:
  ai-analysis:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: AI Code Review
        run: |
          npm run ai:analyze
          npm run ai:optimize
          npm run ai:document
```

### Quality Gates

```yaml
# Проверка качества кода
- name: Quality Check
  run: |
    npm run quality:check
    if [ $? -ne 0 ]; then
      echo "Quality check failed"
      exit 1
    fi
```

## Метрики качества

### Текущие показатели

- **AI-подсказки**: 100% покрытие (VSCode + расширения)
- **Анализ коммитов**: Автоматический для всех коммитов
- **Генерация docstrings**: 4 стиля + NestJS специализация
- **Оптимизация кода**: 6 типов оптимизации + метрики
- **Интеграция с CI/CD**: Автоматические проверки

### Целевые показатели

- **100% покрытие** AI-подсказками
- **0 критических проблем** в коммитах
- **100% документация** для всех публичных API
- **>80% качество** по всем метрикам
- **Автоматическая оптимизация** проблемного кода

## Troubleshooting

### Частые проблемы

1. **Copilot не работает**:
   - Проверьте авторизацию GitHub
   - Убедитесь в активной подписке
   - Перезапустите VSCode

2. **AI-анализ коммитов не запускается**:
   - Проверьте права на .husky директорию
   - Убедитесь в корректности скриптов
   - Проверьте зависимости

3. **Генерация docstrings не работает**:
   - Проверьте входные параметры
   - Убедитесь в корректности шаблонов
   - Проверьте логи сервиса

### Логи

- **AI-анализ**: `npm run ai:analyze`
- **Оптимизация**: `npm run ai:optimize`
- **Документация**: `npm run ai:document`
- **Качество**: `npm run quality:check`

## Следующие шаги

1. **Расширение AI-моделей**: Интеграция с GPT-4, Claude
2. **Персонализация**: Адаптация под команду
3. **Автоматизация**: Полностью автономная оптимизация
4. **Мониторинг**: Отслеживание эффективности AI

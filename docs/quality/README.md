# Система качества кода

## Обзор

Комплексная система качества кода для проекта SaleSpot BY, обеспечивающая высокие стандарты через автоматические проверки, исправления и обучение команды.

## Архитектура системы

```
📁 Система качества кода
├── 🛡️ scripts/code-captain.sh          # Основной скрипт проверки качества
├── 🚦 scripts/quality-gates.sh         # Контроль качества
├── 📜 docs/rules/code-constitution.md  # Конституция кода
├── 🤖 docs/ai/ai-guidelines.md        # Руководящие принципы ИИ
├── 🎯 .husky/pre-commit               # Pre-commit хук
└── 📊 reports/                         # Отчеты о качестве
```

## Быстрый старт

### 1. Проверка текущего статуса

```bash
cd /home/boss/Projects/dev && ./scripts/code-captain.sh
```

### 2. Автоматическое исправление проблем

```bash
cd /home/boss/Projects/dev && ./scripts/code-captain.sh --fix
```

### 3. Генерация отчета

```bash
cd /home/boss/Projects/dev && ./scripts/code-captain.sh --report
```

## Компоненты системы

### 1. Code Captain (code-captain.sh)

Основной скрипт системы, выполняющий все проверки качества кода.

**Функции:**

- ✅ Проверка типов TypeScript
- ✅ Валидация правил ESLint
- ✅ Проверка форматирования Prettier
- ✅ Выполнение тестов
- ✅ Сканирование безопасности
- ✅ Возможности автоматического исправления
- ✅ Генерация отчетов

**Использование:**

```bash
# Полная проверка
./scripts/code-captain.sh

# Автоматическое исправление
./scripts/code-captain.sh --fix

# Генерация отчета
./scripts/code-captain.sh --report

# Справка
./scripts/code-captain.sh --help
```

### 2. Quality Gates (quality-gates.sh)

Система контроля качества, блокирующая коммиты с проблемами.

**Проверки:**

- ✅ TypeScript (0 ошибок)
- ✅ ESLint (0 ошибок)
- ✅ Prettier (правильное форматирование)
- ✅ Тесты (все проходят)
- ✅ Безопасность (нет уязвимостей)
- ✅ Покрытие тестами (>= 80%)
- ✅ Размер бандла (<= 500MB)

**Использование:**

```bash
# Стандартная проверка
./scripts/quality-gates.sh

# Строгий режим
./scripts/quality-gates.sh --strict

# С отчетом
./scripts/quality-gates.sh --report

# Справка
./scripts/quality-gates.sh --help
```

## Конституция кода

### Основные принципы

1. **Строгая типизация TypeScript**
   - `strict: true` в `tsconfig.json`
   - Запрет использования `any`
   - Использование `satisfies` для проверки типов
   - `exactOptionalPropertyTypes` для опциональных полей

2. **Правила ESLint**
   - `@typescript-eslint/recommended-requiring-type-checking`
   - `prefer-nullish-coalescing` вместо `||`
   - `strict-boolean-expressions` для явных проверок
   - Сортировка импортов

3. **Валидация Zod**
   - Валидация данных во время выполнения
   - Генерация типов из схем
   - Использование `safeParse`

### Структура кода

```typescript
// 1. Встроенные модули
import { Injectable } from '@nestjs/common';

// 2. Внешние зависимости
import { z } from 'zod';

// 3. Внутренние модули
import { UserService } from './user.service';

// 4. Типы
import type { User } from './user.types';
```

## Руководящие принципы ИИ для Cursor

### Шаблон промпта

```
Вот наши принципы проекта: [вставить содержимое docs/ai/ai-guidelines.md].
Теперь, пожалуйста, помогите мне с задачей... [описать задачу]

Помните:
- Всегда используйте строгую типизацию TypeScript
- Избегайте any, используйте unknown или конкретные типы
- Следуйте правилам ESLint и Prettier
- Используйте Zod для валидации
- Правильно сортируйте импорты
```

## Git хуки

### Pre-commit хук

Автоматически запускается при каждом коммите:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🛡️ Code Captain проверяет коммит..."

# Запуск системы Code Captain
if ./scripts/code-captain.sh; then
  echo "✅ Code Captain одобрил коммит!"
  exit 0
else
  echo "❌ Code Captain заблокировал коммит из-за проблем с кодом"
  echo "💡 Используйте: ./scripts/code-captain.sh --fix для автоматического исправления"
  exit 1
fi
```

## Метрики качества

### Целевые показатели

- **Покрытие TypeScript**: 100%
- **Ошибки ESLint**: 0
- **Предупреждения ESLint**: < 10
- **Покрытие тестами**: > 80%
- **Уязвимости безопасности**: 0
- **Размер бандла**: < 500MB
- **Дублирование кода**: < 3%

### Мониторинг

Система автоматически генерирует отчеты в папке `reports/`:

- `code-quality-YYYYMMDD-HHMMSS.md`
- `auto-fix-YYYYMMDD-HHMMSS.md`
- `quality-gates-YYYYMMDD-HHMMSS.md`

## Установка и настройка

### 1. Установка зависимостей

```bash
cd /home/boss/Projects/dev

# Установка jscodeshift для codemods
pnpm add -g jscodeshift

# Установка дополнительных инструментов
pnpm add -D eslint-plugin-complexity jscpd
```

### 2. Установка разрешений

```bash
# Сделать скрипты исполняемыми
chmod +x scripts/code-captain.sh
chmod +x scripts/codemods.sh
chmod +x scripts/auto-fix.sh
chmod +x scripts/quality-gates.sh
```

### 3. Настройка IDE

**VS Code / Cursor:**

- Установить расширения: ESLint, Prettier, TypeScript
- Включить автоматическое форматирование при сохранении
- Включить проверку типов в реальном времени

## Рабочий процесс разработки

### 1. Начало работы

```bash
# Проверка текущего статуса
./scripts/code-captain.sh

# Автоматическое исправление проблем
./scripts/code-captain.sh --fix
```

### 2. Разработка

- Следовать правилам из `docs/rules/code-constitution.md`
- Использовать руководящие принципы ИИ из `docs/ai/ai-guidelines.md`
- Регулярно запускать проверки

### 3. Перед коммитом

```bash
# Полная проверка
./scripts/quality-gates.sh

# Если есть проблемы - автоматическое исправление
./scripts/auto-fix.sh
```

### 4. Коммит

```bash
git add .
git commit -m "feat: добавить новую функцию"

# Pre-commit хук автоматически проверяет код
```

## Устранение неполадок

### Распространенные проблемы

1. **Ошибки TypeScript**

   ```bash
   # Автоматическое исправление
   ./scripts/codemods.sh --any --typing
   ```

2. **Ошибки ESLint**

   ```bash
   # Автоматическое исправление
   pnpm run lint:fix
   ```

3. **Проблемы форматирования**

   ```bash
   # Автоматическое форматирование
   pnpm run format
   ```

4. **Проблемы с импортами**
   ```bash
   # Исправление порядка импортов
   ./scripts/codemods.sh --imports
   ```

### Получение справки

```bash
# Справка для всех скриптов
./scripts/code-captain.sh --help
./scripts/codemods.sh --help
./scripts/auto-fix.sh --help
./scripts/quality-gates.sh --help
```

## Дополнительные ресурсы

- [docs/rules/code-constitution.md](./code-constitution.md) - Конституция кода
- [docs/ai/ai-guidelines.md](./ai/ai-guidelines.md) - Руководящие принципы ИИ
- [docs/roadmap.md](./docs/roadmap.md) - Roadmap проекта
- [reports/](./reports/) - Отчеты о качестве

## Заключение

Система качества кода обеспечивает:

- ✅ **Автоматическое качество** - все проверки выполняются автоматически
- ✅ **Обучение команды** - четкие правила и принципы
- ✅ **Предотвращение ошибок** - блокирует коммиты с проблемами
- ✅ **Метрики качества** - отслеживает прогресс
- ✅ **Интеграция ИИ** - принципы для Cursor и других ИИ-ассистентов

**Помните**: Чистый код - это не роскошь, а необходимость для успешных проектов! 🛡️

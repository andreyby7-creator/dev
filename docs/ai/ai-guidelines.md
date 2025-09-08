# 🤖 AI Guidelines для Cursor - SaleSpot BY

> **ВАЖНО**: Правила для AI-ассистентов, работающих с проектом SaleSpot BY.

## 🎯 Основные принципы

### 1. Строгая типизация TypeScript

- **ВСЕГДА** используй `strict: true` в `tsconfig.json`
- **ЗАПРЕЩЕНО** использовать `any` - используй `unknown` или конкретные типы
- **ОБЯЗАТЕЛЬНО** используй `satisfies` для проверки типов без потери информации
- **ТРЕБУЕТСЯ** `exactOptionalPropertyTypes` для точной работы с optional полями

### 2. ESLint правила (строгие)

- Следуй `@typescript-eslint/recommended-requiring-type-checking`
- Используй `prefer-nullish-coalescing` вместо `||`
- Применяй `strict-boolean-expressions` для явных проверок
- Сортируй импорты согласно `import/order`

### 3. Zod валидация

- Используй Zod для runtime валидации
- Генерируй типы из схем: `type MyType = z.infer<typeof MySchema>`
- Применяй `safeParse` для безопасной валидации

## 🏗️ Структура кода

### Импорты (строгий порядок)

```typescript
// 1. Built-in модули
import { Injectable } from '@nestjs/common';

// 2. External зависимости
import { z } from 'zod';

// 3. Internal модули
import { UserService } from './user.service';

// 4. Types
import type { User } from './user.types';
```

### Типизация (обязательные правила)

```typescript
// ✅ ХОРОШО
const user: User = { id: '1', name: 'John' };
const result = schema.safeParse(data);

// ❌ ПЛОХО
const user: any = { id: '1', name: 'John' };
const result = schema.parse(data); // может выбросить исключение
```

### Обработка ошибок

```typescript
// ✅ ХОРОШО
if (error instanceof z.ZodError) {
  console.error('Validation error:', error.issues);
}

// ❌ ПЛОХО
if (error.errors) {
  // может не существовать
  console.error('Validation error:', error.errors);
}
```

## 🔧 Автоматические исправления

### Типичные ошибки и их решения

1. **TS2375: Type 'string | undefined' is not assignable to type 'string'**

   ```typescript
   // ❌ Проблема
   firstName: convertNullableString(user.first_name);

   // ✅ Решение
   firstName: convertNullableString(user.first_name) ?? undefined;
   ```

2. **Unexpected nullable string value in conditional**

   ```typescript
   // ❌ Проблема
   if (value || defaultValue) { ... }

   // ✅ Решение
   if (value ?? defaultValue) { ... }
   ```

3. **Zod enum optional**

   ```typescript
   // ❌ Проблема
   action: AuditActionSchema.optional();

   // ✅ Решение
   action: z.union([AuditActionSchema, z.undefined()]).optional();
   ```

4. **Сложность функции превышает лимит**

   ```typescript
   // ❌ Проблема
   function complexFunction() {
     // 50+ строк кода
   }

   // ✅ Решение
   function simpleFunction() {
     return processData(validateInput(getInput()));
   }
   ```

5. **Использование any**

   ```typescript
   // ❌ Проблема
   const data: any = getData();

   // ✅ Решение
   const data: unknown = getData();
   const validatedData = schema.safeParse(data);
   ```

6. **Дублирование кода**

   ```typescript
   // ❌ Проблема
   const user1 = { id: 1, name: 'John' };
   const user2 = { id: 2, name: 'Jane' };

   // ✅ Решение
   const createUser = (id: number, name: string) => ({ id, name });
   const user1 = createUser(1, 'John');
   const user2 = createUser(2, 'Jane');
   ```

## 🚀 Команды для проверки

```bash
# Полная проверка
pnpm run type-check && pnpm run lint

# Только TypeScript
pnpm run type-check

# Только ESLint с автоисправлением
pnpm run lint:fix

# Система "Капитан Чистого Кода"
./scripts/code-captain.sh

# Автоматическое исправление
./scripts/code-captain.sh --fix

# Генерация отчета
./scripts/code-captain.sh --report
```

## 🎯 Приоритеты исправления

1. **TypeScript ошибки** - исправляй первыми
2. **ESLint ошибки** - исправляй вторыми
3. **ESLint предупреждения** - исправляй последними

## 📚 Документация

- Всегда добавляй JSDoc для сложных функций
- Используй типизированные интерфейсы вместо any
- Документируй бизнес-логику в комментариях

## 🤖 AI-подсказки для Cursor

### Промпт для начала работы

```
Вот guidelines нашего проекта: [вставь сюда содержимое ai-guidelines.md].
Теперь, пожалуйста, помоги мне с задачей... [опиши задачу]

Помни:
- Всегда используй строгую типизацию TypeScript
- Избегай any, используй unknown или конкретные типы
- Следуй правилам ESLint и Prettier
- Используй Zod для валидации
- Сортируй импорты правильно
```

### Автоматические проверки

- Перед каждым коммитом запускай `./scripts/code-captain.sh`
- При ошибках используй `./scripts/code-captain.sh --fix`
- Генерируй отчеты с `./scripts/code-captain.sh --report`

## 🔒 Quality Gates

Система "Капитан Чистого Кода" блокирует коммиты при:

- TypeScript ошибках
- ESLint ошибках
- Проблемах с форматированием
- Проваленных тестах
- Уязвимостях в зависимостях

## 📊 Метрики качества

- TypeScript coverage: 100%
- ESLint errors: 0
- ESLint warnings: < 10
- Test coverage: > 80%
- Security vulnerabilities: 0

## 🎯 Рекомендации для AI

### При работе с кодом:

1. **Анализируй типы** - всегда проверяй типизацию
2. **Валидируй данные** - используй Zod для runtime валидации
3. **Следуй принципам** - DRY, KISS, SOLID
4. **Документируй** - добавляй JSDoc для сложных функций
5. **Тестируй** - пиши тесты для критической логики

### При исправлении ошибок:

1. **Сначала TypeScript** - исправляй ошибки типизации
2. **Потом ESLint** - исправляй проблемы линтера
3. **В конце форматирование** - применяй Prettier

### При создании новых файлов:

1. **Следуй структуре** - используй правильную организацию файлов
2. **Импортируй правильно** - сортируй импорты по порядку
3. **Типизируй строго** - избегай any, используй конкретные типы
4. **Валидируй входные данные** - используй Zod схемы

---

**Помни**: Чистый код - это не роскошь, это необходимость для успешного проекта! 🛡️

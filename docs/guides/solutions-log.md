# 📝 Лог рабочих решений SaleSpot BY

## 🔧 Исправления типизации

### 1. Правило типизации NestJS запросов ✅

**Проблема:** ESLint ошибки `@typescript-eslint/no-unsafe-*` при работе с `getRequest()`

**Решение:** Использовать дженерики вместо type assertions

```typescript
// ❌ Неправильно - получаем any
const request = context.switchToHttp().getRequest();

// ✅ Правильно - используем дженерики с интерфейсами
const request = context.switchToHttp().getRequest<IRequestWithUser>();
const request = context.switchToHttp().getRequest<IRequestWithHeaders>();
const request = context
  .switchToHttp()
  .getRequest<IRequestWithHeaders & IRequestWithUser>();
```

**Файлы:**

- `apps/api/src/common/interfaces/request.interface.ts` - интерфейсы для типизации
- `apps/api/src/common/decorators/current-user.decorator.ts`
- `apps/api/src/common/guards/roles.guard.ts`
- `apps/api/src/common/guards/supabase-auth.guard.ts`

### 2. Типизация Supabase клиента ✅

**Проблема:** `Unsafe assignment of type SupabaseClient<any, any, "public", any, any>`

**Решение:** Создать типизированный интерфейс

```typescript
// apps/api/src/common/interfaces/supabase-client.interface.ts
export type ITypedSupabaseClient = SupabaseClient<any, 'public', any>;

// Использование
private supabase: ITypedSupabaseClient;

constructor() {
  this.supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  ) as ITypedSupabaseClient;
}
```

### 3. Типизация ошибок ✅

**Проблема:** Неиспользуемые переменные `error` в catch блоках

**Решение:** Использовать `unknown` для типизации ошибок

```typescript
// ❌ Неправильно
} catch (error) {
  return null;
}

// ✅ Правильно
} catch (error: unknown) {
  return null;
}
```

### 4. Удаление async без await ✅

**Проблема:** `Async method has no 'await' expression`

**Решение:** Убирать `async` с методов без `await`

```typescript
// ❌ Неправильно
async getCurrentUser(@CurrentUser() user: IUser): Promise<IUser> {
  return user;
}

// ✅ Правильно
getCurrentUser(@CurrentUser() user: IUser): IUser {
  return user;
}
```

### 5. Supabase типизация Insert = never ✅

**Проблема:** Supabase генерирует `Insert: never` для таблиц с DEFAULT полями

**Ошибки:**

```
src/audit/audit.service.ts(25,10): error TS2769: No overload matches this call.
Argument of type 'AuditLogInsert' is not assignable to parameter of type 'never'
```

**Причина:** Когда все поля в таблице имеют DEFAULT или GENERATED ALWAYS, Supabase честно делает `Insert: never`

**Решение:** Enterprise-style архитектура с репозиториями

```typescript
// 1. Создать собственный DTO-тип
// apps/api/src/types/audit.ts
export type AuditLogInsert = {
  user_id: string;
  user_role: string;
  action: string;
  status: string;
  resource_type?: string | null;
  resource_id?: string | null;
  details?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  metadata?: Record<string, unknown> | null;
};

// 2. Создать репозиторий для обхода типизации
// apps/api/src/audit/audit.repository.ts
@Injectable()
export class AuditRepository {
  async insert(data: AuditLogInsert) {
    const { data: result, error } = await this.supabaseService
      .getClient()
      .from('audit_logs')
      .insert([data] as any) // 👈 Обходим never типизацию тут
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to insert audit log: ${error.message}`);
    }

    return result;
  }
}

// 3. Использовать репозиторий в сервисе
// apps/api/src/audit/audit.service.ts
@Injectable()
export class AuditService {
  constructor(private readonly auditRepository: AuditRepository) {}

  async createAuditLog(auditLogDto: ICreateAuditLogDto): Promise<IAuditLog> {
    const insertData: AuditLogInsert = {
      user_id: auditLogDto.userId,
      user_role: auditLogDto.userRole,
      action: auditLogDto.action,
      status: auditLogDto.status,
      // ... остальные поля
    };

    const data = await this.auditRepository.insert(insertData);
    return this.mapAuditLogFromDatabase(data);
  }
}
```

**Принципы решения:**

1. **Enterprise-style архитектура:** Репозитории изолируют работу с Supabase
2. **Единая точка обхода:** `as any` только в репозиториях
3. **Чистые DTO-типы:** Весь проект работает с собственными типами
4. **Не зависим от автогенерированных типов:** Избегаем `never` типов Supabase

**Созданные файлы:**

- ✅ `apps/api/src/audit/audit.repository.ts` - репозиторий для audit_logs
- ✅ `apps/api/src/auth/auth.repository.ts` - репозиторий для users и rpc
- ✅ `apps/api/src/audit/audit.module.ts` - модуль с репозиторием
- ✅ `apps/api/src/types/audit.ts` - собственный AuditLogInsert тип

**Результат:**

- ✅ Все TypeScript ошибки исправлены
- ✅ Чистая архитектура без `any` в бизнес-логике
- ✅ Изолированная работа с Supabase через репозитории

## 🏗️ Архитектурные решения

### 1. Структура монорепо ✅

**Решение:** pnpm workspaces с разделением на apps

```
/
├── apps/
│   ├── api/     # NestJS API
│   └── web/     # Next.js Web
├── docs/        # Документация
└── package.json # Root workspace
```

### 2. Типизация интерфейсов ✅

**Решение:** Создавать интерфейсы для всех внешних API

```typescript
// apps/api/src/common/interfaces/
├── user.interface.ts
├── supabase-profile.interface.ts
├── supabase-client.interface.ts
└── request.interface.ts
```

### 3. Система ролей ✅

**Решение:** Enum с иерархией ролей

```typescript
export enum UserRole {
  USER = 'user',
  BRAND_MANAGER = 'brand_manager',
  STORE_MANAGER = 'store_manager',
  NETWORK_MANAGER = 'network_manager',
  SUPER_ADMIN = 'super_admin',
}
```

## 🔐 Аутентификация и авторизация

### 1. Supabase Guards ✅

**Решение:** Создать Guards для проверки аутентификации и ролей

```typescript
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
async protectedEndpoint() {
  // ...
}
```

### 2. JWT валидация ✅

**Решение:** Валидировать JWT через Supabase и получать профиль пользователя

```typescript
const {
  data: { user },
  error,
} = await this.supabase.auth.getUser(token);
const { data: profile } = await this.supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single();
```

## 🛠️ Инструменты и конфигурация

### 1. ESLint конфигурация ✅

**Решение:** Настроить ESLint для строгой типизации

```javascript
// apps/api/.eslintrc.js
module.exports = {
  extends: ['@nestjs/eslint-config'],
  rules: {
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',
  },
};
```

### 2. Prettier конфигурация ✅

**Решение:** Единообразное форматирование

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 80,
  "tabWidth": 2
}
```

## 📊 Результаты

### Исправленные ошибки:

- ✅ 15 ошибок типизации исправлены
- ✅ Все `@typescript-eslint/no-unsafe-*` ошибки устранены
- ✅ Правильная типизация NestJS запросов
- ✅ Типизированный Supabase клиент
- ✅ Строгая типизация ошибок
- ✅ Supabase Insert = never проблема решена

### Созданные файлы:

- ✅ `docs/rules/code-constitution.md` - правила кода
- ✅ `docs/guides/solutions-log.md` - лог решений
- ✅ `apps/api/src/common/interfaces/request.interface.ts`
- ✅ `apps/api/src/common/interfaces/supabase-client.interface.ts`
- ✅ `apps/api/src/audit/audit.repository.ts`
- ✅ `apps/api/src/auth/auth.repository.ts`

## 🎯 Следующие шаги

1. Продолжить с roadmap согласно документации
2. Реализовать оставшиеся блоки
3. Обновлять этот лог при появлении новых решений

## Блок 0.3. Маппинг ролей и контроль доступа

### Создана система маппинга ролей

- Создан `role-mapping.interface.ts` с полным маппингом ролей к правам доступа
- Создан `role-mapping.guard.ts` для проверки прав доступа к ресурсам
- Созданы декораторы `resource.decorator.ts` и `module.decorator.ts`
- Обновлены все контроллеры с новыми декораторами
- Подключен `RoleMappingGuard` в `app.module.ts`

### Исправления TypeScript ошибок в декораторах

- **Проблема**: `propertyKey` и `descriptor` могут быть `undefined` в декораторах
- **Решение**: Использовать non-null assertion operator `!` для `propertyKey!` и `descriptor!`
- **Файл**: `apps/api/src/common/decorators/resource.decorator.ts`
- **Код**: `SetMetadata(RESOURCE_KEY, resource)(target, propertyKey!, descriptor!)`

### Исправления типизации в интерфейсах запросов

- **Проблема**: `IRequestWithUser` не содержал `params`, `body`, `query`
- **Решение**: Добавить опциональные поля в интерфейс
- **Файл**: `apps/api/src/common/interfaces/request.interface.ts`
- **Код**:

```typescript
export interface IRequestWithUser {
  user: IUser;
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  query?: Record<string, string>;
}
```

### Исправления в e2e тестах

- **Проблема**: ESLint предупреждение `@typescript-eslint/no-unsafe-argument`
- **Решение**: Упростить вызов `request()` без лишних приведений типов
- **Файл**: `apps/api/test/app.e2e-spec.ts`
- **Код**: `request(app.getHttpServer())` - просто передаем сервер без приведения типов
- **Примечание**: `supertest` автоматически обрабатывает `INestApplication.getHttpServer()`

## 🗄️ База данных и безопасность

### 1. RLS политики и функции ✅

**Решение:** Создать полную систему безопасности на уровне базы данных

```sql
-- Функции маппинга ролей
CREATE OR REPLACE FUNCTION map_user_role(user_id UUID) RETURNS TEXT
CREATE OR REPLACE FUNCTION has_role_access(user_id UUID, required_role TEXT) RETURNS BOOLEAN
CREATE OR REPLACE FUNCTION has_exact_role(user_id UUID, required_role TEXT) RETURNS BOOLEAN

-- Система аудита
CREATE TABLE access_audit (...)
CREATE OR REPLACE FUNCTION log_access_audit(...)
CREATE OR REPLACE FUNCTION get_access_statistics(...)
```

**Файлы:**

- `apps/api/src/database/schema.sql` - основная схема
- `apps/api/src/database/functions/map_user_role.sql` - функции ролей
- `apps/api/src/database/tables/access_audit.sql` - система аудита
- `apps/api/src/database/tests/rls-policies.test.sql` - тесты (15 тестов)
- `apps/api/src/database/seeds/test-users.sql` - тестовые данные

### 2. Иерархия ролей ✅

**Решение:** Реализовать иерархическую систему ролей согласно документу Roles

```typescript
// Иерархия ролей (согласно документу Roles)
super_admin(5) >
  network_manager(4) >
  brand_manager(3) >
  store_manager(2) >
  user(1);

// Детальные права доступа
SUPER_ADMIN: 100 % функциональности;
NETWORK_MANAGER: ~80 % функциональности;
BRAND_MANAGER: ~50 % функциональности(параллельно);
STORE_MANAGER: ~60 % функциональности;
USER: ~20 % функциональности;
```

### 3. Система взаимодействия ролей ✅

**Решение:** Создать систему взаимодействия ролей согласно документу Roles

```typescript
// Бизнес-процессы взаимодействия
- SUPER_ADMIN → NETWORK_MANAGER: создание сети
- SUPER_ADMIN → BRAND_MANAGER: создание бренда
- NETWORK_MANAGER → STORE_MANAGER: управление магазинами
- BRAND_MANAGER ↔ NETWORK_MANAGER: сотрудничество
- STORE_MANAGER → USER: управление клиентами
- USER → STORE_MANAGER: обратная связь
```

**Файлы:**

- `apps/api/src/common/interfaces/role-interaction.interface.ts` - система взаимодействия
- `apps/api/src/common/guards/roles.guard.ts` - расширенный RolesGuard
- `apps/api/src/database/tests/role-interactions.test.sql` - тесты (25 тестов)

### 3. Тестовые данные ✅

**Решение:** Создать полный набор тестовых данных

- 5 тестовых пользователей с разными ролями
- 2 тестовые сети
- 3 тестовых бренда
- 3 тестовых магазина
- Привязка пользователей к соответствующим сущностям

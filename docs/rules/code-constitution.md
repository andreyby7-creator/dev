# 🛡️ Code Constitution - SaleSpot BY

> **ВНИМАНИЕ**: This document is mandatory for all developers and AI assistants working on the SaleSpot BY project.

## 📋 Core Principles

### 1. Strict TypeScript Typing

- **ALWAYS** use `strict: true` in `tsconfig.json`
- **FORBIDDEN** to use `any` - use `unknown` or specific types
- **REQUIRED** to use `satisfies` for type checking without losing information
- **REQUIRED** `exactOptionalPropertyTypes` for precise optional field handling

### 2. ESLint Rules (Strict)

- Follow `@typescript-eslint/recommended-requiring-type-checking`
- Use `prefer-nullish-coalescing` instead of `||`
- Apply `strict-boolean-expressions` for explicit checks
- Sort imports according to `import/order`

### 3. Zod Validation

- Use Zod for runtime validation
- Generate types from schemas: `type MyType = z.infer<typeof MySchema>`
- Apply `safeParse` for safe validation

## 🏗️ Code Structure

### Imports (Strict Order)

```typescript
// 1. Built-in modules
import { Injectable } from '@nestjs/common';

// 2. External dependencies
import { z } from 'zod';

// 3. Internal modules
import { UserService } from './user.service';

// 4. Types
import type { User } from './user.types';
```

### Typing (Mandatory Rules)

```typescript
// ✅ GOOD
const user: User = { id: '1', name: 'John' };
const result = schema.safeParse(data);

// ❌ BAD
const user: any = { id: '1', name: 'John' };
const result = schema.parse(data); // may throw exception
```

### Error Handling

```typescript
// ✅ GOOD
if (error instanceof z.ZodError) {
  console.error('Validation error:', error.issues);
}

// ❌ BAD
if (error.errors) {
  // may not exist
  console.error('Validation error:', error.errors);
}
```

## 🔧 Automatic Fixes

### Common Errors and Solutions

1. **TS2375: Type 'string | undefined' is not assignable to type 'string'**

   ```typescript
   // ❌ Problem
   firstName: convertNullableString(user.first_name);

   // ✅ Solution
   firstName: convertNullableString(user.first_name) ?? undefined;
   ```

2. **Unexpected nullable string value in conditional**

   ```typescript
   // ❌ Problem
   if (value || defaultValue) { ... }

   // ✅ Solution
   if (value ?? defaultValue) { ... }
   ```

3. **Zod enum optional**

   ```typescript
   // ❌ Problem
   action: AuditActionSchema.optional();

   // ✅ Solution
   action: z.union([AuditActionSchema, z.undefined()]).optional();
   ```

4. **Function complexity exceeds limit**

   ```typescript
   // ❌ Problem
   function complexFunction() {
     // 50+ lines of code
   }

   // ✅ Solution
   function simpleFunction() {
     return processData(validateInput(getInput()));
   }
   ```

5. **Using any**

   ```typescript
   // ❌ Problem
   const data: any = getData();

   // ✅ Solution
   const data: unknown = getData();
   const validatedData = schema.safeParse(data);
   ```

6. **Code duplication**

   ```typescript
   // ❌ Problem
   const user1 = { id: 1, name: 'John' };
   const user2 = { id: 2, name: 'Jane' };

   // ✅ Solution
   const createUser = (id: number, name: string) => ({ id, name });
   const user1 = createUser(1, 'John');
   const user2 = createUser(2, 'Jane');
   ```

## 🎯 Quality Standards

### Code Quality Metrics

- **0 TypeScript errors** - mandatory
- **0 ESLint errors** - mandatory
- **100% test coverage** - for critical modules
- **Maximum function complexity: 10**
- **Maximum 50 lines per function**
- **Maximum 4 parameters per function**

### Quality Principles

- **DRY** (Don't Repeat Yourself) - avoid duplication
- **KISS** (Keep It Simple, Stupid) - keep it simple
- **SOLID** - follow SOLID principles
- **Clean Code** - write readable and understandable code
- **Type Safety** - use strict typing

## 🔧 Technical Standards

### TypeScript

```typescript
// ✅ GOOD
interface User {
  readonly id: string;
  name: string;
  email: string;
  createdAt: Date;
}

const createUser = (data: CreateUserDto): Promise<User> => {
  // implementation
};

// ❌ BAD
const user: any = { id: 1, name: 'John' };
function processData(data) {
  /* no types */
}
```

**Forbidden:**

- `any` type (use `unknown` or specific types)
- `!` operator (use optional chaining `?.`)
- Implicit types
- `var` (use `const` or `let`)

**Required:**

- Strict typing for all functions
- Explicit return types
- Use `satisfies` for type checking
- Zod for runtime validation

### React/Next.js

```typescript
// ✅ GOOD
interface ButtonProps {
  readonly variant: 'primary' | 'secondary';
  readonly children: React.ReactNode;
  readonly onClick?: () => void;
}

const Button: React.FC<ButtonProps> = ({
  variant,
  children,
  onClick
}) => {
  return (
    <button
      className={`btn btn-${variant}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
};

// ❌ BAD
const Button = (props) => {
  return <button onClick={props.onClick}>{props.children}</button>;
};
```

**Forbidden:**

- `console.log` (use logger)
- Unused variables
- Missing types for props

## 🧹 Clean Code Standards

### Quality Check Commands

```bash
# Full quality check
pnpm run type-check && pnpm run lint

# TypeScript only
pnpm run type-check

# ESLint with auto-fix
pnpm run lint:fix

# Full quality validation
pnpm run quality:full

# Quick validation
pnpm run validate

# Fix issues
pnpm run clean-code

# Code complexity check
pnpm run quality:complexity

# Security check
pnpm run quality:security
```

### Git Hooks

All checks run automatically on commit:

- **pre-commit**: TypeScript, ESLint, Prettier, complexity, security
- **commit-msg**: Conventional commits validation
- **pre-push**: Full quality check + tests + build

### Quality Tools

#### 1. TypeScript

- **Strict typing**: `strict: true`
- **Forbidden**: `any`, `!`, implicit types
- **Required**: explicit return types, Zod validation

#### 2. ESLint

- **Strict rules**: 50+ rules for code cleanliness
- **Complexity**: maximum 10, 50 lines per function
- **Security**: forbid `eval`, `console.log`, XSS

#### 3. Prettier

- **Auto-formatting**: unified code style
- **80 characters**: maximum line length
- **2 spaces**: indentation

#### 4. Husky + lint-staged

- **Pre-commit**: automatic checks
- **Pre-push**: full validation
- **Commit-msg**: conventional commits

### Quality Metrics

| Metric            | Target | Current |
| ----------------- | ------ | ------- |
| TypeScript Errors | 0      | ✅      |
| ESLint Errors     | 0      | ✅      |
| Test Coverage     | >90%   | 📊      |
| Code Complexity   | <10    | 📊      |
| Bundle Size       | <500KB | 📊      |
| Security Issues   | 0      | 📊      |

## 🎯 Coding Rules

### NestJS (API)

- ✅ DTOs for all input data
- ✅ Validation through decorators
- ✅ Guards for endpoint protection
- ✅ API documentation through Swagger

### Next.js (Web)

- ✅ Use App Router
- ✅ Components only with TypeScript
- ✅ Forms through React Hook Form
- ✅ Sentry integration

### Supabase

- ✅ Connect only through official SDK/CLI
- ✅ Never hardcode keys - use `.env`
- ✅ Always generate types from DB schema (`supabase gen types`)
- ✅ Separate `anon` and `service_role`
- ✅ Handle Supabase client errors

## 🔹 Basic Rules

### 1. Clean Code

- ❌ Don't use `any` → replace with strict types (`unknown`, `never`, specific interfaces)
- ✅ Always specify function return types
- ✅ Use `readonly` where possible
- ✅ Generate pure and deterministic functions (no hidden side effects)
- ❌ Don't use `var`, only `const` and `let`
- ✅ Automatically organize code into modules (no "large files")
- ✅ Monitor imports: remove unused, group by meaning
- ❌ Never disable ESLint for "clean code"

### 2. Project Architecture

- ✅ Follow SOLID + DRY + KISS
- ✅ Don't duplicate logic - extract to utilities/services
- ✅ Separate layers:
  - `services/` — API/Supabase work
  - `utils/` — helpers
  - `components/` — React/UI
  - `types/` — common types
- ✅ Make functions reusable

### 3. Cleanliness and Optimization

- ✅ Format code (Prettier + ESLint)
- ✅ Minimize dependencies - install only needed ones
- ✅ Check for dead code and remove it
- ✅ Monitor query performance (`select *` forbidden → only needed fields)
- ✅ Use `async/await` correctly (don't put `async` without `await`)

### 4. Workflow

- ✅ All commands - strictly in format: `cd /home/boss/Projects/dev <command>`
- ✅ Create files only through `edit_file`
- ✅ Update dependencies carefully, without breaking project
- ✅ Never delete functions → only fix and improve
- ✅ Document complex logic

### 5. Typing

- ✅ Always use strict TypeScript typing
- ✅ Create interfaces for all external APIs
- ✅ Use type assertions only when necessary
- ✅ Use common types in `apps/api/src/common/interfaces/`

### 6. Error Handling

- ✅ All errors through `try/catch`
- ✅ Log errors (e.g., BetterStack)
- ✅ Don't ignore variables and promises

### 7. Authentication and Authorization

- ✅ Use Supabase for auth
- ✅ Implement RBAC: `SUPER_ADMIN`, `NETWORK_MANAGER`, `STORE_MANAGER`, `BRAND_MANAGER`, `USER`
- ✅ Create Guards for role and authentication checks

### 8. Security

- ❌ Don't hardcode API keys
- ✅ Validate all input data
- ✅ Monitor security configurations

## 🔹 Forbidden

- ❌ Disable ESLint rules without justification
- ❌ Use `any` (except in extreme cases)
- ❌ Hardcode keys/configs
- ❌ Create unsafe code
- ❌ Ignore TypeScript errors

## 🎯 General Cursor Rules

📝 Communicate in Russian.
📌 Always keep our plan and progress in focus (record what's done, where we stopped).
❌ Don't delete anything without direct request.
🔄 Fix errors in project:
functions not to delete, but to fix;
what can be improved - improve;
when possible, turn files into modules.
🐧 Always remember that work is done in Linux FS (WSL2).

## 🖥️ Working with Code

✨ Write clean, optimized and minimized code.
📐 Maintain order in code (structure, imports, comments).
🗂️ Use edit_file for creating files.
🛠️ Create necessary scripts and modules for fast and reliable work.
📚 Study documentation and update environment to latest versions (without conflicts and destruction).
🔧 Check and fix all errors.

## ⚡ Commands and Terminal

📍 Commands always only in format:
cd /home/boss/projects/dev <command>
🚫 Cursor doesn't execute commands itself, only gives them to me.
✅ Immediately understand that work is done in WSL2 terminal.

## 🧪 Testing and Quality

🧩 Implement unit tests and integration tests.
📊 Monitor test coverage.
📏 Configure linters (ESLint, Prettier).
⚙ Automate checks (CI/CD - at least tests and linting).

## 📦 Deploy and Support

🚀 Prepare deploy scripts (Supabase, Vercel, Railway, server).
🗄️ Manage DB migrations (no manual fixes).
📡 Configure logs and monitoring (Sentry or similar).
🌍 Consider localization: currencies, dates, formats for CIS markets (BY, RU, KZ, etc.).

## 📊 Fix Priorities

1. **TypeScript errors** - fix first
2. **ESLint errors** - fix second
3. **ESLint warnings** - fix last

## 📚 Additional Documentation

- `docs/quality/` - Additional quality standards
- `docs/api/` - API documentation
- `docs/security/` - Security rules

# 📊 Quality Scripts

Скрипты для контроля качества кода и автоматических проверок.

## Скрипты

### 🛡️ code-captain.sh

Главный скрипт системы "Капитан Чистого Кода" для проверки качества.

**Использование:**

```bash
./scripts/quality/code-captain.sh
./scripts/quality/code-captain.sh --fix
./scripts/quality/code-captain.sh --report
```

### 🚦 quality-gates.sh

Система Quality Gates для блокировки коммитов при проблемах.

**Использование:**

```bash
./scripts/quality/quality-gates.sh
./scripts/quality/quality-gates.sh --strict
./scripts/quality/quality-gates.sh --report
```

### 🔍 check-errors.sh

Проверка TypeScript и ESLint ошибок.

**Использование:**

```bash
./scripts/quality/check-errors.sh
```

### 📋 check-quality.sh

Комплексная проверка качества проекта.

**Использование:**

```bash
./scripts/quality/check-quality.sh
```

### 🧹 clean-code.sh

Проверка соответствия стандартам чистого кода.

**Использование:**

```bash
./scripts/quality/clean-code.sh
```

### 🔧 fix-eslint-warnings.sh

Исправление ESLint предупреждений.

**Использование:**

```bash
./scripts/quality/fix-eslint-warnings.sh
```

### 📋 quality-check.sh

Дополнительная проверка качества проекта.

**Использование:**

```bash
./scripts/quality/quality-check.sh
```

## Быстрый старт

```bash
# Полная проверка качества
./scripts/quality/code-captain.sh

# Проверка ошибок
./scripts/quality/check-errors.sh

# Quality Gates
./scripts/quality/quality-gates.sh
```

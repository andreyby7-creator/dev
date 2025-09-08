# Линтеры и форматирование - Руководство

## Обзор

Данное руководство описывает настроенную систему линтеров и форматирования для проекта SaleSpot BY, включающую ESLint, Prettier, TypeScript, Husky и автоматические проверки качества.

## Основные компоненты

### 1. ESLint

**Описание**: Основной линтер для JavaScript и TypeScript с современной flat конфигурацией.

**Конфигурация**: `eslint.config.js`

**Основные правила**:

- **TypeScript**: Строгая типизация, no-explicit-any, explicit return types
- **React**: Hooks rules, accessibility (jsx-a11y), prop-types
- **Import**: Порядок импортов, no-duplicates, no-unresolved
- **General**: no-console, no-debugger, prefer-const, object-shorthand

**Поддерживаемые файлы**:

- `**/*.{ts,tsx}` - TypeScript и React файлы
- `**/*.{js,jsx}` - JavaScript файлы

### 2. Prettier

**Описание**: Автоматический форматтер кода для единообразного стиля.

**Конфигурация**: `.prettierrc`

**Настройки**:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

**Поддерживаемые файлы**:

- `**/*.{ts,tsx,js,jsx,json,md}`

### 3. TypeScript

**Описание**: Строгая типизация с полным набором strict правил.

**Конфигурация**: `tsconfig.json`

**Основные настройки**:

```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "strictFunctionTypes": true,
  "strictBindCallApply": true,
  "strictPropertyInitialization": true,
  "exactOptionalPropertyTypes": true,
  "noUncheckedIndexedAccess": true
}
```

**Поддерживаемые файлы**:

- `apps/**/*` - все приложения
- `packages/**/*` - все пакеты

### 4. EditorConfig

**Описание**: Единообразные настройки редактора для всех разработчиков.

**Конфигурация**: `.editorconfig`

**Основные настройки**:

```ini
root = true

[*]
charset = utf-8
indent_style = space
indent_size = 2
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
```

**Поддерживаемые файлы**:

- Все файлы проекта с соответствующими расширениями

### 5. Husky

**Описание**: Git hooks для автоматической проверки качества кода.

**Конфигурация**: `.husky/`

**Настроенные хуки**:

- **pre-commit**: `./scripts/quality/code-captain.sh`
- **pre-push**: Проверка перед push
- **commit-msg**: Проверка сообщений коммитов

### 6. Lint-staged

**Описание**: Автоматические проверки только для staged файлов.

**Конфигурация**: `package.json`

**Настройки**:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["tsc --noEmit", "eslint --fix", "prettier --write"],
    "*.{js,jsx,json,md}": ["prettier --write"]
  }
}
```

### 7. Commitizen

**Описание**: Интерактивное создание conventional commits.

**Конфигурация**: `package.json`

**Настройки**:

```json
{
  "devDependencies": {
    "commitizen": "4.3.0",
    "cz-conventional-changelog": "^3.3.0"
  }
}
```

## Автоматические проверки качества

### Code Captain Script

**Файл**: `scripts/quality/code-captain.sh`

**Функциональность**:

- Проверка TypeScript типов
- Проверка ESLint правил
- Проверка Prettier форматирования
- Красивый вывод с цветами
- Автоматические исправления

**Запуск**:

```bash
# Полная проверка
./scripts/quality/code-captain.sh

# С автоматическими исправлениями
./scripts/quality/code-captain.sh --fix

# С отчетом
./scripts/quality/code-captain.sh --report
```

### Скрипты package.json

**Основные команды**:

```bash
# Линтинг
pnpm run lint          # Проверка ESLint
pnpm run lint:fix      # Автоматическое исправление ESLint
pnpm run lint:watch    # Линтинг в режиме watch

# Форматирование
pnpm run format        # Автоматическое форматирование Prettier
pnpm run format:check  # Проверка форматирования

# TypeScript
pnpm run type-check    # Проверка типов
pnpm run type-check:watch # Проверка типов в режиме watch

# Комплексные проверки
pnpm run validate      # TypeScript + ESLint + Prettier
pnpm run validate:fix  # С автоматическими исправлениями
pnpm run quality       # Валидация + тесты
pnpm run clean-code    # Полная очистка кода
```

## Интеграция с редакторами

### VSCode

**Рекомендуемые расширения**:

- ESLint
- Prettier - Code formatter
- TypeScript Importer
- EditorConfig for VS Code

**Настройки workspace**:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

### WebStorm/IntelliJ

**Настройки**:

- Enable ESLint
- Enable Prettier
- Format on Save
- Auto Import

## Workflow разработки

### 1. Создание коммита

```bash
# Автоматический conventional commit
pnpm run commit

# Или через git
git add .
git commit -m "feat: add new feature"
```

### 2. Автоматические проверки

1. **pre-commit hook** запускает code-captain.sh
2. **Lint-staged** проверяет staged файлы
3. **TypeScript** проверяет типы
4. **ESLint** проверяет правила
5. **Prettier** форматирует код

### 3. Push в репозиторий

1. **pre-push hook** проверяет качество
2. **commit-msg hook** проверяет сообщение
3. Код автоматически форматируется

## Troubleshooting

### Частые проблемы

1. **Конфликты ESLint и Prettier**:
   - Убедитесь, что eslint-config-prettier подключен
   - Проверьте порядок применения в lint-staged

2. **TypeScript ошибки**:
   - Запустите `pnpm run type-check`
   - Проверьте tsconfig.json настройки

3. **ESLint ошибки**:
   - Запустите `pnpm run lint:fix`
   - Проверьте eslint.config.js

4. **Prettier проблемы**:
   - Запустите `pnpm run format`
   - Проверьте .prettierrc настройки

### Логи

- **ESLint**: `npm run lint`
- **TypeScript**: `npm run type-check`
- **Prettier**: `npm run format:check`
- **Code Captain**: `./scripts/quality/code-captain.sh`

## Метрики качества

### Текущие показатели

- **Покрытие линтерами**: 100%
- **TypeScript ошибки**: 0
- **ESLint ошибки**: 0
- **ESLint предупреждения**: 0
- **Prettier форматирование**: 100% соответствие

### Целевые показатели

- **0 ошибок** TypeScript и ESLint
- **100% соответствие** Prettier
- **Автоматическое форматирование** при сохранении
- **Pre-commit проверки** для всех коммитов

## Следующие шаги

1. **Мониторинг качества** в production
2. **Оптимизация правил** ESLint на основе реального использования
3. **Расширение автоматических проверок** качества
4. **Интеграция** с внешними системами анализа кода

## Заключение

Система линтеров и форматирования полностью настроена и работает корректно. Все компоненты интегрированы и обеспечивают высокое качество кода через автоматические проверки и форматирование.

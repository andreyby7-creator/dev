# Linters and Formatting Guide

## Overview

Configured system of linters and formatting for SaleSpot BY project, including ESLint, Prettier, TypeScript, Husky, and automated quality checks.

## Main Components

### 1. ESLint

**Description**: Main linter for JavaScript and TypeScript with modern flat configuration.

**Configuration**: `eslint.config.js`

**Main Rules**:

- **TypeScript**: Strict typing, no-explicit-any, explicit return types
- **React**: Hooks rules, accessibility (jsx-a11y), prop-types
- **Import**: Import order, no-duplicates, no-unresolved
- **General**: no-console, no-debugger, prefer-const, object-shorthand

**Supported Files**:

- `**/*.{ts,tsx}` - TypeScript and React files
- `**/*.{js,jsx}` - JavaScript files

### 2. Prettier

**Description**: Automatic code formatter for consistent style.

**Configuration**: `.prettierrc`

**Settings**:

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

**Supported Files**:

- `**/*.{ts,tsx,js,jsx,json,md}`

### 3. TypeScript

**Description**: Strict typing with full set of strict rules.

**Configuration**: `tsconfig.json`

**Main Settings**:

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

**Supported Files**:

- `apps/**/*` - all applications
- `packages/**/*` - all packages

### 4. EditorConfig

**Description**: Consistent editor settings for all developers.

**Configuration**: `.editorconfig`

**Main Settings**:

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

**Supported Files**:

- All project files with corresponding extensions

### 5. Husky

**Description**: Git hooks for automatic code quality checks.

**Configuration**: `.husky/`

**Configured Hooks**:

- **pre-commit**: `./scripts/quality/code-captain.sh`
- **pre-push**: Pre-push checks
- **commit-msg**: Commit message validation

### 6. Lint-staged

**Description**: Automatic checks only for staged files.

**Configuration**: `package.json`

**Settings**:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["tsc --noEmit", "eslint --fix", "prettier --write"],
    "*.{js,jsx,json,md}": ["prettier --write"]
  }
}
```

### 7. Commitizen

**Description**: Interactive conventional commits creation.

**Configuration**: `package.json`

**Settings**:

```json
{
  "devDependencies": {
    "commitizen": "4.3.0",
    "cz-conventional-changelog": "^3.3.0"
  }
}
```

## Automated Quality Checks

### Code Captain Script

**File**: `scripts/quality/code-captain.sh`

**Functionality**:

- TypeScript type checking
- ESLint rules validation
- Prettier formatting check
- Beautiful output with colors
- Automatic fixes

**Usage**:

```bash
# Full check
./scripts/quality/code-captain.sh

# With automatic fixes
./scripts/quality/code-captain.sh --fix

# With report
./scripts/quality/code-captain.sh --report
```

### Package.json Scripts

**Main Commands**:

```bash
# Linting
pnpm run lint          # ESLint check
pnpm run lint:fix      # Auto-fix ESLint
pnpm run lint:watch    # Linting in watch mode

# Formatting
pnpm run format        # Auto-format Prettier
pnpm run format:check  # Format check

# TypeScript
pnpm run type-check    # Type check
pnpm run type-check:watch # Type check in watch mode

# Complex checks
pnpm run validate      # TypeScript + ESLint + Prettier
pnpm run validate:fix  # With automatic fixes
pnpm run quality       # Validation + tests
pnpm run clean-code    # Full code cleanup
```

## IDE Integration

### VSCode

**Recommended Extensions**:

- ESLint
- Prettier - Code formatter
- TypeScript Importer
- EditorConfig for VS Code

**Workspace Settings**:

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

**Settings**:

- Enable ESLint
- Enable Prettier
- Format on Save
- Auto Import

## Development Workflow

### 1. Create Commit

```bash
# Automatic conventional commit
pnpm run commit

# Or via git
git add .
git commit -m "feat: add new feature"
```

### 2. Automatic Checks

1. **pre-commit hook** runs code-captain.sh
2. **Lint-staged** checks staged files
3. **TypeScript** checks types
4. **ESLint** checks rules
5. **Prettier** formats code

### 3. Push to Repository

1. **pre-push hook** checks quality
2. **commit-msg hook** validates message
3. Code automatically formatted

## Troubleshooting

### Common Issues

1. **ESLint and Prettier Conflicts**:
   - Ensure eslint-config-prettier is connected
   - Check application order in lint-staged

2. **TypeScript Errors**:
   - Run `pnpm run type-check`
   - Check tsconfig.json settings

3. **ESLint Errors**:
   - Run `pnpm run lint:fix`
   - Check eslint.config.js

4. **Prettier Issues**:
   - Run `pnpm run format`
   - Check .prettierrc settings

### Logs

- **ESLint**: `npm run lint`
- **TypeScript**: `npm run type-check`
- **Prettier**: `npm run format:check`
- **Code Captain**: `./scripts/quality/code-captain.sh`

## Quality Metrics

### Current Indicators

- **Linter Coverage**: 100%
- **TypeScript Errors**: 0
- **ESLint Errors**: 0
- **ESLint Warnings**: 0
- **Prettier Formatting**: 100% compliance

### Target Indicators

- **0 errors** TypeScript and ESLint
- **100% compliance** Prettier
- **Automatic formatting** on save
- **Pre-commit checks** for all commits

## Next Steps

1. **Quality monitoring** in production
2. **ESLint rules optimization** based on real usage
3. **Extended automatic quality checks**
4. **Integration** with external code analysis systems

## Conclusion

Linters and formatting system is fully configured and working correctly. All components are integrated and provide high code quality through automatic checks and formatting.

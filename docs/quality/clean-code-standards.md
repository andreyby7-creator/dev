# Clean Code Standards

## Principles

### 1. Minimalism

- **Less code = fewer errors**
- Each function should do one thing
- Avoid code duplication
- Use composition over inheritance

### 2. Readability

- Variable and function names should be descriptive
- Functions no more than 30 lines
- Maximum complexity: 5
- Maximum 3 parameters per function

### 3. Functional Programming

- Use pure functions
- Avoid mutations
- Prefer `map/filter/reduce` over loops
- Use function composition

## Tools

### ESLint Rules

```javascript
// Complexity
'complexity': ['error', 5],
'max-depth': ['error', 3],
'max-lines': ['error', 200],
'max-lines-per-function': ['error', 30],
'max-params': ['error', 3],
'max-statements': ['error', 15],

// Functional programming
'no-loop-func': 'error',
'no-param-reassign': 'error',
'prefer-rest-params': 'error',
'prefer-spread': 'error',

// Remove unnecessary code
'no-unreachable': 'error',
'no-unreachable-loop': 'error',
'no-constant-condition': 'error',
```

### TypeScript Rules

```json
{
  "strict": true,
  "noImplicitAny": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noImplicitReturns": true,
  "exactOptionalPropertyTypes": true
}
```

## Examples

### ✅ Good

```typescript
// Pure function
const calculateTotal = (items: Item[]): number =>
  items.reduce((sum, item) => sum + item.price, 0);

// Function composition
const processUser = pipe(validateUser, enrichUserData, saveUser);

// Typed utilities
const userData = pick(user, ['id', 'name', 'email']);
```

### ❌ Bad

```typescript
// Complex function
function processUserData(userData: any) {
  // 50+ lines of code
  if (userData && userData.name && userData.email) {
    // many nested conditions
  }
}

// Data mutation
const users = [];
for (let i = 0; i < data.length; i++) {
  users.push({ ...data[i], processed: true });
}

// Code duplication
const user1 = { id: 1, name: 'John', email: 'john@example.com' };
const user2 = { id: 2, name: 'Jane', email: 'jane@example.com' };
```

## Utilities

### Functional Utilities

```typescript
import { pipe, compose, curry, memoize } from '@/utils/type-utils';

// Composition
const processData = pipe(validateInput, transformData, saveToDatabase);

// Currying
const add = curry((a: number, b: number) => a + b);
const addFive = add(5);

// Memoization
const expensiveCalculation = memoize((input: number) => {
  // complex calculations
});
```

### Typed Utilities

```typescript
import { pick, omit, deepClone } from '@/utils/type-utils';

// Extract fields
const userSummary = pick(user, ['id', 'name']);

// Exclude fields
const publicUser = omit(user, ['password', 'secret']);

// Deep cloning
const userCopy = deepClone(user);
```

## Quality Metrics

### Target Indicators

- **Function complexity**: ≤ 5
- **Line count**: ≤ 30
- **Parameter count**: ≤ 3
- **Nesting depth**: ≤ 3
- **Type coverage**: 100%

### Check Commands

```bash
# Full quality check
pnpm run quality:full

# Complexity check
pnpm run quality:complexity

# Auto-fix
pnpm run clean-code
```

## Cursor Recommendations

### 1. Break Down Complex Functions

```typescript
// Instead of one big function
function processUser(user: User) {
  // 50+ lines
}

// Create several small ones
const validateUser = (user: User) => {
  /* 10 lines */
};
const enrichUser = (user: User) => {
  /* 10 lines */
};
const saveUser = (user: User) => {
  /* 10 lines */
};

const processUser = pipe(validateUser, enrichUser, saveUser);
```

### 2. Use Functional Approaches

```typescript
// Instead of loop
const processedUsers = users.map(user => ({
  ...user,
  processed: true,
}));

// Instead of conditions
const getStatus = (user: User) => (user.isActive ? 'active' : 'inactive');
```

### 3. Avoid any

```typescript
// Instead of any
const data: unknown = getData();
const validatedData = schema.safeParse(data);

if (validatedData.success) {
  // validatedData.data is typed
}
```

### 4. Use Composition

```typescript
// Instead of long chains
const result = pipe(getData, validateData, transformData, saveData)(input);
```

## Refactoring Process

### 1. Analysis

```bash
pnpm run quality:complexity
```

### 2. Identify Issues

- Functions with high complexity
- Code duplication
- Unused variables
- Too long functions

### 3. Refactoring

- Break down complex functions
- Extract common parts into utilities
- Apply functional approaches
- Improve typing

### 4. Verification

```bash
pnpm run quality:full
```

## Monitoring

### Weekly Checks

- Run `pnpm run quality:full`
- Analyze complexity metrics
- Refactor problematic areas

### Automation

- Pre-commit hooks
- CI/CD checks
- Automatic fixes

## Results

Following these standards leads to:

- **Fewer errors** in code
- **Better readability** and maintainability
- **Faster development** with Cursor
- **High quality** product

# CI/CD Security and Workflows

## Overview

Comprehensive CI/CD security system and GitHub Actions workflows for SaleSpot BY, ensuring automatic code quality, security, and performance checks at all development stages.

## GitHub Actions Workflows

### Main Workflow

**File**: `.github/workflows/lint.yml`

### Triggers

```yaml
on:
  push:
    branches: [main, develop, feature/*, hotfix/*]
  pull_request:
    branches: [main, develop]
```

### Jobs

#### 1. Quality Check Job

**Testing Matrix**:

- Node.js 18.x
- Node.js 20.x

**Steps**:

1. **Checkout code** - get code
2. **Setup Node.js** - configure Node.js with pnpm caching
3. **Setup pnpm** - install pnpm version 8
4. **Install dependencies** - install dependencies
5. **Check TypeScript types** - type checking
6. **Run ESLint** - code analysis
7. **Check Prettier formatting** - formatting check
8. **Run tests** - test execution
9. **Build applications** - application build
10. **Check security vulnerabilities** - vulnerability check
11. **Upload coverage reports** - coverage report upload

#### 2. Security Scan Job

**Tools**:

- **Trivy** - vulnerability scanner
- **GitHub Security tab** - security system integration

**Features**:

- File system scanning
- Vulnerability detection
- Results upload to GitHub Security

#### 3. Dependency Check Job

**Checks**:

- Outdated dependencies
- Unused packages
- Security audit

**Tools**:

- `pnpm outdated`
- `depcheck`

#### 4. Performance Check Job

**Run Condition**: only for pull requests

**Tools**:

- **Lighthouse CI** - performance analysis
- **Bundle size check** - build size check

**Metrics**:

- Performance score
- Accessibility score
- Best practices score
- SEO score

## Security Components

### 1. TypeScript Type Checking

**Description**: Strict TypeScript type checking to prevent runtime errors.

**Configuration**:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

**Check Command**:

```bash
cd /home/boss/Projects/dev && pnpm type-check
```

### 2. ESLint Security Rules

**Description**: Code checking for security and quality standards compliance.

**Main Security Rules**:

- `@typescript-eslint/no-non-null-assertion` - prohibit non-null assertion operator (!)
- `@typescript-eslint/prefer-nullish-coalescing` - use ?? instead of ||
- `@typescript-eslint/no-unnecessary-condition` - remove unnecessary checks
- `strict-boolean-expressions` - explicit comparisons in conditions

**Check Command**:

```bash
cd /home/boss/Projects/dev && pnpm lint
```

### 3. Dependency Security Scanning

**Description**: Automatic dependency vulnerability scanning.

**Tools**:

- `npm audit` - npm dependency check
- `pnpm audit` - pnpm dependency check
- `snyk` - extended security scanning

**Check Command**:

```bash
cd /home/boss/Projects/dev && pnpm audit
```

### 4. Configuration Validation

**Description**: Configuration files and environment variables validation.

**Checked Files**:

- `.env` files
- `tsconfig.json`
- `eslint.config.js`
- `package.json`
- Docker configurations

**Schema Validation**:

```typescript
// apps/api/src/config/env.config.ts
import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.string().transform(Number),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  // ... other variables
});
```

## Pipeline Stages

### Stage 1: Code Quality

```yaml
- name: TypeScript Check
  run: pnpm type-check

- name: ESLint Check
  run: pnpm lint

- name: Code Format Check
  run: pnpm format:check
```

### Stage 2: Security Scanning

```yaml
- name: Dependency Audit
  run: pnpm audit

- name: Secret Scanning
  run: ./scripts/quality/dead-config-detector.ts

- name: Configuration Validation
  run: pnpm config:validate
```

### Stage 3: Testing

```yaml
- name: Unit Tests
  run: pnpm test

- name: Integration Tests
  run: pnpm test:integration

- name: Security Tests
  run: pnpm test:security
```

### Stage 4: Build & Deploy

```yaml
- name: Build Application
  run: pnpm build

- name: Security Scan Build
  run: pnpm security:scan:build

- name: Deploy to Staging
  run: pnpm deploy:staging
```

## Lighthouse Configuration

**File**: `.lighthouserc.json`

### Collection Settings

```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:3000"],
      "startServerCommand": "pnpm run start:web",
      "startServerReadyPattern": "ready - started server on",
      "startServerReadyTimeout": 30000,
      "numberOfRuns": 3
    }
  }
}
```

### Assertions

```json
{
  "assert": {
    "assertions": {
      "categories:performance": ["warn", { "minScore": 0.9 }],
      "categories:accessibility": ["error", { "minScore": 0.95 }],
      "categories:best-practices": ["warn", { "minScore": 0.9 }],
      "categories:seo": ["warn", { "minScore": 0.9 }],
      "first-contentful-paint": ["warn", { "maxNumericValue": 2000 }],
      "largest-contentful-paint": ["warn", { "maxNumericValue": 2500 }],
      "cumulative-layout-shift": ["warn", { "maxNumericValue": 0.1 }],
      "total-blocking-time": ["warn", { "maxNumericValue": 300 }],
      "speed-index": ["warn", { "maxNumericValue": 2000 }]
    }
  }
}
```

## Codecov Integration

### Settings

```yaml
- name: Upload coverage reports
  uses: codecov/codecov-action@v4
  if: matrix.node-version == '20.x'
  with:
    file: ./coverage/lcov.info
    flags: unittests
    name: codecov-umbrella
    fail_ci_if_error: false
```

### Features

- Automatic coverage report upload
- Coverage change tracking
- Coverage drop notifications
- Detailed file statistics

## Security Integration

### Trivy Scanner

```yaml
- name: Run Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@master
  with:
    scan-type: 'fs'
    scan-ref: '.'
    format: 'sarif'
    output: 'trivy-results.sarif'
```

### GitHub Security Tab

```yaml
- name: Upload Trivy scan results to GitHub Security tab
  uses: github/codeql-action/upload-sarif@v3
  if: always()
  with:
    sarif_file: 'trivy-results.sarif'
```

## Caching

### Node.js and pnpm

```yaml
- name: Setup Node.js ${{ matrix.node-version }}
  uses: actions/setup-node@v4
  with:
    node-version: ${{ matrix.node-version }}
    cache: 'pnpm'
```

### Caching Benefits

- Faster dependency installation
- Reduced workflow execution time
- GitHub Actions resource savings

## Conditional Execution

### Performance Check

```yaml
performance-check:
  name: Performance Check
  runs-on: ubuntu-latest
  if: github.event_name == 'pull_request'
```

### Coverage Upload

```yaml
- name: Upload coverage reports
  if: matrix.node-version == '20.x'
```

## Security Rules Enforcement

### 1. Pre-commit Hooks

**Description**: Automatic checks before code commit.

**Configuration**:

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "pnpm test:all"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write", "git add"]
  }
}
```

### 2. Branch Protection Rules

**Description**: Protection of main branches from unsafe changes.

**Rules**:

- Code review requirement
- All checks passing requirement
- Direct push to main/master prohibition
- Base branch currency requirement

### 3. Automated Security Checks

**Description**: Automatic security checks in every PR.

**Checks**:

- Secret scanning in code
- Dependency vulnerability check
- Configuration validation
- Security standards compliance check

## Monitoring & Alerts

### 1. Security Metrics

**Metrics**:

- Number of detected vulnerabilities
- Vulnerability fix time
- Successful security check percentage
- Number of failed builds due to security

### 2. Alerting

**Alert Conditions**:

- Critical dependency vulnerabilities
- Failed security checks
- Security rule bypass attempts
- Failed deployments

### 3. Reporting

**Reports**:

- Daily security summary
- Weekly vulnerability report
- Monthly security compliance report
- Quarterly security audit report

## Compliance & Standards

### 1. OWASP Top 10

**Compliance**:

- A01:2021 – Broken Access Control
- A02:2021 – Cryptographic Failures
- A03:2021 – Injection
- A04:2021 – Insecure Design
- A05:2021 – Security Misconfiguration

### 2. Industry Standards

**Standards**:

- ISO 27001 (Information Security)
- SOC 2 (Security, Availability, Confidentiality)
- GDPR (Data Protection)
- PCI DSS (Payment Security)

### 3. Internal Policies

**Policies**:

- Code Review Guidelines
- Security Testing Requirements
- Incident Response Procedures
- Change Management Process

## Troubleshooting

### Common Issues

1. **Build Timeout**
   - Increase timeout in settings
   - Optimize build process

2. **Dependency Errors**
   - Check package.json
   - Update lockfile

3. **Test Issues**
   - Check Jest configuration
   - Ensure test correctness

4. **Security Scan Errors**
   - Update dependencies
   - Fix vulnerabilities

### Logs and Debugging

- GitHub Actions logs available in interface
- Detailed information for each step
- Re-run capability

## Best Practices

1. **Use matrices** for testing on different versions
2. **Cache dependencies** for speed
3. **Conditional execution** for resource optimization
4. **Detailed error messages**
5. **Regular updates** of actions and tools

## Workflow Extension

### Adding New Checks

1. Create new job in workflow
2. Configure triggers
3. Add necessary steps
4. Test locally

### New Tool Integration

1. Add to package.json
2. Create run script
3. Integrate into workflow
4. Configure reports

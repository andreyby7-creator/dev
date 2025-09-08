# 🚀 Технический стек проекта SaleSpot BY

## 📦 Package Manager

- **pnpm** - 8.15.4 (монорепо менеджер)
- **Node.js** - 20.x LTS (рекомендуется 20.18+)

## 🏗️ Monorepo Structure

- **Workspaces**: apps/api, apps/web, packages/shared
- **Root**: TypeScript конфигурация и общие зависимости
- **ESM Modules**: Полная поддержка ES модулей

## 🔧 Backend (NestJS API)

### Core Framework

- **@nestjs/common** - 11.1.6
- **@nestjs/core** - 11.1.6
- **@nestjs/platform-express** - 11.1.6
- **@nestjs/config** - 4.0.2
- **@nestjs/terminus** - 11.0.0
- **@nestjs/jwt** - 11.0.0
- **@nestjs/swagger** - 11.2.0
- **@nestjs/schedule** - 6.0.0
- **@nestjs/throttler** - 6.4.0

### Database & ORM

- **typeorm** - 0.3.26
- **pg** - 8.11.3 (PostgreSQL driver)
- **@nestjs/typeorm** - 10.0.2 (удален, используем кастомный адаптер)

### Caching & Session

- **ioredis** - 5.7.0
- **@nestjs/cache-manager** - 3.0.1
- **cache-manager** - 7.2.0
- **@nestjs-modules/ioredis** - 1.0.1 (удален, используем кастомный модуль)

### Authentication & Security

- **passport** - 0.7.0
- **passport-jwt** - 4.0.1
- **passport-local** - 1.0.0
- **bcryptjs** - 2.4.3
- **jsonwebtoken** - 9.0.2
- **class-validator** - 0.14.2
- **class-transformer** - 0.5.1
- **helmet** - 7.2.0
- **compression** - 1.7.5
- **csurf** - 1.11.0

### External Services

- **@supabase/supabase-js** - 2.39.0
- **@sentry/node** - 8.30.0
- **betterstack-logs** - 1.0.0

### Logging & Monitoring

- **pino** - 9.3.2
- **pino-pretty** - 11.0.0
- **winston** - 3.17.0
- **winston-elasticsearch** - 0.19.0
- **@opentelemetry/api** - 1.9.0
- **@opentelemetry/sdk-node** - 0.53.0
- **prom-client** - 15.1.0
- **@elastic/elasticsearch** - 9.1.1

### Validation & Configuration

- **joi** - 17.12.0
- **zod** - 4.1.5
- **reflect-metadata** - 0.2.1
- **dotenv** - 16.4.5

### Testing

- **@nestjs/testing** - 11.0.0
- **jest** - 29.7.0
- **supertest** - 7.0.0
- **ts-jest** - 29.2.5

### Development Tools

- **tsx** - 4.20.5 (быстрый TypeScript runner)
- **nodemon** - 3.1.9
- **tsconfig-paths** - 4.2.0

### Enterprise Features

- **opossum** - 9.0.0 (Circuit Breaker)
- **rate-limiter-flexible** - 5.0.0
- **rxjs** - 7.8.1

## 🎨 Frontend (Next.js Web)

### Core Framework

- **next** - 15.5.2
- **react** - 19.1.1
- **react-dom** - 19.1.1

### State Management

- **zustand** - 5.0.0
- **@tanstack/react-query** - 5.56.2

### UI Components & Styling

- **@radix-ui/react-\*** - 1.0.5 (различные компоненты)
- **class-variance-authority** - 0.7.0
- **clsx** - 2.0.0
- **tailwind-merge** - 2.0.0
- **lucide-react** - 0.303.0
- **tailwindcss** - 3.4.1
- **autoprefixer** - 10.4.18
- **postcss** - 8.4.35

### Authentication

- **next-auth** - 4.24.5
- **@auth/supabase-adapter** - 0.1.0

### Forms & Validation

- **react-hook-form** - 7.48.2
- **@hookform/resolvers** - 3.3.2
- **zod** - 3.22.4

### External Services

- **@sentry/nextjs** - 8.32.0

### Testing

- **@testing-library/react** - 16.3.0
- **@testing-library/jest-dom** - 6.5.0
- **@testing-library/user-event** - 14.5.2
- **msw** - 2.3.1

## 🛠️ Development Tools

### TypeScript

- **typescript** - 5.9.2
- **@types/node** - 24.3.0
- **@types/react** - 18.3.12
- **@types/react-dom** - 18.3.1
- **@types/express** - 5.0.0
- **@types/passport-jwt** - 4.0.1
- **@types/passport-local** - 1.0.38
- **@types/bcryptjs** - 2.4.6
- **@types/jsonwebtoken** - 9.0.5
- **@types/supertest** - 6.0.2
- **@types/jest** - 29.5.14
- **@types/cache-manager** - 5.0.0
- **@types/compression** - 1.7.5
- **@types/opossum** - 8.1.9
- **@types/pg** - 8.10.9

### Linting & Formatting

- **eslint** - 9.34.0
- **@typescript-eslint/eslint-plugin** - 8.41.0
- **@typescript-eslint/parser** - 8.41.0
- **eslint-config-prettier** - 9.1.0
- **eslint-plugin-react** - 7.37.5
- **eslint-plugin-react-hooks** - 5.2.0
- **eslint-plugin-jsx-a11y** - 6.8.0
- **eslint-plugin-import** - 2.32.0
- **eslint-plugin-prefer-arrow** - 1.2.3
- **eslint-plugin-prettier** - 5.1.3
- **eslint-import-resolver-typescript** - 4.4.4
- **prettier** - 3.4.2

### Git Hooks & Quality

- **husky** - 9.1.5
- **lint-staged** - 15.2.2
- **commitlint** - 19.5.0
- **@commitlint/cli** - 19.8.1
- **@commitlint/config-conventional** - 19.5.0
- **commitizen** - 4.3.0
- **cz-conventional-changelog** - 3.3.0
- **standard-version** - 9.5.0

### Code Quality Tools

- **@eslint/js** - 9.34.0
- **source-map-support** - 0.5.21
- **ts-loader** - 9.5.1

## 🧹 Code Quality & Standards

### Quality Assurance

- **ESLint** - 50+ строгих правил
- **Prettier** - Автоформатирование
- **TypeScript** - Строгая типизация
- **Husky** - Git hooks
- **lint-staged** - Pre-commit проверки

### Code Standards

- **docs/rules/code-constitution.md** - Конституция кода
- **EditorConfig** - Единые настройки редактора
- **VS Code Extensions** - Рекомендуемые расширения

### Quality Scripts

- **quality-check.sh** - Полная проверка качества
- **clean-code.sh** - Автоисправление проблем
- **security-scan.sh** - Проверка безопасности
- **performance-check.sh** - Проверка производительности

## 🐳 DevOps & Infrastructure

### Containerization

- **Docker** - 24.x
- **docker-compose** - 2.x
- **Multi-stage builds** - Оптимизированные образы

### Orchestration

- **Kubernetes** - 1.28+
- **Helm** - 3.12+
- **Kustomize** - Конфигурация

### CI/CD

- **GitHub Actions** - Автоматические проверки
- **Trivy** - Security scanning
- **Lighthouse CI** - Performance monitoring
- **Codecov** - Coverage reports

### Monitoring & Logging

- **Sentry** - 8.32.0
- **BetterStack** - 1.0.0
- **Prometheus** - 2.47.0
- **Grafana** - 10.2.0
- **Jaeger** - Distributed tracing
- **Elasticsearch** - Centralized logging

## 🗄️ Database & Storage

### Primary Database

- **PostgreSQL** - 15.x (Supabase)

### Caching

- **Redis** - 7.x
- **Connection pooling** - Оптимизация соединений

### File Storage

- **Supabase Storage** (S3-compatible)

## 🔐 Security

### Authentication

- **Supabase Auth** (JWT-based)
- **NextAuth.js** (OAuth providers)

### API Gateway

- **Kong** - 3.4.x
- **Rate Limiting** - Защита от DDoS
- **Circuit Breaker** - Отказоустойчивость

### Security Headers

- **helmet** - 7.2.0
- **cors** - 2.8.5
- **compression** - 1.7.5
- **Security scanning** - Trivy integration

## 📊 Analytics & Monitoring

### Performance

- **@opentelemetry/api** - 1.9.0
- **@opentelemetry/sdk-node** - 0.53.0
- **prom-client** - 15.1.0
- **Lighthouse CI** - Performance metrics

### Error Tracking

- **Sentry** - 8.32.0
- **BetterStack** - 1.0.0

### Observability

- **Custom ObservabilityModule** - Полная система мониторинга
- **Metrics Service** - Системные и бизнес-метрики
- **Logging Service** - Централизованное логирование
- **Tracing Service** - Распределенная трассировка
- **Health Service** - Проверка состояния системы

## 🌐 Networking & APIs

### HTTP Client

- **axios** - 1.6.2
- **node-fetch** - 3.3.2

### API Documentation

- **Swagger/OpenAPI** (через @nestjs/swagger)

## 📱 PWA & Mobile

### Progressive Web App

- **next-pwa** - 5.6.0
- **workbox-webpack-plugin** - 7.0.0

## 🔧 Utilities

### Date & Time

- **date-fns** - 2.30.0
- **dayjs** - 1.11.10

### Data Processing

- **lodash** - 4.17.21
- **ramda** - 0.29.1

### File Processing

- **multer** - 1.4.5-lts.1
- **sharp** - 0.33.0

### Environment

- **dotenv** - 16.4.5
- **cross-env** - 7.0.3

## 🎯 Enterprise Features

### Rate Limiting

- **express-rate-limit** - 7.1.5
- **ioredis** - 5.7.0 (для распределенного rate limiting)

### Circuit Breaker

- **opossum** - 9.0.0

### Load Balancing

- **Кастомная реализация** (round-robin, least-connections, ip-hash)

### Service Discovery

- **Кастомная реализация** (интеграция с Kong API Gateway)

### Deployment & Operations

- **Blue-Green Deployments** - Zero-downtime
- **Feature Flags** - Управление функциональностью
- **Infrastructure as Code** - Terraform
- **Automated Backups** - Резервное копирование
- **Disaster Recovery** - План восстановления

## 📈 Performance & Optimization

### Bundling

- **webpack** - 5.89.0 (Next.js)
- **turbopack** - 0.10.0 (Next.js 15)

### Image Optimization

- **sharp** - 0.33.0
- **next/image** (встроенный в Next.js)

### Code Splitting

- **Next.js Dynamic Imports**
- **React.lazy()**

### Bundle Optimization

- **Tree shaking** - Удаление неиспользуемого кода
- **Code splitting** - Разделение бандлов
- **Lazy loading** - Отложенная загрузка

## 🔄 Version Control & Collaboration

### Git

- **Git** - 2.x
- **GitHub** (hosting)
- **GitHub Actions** (CI/CD)

### Code Quality

- **SonarQube** (опционально)
- **Codecov** (coverage reports)
- **Conventional Commits** - Стандартизированные коммиты

## 🚀 Scripts & Automation

### Development Scripts

- **start-all.sh** - Запуск всех сервисов
- **stop-all.sh** - Остановка всех сервисов
- **restart-all.sh** - Перезапуск сервисов
- **status.sh** - Статус сервисов

### Quality Scripts

- **quality-check.sh** - Полная проверка качества
- **clean-code.sh** - Очистка кода
- **security-scan.sh** - Проверка безопасности
- **performance-check.sh** - Проверка производительности

### DevOps Scripts

- **create-backup.sh** - Создание резервных копий
- **restore-from-backup.sh** - Восстановление из резервной копии
- **docker-cleanup.sh** - Очистка Docker
- **kong.sh** - Управление Kong API Gateway
- **redis.sh** - Управление Redis
- **monitor.sh** - Мониторинг системы
- **observability.sh** - Управление observability

## 📋 Версии Node.js

- **Node.js** - 20.x LTS (рекомендуется 20.18+)
- **npm** - 10.x (встроен в Node.js)
- **pnpm** - 8.15.4

## 🌍 Runtime Environment

- **TypeScript** - 5.9.2 (строгий режим)
- **ESLint** - 9.34.0 (flat config)
- **Prettier** - 3.4.2
- **tsx** - 4.20.5 (быстрый TypeScript runner)

## 📝 Примечания

- ✅ Все зависимости обновлены до последних стабильных версий
- ✅ Используется строгая типизация TypeScript
- ✅ ESLint настроен для максимальной строгости (50+ правил)
- ✅ Поддержка ESM модулей включена
- ✅ Все security vulnerabilities исправлены
- ✅ Enterprise-уровень качества кода
- ✅ Полная автоматизация проверок качества
- ✅ CI/CD pipeline с security scanning
- ✅ Observability система готова к продакшену
- ✅ Docker образы оптимизированы для продакшена
- ✅ Kubernetes манифесты настроены
- ✅ Helm charts готовы к деплою

## 🎯 Целевые показатели качества

- **TypeScript Errors**: 0
- **ESLint Errors**: 0
- **Test Coverage**: >90%
- **Code Complexity**: <10
- **Function Length**: <50 строк
- **Security Issues**: 0
- **Bundle Size**: <500KB
- **Performance Score**: >90 (Lighthouse)

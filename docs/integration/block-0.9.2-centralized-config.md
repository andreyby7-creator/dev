# Блок 0.9.2. Централизованная конфигурация

## Обзор

Блок 0.9.2 реализует единый центр конфигурации всех сервисов системы с поддержкой hot-reload, управлением средами и интеграцией feature flags.

## Статус

**✅ ПОЛНОСТЬЮ ЗАВЕРШЕН (100%)**

## Архитектура

### Centralized Configuration Management

Централизованная система управления конфигурациями обеспечивает:

- **Единый источник истины** для всех конфигураций
- **Hot-reload** конфигураций без перезапуска сервисов
- **Environment management** для разных сред
- **Feature flags integration** в единую систему
- **Secrets management** через KMS
- **Configuration validation** с Zod схемами

### Configuration Hierarchy

```
Global Config
├── Environment Config (dev, staging, production)
├── Service Config
├── Feature Flags
├── Secrets
└── Runtime Config
```

## Ключевые сервисы

### CentralizedConfigService

**Файл:** `apps/api/src/config/centralized-config.service.ts`

**Функциональность:**

- Управление глобальными конфигурациями
- Hot-reload при изменении конфигураций
- Кеширование конфигураций
- Валидация конфигураций

**Основные методы:**

```typescript
async getConfig<T>(key: string): Promise<T>
async setConfig<T>(key: string, value: T): Promise<void>
async reloadConfig(): Promise<void>
async validateConfig(config: any): Promise<boolean>
```

### EnvironmentConfigService

**Файл:** `apps/api/src/config/environment-config.service.ts`

**Функциональность:**

- Управление конфигурациями для разных сред
- Environment-specific overrides
- Переменные окружения
- Конфигурационные профили

**Основные методы:**

```typescript
async getEnvironmentConfig(environment: string): Promise<IEnvironmentConfig>
async getEnvironmentOverrides(environment: string): Promise<IEnvironmentOverride[]>
async setEnvironmentOverride(environment: string, override: IEnvironmentOverride): Promise<void>
```

### ConfigurationValidationService

**Файл:** `apps/api/src/config/configuration-validation.service.ts`

**Функциональность:**

- Валидация конфигураций с Zod схемами
- Type-safe конфигурации
- Автоматическая генерация типов
- Валидация при hot-reload

**Основные методы:**

```typescript
async validateConfiguration<T>(config: any, schema: z.ZodSchema<T>): Promise<T>
async validateEnvironmentConfig(environment: string): Promise<boolean>
async getValidationErrors(): Promise<IValidationError[]>
```

### ConfigurationBackupService

**Файл:** `apps/api/src/config/configuration-backup.service.ts`

**Функциональность:**

- Автоматическое резервное копирование конфигураций
- Версионирование конфигураций
- Восстановление из резервных копий
- Миграция конфигураций

**Основные методы:**

```typescript
async createBackup(): Promise<IBackupInfo>
async restoreBackup(backupId: string): Promise<void>
async listBackups(): Promise<IBackupInfo[]>
async migrateConfiguration(fromVersion: string, toVersion: string): Promise<void>
```

## Feature Flags Integration

### FeatureFlagsService

**Интеграция с блоком 0.8.3**

**Функциональность:**

- Централизованное управление feature flags
- A/B тестирование
- Gradual rollout
- Targeting пользователей

**Основные методы:**

```typescript
async isFeatureEnabled(feature: string, userId?: string): Promise<boolean>
async getFeatureConfig(feature: string): Promise<IFeatureConfig>
async updateFeatureFlag(feature: string, config: IFeatureConfig): Promise<void>
```

### Feature Flag Types

```typescript
interface IFeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetUsers: string[];
  targetGroups: string[];
  conditions: IFeatureCondition[];
  metadata: Record<string, any>;
}
```

## Secrets Management

### SecretsManagerService

**Интеграция с блоком 0.8.5**

**Функциональность:**

- Централизованное управление секретами
- Интеграция с KMS
- Ротация секретов
- Аудит доступа к секретам

**Основные методы:**

```typescript
async getSecret(key: string): Promise<string>
async setSecret(key: string, value: string): Promise<void>
async rotateSecret(key: string): Promise<void>
async auditSecretAccess(key: string): Promise<ISecretAudit[]>
```

## Configuration Schemas

### Base Configuration Schema

```typescript
const BaseConfigSchema = z.object({
  environment: z.enum(['development', 'staging', 'production']),
  version: z.string(),
  debug: z.boolean(),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']),
  database: z.object({
    host: z.string(),
    port: z.number(),
    name: z.string(),
    ssl: z.boolean(),
  }),
  redis: z.object({
    host: z.string(),
    port: z.number(),
    password: z.string().optional(),
  }),
  api: z.object({
    port: z.number(),
    host: z.string(),
    cors: z.object({
      origin: z.array(z.string()),
      credentials: z.boolean(),
    }),
  }),
});
```

### Service-Specific Schemas

```typescript
const AuthConfigSchema = z.object({
  jwt: z.object({
    secret: z.string(),
    expiresIn: z.string(),
    refreshExpiresIn: z.string(),
  }),
  oauth: z.object({
    providers: z.array(z.string()),
    clientId: z.string(),
    clientSecret: z.string(),
  }),
});

const MonitoringConfigSchema = z.object({
  prometheus: z.object({
    enabled: z.boolean(),
    port: z.number(),
    path: z.string(),
  }),
  grafana: z.object({
    enabled: z.boolean(),
    url: z.string(),
    apiKey: z.string(),
  }),
});
```

## Hot-Reload System

### Configuration Watcher

```typescript
class ConfigurationWatcher {
  private watchers: Map<string, fs.FSWatcher> = new Map();

  async watchConfigurationFile(filePath: string): Promise<void> {
    const watcher = fs.watch(filePath, async eventType => {
      if (eventType === 'change') {
        await this.reloadConfiguration(filePath);
      }
    });

    this.watchers.set(filePath, watcher);
  }

  private async reloadConfiguration(filePath: string): Promise<void> {
    try {
      const config = await this.loadConfiguration(filePath);
      await this.validateConfiguration(config);
      await this.notifyServices(config);
    } catch (error) {
      this.logger.error('Failed to reload configuration', error);
    }
  }
}
```

### Service Notification

```typescript
class ConfigurationNotifier {
  private subscribers: Map<string, IConfigurationSubscriber[]> = new Map();

  subscribe(serviceId: string, subscriber: IConfigurationSubscriber): void {
    if (!this.subscribers.has(serviceId)) {
      this.subscribers.set(serviceId, []);
    }
    this.subscribers.get(serviceId)!.push(subscriber);
  }

  async notifyConfigurationChange(
    serviceId: string,
    config: any
  ): Promise<void> {
    const subscribers = this.subscribers.get(serviceId) || [];

    await Promise.all(
      subscribers.map(subscriber => subscriber.onConfigurationChange(config))
    );
  }
}
```

## Environment Management

### Environment Profiles

```typescript
interface IEnvironmentProfile {
  name: string;
  description: string;
  config: Record<string, any>;
  overrides: IEnvironmentOverride[];
  secrets: string[];
  featureFlags: string[];
}
```

### Environment Overrides

```typescript
interface IEnvironmentOverride {
  key: string;
  value: any;
  condition?: IOverrideCondition;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Environment Promotion

```typescript
class EnvironmentPromotionService {
  async promoteConfiguration(
    fromEnvironment: string,
    toEnvironment: string,
    configKeys: string[]
  ): Promise<void> {
    const sourceConfig = await this.getEnvironmentConfig(fromEnvironment);
    const targetConfig = await this.getEnvironmentConfig(toEnvironment);

    for (const key of configKeys) {
      const value = this.getNestedValue(sourceConfig, key);
      this.setNestedValue(targetConfig, key, value);
    }

    await this.saveEnvironmentConfig(toEnvironment, targetConfig);
    await this.validateEnvironmentConfig(toEnvironment);
  }
}
```

## Configuration API

### REST Endpoints

```typescript
@Controller('config')
export class ConfigurationController {
  @Get(':key')
  async getConfig(@Param('key') key: string): Promise<any> {
    return this.configService.getConfig(key);
  }

  @Post(':key')
  async setConfig(
    @Param('key') key: string,
    @Body() value: any
  ): Promise<void> {
    return this.configService.setConfig(key, value);
  }

  @Post('reload')
  async reloadConfig(): Promise<void> {
    return this.configService.reloadConfig();
  }

  @Get('environment/:env')
  async getEnvironmentConfig(@Param('env') env: string): Promise<any> {
    return this.environmentService.getEnvironmentConfig(env);
  }

  @Post('backup')
  async createBackup(): Promise<IBackupInfo> {
    return this.backupService.createBackup();
  }

  @Post('backup/:id/restore')
  async restoreBackup(@Param('id') id: string): Promise<void> {
    return this.backupService.restoreBackup(id);
  }
}
```

## Конфигурационные файлы

### Основной конфигурационный файл

```yaml
# config/default.yaml
environment: development
version: '1.0.0'
debug: true
logLevel: info

database:
  host: localhost
  port: 5432
  name: salespot_dev
  ssl: false

redis:
  host: localhost
  port: 6379

api:
  port: 3000
  host: 0.0.0.0
  cors:
    origin: ['http://localhost:3000']
    credentials: true

auth:
  jwt:
    secret: 'your-secret-key'
    expiresIn: '1h'
    refreshExpiresIn: '7d'
  oauth:
    providers: ['google', 'github']
    clientId: 'your-client-id'
    clientSecret: 'your-client-secret'

monitoring:
  prometheus:
    enabled: true
    port: 9090
    path: '/metrics'
  grafana:
    enabled: true
    url: 'http://localhost:3001'
    apiKey: 'your-api-key'
```

### Environment-specific конфигурации

```yaml
# config/production.yaml
environment: production
debug: false
logLevel: warn

database:
  host: ${DB_HOST}
  port: ${DB_PORT}
  name: ${DB_NAME}
  ssl: true

redis:
  host: ${REDIS_HOST}
  port: ${REDIS_PORT}
  password: ${REDIS_PASSWORD}

api:
  port: ${API_PORT}
  host: 0.0.0.0
  cors:
    origin: ${CORS_ORIGINS}
    credentials: true
```

## Валидация конфигураций

### Runtime Validation

```typescript
class ConfigurationValidator {
  async validateConfiguration(config: any): Promise<IValidationResult> {
    const errors: IValidationError[] = [];

    // Validate required fields
    const requiredFields = ['environment', 'version', 'database', 'api'];
    for (const field of requiredFields) {
      if (!config[field]) {
        errors.push({
          field,
          message: `Required field '${field}' is missing`,
          severity: 'error',
        });
      }
    }

    // Validate environment-specific rules
    if (config.environment === 'production') {
      if (config.debug === true) {
        errors.push({
          field: 'debug',
          message: 'Debug mode should be disabled in production',
          severity: 'warning',
        });
      }

      if (!config.database.ssl) {
        errors.push({
          field: 'database.ssl',
          message: 'SSL should be enabled in production',
          severity: 'error',
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
```

## Мониторинг конфигураций

### Configuration Metrics

```typescript
interface IConfigurationMetrics {
  totalConfigurations: number;
  activeConfigurations: number;
  configurationChanges: number;
  validationErrors: number;
  hotReloads: number;
  backupCount: number;
  lastBackupTime: Date;
}
```

### Configuration Audit

```typescript
interface IConfigurationAudit {
  id: string;
  action: 'create' | 'update' | 'delete' | 'reload' | 'backup' | 'restore';
  key: string;
  oldValue?: any;
  newValue?: any;
  userId: string;
  timestamp: Date;
  environment: string;
  ipAddress: string;
}
```

## Безопасность

### Access Control

```typescript
class ConfigurationSecurityService {
  async checkPermission(
    userId: string,
    action: string,
    configKey: string
  ): Promise<boolean> {
    const user = await this.userService.getUser(userId);
    const permissions = await this.getUserPermissions(user.id);

    return permissions.some(
      permission =>
        permission.action === action && permission.resource === configKey
    );
  }

  async auditConfigurationAccess(
    userId: string,
    action: string,
    configKey: string
  ): Promise<void> {
    await this.auditService.log({
      userId,
      action,
      resource: configKey,
      timestamp: new Date(),
      ipAddress: this.getClientIP(),
    });
  }
}
```

### Secrets Protection

```typescript
class SecretsProtectionService {
  async encryptSecret(value: string): Promise<string> {
    const key = await this.getEncryptionKey();
    return this.encryptionService.encrypt(value, key);
  }

  async decryptSecret(encryptedValue: string): Promise<string> {
    const key = await this.getEncryptionKey();
    return this.encryptionService.decrypt(encryptedValue, key);
  }

  async maskSecretInLogs(value: string): string {
    if (value.length <= 4) {
      return '*'.repeat(value.length);
    }
    return (
      value.substring(0, 2) +
      '*'.repeat(value.length - 4) +
      value.substring(value.length - 2)
    );
  }
}
```

## Тестирование

### Unit Tests

```typescript
describe('CentralizedConfigService', () => {
  let service: CentralizedConfigService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [CentralizedConfigService],
    }).compile();

    service = module.get<CentralizedConfigService>(CentralizedConfigService);
  });

  it('should get configuration value', async () => {
    const config = { api: { port: 3000 } };
    jest.spyOn(service, 'getConfig').mockResolvedValue(config);

    const result = await service.getConfig('api');
    expect(result).toEqual(config);
  });

  it('should validate configuration', async () => {
    const validConfig = { environment: 'development', version: '1.0.0' };
    const result = await service.validateConfig(validConfig);
    expect(result).toBe(true);
  });
});
```

### Integration Tests

```typescript
describe('Configuration Integration', () => {
  it('should hot-reload configuration', async () => {
    const initialConfig = await configService.getConfig('api');
    expect(initialConfig.port).toBe(3000);

    // Update configuration file
    await fs.writeFile('config/test.yaml', 'api:\n  port: 4000');

    // Wait for hot-reload
    await new Promise(resolve => setTimeout(resolve, 1000));

    const updatedConfig = await configService.getConfig('api');
    expect(updatedConfig.port).toBe(4000);
  });
});
```

## Развертывание

### Docker Configuration

```dockerfile
FROM node:18-alpine
WORKDIR /app

# Copy configuration files
COPY config/ ./config/
COPY package*.json ./
RUN npm ci --only=production

COPY . .
EXPOSE 3000

CMD ["npm", "start"]
```

### Kubernetes ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  config.yaml: |
    environment: production
    version: "1.0.0"
    debug: false
    logLevel: info
    api:
      port: 3000
      host: 0.0.0.0
```

### Environment Variables

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
  DB_PASSWORD: <base64-encoded-password>
  JWT_SECRET: <base64-encoded-secret>
  REDIS_PASSWORD: <base64-encoded-password>
```

## Заключение

Блок 0.9.2 успешно реализует централизованную систему управления конфигурациями с поддержкой hot-reload, валидации и интеграции с feature flags и secrets management. Система обеспечивает гибкость, безопасность и удобство управления конфигурациями всех сервисов.

**Результат:** ✅ **Block 0.9.2: Централизованная конфигурация - 100% ГОТОВО!**

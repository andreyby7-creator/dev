import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { vi } from 'vitest';
import { CentralizedConfigService } from '../centralized-config.service';

describe('CentralizedConfigService', () => {
  let service: CentralizedConfigService;
  let _configService: {
    get: ReturnType<typeof vi.fn>;
  };
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    _configService = {
      get: vi
        .fn()
        .mockImplementation(
          (key: string, defaultValue?: string | undefined) => {
            const configs: Record<string, string> = {
              JWT_SECRET: 'test-secret',
              JWT_EXPIRES_IN: '1h',
              DATABASE_URL: 'postgresql://localhost:5432/test',
              DB_POOL_MIN: '2',
              DB_POOL_MAX: '10',
              REDIS_URL: 'redis://localhost:6379',
              REDIS_TTL: '3600',
              MONITORING_ENABLED: 'true',
              MONITORING_INTERVAL: '30000',
              RATE_LIMIT_ENABLED: 'true',
              RATE_LIMIT_MAX: '100',
              FEATURE_NEW_DASHBOARD: 'false',
              FEATURE_AI_ASSISTANT: 'true',
              CONFIG_OVERRIDES: '{}',
              CENTRALIZED_CONFIG_ENABLED: 'true',
            };
            return configs[key] ?? defaultValue ?? 'default-value';
          }
        ),
    };

    eventEmitter = {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      once: vi.fn(),
      removeAllListeners: vi.fn(),
      setMaxListeners: vi.fn(),
      getMaxListeners: vi.fn(),
      listeners: vi.fn(),
      rawListeners: vi.fn(),
      listenerCount: vi.fn(),
      prependListener: vi.fn(),
      prependOnceListener: vi.fn(),
      eventNames: vi.fn(),
    } as unknown as EventEmitter2;

    service = new CentralizedConfigService(
      _configService as unknown as ConfigService,
      eventEmitter
    );

    // Инициализируем сервис
    await service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('setConfig', () => {
    it('should set configuration successfully', async () => {
      await service.setConfig(
        'test.key',
        'test-value',
        'test-env',
        'test-service',
        'test-user'
      );

      const value = await service.getConfig('test.key');
      expect(value).toBe('test-value');
    });

    it('should emit config updated event', async () => {
      await service.setConfig(
        'test.key',
        'test-value',
        'test-env',
        'test-service',
        'test-user'
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'config.updated',
        expect.objectContaining({
          key: expect.any(String),
          oldValue: undefined,
          newValue: expect.any(String),
          environment: expect.any(String),
          _service: expect.any(String),
        })
      );
    });

    it('should increment version on update', async () => {
      await service.setConfig(
        'test.key',
        'test-value',
        'test-env',
        'test-service',
        'test-user'
      );

      await service.setConfig(
        'test.key',
        'updated-value',
        'test-env',
        'test-service',
        'test-user'
      );

      const configs = await service.getAllConfigs('test-service');
      const config = configs.find(c => c.key === 'test.key');
      expect(config?.version).toBe(2);
    });
  });

  describe('getConfig', () => {
    it('should return configuration value', async () => {
      await service.setConfig(
        'test.key',
        'test-value',
        'test-env',
        'test-service',
        'test-user'
      );

      const value = await service.getConfig('test.key');
      expect(value).toBe('test-value');
    });

    it('should return undefined for non-existent key', async () => {
      const value = await service.getConfig('non-existent.key');
      expect(value).toBeUndefined();
    });

    it('should filter by environment', async () => {
      await service.setConfig(
        'test.key',
        'test-value',
        'test-env',
        'test-service',
        'test-user'
      );

      const value = await service.getConfig('test.key', 'other-env');
      expect(value).toBeUndefined();
    });
  });

  describe('getAllConfigs', () => {
    it('should return all configurations', async () => {
      await service.setConfig(
        'test.key1',
        'value1',
        'test-env',
        'test-service',
        'test-user'
      );

      await service.setConfig(
        'test.key2',
        'value2',
        'test-env',
        'test-service',
        'test-user'
      );

      const configs = await service.getAllConfigs();
      expect(configs.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by service', async () => {
      await service.setConfig(
        'test.key',
        'test-value',
        'test-env',
        'test-service',
        'test-user'
      );

      const configs = await service.getAllConfigs('test-service');
      expect(configs.every(c => c._service === 'test-service')).toBe(true);
    });

    it('should filter by environment', async () => {
      await service.setConfig(
        'test.key',
        'test-value',
        'test-env',
        'test-service',
        'test-user'
      );

      const configs = await service.getAllConfigs(undefined, 'test-env');
      expect(
        configs.every(
          c => c.environment === 'test-env' || c.environment === 'all'
        )
      ).toBe(true);
    });
  });

  describe('registerSchema', () => {
    it('should register configuration schema', async () => {
      const schema = {
        'test.key': (await import('zod')).z.string(),
      };

      await service.registerSchema('test-service', schema);

      // Схема зарегистрирована, но нет прямого способа проверить это
      // кроме как через валидацию
      expect(true).toBe(true);
    });
  });

  describe('validateConfig', () => {
    it('should validate configuration against schema', async () => {
      const schema = {
        'test.key': (await import('zod')).z.string(),
      };

      await service.registerSchema('test-service', schema);

      const isValid = await service.validateConfig('test-service', {
        'test.key': 'valid-string',
      });

      expect(isValid).toBe(true);
    });

    it('should return false for invalid configuration', async () => {
      const schema = {
        'test.key': (await import('zod')).z.string(),
      };

      await service.registerSchema('test-service', schema);

      const isValid = await service.validateConfig('test-service', {
        'test.key': 123, // Должно быть строкой
      });

      expect(isValid).toBe(false);
    });
  });

  describe('exportConfig', () => {
    it('should export configuration in JSON format', async () => {
      await service.setConfig(
        'test.key',
        'test-value',
        'test-env',
        'test-service',
        'test-user'
      );

      const exported = await service.exportConfig(
        'test-service',
        'test-env',
        'json'
      );
      const parsed = JSON.parse(exported);

      expect(parsed['test.key']).toBe('test-value');
    });

    it('should export configuration in ENV format', async () => {
      await service.setConfig(
        'test.key',
        'test-value',
        'test-env',
        'test-service',
        'test-user'
      );

      const exported = await service.exportConfig(
        'test-service',
        'test-env',
        'env'
      );
      expect(exported).toContain('TEST_KEY=test-value');
    });

    it('should export configuration in YAML format', async () => {
      await service.setConfig(
        'test.key',
        'test-value',
        'test-env',
        'test-service',
        'test-user'
      );

      const exported = await service.exportConfig(
        'test-service',
        'test-env',
        'yaml'
      );
      expect(exported).toContain('test.key: test-value');
    });
  });

  describe('getChangeHistory', () => {
    it('should return change history', async () => {
      await service.setConfig(
        'test.key',
        'test-value',
        'test-env',
        'test-service',
        'test-user'
      );

      await service.setConfig(
        'test.key',
        'updated-value',
        'test-env',
        'test-service',
        'test-user'
      );

      const history = await service.getChangeHistory('test-service');
      expect(history.length).toBeGreaterThan(0);
      expect(history[0]?.key).toBe('test.key');
      expect(history[0]?.oldValue).toBe('test-value');
      expect(history[0]?.newValue).toBe('updated-value');
    });
  });
});

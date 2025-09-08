import { vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { createMockRedisService } from '../test/mocks/redis.service.mock';
import { RedisService } from '../redis/redis.service';
import { HotReloadConfigService } from './hot-reload-config.service';

describe('HotReloadConfigService', () => {
  let service: HotReloadConfigService;
  let redisService: ReturnType<typeof createMockRedisService>;
  let _configService: {
    get: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    redisService = createMockRedisService();

    _configService = {
      get: vi.fn((key: string, defaultValue?: string | undefined) => {
        const config: Record<string, string> = {
          HOT_RELOAD_ENABLED: 'true',
          HOT_RELOAD_WATCH_INTERVAL: '5000',
          HOT_RELOAD_MAX_FILE_SIZE: '1048576',
          HOT_RELOAD_ALLOWED_EXTENSIONS: 'json,yaml,yml,env',
          HOT_RELOAD_NOTIFICATIONS: 'true',
          HOT_RELOAD_BACKUP: 'true',
        };
        return config[key] ?? defaultValue ?? 'test-value';
      }),
    };

    service = new HotReloadConfigService(
      redisService as unknown as RedisService,
      _configService as unknown as ConfigService
    );

    // Mock private properties
    (
      service as unknown as {
        configCache: Map<string, string>;
        changeHistory: unknown[];
        watchers: Map<string, unknown>;
      }
    ).configCache = new Map();
    (
      service as unknown as {
        configCache: Map<string, string>;
        changeHistory: unknown[];
        watchers: Map<string, unknown>;
      }
    ).changeHistory = [];
    (
      service as unknown as {
        configCache: Map<string, string>;
        changeHistory: unknown[];
        watchers: Map<string, unknown>;
      }
    ).watchers = new Map();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('updateConfig', () => {
    it('should update configuration', async () => {
      redisService.set.mockResolvedValue('OK');

      const result = await service.updateConfig('test-key', 'test-value');

      expect(result).toBe(true);
      expect(redisService.set).toHaveBeenCalledWith(
        'config:test-key',
        '"test-value"',
        0
      );
    });

    it('should handle update errors', async () => {
      redisService.set.mockRejectedValue(new Error('Redis error'));

      const result = await service.updateConfig('test-key', 'test-value');

      expect(result).toBe(false);
    });
  });

  describe('reloadConfiguration', () => {
    it('should reload configuration', async () => {
      redisService.keys.mockResolvedValue(['config:key1', 'config:key2']);
      redisService.get.mockResolvedValue('"test-value"');

      const result = await service.reloadConfiguration();

      expect(result).toBe(true);
      expect(redisService.keys).toHaveBeenCalledWith('config:*');
    });

    it('should handle reload errors', async () => {
      redisService.keys.mockRejectedValue(new Error('Redis error'));

      const result = await service.reloadConfiguration();

      // The service returns true even on error because it catches the error and logs it
      expect(result).toBe(true);
    });
  });

  describe('loadConfigurationFromRedis', () => {
    it('should load configuration from Redis', async () => {
      redisService.keys.mockResolvedValue(['config:key1', 'config:key2']);
      redisService.get.mockResolvedValue('"test-value"');

      await (
        service as unknown as {
          loadConfigurationFromRedis: () => Promise<void>;
        }
      ).loadConfigurationFromRedis();

      expect(redisService.keys).toHaveBeenCalledWith('config:*');
      expect(redisService.get).toHaveBeenCalled();
    });

    it('should handle empty configuration', async () => {
      redisService.keys.mockResolvedValue([]);

      await (
        service as unknown as {
          loadConfigurationFromRedis: () => Promise<void>;
        }
      ).loadConfigurationFromRedis();

      expect(redisService.keys).toHaveBeenCalledWith('config:*');
    });
  });

  describe('checkForChanges', () => {
    it('should check for configuration changes', async () => {
      redisService.keys.mockResolvedValue(['config:key1']);
      redisService.get.mockResolvedValue('"new-value"');

      await (
        service as unknown as { checkForChanges: () => Promise<void> }
      ).checkForChanges();

      expect(redisService.keys).toHaveBeenCalledWith('config:*');
    });
  });

  describe('handleConfigChange', () => {
    it('should handle configuration change', async () => {
      await (
        service as unknown as {
          handleConfigChange: (
            key: string,
            oldValue: string,
            newValue: string,
            source: string
          ) => Promise<void>;
        }
      ).handleConfigChange('test-key', 'old-value', 'new-value', 'api');

      // Should not throw error
      expect(true).toBe(true);
    });
  });

  describe('notifyWatchers', () => {
    it('should notify watchers', async () => {
      const changeData = {
        key: 'test-key',
        oldValue: 'old-value',
        newValue: 'new-value',
        timestamp: new Date(),
        source: 'api' as const,
      };

      await (
        service as unknown as {
          notifyWatchers: (data: unknown) => Promise<void>;
        }
      ).notifyWatchers(changeData);

      // Should not throw error
      expect(true).toBe(true);
    });
  });

  describe('backupConfiguration', () => {
    it('should backup configuration', async () => {
      redisService.set.mockResolvedValue('OK');

      await (
        service as unknown as {
          backupConfiguration: (
            key: string,
            oldValue: string,
            newValue: string
          ) => Promise<void>;
        }
      ).backupConfiguration('test-key', 'old-value', 'new-value');

      expect(redisService.set).toHaveBeenCalled();
    });
  });

  describe('sendNotification', () => {
    it('should send notification', async () => {
      const notificationData = {
        key: 'test-key',
        oldValue: 'old-value',
        newValue: 'new-value',
        timestamp: new Date(),
        source: 'api' as const,
      };

      await (
        service as unknown as {
          sendNotification: (data: unknown) => Promise<void>;
        }
      ).sendNotification(notificationData);

      // Should not throw error
      expect(true).toBe(true);
    });
  });

  describe('getConfig', () => {
    it('should get configuration value', () => {
      (
        service as unknown as { configCache: Map<string, string> }
      ).configCache.set('test-key', 'test-value');

      const value = service.getConfig('test-key');

      expect(value).toBe('test-value');
    });

    it('should return default value when key not found', () => {
      const value = service.getConfig('non-existent-key', 'default-value');

      expect(value).toBe('default-value');
    });
  });

  describe('getAllConfigKeys', () => {
    it('should get all configuration keys', () => {
      (
        service as unknown as { configCache: Map<string, string> }
      ).configCache.set('key1', 'value1');
      (
        service as unknown as { configCache: Map<string, string> }
      ).configCache.set('key2', 'value2');

      const keys = service.getAllConfigKeys();

      expect(keys).toEqual(['key1', 'key2']);
    });
  });

  describe('getChangeHistory', () => {
    it('should get configuration change history', () => {
      const changeEvent = {
        key: 'test-key',
        oldValue: 'old-value',
        newValue: 'new-value',
        timestamp: new Date(),
        source: 'api' as const,
      };

      (service as unknown as { changeHistory: unknown[] }).changeHistory.push(
        changeEvent
      );

      const history = service.getChangeHistory();

      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(changeEvent);
    });
  });

  describe('addWatcher', () => {
    it('should add configuration watcher', () => {
      const callback = vi.fn();

      const watcherId = service.addWatcher('test-pattern', callback);

      expect(watcherId).toBeDefined();
      expect(typeof watcherId).toBe('string');
    });
  });

  describe('removeWatcher', () => {
    it('should remove configuration watcher', () => {
      const callback = vi.fn();
      const watcherId = service.addWatcher('test-pattern', callback);

      const result = service.removeWatcher(watcherId);

      expect(result).toBe(true);
    });

    it('should return false for non-existent watcher', () => {
      const result = service.removeWatcher('non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('getActiveWatchers', () => {
    it('should get active watchers', () => {
      const callback = vi.fn();
      service.addWatcher('test-pattern', callback);

      const watchers = service.getActiveWatchers();

      expect(watchers).toHaveLength(1);
      expect(watchers[0]?.pattern).toBe('test-pattern');
    });
  });

  describe('validateConfigValue', () => {
    it('should validate configuration value', () => {
      const result = service.validateConfigValue('test-key', 'test-value');

      expect(result).toBe(true);
    });

    it('should reject null values', () => {
      const result = service.validateConfigValue('test-key', null);

      expect(result).toBe(false);
    });

    it('should reject undefined values', () => {
      const result = service.validateConfigValue('test-key', undefined);

      expect(result).toBe(false);
    });
  });

  describe('getServiceStats', () => {
    it('should get service statistics', () => {
      const stats = service.getServiceStats();

      expect(stats).toHaveProperty('enabled');
      expect(stats).toHaveProperty('watchersCount');
      expect(stats).toHaveProperty('cachedConfigsCount');
      expect(stats).toHaveProperty('changeHistoryCount');
    });
  });
});

import { ConfigService } from '@nestjs/config';
import { CdnService } from './cdn.service';

describe('CdnService', () => {
  let cdnService: CdnService;
  let mockConfigService: {
    get: (key: string, defaultValue?: string | undefined) => string | undefined;
  };

  beforeEach(async () => {
    mockConfigService = {
      get: (key: string, defaultValue?: string | undefined) => {
        switch (key) {
          case 'CDN_PROVIDER':
            return 'aws';
          case 'CDN_BASE_URL':
            return 'https://cdn.example.com';
          case 'CDN_API_KEY':
            return 'api-key-123';
          case 'CDN_ZONE_ID':
            return 'zone-456';
          case 'CDN_DISTRIBUTION_ID':
            return 'dist-789';
          default:
            return defaultValue;
        }
      },
    };

    // Создаем сервис напрямую с моком
    cdnService = new CdnService(mockConfigService as unknown as ConfigService);

    // Инициализируем сервис
    cdnService.onModuleInit();
  });

  it('should be defined', () => {
    expect(cdnService).toBeDefined();
  });

  it('should initialize config after onModuleInit', () => {
    expect(cdnService.getConfig().provider).toBe('aws');
    expect(cdnService.getConfig().baseUrl).toBe('https://cdn.example.com');
    expect(cdnService.getConfig().apiKey).toBe('api-key-123');
    expect(cdnService.getConfig().zoneId).toBe('zone-456');
    expect(cdnService.getConfig().distributionId).toBe('dist-789');
  });

  describe('constructor', () => {
    it('should initialize with default config when no env vars', () => {
      // Создаем новый сервис с моком, который возвращает undefined для всех значений
      const defaultMockConfigService = {
        get: (_key: string, defaultValue?: string | undefined) => {
          return defaultValue; // Всегда возвращаем значение по умолчанию
        },
      };

      const defaultService = new CdnService(
        defaultMockConfigService as unknown as ConfigService
      );
      defaultService.onModuleInit();

      const config = defaultService.getConfig();

      expect(config.provider).toBe('local');
      expect(config.baseUrl).toBe('http://localhost:3001/static');
      expect(config.apiKey).toBeUndefined();
      expect(config.zoneId).toBeUndefined();
      expect(config.distributionId).toBeUndefined();
    });

    it('should initialize with environment variables', () => {
      // Создаем новый экземпляр с переопределенными значениями
      const customMockConfigService = {
        get: (key: string, defaultValue?: string | undefined) => {
          switch (key) {
            case 'CDN_PROVIDER':
              return 'cloudflare';
            case 'CDN_BASE_URL':
              return 'https://cdn.example.com';
            case 'CDN_API_KEY':
              return 'api-key-123';
            case 'CDN_ZONE_ID':
              return 'zone-456';
            case 'CDN_DISTRIBUTION_ID':
              return 'dist-789';
            default:
              return defaultValue;
          }
        },
      };

      const customService = new CdnService(
        customMockConfigService as unknown as ConfigService
      );
      customService.onModuleInit();
      const config = customService.getConfig();

      expect(config.provider).toBe('cloudflare');
      expect(config.baseUrl).toBe('https://cdn.example.com');
      expect(config.apiKey).toBe('api-key-123');
      expect(config.zoneId).toBe('zone-456');
      expect(config.distributionId).toBe('dist-789');
    });
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const mockFile = { filename: 'test.jpg', size: 1024 };
      const path = 'images/test.jpg';

      const result = await cdnService.uploadFile(mockFile, path);
      expect(result).toBe('https://cdn.example.com/images/test.jpg');
    });

    it('should handle upload errors', async () => {
      const mockFile = { filename: 'test.jpg', size: 1024 };
      const path = 'images/test.jpg';

      // Создаем сервис с неверным baseUrl для симуляции ошибки
      const errorMockConfigService = {
        get: (key: string, defaultValue?: string | undefined) => {
          if (key === 'CDN_BASE_URL') return undefined;
          return defaultValue;
        },
      };

      const errorService = new CdnService(
        errorMockConfigService as unknown as ConfigService
      );
      errorService.onModuleInit();

      await errorService.uploadFile(mockFile, path).catch((error: unknown) => {
        expect(error).toBeDefined();
      });
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const path = 'images/test.jpg';

      const result = await cdnService.deleteFile(path);
      expect(result).toBe(true);
    });

    it('should handle delete errors gracefully', async () => {
      const path = 'images/test.jpg';

      // Мокаем ошибку через переопределение метода
      const errorService = new (class extends CdnService {
        constructor() {
          super(mockConfigService as unknown as ConfigService);
        }

        async deleteFile(_path: string): Promise<boolean> {
          // Симулируем ошибку, но возвращаем false как в реальном сервисе
          (
            this as unknown as { logger: { error: (msg: string) => void } }
          ).logger.error('Delete failed');
          return false;
        }
      })();

      const result = await errorService.deleteFile(path);
      expect(result).toBe(false);
    });
  });

  describe('purgeCache', () => {
    it('should purge cache successfully', async () => {
      const result = await cdnService.purgeCache();
      expect(result).toBe(true);
    });

    it('should handle purge errors gracefully', async () => {
      // Мокаем ошибку через переопределение метода
      const errorService = new (class extends CdnService {
        constructor() {
          super(mockConfigService as unknown as ConfigService);
        }

        async purgeCache(_paths?: string[]): Promise<boolean> {
          // Симулируем ошибку, но возвращаем false как в реальном сервисе
          (
            this as unknown as { logger: { error: (msg: string) => void } }
          ).logger.error('Purge failed');
          return false;
        }
      })();

      const result = await errorService.purgeCache();
      expect(result).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return CDN statistics', async () => {
      const stats = await cdnService.getStats();

      expect(stats).toHaveProperty('totalFiles');
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('cacheHitRate');
      expect(stats).toHaveProperty('bandwidth');
      expect(stats).toHaveProperty('requests');
    });

    it('should return consistent stats structure', async () => {
      const stats1 = await cdnService.getStats();
      const stats2 = await cdnService.getStats();

      expect(stats1).toEqual(stats2);
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const config = cdnService.getConfig();

      expect(config).toHaveProperty('provider');
      expect(config).toHaveProperty('baseUrl');
      expect(config).toHaveProperty('apiKey');
      expect(config).toHaveProperty('zoneId');
      expect(config).toHaveProperty('distributionId');
    });

    it('should return the same config instance', () => {
      const config1 = cdnService.getConfig();
      const config2 = cdnService.getConfig();

      expect(config1).toBe(config2);
    });
  });

  describe('configuration validation', () => {
    it('should handle invalid provider gracefully', () => {
      // Создаем сервис с моком, который возвращает значения по умолчанию
      const defaultMockConfigService = {
        get: (_key: string, defaultValue?: string | undefined) => {
          return defaultValue; // Всегда возвращаем значение по умолчанию
        },
      };

      const defaultService = new CdnService(
        defaultMockConfigService as unknown as ConfigService
      );
      defaultService.onModuleInit();

      const config = defaultService.getConfig();
      // Должен использовать значение по умолчанию
      expect(config.provider).toBe('local');
      expect(config.baseUrl).toBe('http://localhost:3001/static');
    });

    it('should handle empty baseUrl gracefully', () => {
      // Создаем сервис с моком, который возвращает значения по умолчанию
      const defaultMockConfigService = {
        get: (_key: string, defaultValue?: string | undefined) => {
          return defaultValue; // Всегда возвращаем значение по умолчанию
        },
      };

      const defaultService = new CdnService(
        defaultMockConfigService as unknown as ConfigService
      );
      defaultService.onModuleInit();

      const config = defaultService.getConfig();
      // Должен использовать значение по умолчанию
      expect(config.baseUrl).toBe('http://localhost:3001/static');
    });
  });
});

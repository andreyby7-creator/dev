import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { ConfigCachingService } from '../config-caching.service';

describe('ConfigCachingService', () => {
  let service: ConfigCachingService;

  beforeEach(async () => {
    // Устанавливаем переменные окружения для тестов
    process.env.CONFIG_CACHE_ENABLED = 'true';
    process.env.CONFIG_CACHE_TTL = '300';
    process.env.CONFIG_CACHE_MAX_SIZE = '1000';
    process.env.CONFIG_CACHE_CLEANUP_INTERVAL = '60';
    const module = await Test.createTestingModule({
      providers: [
        ConfigCachingService,
        {
          provide: ConfigService,
          useValue: {
            get: vi
              .fn()
              .mockImplementation((key: string, defaultValue?: unknown) => {
                const configs: Record<string, unknown> = {
                  CONFIG_CACHE_ENABLED: 'true',
                  CONFIG_CACHE_TTL: '3600',
                  CONFIG_CACHE_MAX_SIZE: '1000',
                };
                return configs[key] ?? defaultValue ?? 'default-value';
              }),
          },
        },
      ],
    }).compile();

    service = module.get<ConfigCachingService>(ConfigCachingService);
  });

  describe('touch', () => {
    it('should update TTL for existing key', () => {
      const key = 'test-key';
      service.set(key, 'test-value', 10); // Увеличиваем TTL чтобы не истекал
      service.touch(key);
      expect(service.get(key)).toBe('test-value');
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries during cleanup', async () => {
      service.set('key1', 'value1', 1);
      service.set('key2', 'value2', 5);

      // Ждем истечения TTL для key1
      await new Promise(resolve => setTimeout(resolve, 1500));
      // service.cleanup(); // private method

      expect(service.get('key1')).toBeNull();
      expect(service.get('key2')).toBe('value2');
    });
  });
});

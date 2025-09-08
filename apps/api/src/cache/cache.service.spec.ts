import { vi } from 'vitest';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;
  let mockCacheManager: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
  };
  let mockRedis: {
    keys: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
    flushdb: ReturnType<typeof vi.fn>;
    ping: ReturnType<typeof vi.fn>;
    ttl: ReturnType<typeof vi.fn>;
    expire: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    dbsize: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockCacheManager = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    };

    mockRedis = {
      keys: vi.fn(),
      del: vi.fn(),
      flushdb: vi.fn(),
      ping: vi.fn(),
      ttl: vi.fn(),
      expire: vi.fn(),
      info: vi.fn(),
      dbsize: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should return cached value on hit', async () => {
      const mockValue = { data: 'test' };
      mockCacheManager.get.mockResolvedValue(mockValue);

      const result = await service.get('test-key');
      expect(result).toEqual(mockValue);
    });

    it('should return null on miss', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);

      const result = await service.get('test-key');
      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockCacheManager.get.mockRejectedValue(new Error('Redis error'));

      const result = await service.get('test-key');
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value in cache', async () => {
      mockCacheManager.set.mockResolvedValue(undefined);

      await expect(
        service.set('test-key', 'test-value')
      ).resolves.not.toThrow();
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'test-key',
        'test-value',
        undefined
      );
    });

    it('should set value with TTL', async () => {
      mockCacheManager.set.mockResolvedValue(undefined);

      await expect(
        service.set('test-key', 'test-value', 3600)
      ).resolves.not.toThrow();
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'test-key',
        'test-value',
        3600
      );
    });

    it('should handle errors gracefully', async () => {
      mockCacheManager.set.mockRejectedValue(new Error('Redis error'));

      await expect(
        service.set('test-key', 'test-value')
      ).resolves.not.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete key from cache', async () => {
      mockCacheManager.del.mockResolvedValue(undefined);

      await expect(service.delete('test-key')).resolves.not.toThrow();
      expect(mockCacheManager.del).toHaveBeenCalledWith('test-key');
    });

    it('should handle errors gracefully', async () => {
      mockCacheManager.del.mockRejectedValue(new Error('Redis error'));

      await expect(service.delete('test-key')).resolves.not.toThrow();
    });
  });

  describe('deleteByPattern', () => {
    it('should delete keys by pattern', async () => {
      const mockKeys = ['test-key-1', 'test-key-2', 'test-key-3'];
      mockRedis.keys.mockResolvedValue(mockKeys);
      mockRedis.del.mockResolvedValue(3);

      const result = await service.deleteByPattern('test-*');
      expect(result).toBe(3);
      expect(mockRedis.keys).toHaveBeenCalledWith('test-*');
      expect(mockRedis.del).toHaveBeenCalledWith(...mockKeys);
    });

    it('should return 0 when no keys match pattern', async () => {
      mockRedis.keys.mockResolvedValue([]);

      const result = await service.deleteByPattern('nonexistent-*');
      expect(result).toBe(0);
      expect(mockRedis.keys).toHaveBeenCalledWith('nonexistent-*');
    });

    it('should handle errors gracefully', async () => {
      mockRedis.keys.mockRejectedValue(new Error('Redis error'));

      const result = await service.deleteByPattern('test-*');
      expect(result).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all cache', async () => {
      mockRedis.flushdb.mockResolvedValue('OK');

      await expect(service.clear()).resolves.not.toThrow();
      expect(mockRedis.flushdb).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockRedis.flushdb.mockRejectedValue(new Error('Redis error'));

      await expect(service.clear()).resolves.not.toThrow();
    });
  });

  describe('getTTL', () => {
    it('should return TTL for key', async () => {
      mockRedis.ttl.mockResolvedValue(3600);

      const result = await service.getTTL('test-key');
      expect(result).toBe(3600);
      expect(mockRedis.ttl).toHaveBeenCalledWith('test-key');
    });

    it('should handle errors gracefully', async () => {
      mockRedis.ttl.mockRejectedValue(new Error('Redis error'));

      const result = await service.getTTL('test-key');
      expect(result).toBe(-1);
    });
  });

  describe('setTTL', () => {
    it('should set TTL for key', async () => {
      mockRedis.expire.mockResolvedValue(1);

      const result = await service.setTTL('test-key', 3600);
      expect(result).toBe(true);
      expect(mockRedis.expire).toHaveBeenCalledWith('test-key', 3600);
    });

    it('should return false on error', async () => {
      mockRedis.expire.mockRejectedValue(new Error('Redis error'));

      const result = await service.setTTL('test-key', 3600);
      expect(result).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      mockRedis.dbsize.mockResolvedValue(100);
      mockRedis.info.mockResolvedValueOnce('uptime_in_seconds:12345\r\n');
      mockRedis.info.mockResolvedValueOnce('used_memory_human:1.5M\r\n');

      const result = await service.getStats();
      expect(result).toHaveProperty('hits');
      expect(result).toHaveProperty('misses');
      expect(result).toHaveProperty('keys');
      expect(result).toHaveProperty('memory');
      expect(result).toHaveProperty('uptime');
    });

    it('should handle errors gracefully', async () => {
      mockRedis.info.mockRejectedValue(new Error('Redis error'));

      const result = await service.getStats();
      expect(result).toHaveProperty('hits');
      expect(result).toHaveProperty('misses');
      expect(result.keys).toBe(0);
      expect(result.memory).toBe('0B');
      expect(result.uptime).toBe(0);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      mockRedis.ping.mockResolvedValue('PONG');

      const result = await service.healthCheck();
      expect(result.status).toBe('healthy');
      expect(result.message).toBe('Redis connection is healthy');
    });

    it('should return unhealthy status on error', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Redis error'));

      const result = await service.healthCheck();
      expect(result.status).toBe('unhealthy');
      expect(result.message).toBe('Redis connection failed');
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return performance metrics', async () => {
      mockRedis.ping.mockResolvedValue('PONG');

      const result = await service.getPerformanceMetrics();
      expect(result).toHaveProperty('responseTime');
      expect(result).toHaveProperty('throughput');
      expect(result).toHaveProperty('errorRate');
    });

    it('should handle errors gracefully', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Redis error'));

      const result = await service.getPerformanceMetrics();
      expect(result.responseTime).toBe(-1);
      expect(result.throughput).toBe(0);
      expect(result.errorRate).toBe(1);
    });
  });
});

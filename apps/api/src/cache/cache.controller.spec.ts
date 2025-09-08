import { vi } from 'vitest';
import { CacheController } from './cache.controller';
import { CacheService } from './cache.service';

describe('CacheController', () => {
  let controller: CacheController;
  let mockCacheService: {
    healthCheck: ReturnType<typeof vi.fn>;
    getStats: ReturnType<typeof vi.fn>;
    getPerformanceMetrics: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    getTTL: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    setTTL: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    deleteByPattern: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
    setDemoData: ReturnType<typeof vi.fn>;
    getDemoData: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockCacheService = {
      healthCheck: vi.fn(),
      getStats: vi.fn(),
      getPerformanceMetrics: vi.fn(),
      get: vi.fn(),
      getTTL: vi.fn(),
      set: vi.fn(),
      setTTL: vi.fn(),
      delete: vi.fn(),
      deleteByPattern: vi.fn(),
      clear: vi.fn(),
      setDemoData: vi.fn(),
      getDemoData: vi.fn(),
    };

    controller = new CacheController(
      mockCacheService as unknown as CacheService
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      const mockHealth = {
        status: 'healthy',
        message: 'Redis connection is healthy',
      };
      mockCacheService.healthCheck.mockResolvedValue(mockHealth);

      const result = await controller.healthCheck();
      expect(result).toEqual(mockHealth);
      expect(mockCacheService.healthCheck).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      const mockStats = {
        hits: 100,
        misses: 20,
        keys: 50,
        memory: '1.5M',
        uptime: 3600,
      };
      mockCacheService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();
      expect(result).toEqual(mockStats);
      expect(mockCacheService.getStats).toHaveBeenCalled();
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return performance metrics', async () => {
      const mockMetrics = {
        responseTime: 15,
        throughput: 120,
        errorRate: 0.1,
      };
      mockCacheService.getPerformanceMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getPerformanceMetrics();
      expect(result).toEqual(mockMetrics);
      expect(mockCacheService.getPerformanceMetrics).toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('should return cached value', async () => {
      const mockValue = { data: 'test' };
      mockCacheService.get.mockResolvedValue(mockValue);

      const result = await controller.get('test-key');
      expect(result).toEqual({ key: 'test-key', value: mockValue });
      expect(mockCacheService.get).toHaveBeenCalledWith('test-key');
    });

    it('should return not found message for missing key', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const result = await controller.get('missing-key');
      expect(result).toEqual({ message: 'Key not found', key: 'missing-key' });
    });
  });

  describe('getTTL', () => {
    it('should return TTL for key', async () => {
      mockCacheService.getTTL.mockResolvedValue(3600);

      const result = await controller.getTTL('test-key');
      expect(result).toEqual({ key: 'test-key', ttl: 3600 });
      expect(mockCacheService.getTTL).toHaveBeenCalledWith('test-key');
    });
  });

  describe('set', () => {
    it('should set value in cache', async () => {
      const dto = { key: 'test-key', value: 'test-value', ttl: 3600 };
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await controller.set(dto);
      expect(result).toEqual({
        message: 'Value set successfully',
        key: 'test-key',
      });
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'test-key',
        'test-value',
        3600
      );
    });
  });

  describe('setTTL', () => {
    it('should set TTL for key', async () => {
      mockCacheService.setTTL.mockResolvedValue(true);

      const result = await controller.setTTL('test-key', 3600);
      expect(result).toEqual({ key: 'test-key', ttl: 3600, success: true });
      expect(mockCacheService.setTTL).toHaveBeenCalledWith('test-key', 3600);
    });
  });

  describe('delete', () => {
    it('should delete key from cache', async () => {
      mockCacheService.delete.mockResolvedValue(undefined);

      const result = await controller.delete('test-key');
      expect(result).toEqual({
        message: 'Key deleted successfully',
        key: 'test-key',
      });
      expect(mockCacheService.delete).toHaveBeenCalledWith('test-key');
    });
  });

  describe('deleteByPattern', () => {
    it('should delete keys by pattern', async () => {
      const dto = { pattern: 'test-*' };
      mockCacheService.deleteByPattern.mockResolvedValue(5);

      const result = await controller.deleteByPattern(dto);
      expect(result).toEqual({
        message: 'Keys deleted successfully',
        pattern: 'test-*',
        deleted: 5,
      });
      expect(mockCacheService.deleteByPattern).toHaveBeenCalledWith('test-*');
    });
  });

  describe('clear', () => {
    it('should clear all cache', async () => {
      mockCacheService.clear.mockResolvedValue(undefined);

      const result = await controller.clear();
      expect(result).toEqual({ message: 'Cache cleared successfully' });
      expect(mockCacheService.clear).toHaveBeenCalled();
    });
  });

  describe('setDemoData', () => {
    it('should set demo data in cache', async () => {
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await controller.setDemoData();
      expect(result).toEqual({
        message: 'Demo data set successfully',
        keys: ['demo:data', 'demo:users', 'demo:cards'],
      });
      expect(mockCacheService.set).toHaveBeenCalledTimes(3);
    });
  });

  describe('getDemoData', () => {
    it('should return demo data from cache', async () => {
      const mockData = { users: [], cards: [] };
      const mockStats = {
        hits: 100,
        misses: 20,
        keys: 50,
        memory: '1.5M',
        uptime: 3600,
      };

      mockCacheService.get
        .mockResolvedValueOnce(mockData)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockCacheService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getDemoData();
      expect(result).toEqual({
        data: mockData,
        users: [],
        cards: [],
        cacheStats: mockStats,
      });
      expect(mockCacheService.get).toHaveBeenCalledTimes(3);
      expect(mockCacheService.getStats).toHaveBeenCalled();
    });
  });
});

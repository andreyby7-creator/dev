import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { RedisService } from './redis.service';

describe('RedisService', () => {
  let service: RedisService;
  let mockRedisClient: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
    exists: ReturnType<typeof vi.fn>;
    expire: ReturnType<typeof vi.fn>;
    ttl: ReturnType<typeof vi.fn>;
    keys: ReturnType<typeof vi.fn>;
    flushall: ReturnType<typeof vi.fn>;
    ping: ReturnType<typeof vi.fn>;
    quit: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockRedisClient = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      exists: vi.fn(),
      expire: vi.fn(),
      ttl: vi.fn(),
      keys: vi.fn(),
      flushall: vi.fn(),
      ping: vi.fn(),
      quit: vi.fn(),
      on: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedisClient,
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getClient', () => {
    it('should return Redis client instance', () => {
      const client = service.getClient();

      expect(client).toBe(mockRedisClient);
    });
  });

  describe('get', () => {
    it('should get value by key', async () => {
      const key = 'test-key';
      const value = 'test-value';
      mockRedisClient.get.mockResolvedValue(value);

      const result = await service.get(key);

      expect(result).toBe(value);
      expect(mockRedisClient.get).toHaveBeenCalledWith(key);
    });

    it('should handle Redis errors gracefully', async () => {
      const key = 'test-key';
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

      const result = await service.get(key);

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set key-value pair', async () => {
      const key = 'test-key';
      const value = 'test-value';
      mockRedisClient.set.mockResolvedValue('OK');

      const result = await service.set(key, value);

      expect(result).toBe('OK');
      expect(mockRedisClient.set).toHaveBeenCalledWith(key, value);
    });

    it('should set key-value pair with TTL', async () => {
      const key = 'test-key';
      const value = 'test-value';
      const ttl = 3600;
      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.expire.mockResolvedValue(1);

      const result = await service.set(key, value, ttl);

      expect(result).toBe('OK');
      expect(mockRedisClient.set).toHaveBeenCalledWith(key, value);
      expect(mockRedisClient.expire).toHaveBeenCalledWith(key, ttl);
    });

    it('should handle Redis errors', async () => {
      const key = 'test-key';
      const value = 'test-value';
      mockRedisClient.set.mockRejectedValue(new Error('Redis error'));

      await expect(service.set(key, value)).rejects.toThrow(
        'Redis set operation failed'
      );
    });
  });

  describe('del', () => {
    it('should delete key', async () => {
      const key = 'test-key';
      mockRedisClient.del.mockResolvedValue(1);

      const result = await service.del(key);

      expect(result).toBe(1);
      expect(mockRedisClient.del).toHaveBeenCalledWith(key);
    });

    it('should handle Redis errors gracefully', async () => {
      const key = 'test-key';
      mockRedisClient.del.mockRejectedValue(new Error('Redis error'));

      const result = await service.del(key);

      expect(result).toBe(0);
    });
  });

  describe('exists', () => {
    it('should check if key exists', async () => {
      const key = 'test-key';
      mockRedisClient.exists.mockResolvedValue(1);

      const result = await service.exists(key);

      expect(result).toBe(1);
      expect(mockRedisClient.exists).toHaveBeenCalledWith(key);
    });

    it('should handle Redis errors gracefully', async () => {
      const key = 'test-key';
      mockRedisClient.exists.mockRejectedValue(new Error('Redis error'));

      const result = await service.exists(key);

      expect(result).toBe(0);
    });
  });

  describe('expire', () => {
    it('should set TTL for key', async () => {
      const key = 'test-key';
      const ttl = 3600;
      mockRedisClient.expire.mockResolvedValue(1);

      const result = await service.expire(key, ttl);

      expect(result).toBe(1);
      expect(mockRedisClient.expire).toHaveBeenCalledWith(key, ttl);
    });

    it('should handle Redis errors gracefully', async () => {
      const key = 'test-key';
      const ttl = 3600;
      mockRedisClient.expire.mockRejectedValue(new Error('Redis error'));

      const result = await service.expire(key, ttl);

      expect(result).toBe(0);
    });
  });

  describe('ttl', () => {
    it('should get TTL for key', async () => {
      const key = 'test-key';
      mockRedisClient.ttl.mockResolvedValue(3600);

      const result = await service.ttl(key);

      expect(result).toBe(3600);
      expect(mockRedisClient.ttl).toHaveBeenCalledWith(key);
    });

    it('should handle Redis errors gracefully', async () => {
      const key = 'test-key';
      mockRedisClient.ttl.mockRejectedValue(new Error('Redis error'));

      const result = await service.ttl(key);

      expect(result).toBe(-1);
    });
  });

  describe('keys', () => {
    it('should get keys by pattern', async () => {
      const pattern = 'test-*';
      const keys = ['test-1', 'test-2'];
      mockRedisClient.keys.mockResolvedValue(keys);

      const result = await service.keys(pattern);

      expect(result).toEqual(keys);
      expect(mockRedisClient.keys).toHaveBeenCalledWith(pattern);
    });

    it('should handle Redis errors gracefully', async () => {
      const pattern = 'test-*';
      mockRedisClient.keys.mockRejectedValue(new Error('Redis error'));

      const result = await service.keys(pattern);

      expect(result).toEqual([]);
    });
  });

  describe('flushall', () => {
    it('should flush all keys', async () => {
      mockRedisClient.flushall.mockResolvedValue('OK');

      const result = await service.flushall();

      expect(result).toBe('OK');
      expect(mockRedisClient.flushall).toHaveBeenCalled();
    });

    it('should handle Redis errors', async () => {
      mockRedisClient.flushall.mockRejectedValue(new Error('Redis error'));

      await expect(service.flushall()).rejects.toThrow(
        'Redis flush operation failed'
      );
    });
  });

  describe('ping', () => {
    it('should ping Redis server', async () => {
      mockRedisClient.ping.mockResolvedValue('PONG');

      const result = await service.ping();

      expect(result).toBe('PONG');
      expect(mockRedisClient.ping).toHaveBeenCalled();
    });

    it('should handle Redis errors', async () => {
      mockRedisClient.ping.mockRejectedValue(new Error('Redis error'));

      await expect(service.ping()).rejects.toThrow(
        'Redis ping operation failed'
      );
    });
  });

  describe('connect', () => {
    it('should connect to Redis', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);

      await service.connect();

      expect(mockRedisClient.connect).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      mockRedisClient.connect.mockRejectedValue(new Error('Connection failed'));

      await expect(service.connect()).rejects.toThrow(
        'Redis connection failed'
      );
    });
  });

  describe('disconnect', () => {
    it('should disconnect from Redis', async () => {
      mockRedisClient.disconnect.mockResolvedValue(undefined);

      await service.disconnect();

      expect(mockRedisClient.disconnect).toHaveBeenCalled();
    });

    it('should handle disconnection errors', async () => {
      mockRedisClient.disconnect.mockRejectedValue(
        new Error('Disconnection failed')
      );

      await expect(service.disconnect()).rejects.toThrow(
        'Redis disconnection failed'
      );
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when Redis is connected', async () => {
      mockRedisClient.ping.mockResolvedValue('PONG');

      const health = await service.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.latency).toBeDefined();
      expect(typeof health.latency).toBe('number');
    });

    it('should return unhealthy status when ping fails', async () => {
      mockRedisClient.ping.mockRejectedValue(new Error('Redis error'));

      const health = await service.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.latency).toBeUndefined();
    });
  });

  describe('getInfo', () => {
    it('should return Redis info when connected', async () => {
      mockRedisClient.ping.mockResolvedValue('PONG');

      const info = await service.getInfo();

      expect(info.connected).toBe(true);
      expect(info.clientType).toBe('mock');
      expect(info.version).toBe('1.0.0');
    });

    it('should return Redis info when not connected', async () => {
      mockRedisClient.ping.mockRejectedValue(new Error('Redis error'));

      const info = await service.getInfo();

      expect(info.connected).toBe(false);
      expect(info.clientType).toBe('unknown');
      expect(info.version).toBeUndefined();
    });
  });
});

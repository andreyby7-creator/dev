import { Inject, Injectable, Logger } from '@nestjs/common';

export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<string>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  expire(key: string, ttl: number): Promise<number>;
  ttl(key: string): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  flushall(): Promise<string>;
  ping(): Promise<string>;
  on(event: string, callback: (...args: unknown[]) => void): void;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);

  constructor(
    @Inject('REDIS_CLIENT') private readonly redisClient: RedisClient
  ) {}

  /**
   * Get Redis client instance
   */
  getClient(): RedisClient {
    return this.redisClient;
  }

  /**
   * Get value by key
   */
  async get(key: string): Promise<string | null> {
    try {
      return await this.redisClient.get(key);
    } catch {
      this.logger.error(`Error getting key ${key}`);
      return null;
    }
  }

  /**
   * Set key-value pair with optional TTL
   */
  async set(key: string, value: string, ttl?: number): Promise<string> {
    try {
      const result = await this.redisClient.set(key, value);

      if (ttl != null && ttl > 0) {
        await this.redisClient.expire(key, ttl);
      }

      return result;
    } catch {
      this.logger.error(`Error setting key ${key}`);
      throw new Error('Redis set operation failed');
    }
  }

  /**
   * Delete key
   */
  async del(key: string): Promise<number> {
    try {
      return await this.redisClient.del(key);
    } catch {
      this.logger.error(`Error deleting key ${key}`);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<number> {
    try {
      return await this.redisClient.exists(key);
    } catch {
      this.logger.error(`Error checking existence of key ${key}`);
      return 0;
    }
  }

  /**
   * Set TTL for key
   */
  async expire(key: string, ttl: number): Promise<number> {
    try {
      return await this.redisClient.expire(key, ttl);
    } catch {
      this.logger.error(`Error setting TTL for key ${key}`);
      return 0;
    }
  }

  /**
   * Get TTL for key
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.redisClient.ttl(key);
    } catch {
      this.logger.error(`Error getting TTL for key ${key}`);
      return -1;
    }
  }

  /**
   * Get keys by pattern
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.redisClient.keys(pattern);
    } catch {
      this.logger.error(`Error getting keys for pattern ${pattern}`);
      return [];
    }
  }

  /**
   * Flush all keys
   */
  async flushall(): Promise<string> {
    try {
      return await this.redisClient.flushall();
    } catch {
      this.logger.error('Error flushing all keys');
      throw new Error('Redis flush operation failed');
    }
  }

  /**
   * Ping Redis server
   */
  async ping(): Promise<string> {
    try {
      return await this.redisClient.ping();
    } catch {
      this.logger.error('Error pinging Redis');
      throw new Error('Redis ping operation failed');
    }
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    try {
      await this.redisClient.connect();
      this.logger.log('Connected to Redis');
    } catch {
      this.logger.error('Error connecting to Redis');
      throw new Error('Redis connection failed');
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      await this.redisClient.disconnect();
      this.logger.log('Disconnected from Redis');
    } catch {
      this.logger.error('Error disconnecting from Redis');
      throw new Error('Redis disconnection failed');
    }
  }

  /**
   * Health check for Redis
   */
  async healthCheck(): Promise<{ status: string; latency?: number }> {
    try {
      const startTime = Date.now();
      await this.redisClient.ping();
      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        latency,
      };
    } catch {
      this.logger.error('Redis health check failed');
      return {
        status: 'unhealthy',
      };
    }
  }

  /**
   * Get Redis info
   */
  async getInfo(): Promise<{
    connected: boolean;
    clientType: string;
    version?: string;
  }> {
    try {
      await this.redisClient.ping();

      return {
        connected: true,
        clientType: 'mock', // В продакшене это будет реальный тип клиента
        version: '1.0.0',
      };
    } catch {
      return {
        connected: false,
        clientType: 'unknown',
      };
    }
  }
}

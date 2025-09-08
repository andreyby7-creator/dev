import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import type Redis from 'ioredis';

export interface ICacheStats {
  hits: number;
  misses: number;
  keys: number;
  memory: string;
  uptime: number;
}

export interface ICacheItem<T = unknown> {
  key: string;
  value: T;
  ttl?: number;
  createdAt: Date;
  expiresAt?: Date;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private stats = {
    hits: 0,
    misses: 0,
  };

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject('REDIS_CLIENT') private readonly redis: Redis
  ) {}

  // Базовые CRUD операции
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value !== undefined && value !== null) {
        this.stats.hits++;
        this.logger.debug(`Cache HIT: ${key}`);
        return value;
      } else {
        this.stats.misses++;
        this.logger.debug(`Cache MISS: ${key}`);
        return null;
      }
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
      this.logger.debug(`Cache SET: ${key} (TTL: ${ttl ?? 'default'}s)`);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache DELETE: ${key}`);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async deleteByPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        const deleted = await this.redis.del(...keys);
        this.logger.debug(`Cache DELETE PATTERN: ${pattern} (${deleted} keys)`);
        return deleted;
      }
      return 0;
    } catch (error) {
      this.logger.error(`Cache delete pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  async clear(): Promise<void> {
    try {
      await this.redis.flushdb();
      this.logger.debug('Cache CLEAR: all keys');
    } catch (error) {
      this.logger.error('Cache clear error:', error);
    }
  }

  // TTL операции
  async getTTL(key: string): Promise<number> {
    try {
      const ttl = await this.redis.ttl(key);
      return ttl;
    } catch (error) {
      this.logger.error(`Cache TTL error for key ${key}:`, error);
      return -1;
    }
  }

  async setTTL(key: string, ttl: number): Promise<boolean> {
    try {
      const result = await this.redis.expire(key, ttl);
      this.logger.debug(`Cache SET TTL: ${key} -> ${ttl}s`);
      return result === 1;
    } catch (error) {
      this.logger.error(`Cache set TTL error for key ${key}:`, error);
      return false;
    }
  }

  // Статистика и мониторинг
  async getStats(): Promise<ICacheStats> {
    try {
      const info = await this.redis.info('stats');
      const keys = await this.redis.dbsize();
      const memory = await this.redis.info('memory');

      // Парсим статистику Redis
      const stats = this.parseRedisInfo(info);
      const memoryInfo = this.parseRedisMemory(memory);

      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        keys,
        memory: memoryInfo.used_memory_human ?? '0B',
        uptime: stats.uptime_in_seconds ?? 0,
      };
    } catch (error) {
      this.logger.error('Cache stats error:', error);
      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        keys: 0,
        memory: '0B',
        uptime: 0,
      };
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; message: string }> {
    try {
      await this.redis.ping();
      return { status: 'healthy', message: 'Redis connection is healthy' };
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      return { status: 'unhealthy', message: 'Redis connection failed' };
    }
  }

  // Утилиты
  private parseRedisInfo(info: string): Record<string, number> {
    const stats: Record<string, number> = {};
    const lines = info.split('\r\n');

    for (const line of lines) {
      const [key, value] = line.split(':');
      if (
        key != null &&
        key !== '' &&
        value != null &&
        value !== '' &&
        !Number.isNaN(Number(value))
      ) {
        stats[key] = Number(value);
      }
    }

    return stats;
  }

  private parseRedisMemory(memory: string): Record<string, string> {
    const memoryInfo: Record<string, string> = {};
    const lines = memory.split('\r\n');

    for (const line of lines) {
      const [key, value] = line.split(':');
      if (key != null && key !== '' && value != null && value !== '') {
        memoryInfo[key] = value;
      }
    }

    return memoryInfo;
  }

  // Performance monitoring
  async getPerformanceMetrics(): Promise<{
    responseTime: number;
    throughput: number;
    errorRate: number;
  }> {
    try {
      const start = Date.now();
      await this.redis.ping();
      const responseTime = Date.now() - start;

      const total = this.stats.hits + this.stats.misses;
      const hitRate = total > 0 ? this.stats.hits / total : 0;
      const errorRate = 1 - hitRate;

      return {
        responseTime,
        throughput: total,
        errorRate,
      };
    } catch (error) {
      this.logger.error('Performance metrics error:', error);
      return {
        responseTime: -1,
        throughput: 0,
        errorRate: 1,
      };
    }
  }
}

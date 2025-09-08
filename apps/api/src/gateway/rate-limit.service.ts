import { Injectable, Logger, Inject } from '@nestjs/common';
import Redis from 'ioredis';

export interface IRateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface IRateLimitInfo {
  remaining: number;
  resetTime: Date;
  totalRequests: number;
  blocked: boolean;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async checkRateLimit(
    key: string,
    config: IRateLimitConfig
  ): Promise<IRateLimitInfo> {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    const windowKey = `rate_limit:${key}:${Math.floor(now / config.windowMs)}`;

    try {
      // Получаем текущие запросы в окне
      const requests = await this.redis.zrangebyscore(
        windowKey,
        windowStart,
        '+inf'
      );

      const currentRequests = requests.length;
      const remaining = Math.max(0, config.maxRequests - currentRequests);
      const blocked = currentRequests >= config.maxRequests;

      // Добавляем текущий запрос
      if (!blocked) {
        await this.redis.zadd(windowKey, now, `${now}-${Math.random()}`);
        await this.redis.expire(windowKey, Math.ceil(config.windowMs / 1000));
      }

      const resetTime = new Date(now + config.windowMs);

      this.logger.debug(
        `Rate limit check for ${key}: ${currentRequests}/${config.maxRequests} requests`
      );

      return {
        remaining,
        resetTime,
        totalRequests: currentRequests,
        blocked,
      };
    } catch (error) {
      this.logger.error('Rate limit check error:', error);
      // В случае ошибки Redis, разрешаем запрос
      return {
        remaining: config.maxRequests,
        resetTime: new Date(now + config.windowMs),
        totalRequests: 0,
        blocked: false,
      };
    }
  }

  async checkApiKeyRateLimit(apiKey: string): Promise<IRateLimitInfo> {
    const config: IRateLimitConfig = {
      windowMs: 60000, // 1 минута
      maxRequests: 100, // 100 запросов в минуту
    };

    return this.checkRateLimit(`api_key:${apiKey}`, config);
  }

  async checkHourlyRateLimit(apiKey: string): Promise<IRateLimitInfo> {
    const config: IRateLimitConfig = {
      windowMs: 3600000, // 1 час
      maxRequests: 1000, // 1000 запросов в час
    };

    return this.checkRateLimit(`hourly:${apiKey}`, config);
  }

  async checkUserRateLimit(userId: string): Promise<IRateLimitInfo> {
    const config: IRateLimitConfig = {
      windowMs: 60000, // 1 минута
      maxRequests: 50, // 50 запросов в минуту для пользователей
    };

    return this.checkRateLimit(`user:${userId}`, config);
  }

  async checkIpRateLimit(ip: string): Promise<IRateLimitInfo> {
    const config: IRateLimitConfig = {
      windowMs: 60000, // 1 минута
      maxRequests: 30, // 30 запросов в минуту с одного IP
    };

    return this.checkRateLimit(`ip:${ip}`, config);
  }

  async resetRateLimit(key: string): Promise<boolean> {
    try {
      const pattern = `rate_limit:${key}:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.debug(`Rate limit reset for ${key}`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error('Rate limit reset error:', error);
      return false;
    }
  }

  async getRateLimitStats(key: string): Promise<{
    totalRequests: number;
    blockedRequests: number;
    averageRequestsPerMinute: number;
  }> {
    try {
      const pattern = `rate_limit:${key}:*`;
      const keys = await this.redis.keys(pattern);

      let totalRequests = 0;
      let blockedRequests = 0;

      for (const key of keys) {
        const requests = await this.redis.zcard(key);
        totalRequests += requests;

        // Примерная оценка заблокированных запросов
        const config = this.getConfigForKey(key);
        if (config && requests >= config.maxRequests) {
          blockedRequests += requests - config.maxRequests;
        }
      }

      const averageRequestsPerMinute =
        keys.length > 0 ? totalRequests / keys.length : 0;

      return {
        totalRequests,
        blockedRequests,
        averageRequestsPerMinute,
      };
    } catch (error) {
      this.logger.error('Rate limit stats error:', error);
      return {
        totalRequests: 0,
        blockedRequests: 0,
        averageRequestsPerMinute: 0,
      };
    }
  }

  private getConfigForKey(key: string): IRateLimitConfig | null {
    if (key.includes('api_key:')) {
      return { windowMs: 60000, maxRequests: 100 };
    } else if (key.includes('hourly:')) {
      return { windowMs: 3600000, maxRequests: 1000 };
    } else if (key.includes('user:')) {
      return { windowMs: 60000, maxRequests: 50 };
    } else if (key.includes('ip:')) {
      return { windowMs: 60000, maxRequests: 30 };
    }
    return null;
  }

  // Health check для rate limiting
  async healthCheck(): Promise<{ status: string; redisConnected: boolean }> {
    try {
      await this.redis.ping();
      return { status: 'healthy', redisConnected: true };
    } catch (error) {
      this.logger.error('Rate limit health check failed:', error);
      return { status: 'unhealthy', redisConnected: false };
    }
  }
}

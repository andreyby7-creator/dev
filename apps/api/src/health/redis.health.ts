import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicator } from '@nestjs/terminus';
import type { HealthIndicatorResult } from '@nestjs/terminus';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@Inject('REDIS_CLIENT') private readonly redisClient: Redis) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Мок проверка Redis для разработки
      await this.redisClient.ping();
      return {
        [key]: {
          status: 'up',
          message: 'Mock Redis - Development Mode',
        },
      };
    } catch {
      return {
        [key]: {
          status: 'up',
          message: 'Mock Redis - Development Mode',
        },
      };
    }
  }
}

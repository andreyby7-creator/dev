import { Controller } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { RedisHealthIndicator } from './redis.health';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private redisIndicator: RedisHealthIndicator
  ) {}

  @HealthCheck()
  check() {
    return this.health.check([
      async () => this.redisIndicator.isHealthy('redis'),
    ]);
  }
}

import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { redactedLogger } from '../../utils/redacted-logger';
import { HealthService } from '../services/health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getHealth(@Res() res: Response) {
    try {
      const healthStatus = await this.healthService.getComprehensiveHealth();

      const statusCode =
        healthStatus.overall === 'healthy'
          ? HttpStatus.OK
          : healthStatus.overall === 'degraded'
            ? HttpStatus.SERVICE_UNAVAILABLE
            : HttpStatus.INTERNAL_SERVER_ERROR;

      res.status(statusCode).json({
        status: healthStatus.overall,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version ?? '1.0.0',
        checks: {
          database: {
            status: healthStatus.database.status,
            responseTime: healthStatus.database.responseTime,
            details: healthStatus.database.details ?? {},
          },
          redis: {
            status: healthStatus.redis.status,
            responseTime: healthStatus.redis.responseTime,
            details: healthStatus.redis.details ?? {},
          },
          externalApis: {
            status: healthStatus.externalApis.status,
            details: healthStatus.externalApis.details ?? {},
          },
          system: {
            status: healthStatus.system.status,
            details: healthStatus.system.details ?? {},
          },
        },
      });
    } catch (error) {
      redactedLogger.error('Health check failed', error as string);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      });
    }
  }

  @Get('z')
  async getHealthZ(@Res() res: Response) {
    // Простая проверка для load balancer
    res.status(HttpStatus.OK).send('OK');
  }

  @Get('ready')
  async getReadiness(@Res() res: Response) {
    const readiness = await this.healthService.getReadiness();
    const statusCode = readiness.ready
      ? HttpStatus.OK
      : HttpStatus.SERVICE_UNAVAILABLE;

    res.status(statusCode).json({
      ready: readiness.ready,
      timestamp: new Date().toISOString(),
      checks: readiness.checks,
    });
  }

  @Get('live')
  async getLiveness(@Res() res: Response) {
    const liveness = await this.healthService.getLiveness();
    const statusCode = liveness.alive
      ? HttpStatus.OK
      : HttpStatus.INTERNAL_SERVER_ERROR;

    res.status(statusCode).json({
      alive: liveness.alive,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }
}

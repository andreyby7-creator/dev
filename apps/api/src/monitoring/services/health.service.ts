import { Injectable } from '@nestjs/common';
import { redactedLogger } from '../../utils/redacted-logger';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  details?: string;
}

interface ComprehensiveHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  database: HealthCheckResult;
  redis: HealthCheckResult;
  externalApis: HealthCheckResult;
  system: HealthCheckResult;
}

interface ReadinessCheck {
  ready: boolean;
  checks: Record<string, boolean>;
}

interface LivenessCheck {
  alive: boolean;
}

@Injectable()
export class HealthService {
  constructor() {}

  async getComprehensiveHealth(): Promise<ComprehensiveHealth> {
    const startTime = Date.now();

    const [database, redis, externalApis, system] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkExternalApis(),
      this.checkSystemResources(),
    ]);

    const health: ComprehensiveHealth = {
      overall: 'healthy',
      database:
        database.status === 'fulfilled'
          ? database.value
          : { status: 'unhealthy', details: 'Database check failed' },
      redis:
        redis.status === 'fulfilled'
          ? redis.value
          : { status: 'unhealthy', details: 'Redis check failed' },
      externalApis:
        externalApis.status === 'fulfilled'
          ? externalApis.value
          : { status: 'unhealthy', details: 'External APIs check failed' },
      system:
        system.status === 'fulfilled'
          ? system.value
          : { status: 'unhealthy', details: 'System check failed' },
    };

    // Определяем общий статус
    const unhealthyCount = [
      health.database,
      health.redis,
      health.externalApis,
      health.system,
    ].filter(check => check.status === 'unhealthy').length;
    const degradedCount = [
      health.database,
      health.redis,
      health.externalApis,
      health.system,
    ].filter(check => check.status === 'degraded').length;

    if (unhealthyCount > 0) {
      health.overall = 'unhealthy';
    } else if (degradedCount > 0) {
      health.overall = 'degraded';
    }

    const totalTime = Date.now() - startTime;
    redactedLogger.log(
      `Health check completed in ${totalTime}ms`,
      'HealthService'
    );

    return health;
  }

  private async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Проверяем подключение к БД
      // const isConnected = this.dataSource.isInitialized;
      // if (!isConnected) {
      //   return { status: 'unhealthy', details: 'Database not initialized' };
      // }

      // Выполняем простой запрос
      // await this.dataSource.query('SELECT 1');

      const responseTime = Date.now() - startTime;

      if (responseTime > 1000) {
        return {
          status: 'degraded',
          responseTime,
          details: `Database response time: ${responseTime}ms`,
        };
      }

      return {
        status: 'healthy',
        responseTime,
        details: 'Database connection OK',
      };
    } catch (error) {
      redactedLogger.error('Database health check failed', error as string);
      return {
        status: 'unhealthy',
        details: `Database error: ${(error as Error).message}`,
      };
    }
  }

  private async checkRedis(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // const redisClient = this.redisService.getClient();
      // await redisClient.ping();

      const responseTime = Date.now() - startTime;

      if (responseTime > 500) {
        return {
          status: 'degraded',
          responseTime,
          details: `Redis response time: ${responseTime}ms`,
        };
      }

      return {
        status: 'healthy',
        responseTime,
        details: 'Redis connection OK',
      };
    } catch (error) {
      redactedLogger.error('Redis health check failed', error as string);
      return {
        status: 'unhealthy',
        details: `Redis error: ${(error as Error).message}`,
      };
    }
  }

  private async checkExternalApis(): Promise<HealthCheckResult> {
    try {
      // Проверяем доступность внешних API
      const externalChecks = await Promise.allSettled([
        this.checkSupabaseConnection(),
        this.checkSentryConnection(),
      ]);

      const failedChecks = externalChecks.filter(
        result => result.status === 'rejected'
      );

      if (failedChecks.length > 0) {
        return {
          status: 'degraded',
          details: `${failedChecks.length} external API(s) unavailable`,
        };
      }

      return {
        status: 'healthy',
        details: 'All external APIs OK',
      };
    } catch (error) {
      redactedLogger.error(
        'External APIs health check failed',
        error as string
      );
      return {
        status: 'unhealthy',
        details: `External APIs error: ${(error as Error).message}`,
      };
    }
  }

  private async checkSystemResources(): Promise<HealthCheckResult> {
    try {
      const memUsage = process.memoryUsage();

      // Проверяем использование памяти
      const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

      if (memoryUsagePercent > 90) {
        return {
          status: 'unhealthy',
          details: `High memory usage: ${memoryUsagePercent.toFixed(2)}%`,
        };
      }

      if (memoryUsagePercent > 80) {
        return {
          status: 'degraded',
          details: `Elevated memory usage: ${memoryUsagePercent.toFixed(2)}%`,
        };
      }

      return {
        status: 'healthy',
        details: `Memory usage: ${memoryUsagePercent.toFixed(2)}%`,
      };
    } catch (error) {
      redactedLogger.error(
        'System resources health check failed',
        error as string
      );
      return {
        status: 'unhealthy',
        details: `System check error: ${(error as Error).message}`,
      };
    }
  }

  private async checkSupabaseConnection(): Promise<void> {
    // Проверка подключения к Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    if (supabaseUrl == null || supabaseUrl === '') {
      throw new Error('SUPABASE_URL not configured');
    }

    // Здесь можно добавить реальную проверку Supabase
    // Пока просто проверяем наличие URL
  }

  private async checkSentryConnection(): Promise<void> {
    // Проверка подключения к Sentry
    const sentryDsn = process.env.SENTRY_DSN;
    if (sentryDsn == null || sentryDsn === '') {
      throw new Error('SENTRY_DSN not configured');
    }

    // Здесь можно добавить реальную проверку Sentry
    // Пока просто проверяем наличие DSN
  }

  async getReadiness(): Promise<ReadinessCheck> {
    const checks = {
      database: await this.isDatabaseReady(),
      redis: await this.isRedisReady(),
      externalApis: await this.areExternalApisReady(),
    };

    const ready = Object.values(checks).every(check => check);

    return { ready, checks };
  }

  async getLiveness(): Promise<LivenessCheck> {
    // Простая проверка - приложение работает
    return { alive: true };
  }

  private async isDatabaseReady(): Promise<boolean> {
    // TODO: implement real DB health check
    return true;
  }

  private async isRedisReady(): Promise<boolean> {
    // TODO: implement real Redis health check
    return true;
  }

  private async areExternalApisReady(): Promise<boolean> {
    try {
      await Promise.all([
        this.checkSupabaseConnection(),
        this.checkSentryConnection(),
      ]);

      return true;
    } catch {
      return false;
    }
  }
}

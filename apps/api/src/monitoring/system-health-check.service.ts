import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { HealthCheckResult } from '@nestjs/terminus';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { firstValueFrom } from 'rxjs';

export interface IServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastCheck: Date;
  details: Record<string, unknown>;
  error?: string;
}

export interface ISystemHealthCheck {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: IServiceHealth[];
  timestamp: Date;
  uptime: number;
  version: string;
}

@Injectable()
export class SystemHealthCheckService {
  private readonly logger = new Logger(SystemHealthCheckService.name);
  private services: IServiceHealth[] = [];
  private startTime = Date.now();

  constructor(
    private _configService: ConfigService,
    private healthCheckService: HealthCheckService,
    private httpService: HttpService
  ) {
    // Используем _configService
    this._configService.get('HEALTH_CHECK_ENABLED');
    this.initializeServices();
    this.startPeriodicHealthChecks();
  }

  private initializeServices(): void {
    // Инициализируем список сервисов для проверки
    this.services = [
      {
        name: 'database',
        status: 'healthy',
        responseTime: 0,
        lastCheck: new Date(),
        details: {},
      },
      {
        name: 'redis',
        status: 'healthy',
        responseTime: 0,
        lastCheck: new Date(),
        details: {},
      },
      {
        name: 'supabase',
        status: 'healthy',
        responseTime: 0,
        lastCheck: new Date(),
        details: {},
      },
      {
        name: 'external-apis',
        status: 'healthy',
        responseTime: 0,
        lastCheck: new Date(),
        details: {},
      },
    ];
  }

  private startPeriodicHealthChecks(): void {
    // Проверяем здоровье каждые 30 секунд
    setInterval(() => {
      void this.performHealthChecks();
    }, 30000);

    // Первоначальная проверка
    setTimeout(() => {
      void this.performHealthChecks();
    }, 5000);
  }

  private async performHealthChecks(): Promise<void> {
    this.logger.debug('Performing health checks...');

    for (const service of this.services) {
      try {
        await this.checkServiceHealth(service);
      } catch (error) {
        this.logger.error(`Health check failed for ${service.name}:`, error);
        service.status = 'unhealthy';
        service.error =
          error instanceof Error ? error.message : 'Unknown error';
        service.lastCheck = new Date();
      }
    }
  }

  private async checkServiceHealth(service: IServiceHealth): Promise<void> {
    const startTime = Date.now();

    switch (service.name) {
      case 'database':
        await this.checkDatabaseHealth(service);
        break;
      case 'redis':
        await this.checkRedisHealth(service);
        break;
      case 'supabase':
        await this.checkSupabaseHealth(service);
        break;
      case 'external-apis':
        await this.checkExternalApisHealth(service);
        break;
      default:
        service.status = 'healthy';
        service.error = 'Unknown service';
    }

    service.responseTime = Date.now() - startTime;
    service.lastCheck = new Date();
  }

  private async checkDatabaseHealth(service: IServiceHealth): Promise<void> {
    try {
      // В реальном приложении здесь была бы проверка подключения к БД
      // Для демонстрации используем простую проверку
      const dbUrl = this._configService.get('DATABASE_URL');

      if (dbUrl == null) {
        service.status = 'unhealthy';
        service.error = 'Database URL not configured';
        return;
      }

      // Симуляция проверки БД
      await new Promise(resolve => setTimeout(resolve, 100));

      service.status = 'healthy';
      service.details = {
        url: dbUrl.replace(/\/\/.*@/, '//***:***@'), // Маскируем credentials
        poolSize: 10,
        activeConnections: 3,
      };
    } catch (error) {
      service.status = 'unhealthy';
      service.error =
        error instanceof Error ? error.message : 'Database check failed';
    }
  }

  private async checkRedisHealth(service: IServiceHealth): Promise<void> {
    try {
      const redisUrl = this._configService.get('REDIS_URL');

      if (redisUrl == null) {
        service.status = 'unhealthy';
        service.error = 'Redis URL not configured';
        return;
      }

      // Симуляция проверки Redis
      await new Promise(resolve => setTimeout(resolve, 50));

      service.status = 'healthy';
      service.details = {
        url: redisUrl.replace(/\/\/.*@/, '//***:***@'), // Маскируем credentials
        memoryUsage: '45MB',
        connectedClients: 2,
      };
    } catch (error) {
      service.status = 'unhealthy';
      service.error =
        error instanceof Error ? error.message : 'Redis check failed';
    }
  }

  private async checkSupabaseHealth(service: IServiceHealth): Promise<void> {
    try {
      const supabaseUrl = this._configService.get('SUPABASE_URL');

      if (supabaseUrl == null) {
        service.status = 'unhealthy';
        service.error = 'Supabase URL not configured';
        return;
      }

      // Проверяем доступность Supabase API
      const response = await firstValueFrom(
        this.httpService.get(`${supabaseUrl}/rest/v1/`, {
          timeout: 5000,
          headers: {
            apikey: this._configService.get('SUPABASE_ANON_KEY', ''),
            Authorization: `Bearer ${this._configService.get('SUPABASE_ANON_KEY', '')}`,
          },
        })
      );

      if (response.status === 200) {
        service.status = 'healthy';
        service.details = {
          url: supabaseUrl,
          version: response.headers['x-supabase-version'] ?? 'unknown',
          responseTime: response.headers['x-response-time'] ?? 'unknown',
        };
      } else {
        service.status = 'degraded';
        service.error = `Unexpected status: ${response.status}`;
      }
    } catch (error) {
      service.status = 'unhealthy';
      service.error =
        error instanceof Error ? error.message : 'Supabase check failed';
    }
  }

  private async checkExternalApisHealth(
    service: IServiceHealth
  ): Promise<void> {
    try {
      const externalApis = [
        { name: 'Sentry', url: this._configService.get('SENTRY_DSN') },
        {
          name: 'BetterStack',
          url: this._configService.get('BETTERSTACK_TOKEN'),
        },
      ];

      const results: Record<
        string,
        { status: string; [key: string]: unknown }
      > = {};
      let healthyCount = 0;

      for (const api of externalApis) {
        if (api.url != null) {
          try {
            // Симуляция проверки внешних API
            await new Promise(resolve => setTimeout(resolve, 200));
            results[api.name] = { status: 'healthy', responseTime: 200 };
            healthyCount++;
          } catch (error) {
            results[api.name] = {
              status: 'unhealthy',
              error: error instanceof Error ? error.message : 'Check failed',
            };
          }
        } else {
          results[api.name] = { status: 'not_configured' };
        }
      }

      if (healthyCount === externalApis.length) {
        service.status = 'healthy';
      } else if (healthyCount > 0) {
        service.status = 'degraded';
      } else {
        service.status = 'unhealthy';
      }

      service.details = results;
    } catch (error) {
      service.status = 'unhealthy';
      service.error =
        error instanceof Error ? error.message : 'External APIs check failed';
    }
  }

  async getSystemHealth(): Promise<ISystemHealthCheck> {
    const healthyServices = this.services.filter(
      s => s.status === 'healthy'
    ).length;
    const totalServices = this.services.length;

    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyServices === totalServices) {
      overall = 'healthy';
    } else if (healthyServices > totalServices / 2) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }

    return {
      overall,
      services: [...this.services],
      timestamp: new Date(),
      uptime: Date.now() - this.startTime,
      version: this._configService.get('APP_VERSION', '1.0.0'),
    };
  }

  async getServiceHealth(serviceName: string): Promise<IServiceHealth | null> {
    return this.services.find(s => s.name === serviceName) ?? null;
  }

  async getAllServicesHealth(): Promise<IServiceHealth[]> {
    return [...this.services];
  }

  async performImmediateHealthCheck(): Promise<ISystemHealthCheck> {
    await this.performHealthChecks();
    return this.getSystemHealth();
  }

  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    const systemHealth = await this.getSystemHealth();

    const healthChecks: Record<
      string,
      () => Promise<{
        [key: string]: { status: string; [key: string]: unknown };
      }>
    > = {};

    for (const service of systemHealth.services) {
      healthChecks[service.name] = async () => {
        if (service.status === 'healthy') {
          return { [service.name]: { status: 'up', ...service.details } };
        } else {
          throw new Error(
            `${service.name} is ${service.status}: ${service.error ?? 'Unknown error'}`
          );
        }
      };
    }

    return this.healthCheckService.check(Object.values(healthChecks) as never);
  }

  async getHealthMetrics(): Promise<Record<string, unknown>> {
    const systemHealth = await this.getSystemHealth();

    return {
      overall_status: systemHealth.overall,
      healthy_services: systemHealth.services.filter(
        s => s.status === 'healthy'
      ).length,
      total_services: systemHealth.services.length,
      uptime_seconds: Math.floor(systemHealth.uptime / 1000),
      last_check: systemHealth.timestamp,
      services: systemHealth.services.reduce(
        (acc, service) => {
          acc[service.name] = {
            status: service.status,
            response_time_ms: service.responseTime,
            last_check: service.lastCheck,
          };
          return acc;
        },
        {} as Record<string, unknown>
      ),
    };
  }
}

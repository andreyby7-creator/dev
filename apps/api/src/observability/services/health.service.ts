import type { OnModuleInit } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { getEnv } from '../../utils/getEnv';

export interface IHealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  timestamp: string;
  duration?: number;
}

export interface IHealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  checks: IHealthCheck[];
}

@Injectable()
export class HealthService implements OnModuleInit {
  private startTime = Date.now();
  private healthChecks: Map<string, IHealthCheck> = new Map();

  async onModuleInit() {
    await this.initialize();
  }

  async initialize() {
    this.startTime = Date.now();
    this.healthChecks.clear();

    // Register default health checks
    await this.registerHealthCheck('database', this.checkDatabase.bind(this));
    await this.registerHealthCheck('memory', this.checkMemory.bind(this));
    await this.registerHealthCheck('disk', this.checkDisk.bind(this));
    await this.registerHealthCheck(
      'external_apis',
      this.checkExternalApis.bind(this)
    );
  }

  async getStatus(): Promise<IHealthStatus> {
    const checks = Array.from(this.healthChecks.values());
    const overallStatus = this.determineOverallStatus(checks);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: getEnv('npm_package_version', 'string', { default: '1.0.0' }),
      checks,
    };
  }

  async registerHealthCheck(
    name: string,
    checkFunction: () => Promise<IHealthCheck>
  ): Promise<void> {
    try {
      const startTime = Date.now();
      const check = await checkFunction();
      check.duration = Date.now() - startTime;
      check.timestamp = new Date().toISOString();

      this.healthChecks.set(name, check);
    } catch (error) {
      this.healthChecks.set(name, {
        name,
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async runHealthChecks(): Promise<void> {
    const checkPromises = Array.from(this.healthChecks.keys()).map(
      async name => {
        const check = this.healthChecks.get(name);
        if (check) {
          await this.registerHealthCheck(name, this.getCheckFunction(name));
        }
      }
    );

    await Promise.all(checkPromises);
  }

  private async checkDatabase(): Promise<IHealthCheck> {
    // Mock database check - in real implementation this would check actual database connection
    const isHealthy = Math.random() > 0.1; // 90% chance of being healthy

    return {
      name: 'database',
      status: isHealthy ? 'healthy' : 'unhealthy',
      message: isHealthy
        ? 'Database connection is healthy'
        : 'Database connection failed',
      timestamp: new Date().toISOString(),
    };
  }

  private async checkMemory(): Promise<IHealthCheck> {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    const memoryUsagePercent = (heapUsedMB / heapTotalMB) * 100;

    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    let message = `Memory usage: ${heapUsedMB.toFixed(2)}MB / ${heapTotalMB.toFixed(2)}MB (${memoryUsagePercent.toFixed(1)}%)`;

    if (memoryUsagePercent > 90) {
      status = 'unhealthy';
      message += ' - Critical memory usage';
    } else if (memoryUsagePercent > 80) {
      status = 'degraded';
      message += ' - High memory usage';
    }

    return {
      name: 'memory',
      status,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDisk(): Promise<IHealthCheck> {
    // Mock disk check - in real implementation this would check actual disk space
    const diskUsagePercent = Math.random() * 100;

    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    let message = `Disk usage: ${diskUsagePercent.toFixed(1)}%`;

    if (diskUsagePercent > 95) {
      status = 'unhealthy';
      message += ' - Critical disk usage';
    } else if (diskUsagePercent > 85) {
      status = 'degraded';
      message += ' - High disk usage';
    }

    return {
      name: 'disk',
      status,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  private async checkExternalApis(): Promise<IHealthCheck> {
    // Mock external APIs check - in real implementation this would check actual external services
    const isHealthy = Math.random() > 0.05; // 95% chance of being healthy

    return {
      name: 'external_apis',
      status: isHealthy ? 'healthy' : 'degraded',
      message: isHealthy
        ? 'All external APIs are responding'
        : 'Some external APIs are slow',
      timestamp: new Date().toISOString(),
    };
  }

  private getCheckFunction(name: string): () => Promise<IHealthCheck> {
    const checkFunctions: Record<string, () => Promise<IHealthCheck>> = {
      database: this.checkDatabase.bind(this),
      memory: this.checkMemory.bind(this),
      disk: this.checkDisk.bind(this),
      external_apis: this.checkExternalApis.bind(this),
    };

    return (
      checkFunctions[name] ??
      (async () => ({
        name,
        status: 'unhealthy',
        message: 'Unknown health check',
        timestamp: new Date().toISOString(),
      }))
    );
  }

  private determineOverallStatus(
    checks: IHealthCheck[]
  ): 'healthy' | 'unhealthy' | 'degraded' {
    if (checks.length === 0) {
      return 'healthy';
    }

    const hasUnhealthy = checks.some(check => check.status === 'unhealthy');
    const hasDegraded = checks.some(check => check.status === 'degraded');

    if (hasUnhealthy) {
      return 'unhealthy';
    }

    if (hasDegraded) {
      return 'degraded';
    }

    return 'healthy';
  }

  async getDetailedHealth(): Promise<Record<string, unknown>> {
    const status = await this.getStatus();

    return {
      ...status,
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
      },
      environment: {
        nodeEnv: getEnv('NODE_ENV', 'string', { default: 'development' }),
        port: getEnv('PORT', 'number', { default: 3001 }),
        hostname: getEnv('HOSTNAME', 'string', { default: 'localhost' }),
      },
    };
  }
}

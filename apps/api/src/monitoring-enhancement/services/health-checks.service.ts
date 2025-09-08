import { Injectable, Logger } from '@nestjs/common';

export interface HealthCheck {
  id: string;
  name: string;
  _service: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  expectedStatus: number;
  timeout: number; // milliseconds
  interval: number; // seconds
  enabled: boolean;
  lastCheck?: Date;
  lastStatus?: 'healthy' | 'unhealthy' | 'unknown';
  lastResponse?: number;
  consecutiveFailures: number;
  metadata: Record<string, unknown>;
}

export interface HealthStatus {
  _service: string;
  status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown';
  checks: Array<{
    name: string;
    status: 'healthy' | 'unhealthy' | 'unknown';
    responseTime?: number;
    lastCheck: Date;
    message?: string;
  }>;
  overallUptime: number; // percentage
  lastCheck: Date;
  metadata: Record<string, unknown>;
}

export interface HealthMetrics {
  totalServices: number;
  healthyServices: number;
  unhealthyServices: number;
  degradedServices: number;
  unknownServices: number;
  averageResponseTime: number;
  uptime: number; // percentage
  lastUpdated: Date;
}

@Injectable()
export class HealthChecksService {
  private readonly logger = new Logger(HealthChecksService.name);
  private healthChecks: Map<string, HealthCheck> = new Map();
  private healthStatuses: Map<string, HealthStatus> = new Map();
  private checkResults: Map<
    string,
    Array<{
      timestamp: Date;
      status: 'healthy' | 'unhealthy' | 'unknown';
      responseTime?: number;
      message?: string;
    }>
  > = new Map();

  async performHealthCheck(service?: string): Promise<{
    _service: string;
    status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown';
    checks: number;
    healthy: number;
    unhealthy: number;
    responseTime: number;
  }> {
    try {
      this.logger.log(
        `Performing health check for service: ${service ?? 'all'}`
      );

      let checksToRun = Array.from(this.healthChecks.values());

      if (service != null) {
        checksToRun = checksToRun.filter(check => check._service === service);
      }

      if (checksToRun.length === 0) {
        // Create default health checks if none exist
        checksToRun = this.createDefaultHealthChecks(service);
      }

      let healthy = 0;
      let unhealthy = 0;
      let totalResponseTime = 0;
      const checkResults: Array<{
        name: string;
        status: 'healthy' | 'unhealthy' | 'unknown';
        responseTime?: number;
        lastCheck: Date;
        message?: string;
      }> = [];

      for (const check of checksToRun) {
        const result = await this.executeHealthCheck(check);
        checkResults.push(result);

        if (result.status === 'healthy') {
          healthy++;
        } else {
          unhealthy++;
        }

        if (result.responseTime != null) {
          totalResponseTime += result.responseTime;
        }
      }

      const overallStatus = this.determineOverallStatus(
        healthy,
        unhealthy,
        checkResults.length
      );
      const averageResponseTime =
        checkResults.length > 0 ? totalResponseTime / checkResults.length : 0;

      // Update health status
      const healthStatus: HealthStatus = {
        _service: service ?? 'all',
        status: overallStatus,
        checks: checkResults,
        overallUptime: this.calculateUptime(),
        lastCheck: new Date(),
        metadata: {
          totalChecks: checkResults.length,
          healthyChecks: healthy,
          unhealthyChecks: unhealthy,
        },
      };

      this.healthStatuses.set(service ?? 'all', healthStatus);

      this.logger.log(
        `Health check completed for ${service ?? 'all'}: ${overallStatus} (${healthy}/${checkResults.length} healthy)`
      );

      return {
        _service: service ?? 'all',
        status: overallStatus,
        checks: checkResults.length,
        healthy,
        unhealthy,
        responseTime: averageResponseTime,
      };
    } catch (error) {
      this.logger.error('Failed to perform health check', error);
      throw error;
    }
  }

  async getHealthStatus(): Promise<{
    services: HealthStatus[];
    metrics: HealthMetrics;
    summary: {
      total: number;
      healthy: number;
      unhealthy: number;
      degraded: number;
      unknown: number;
    };
  }> {
    try {
      this.logger.log('Getting health status for all services');

      const services = Array.from(this.healthStatuses.values());

      const total = services.length;
      const healthy = services.filter(s => s.status === 'healthy').length;
      const unhealthy = services.filter(s => s.status === 'unhealthy').length;
      const degraded = services.filter(s => s.status === 'degraded').length;
      const unknown = services.filter(s => s.status === 'unknown').length;

      const averageResponseTime =
        services.reduce((sum, service) => {
          const serviceResponseTime = service.checks.reduce(
            (checkSum, check) => checkSum + (check.responseTime ?? 0),
            0
          );
          return sum + serviceResponseTime / service.checks.length;
        }, 0) / (services.length || 1);

      const uptime =
        services.reduce((sum, service) => sum + service.overallUptime, 0) /
        (services.length || 1);

      const metrics: HealthMetrics = {
        totalServices: total,
        healthyServices: healthy,
        unhealthyServices: unhealthy,
        degradedServices: degraded,
        unknownServices: unknown,
        averageResponseTime,
        uptime,
        lastUpdated: new Date(),
      };

      return {
        services,
        metrics,
        summary: {
          total,
          healthy,
          unhealthy,
          degraded,
          unknown,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get health status', error);
      throw error;
    }
  }

  async addHealthCheck(
    check: Omit<
      HealthCheck,
      'id' | 'consecutiveFailures' | 'lastCheck' | 'lastStatus' | 'lastResponse'
    >
  ): Promise<{
    success: boolean;
    checkId: string;
  }> {
    try {
      this.logger.log(`Adding health check for service: ${check._service}`);

      const checkId = `check-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const newCheck: HealthCheck = {
        ...check,
        id: checkId,
        consecutiveFailures: 0,
      };

      this.healthChecks.set(checkId, newCheck);
      this.checkResults.set(checkId, []);

      this.logger.log(
        `Added health check ${checkId} for service ${check._service}`
      );

      return {
        success: true,
        checkId,
      };
    } catch (error) {
      this.logger.error('Failed to add health check', error);
      throw error;
    }
  }

  async getHealthCheckHistory(
    checkId: string,
    timeRange?: string
  ): Promise<{
    checkId: string;
    history: Array<{
      timestamp: Date;
      status: 'healthy' | 'unhealthy' | 'unknown';
      responseTime?: number;
      message?: string;
    }>;
    timeRange: string;
  }> {
    try {
      this.logger.log(`Getting health check history for ${checkId}`);

      const history = this.checkResults.get(checkId) ?? [];
      const cutoffTime = this.getCutoffTime(timeRange ?? '24h');
      const filteredHistory = history.filter(
        entry => entry.timestamp >= cutoffTime
      );

      return {
        checkId,
        history: filteredHistory,
        timeRange: timeRange ?? '24h',
      };
    } catch (error) {
      this.logger.error('Failed to get health check history', error);
      throw error;
    }
  }

  private async executeHealthCheck(check: HealthCheck): Promise<{
    name: string;
    status: 'healthy' | 'unhealthy' | 'unknown';
    responseTime?: number;
    lastCheck: Date;
    message?: string;
  }> {
    try {
      // Simulate health check execution
      const responseTime = Math.random() * 1000; // Random response time up to 1 second
      const isHealthy = Math.random() > 0.1; // 90% chance of being healthy

      const status = isHealthy ? 'healthy' : 'unhealthy';
      const message = isHealthy ? 'Service is healthy' : 'Service is unhealthy';

      // Update check results
      const history = this.checkResults.get(check.id) ?? [];
      history.push({
        timestamp: new Date(),
        status,
        responseTime,
        message,
      });

      // Store the result for potential future use
      this.checkResults.set(check.id, history);

      // Keep only last 100 results
      if (history.length > 100) {
        history.splice(0, history.length - 100);
      }

      this.checkResults.set(check.id, history);

      // Update check status
      check.lastCheck = new Date();
      check.lastStatus = status;
      check.lastResponse = responseTime;

      if (status === 'healthy') {
        check.consecutiveFailures = 0;
      } else {
        check.consecutiveFailures++;
      }

      return {
        name: check.name,
        status,
        responseTime,
        lastCheck: new Date(),
        message,
      };
    } catch (error) {
      this.logger.error(`Health check failed for ${check.name}`, error);

      return {
        name: check.name,
        status: 'unknown',
        lastCheck: new Date(),
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private createDefaultHealthChecks(service?: string): HealthCheck[] {
    const defaultChecks: HealthCheck[] = [
      {
        id: `default-${Date.now()}-1`,
        name: 'API Health Check',
        _service: service ?? 'api',
        endpoint: '/health',
        method: 'GET',
        expectedStatus: 200,
        timeout: 5000,
        interval: 30,
        enabled: true,
        consecutiveFailures: 0,
        metadata: { type: 'default' },
      },
      {
        id: `default-${Date.now()}-2`,
        name: 'Database Health Check',
        _service: service ?? 'database',
        endpoint: '/health/db',
        method: 'GET',
        expectedStatus: 200,
        timeout: 10000,
        interval: 60,
        enabled: true,
        consecutiveFailures: 0,
        metadata: { type: 'default' },
      },
    ];

    for (const check of defaultChecks) {
      this.healthChecks.set(check.id, check);
      this.checkResults.set(check.id, []);
    }

    return defaultChecks;
  }

  private determineOverallStatus(
    healthy: number,
    unhealthy: number,
    total: number
  ): 'healthy' | 'unhealthy' | 'degraded' | 'unknown' {
    if (total === 0) return 'unknown';
    if (unhealthy === 0) return 'healthy';
    if (healthy === 0) return 'unhealthy';
    if (unhealthy / total > 0.5) return 'unhealthy';
    return 'degraded';
  }

  private calculateUptime(): number {
    // Simulate uptime calculation
    return Math.random() * 100;
  }

  private getCutoffTime(timeRange: string): Date {
    const now = new Date();
    const range = timeRange.toLowerCase();

    if (range.includes('1h') || range.includes('hour')) {
      return new Date(now.getTime() - 60 * 60 * 1000);
    } else if (range.includes('24h') || range.includes('day')) {
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (range.includes('7d') || range.includes('week')) {
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range.includes('30d') || range.includes('month')) {
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Default to 24 hours
    return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
}

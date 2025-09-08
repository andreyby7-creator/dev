import type { OnModuleInit } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { MetricsService } from './services/metrics.service';
import { LoggingService } from './services/logging.service';
import { TracingService } from './services/tracing.service';
import { HealthService } from './services/health.service';

export interface ISystemMetrics {
  cpu: number;
  memory: number;
  uptime: number;
  activeConnections: number;
  requestCount: number;
  errorRate: number;
}

export interface IBusinessMetrics {
  dau: number;
  mau: number;
  ctr: number;
  roi: number;
  activeUsers: number;
  totalTransactions: number;
}

@Injectable()
export class ObservabilityService implements OnModuleInit {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly loggingService: LoggingService,
    private readonly tracingService: TracingService,
    private readonly healthService: HealthService
  ) {}

  async onModuleInit() {
    await this.initializeServices();
  }

  private async initializeServices() {
    await this.metricsService.initialize();
    await this.loggingService.initialize();
    await this.tracingService.initialize();
    await this.healthService.initialize();
  }

  async getSystemMetrics(): Promise<ISystemMetrics> {
    return this.metricsService.getSystemMetrics();
  }

  async getBusinessMetrics(): Promise<IBusinessMetrics> {
    return this.metricsService.getBusinessMetrics();
  }

  async logEvent(
    level: string,
    message: string,
    context?: Record<string, unknown>
  ) {
    return this.loggingService.log(level, message, context);
  }

  async startTrace(operation: string, context?: Record<string, unknown>) {
    return this.tracingService.startTrace(operation, context);
  }

  async endTrace(traceId: string, result?: Record<string, unknown>) {
    return this.tracingService.endTrace(traceId, result);
  }

  async getHealthStatus() {
    return this.healthService.getStatus();
  }

  async getMetrics() {
    return {
      system: await this.getSystemMetrics(),
      business: await this.getBusinessMetrics(),
      health: await this.getHealthStatus(),
    };
  }
}

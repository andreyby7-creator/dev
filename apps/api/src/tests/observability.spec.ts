import { vi } from 'vitest';
import { ObservabilityService } from '../observability/observability.service';
import type { HealthService } from '../observability/services/health.service';
import type { LoggingService } from '../observability/services/logging.service';
import type { MetricsService } from '../observability/services/metrics.service';
import type { TracingService } from '../observability/services/tracing.service';

describe('ObservabilityModule', () => {
  let observabilityService: ObservabilityService;
  let metricsService: MetricsService;
  let loggingService: LoggingService;
  let tracingService: TracingService;
  let healthService: HealthService;

  beforeEach(async () => {
    // Create mock services with proper state
    const mockMetricsService = {
      initialize: vi.fn().mockResolvedValue(undefined),
      getSystemMetrics: vi.fn().mockResolvedValue({
        cpu: 50,
        memory: 60,
        uptime: 3600,
        activeConnections: 10,
        requestCount: 100,
        errorRate: 0.05,
      }),
      getBusinessMetrics: vi.fn().mockResolvedValue({
        dau: 1000,
        mau: 10000,
        ctr: 0.02,
        roi: 0.15,
        activeUsers: 500,
        totalTransactions: 1000,
      }),
    };

    const mockLoggingService = {
      initialize: vi.fn().mockResolvedValue(undefined),
      log: vi.fn().mockResolvedValue(undefined),
    };

    const mockTracingService = {
      initialize: vi.fn().mockResolvedValue(undefined),
      startTrace: vi.fn().mockResolvedValue('trace-123'),
      endTrace: vi.fn().mockResolvedValue(undefined),
    };

    const mockHealthService = {
      initialize: vi.fn().mockResolvedValue(undefined),
      getStatus: vi.fn().mockResolvedValue({
        status: 'healthy',
        uptime: 3600,
        version: '1.0.0',
        timestamp: new Date(),
      }),
    };

    // Create ObservabilityService with mocked dependencies
    observabilityService = new ObservabilityService(
      mockMetricsService as unknown as MetricsService,
      mockLoggingService as unknown as LoggingService,
      mockTracingService as unknown as TracingService,
      mockHealthService as unknown as HealthService
    );

    // Store references for tests
    metricsService = mockMetricsService as unknown as MetricsService;
    loggingService = mockLoggingService as unknown as LoggingService;
    tracingService = mockTracingService as unknown as TracingService;
    healthService = mockHealthService as unknown as HealthService;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('ObservabilityService', () => {
    it('should initialize all services on module init', async () => {
      await observabilityService.onModuleInit();

      expect(metricsService.initialize).toHaveBeenCalled();
      expect(loggingService.initialize).toHaveBeenCalled();
      expect(tracingService.initialize).toHaveBeenCalled();
      expect(healthService.initialize).toHaveBeenCalled();
    });

    it('should get system metrics', async () => {
      const metrics = await observabilityService.getSystemMetrics();

      expect(metricsService.getSystemMetrics).toHaveBeenCalled();
      expect(metrics).toEqual({
        cpu: 50,
        memory: 60,
        uptime: 3600,
        activeConnections: 10,
        requestCount: 100,
        errorRate: 0.05,
      });
    });

    it('should get business metrics', async () => {
      const metrics = await observabilityService.getBusinessMetrics();

      expect(metricsService.getBusinessMetrics).toHaveBeenCalled();
      expect(metrics).toEqual({
        dau: 1000,
        mau: 10000,
        ctr: 0.02,
        roi: 0.15,
        activeUsers: 500,
        totalTransactions: 1000,
      });
    });

    it('should log event', async () => {
      await observabilityService.logEvent('info', 'Test message', {
        userId: 123,
      });

      expect(loggingService.log).toHaveBeenCalledWith('info', 'Test message', {
        userId: 123,
      });
    });

    it('should start trace', async () => {
      const traceId = await observabilityService.startTrace('test-operation', {
        userId: 123,
      });

      expect(tracingService.startTrace).toHaveBeenCalledWith('test-operation', {
        userId: 123,
      });
      expect(traceId).toBe('trace-123');
    });

    it('should end trace', async () => {
      await observabilityService.endTrace('trace-123', { result: 'success' });

      expect(tracingService.endTrace).toHaveBeenCalledWith('trace-123', {
        result: 'success',
      });
    });

    it('should get health status', async () => {
      const status = await observabilityService.getHealthStatus();

      expect(healthService.getStatus).toHaveBeenCalled();
      expect(status).toHaveProperty('status', 'healthy');
    });

    it('should get all metrics', async () => {
      const metrics = await observabilityService.getMetrics();

      expect(metricsService.getSystemMetrics).toHaveBeenCalled();
      expect(metricsService.getBusinessMetrics).toHaveBeenCalled();
      expect(healthService.getStatus).toHaveBeenCalled();
      expect(metrics).toHaveProperty('system');
      expect(metrics).toHaveProperty('business');
      expect(metrics).toHaveProperty('health');
    });
  });
});

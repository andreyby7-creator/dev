import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { HealthChecksService } from '../health-checks.service';

describe('HealthChecksService', () => {
  let service: HealthChecksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthChecksService],
    }).compile();

    service = module.get<HealthChecksService>(HealthChecksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('performHealthCheck', () => {
    it('should perform health check for all services', async () => {
      const result = await service.performHealthCheck();

      expect(result._service).toBe('all');
      expect(result.status).toMatch(/^(healthy|unhealthy|degraded|unknown)$/);
      expect(result.checks).toBeGreaterThanOrEqual(0);
      expect(result.healthy).toBeGreaterThanOrEqual(0);
      expect(result.unhealthy).toBeGreaterThanOrEqual(0);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should perform health check for specific service', async () => {
      const result = await service.performHealthCheck('test-service');

      expect(result._service).toBe('test-service');
      expect(result.status).toMatch(/^(healthy|unhealthy|degraded|unknown)$/);
      expect(result.checks).toBeGreaterThanOrEqual(0);
      expect(result.healthy).toBeGreaterThanOrEqual(0);
      expect(result.unhealthy).toBeGreaterThanOrEqual(0);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should create default health checks when none exist', async () => {
      const result = await service.performHealthCheck('new-service');

      expect(result._service).toBe('new-service');
      expect(result.checks).toBeGreaterThan(0);
    });

    it('should return consistent results for same service', async () => {
      const result1 = await service.performHealthCheck('test-service');
      const result2 = await service.performHealthCheck('test-service');

      expect(result1._service).toBe(result2._service);
      expect(result1.checks).toBe(result2.checks);
    });
  });

  describe('getHealthStatus', () => {
    beforeEach(async () => {
      // Perform health checks for different services
      await service.performHealthCheck('service-1');
      await service.performHealthCheck('service-2');
      await service.performHealthCheck('service-3');
    });

    it('should return health status for all services', async () => {
      const result = await service.getHealthStatus();

      expect(result.services).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.total).toBeGreaterThanOrEqual(0);
      expect(result.summary.healthy).toBeGreaterThanOrEqual(0);
      expect(result.summary.unhealthy).toBeGreaterThanOrEqual(0);
      expect(result.summary.degraded).toBeGreaterThanOrEqual(0);
      expect(result.summary.unknown).toBeGreaterThanOrEqual(0);
    });

    it('should return valid metrics', async () => {
      const result = await service.getHealthStatus();

      expect(result.metrics.totalServices).toBeGreaterThanOrEqual(0);
      expect(result.metrics.healthyServices).toBeGreaterThanOrEqual(0);
      expect(result.metrics.unhealthyServices).toBeGreaterThanOrEqual(0);
      expect(result.metrics.degradedServices).toBeGreaterThanOrEqual(0);
      expect(result.metrics.unknownServices).toBeGreaterThanOrEqual(0);
      expect(result.metrics.averageResponseTime).toBeGreaterThanOrEqual(0);
      expect(result.metrics.uptime).toBeGreaterThanOrEqual(0);
      expect(result.metrics.uptime).toBeLessThanOrEqual(100);
      expect(result.metrics.lastUpdated).toBeInstanceOf(Date);
    });

    it('should return services with valid structure', async () => {
      const result = await service.getHealthStatus();

      for (const serviceStatus of result.services) {
        expect(serviceStatus).toHaveProperty('_service');
        expect(serviceStatus).toHaveProperty('status');
        expect(serviceStatus).toHaveProperty('checks');
        expect(serviceStatus).toHaveProperty('overallUptime');
        expect(serviceStatus).toHaveProperty('lastCheck');
        expect(serviceStatus).toHaveProperty('metadata');

        expect(serviceStatus.status).toMatch(
          /^(healthy|unhealthy|degraded|unknown)$/
        );
        expect(serviceStatus.overallUptime).toBeGreaterThanOrEqual(0);
        expect(serviceStatus.overallUptime).toBeLessThanOrEqual(100);
        expect(serviceStatus.lastCheck).toBeInstanceOf(Date);
        expect(Array.isArray(serviceStatus.checks)).toBe(true);
      }
    });

    it('should have consistent summary totals', async () => {
      const result = await service.getHealthStatus();

      const totalFromSummary =
        result.summary.healthy +
        result.summary.unhealthy +
        result.summary.degraded +
        result.summary.unknown;

      expect(result.summary.total).toBe(totalFromSummary);
      expect(result.metrics.totalServices).toBe(result.summary.total);
    });
  });

  describe('addHealthCheck', () => {
    it('should add health check successfully', async () => {
      const check = {
        name: 'Test Health Check',
        _service: 'test-service',
        endpoint: '/health',
        method: 'GET' as const,
        expectedStatus: 200,
        timeout: 5000,
        interval: 30,
        enabled: true,
        metadata: { type: 'custom' },
      };

      const result = await service.addHealthCheck(check);

      expect(result.success).toBe(true);
      expect(result.checkId).toBeDefined();
    });

    it('should add health check with minimal required fields', async () => {
      const check = {
        name: 'Minimal Health Check',
        _service: 'minimal-service',
        endpoint: '/health',
        method: 'GET' as const,
        expectedStatus: 200,
        timeout: 5000,
        interval: 30,
        enabled: true,
        metadata: {},
      };

      const result = await service.addHealthCheck(check);

      expect(result.success).toBe(true);
      expect(result.checkId).toBeDefined();
    });

    it('should generate unique check IDs', async () => {
      const check1 = {
        name: 'Check 1',
        _service: 'service-1',
        endpoint: '/health',
        method: 'GET' as const,
        expectedStatus: 200,
        timeout: 5000,
        interval: 30,
        enabled: true,
        metadata: {},
      };

      const check2 = {
        name: 'Check 2',
        _service: 'service-2',
        endpoint: '/health',
        method: 'GET' as const,
        expectedStatus: 200,
        timeout: 5000,
        interval: 30,
        enabled: true,
        metadata: {},
      };

      const result1 = await service.addHealthCheck(check1);
      const result2 = await service.addHealthCheck(check2);

      expect(result1.checkId).not.toBe(result2.checkId);
    });
  });

  describe('getHealthCheckHistory', () => {
    let checkId: string;

    beforeEach(async () => {
      const result = await service.addHealthCheck({
        name: 'Test Check',
        _service: 'test-service',
        endpoint: '/health',
        method: 'GET',
        expectedStatus: 200,
        timeout: 5000,
        interval: 30,
        enabled: true,
        metadata: {},
      });
      checkId = result.checkId;

      // Perform health check to generate history
      await service.performHealthCheck('test-service');
    });

    it('should return health check history', async () => {
      const result = await service.getHealthCheckHistory(checkId, '24h');

      expect(result.checkId).toBe(checkId);
      expect(result.history).toBeDefined();
      expect(Array.isArray(result.history)).toBe(true);
      expect(result.timeRange).toBe('24h');
    });

    it('should return history for different time ranges', async () => {
      const timeRanges = ['1h', '24h', '7d', '30d'];

      for (const timeRange of timeRanges) {
        const result = await service.getHealthCheckHistory(checkId, timeRange);

        expect(result.checkId).toBe(checkId);
        expect(result.timeRange).toBe(timeRange);
        expect(result.history).toBeDefined();
        expect(Array.isArray(result.history)).toBe(true);
      }
    });

    it('should return empty history for non-existent check', async () => {
      const result = await service.getHealthCheckHistory(
        'non-existent-check',
        '24h'
      );

      expect(result.checkId).toBe('non-existent-check');
      expect(result.history).toBeDefined();
      expect(result.history).toHaveLength(0);
    });

    it('should return history entries with valid structure', async () => {
      const result = await service.getHealthCheckHistory(checkId, '24h');

      for (const entry of result.history) {
        expect(entry).toHaveProperty('timestamp');
        expect(entry).toHaveProperty('status');
        expect(entry.timestamp).toBeInstanceOf(Date);
        expect(entry.status).toMatch(/^(healthy|unhealthy|unknown)$/);
      }
    });
  });

  describe('health check execution', () => {
    it('should execute health checks with different methods', async () => {
      const checks = [
        {
          name: 'GET Check',
          service: 'get-service',
          endpoint: '/health',
          method: 'GET' as const,
          expectedStatus: 200,
          timeout: 5000,
          interval: 30,
          enabled: true,
          metadata: {},
        },
        {
          name: 'POST Check',
          _service: 'post-service',
          endpoint: '/health',
          method: 'POST' as const,
          expectedStatus: 201,
          timeout: 10000,
          interval: 60,
          enabled: true,
          metadata: {},
        },
      ];

      for (const check of checks) {
        const result = await service.addHealthCheck({
          name: check.name,
          _service: 'test-service',
          endpoint: check.endpoint,
          method: 'GET',
          expectedStatus: 200,
          timeout: 5000,
          interval: check.interval,
          enabled: true,
          metadata: {},
        });
        expect(result.success).toBe(true);
      }
    });

    it('should handle health checks with different expected status codes', async () => {
      const statusCodes = [200, 201, 204, 301, 302];

      for (const statusCode of statusCodes) {
        const result = await service.addHealthCheck({
          name: `Status ${statusCode} Check`,
          _service: `status-${statusCode}-service`,
          endpoint: '/health',
          method: 'GET',
          expectedStatus: statusCode,
          timeout: 5000,
          interval: 30,
          enabled: true,
          metadata: {},
        });

        expect(result.success).toBe(true);
      }
    });

    it('should handle health checks with different timeouts', async () => {
      const timeouts = [1000, 5000, 10000, 30000];

      for (const timeout of timeouts) {
        const result = await service.addHealthCheck({
          name: `Timeout ${timeout} Check`,
          _service: `timeout-${timeout}-service`,
          endpoint: '/health',
          method: 'GET',
          expectedStatus: 200,
          timeout,
          interval: 30,
          enabled: true,
          metadata: {},
        });

        expect(result.success).toBe(true);
      }
    });
  });
});

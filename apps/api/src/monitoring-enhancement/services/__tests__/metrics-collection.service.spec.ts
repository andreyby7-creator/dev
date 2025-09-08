import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { MetricsCollectionService } from '../metrics-collection.service';

describe('MetricsCollectionService', () => {
  let service: MetricsCollectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsCollectionService],
    }).compile();

    service = module.get<MetricsCollectionService>(MetricsCollectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('collectMetrics', () => {
    it('should collect metrics successfully', async () => {
      const config = {
        interval: 30,
        metrics: ['cpu.usage', 'memory.usage', 'disk.usage'],
        retention: 3600,
        aggregation: 'avg' as const,
      };

      const result = await service.collectMetrics(config);

      expect(result.success).toBe(true);
      expect(result.collected).toBe(3);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should handle empty metrics list', async () => {
      const config = {
        interval: 30,
        metrics: [],
        retention: 3600,
        aggregation: 'avg' as const,
      };

      const result = await service.collectMetrics(config);

      expect(result.success).toBe(true);
      expect(result.collected).toBe(0);
    });

    it('should handle large metrics list', async () => {
      const config = {
        interval: 30,
        metrics: Array.from({ length: 100 }, (_, i) => `metric.${i}`),
        retention: 3600,
        aggregation: 'avg' as const,
      };

      const result = await service.collectMetrics(config);

      expect(result.success).toBe(true);
      expect(result.collected).toBe(100);
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return performance metrics', async () => {
      const result = await service.getPerformanceMetrics('1h');

      expect(result.metrics).toBeDefined();
      expect(result.metrics.cpu).toBeDefined();
      expect(result.metrics.memory).toBeDefined();
      expect(result.metrics.disk).toBeDefined();
      expect(result.metrics.network).toBeDefined();
      expect(result.metrics.application).toBeDefined();
      expect(result.timeRange).toBe('1h');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should return performance metrics with default time range', async () => {
      const result = await service.getPerformanceMetrics();

      expect(result.metrics).toBeDefined();
      expect(result.timeRange).toBe('1h');
    });

    it('should validate CPU metrics structure', async () => {
      const result = await service.getPerformanceMetrics();

      expect(result.metrics.cpu.usage).toBeGreaterThanOrEqual(0);
      expect(result.metrics.cpu.usage).toBeLessThanOrEqual(100);
      expect(result.metrics.cpu.cores).toBeGreaterThan(0);
      expect(result.metrics.cpu.loadAverage).toHaveLength(3);
    });

    it('should validate memory metrics structure', async () => {
      const result = await service.getPerformanceMetrics();

      expect(result.metrics.memory.used).toBeGreaterThanOrEqual(0);
      expect(result.metrics.memory.total).toBeGreaterThan(0);
      expect(result.metrics.memory.free).toBeGreaterThanOrEqual(0);
      expect(result.metrics.memory.usage).toBeGreaterThanOrEqual(0);
      expect(result.metrics.memory.usage).toBeLessThanOrEqual(100);
    });

    it('should validate application metrics structure', async () => {
      const result = await service.getPerformanceMetrics();

      expect(result.metrics.application.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.metrics.application.throughput).toBeGreaterThanOrEqual(0);
      expect(result.metrics.application.errorRate).toBeGreaterThanOrEqual(0);
      expect(
        result.metrics.application.activeConnections
      ).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getMetricsHistory', () => {
    it('should return metrics history', async () => {
      // First collect some metrics
      await service.collectMetrics({
        interval: 30,
        metrics: ['test.metric'],
        retention: 3600,
        aggregation: 'avg',
      });

      const result = await service.getMetricsHistory('test.metric', '1h');

      expect(result.metric).toBe('test.metric');
      expect(result.data).toBeDefined();
      expect(result.timeRange).toBe('1h');
    });

    it('should return empty data for non-existent metric', async () => {
      const result = await service.getMetricsHistory('non.existent', '1h');

      expect(result.metric).toBe('non.existent');
      expect(result.data).toHaveLength(0);
    });
  });

  describe('aggregateMetrics', () => {
    it('should aggregate metrics with sum', async () => {
      // First collect some metrics
      await service.collectMetrics({
        interval: 30,
        metrics: ['test.metric'],
        retention: 3600,
        aggregation: 'avg',
      });

      const result = await service.aggregateMetrics('test.metric', 'sum');

      expect(result.metric).toBe('test.metric');
      expect(result.aggregation).toBe('sum');
      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should aggregate metrics with average', async () => {
      await service.collectMetrics({
        interval: 30,
        metrics: ['test.metric'],
        retention: 3600,
        aggregation: 'avg',
      });

      const result = await service.aggregateMetrics('test.metric', 'avg');

      expect(result.metric).toBe('test.metric');
      expect(result.aggregation).toBe('avg');
      expect(result.value).toBeGreaterThanOrEqual(0);
    });

    it('should aggregate metrics with min', async () => {
      await service.collectMetrics({
        interval: 30,
        metrics: ['test.metric'],
        retention: 3600,
        aggregation: 'avg',
      });

      const result = await service.aggregateMetrics('test.metric', 'min');

      expect(result.metric).toBe('test.metric');
      expect(result.aggregation).toBe('min');
      expect(result.value).toBeGreaterThanOrEqual(0);
    });

    it('should aggregate metrics with max', async () => {
      await service.collectMetrics({
        interval: 30,
        metrics: ['test.metric'],
        retention: 3600,
        aggregation: 'avg',
      });

      const result = await service.aggregateMetrics('test.metric', 'max');

      expect(result.metric).toBe('test.metric');
      expect(result.aggregation).toBe('max');
      expect(result.value).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty metrics for aggregation', async () => {
      const result = await service.aggregateMetrics('non.existent', 'sum');

      expect(result.metric).toBe('non.existent');
      expect(result.aggregation).toBe('sum');
      expect(result.value).toBe(0);
    });
  });
});

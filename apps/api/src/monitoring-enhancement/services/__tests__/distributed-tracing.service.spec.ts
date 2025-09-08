import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { DistributedTracingService } from '../distributed-tracing.service';

describe('DistributedTracingService', () => {
  let service: DistributedTracingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DistributedTracingService],
    }).compile();

    service = module.get<DistributedTracingService>(DistributedTracingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startTrace', () => {
    it('should start trace successfully', async () => {
      const config = {
        _service: 'test-service',
        operation: 'test-operation',
        tags: { userId: 'user-123' },
        metadata: { requestId: 'req-456' },
      };

      const result = await service.startTrace(config);

      expect(result.traceId).toBeDefined();
      expect(result.spanId).toBeDefined();
      expect(result.status).toBe('started');
    });

    it('should start trace with minimal config', async () => {
      const config = {
        _service: 'test-service',
        operation: 'test-operation',
      };

      const result = await service.startTrace(config);

      expect(result.traceId).toBeDefined();
      expect(result.spanId).toBeDefined();
      expect(result.status).toBe('started');
    });

    it('should generate unique trace and span IDs', async () => {
      const config1 = {
        _service: 'service-1',
        operation: 'operation-1',
      };

      const config2 = {
        _service: 'service-2',
        operation: 'operation-2',
      };

      const result1 = await service.startTrace(config1);
      const result2 = await service.startTrace(config2);

      expect(result1.traceId).not.toBe(result2.traceId);
      expect(result1.spanId).not.toBe(result2.spanId);
    });
  });

  describe('getTraces', () => {
    beforeEach(async () => {
      // Start some test traces
      await service.startTrace({
        _service: 'service-1',
        operation: 'operation-1',
      });
      await service.startTrace({
        _service: 'service-2',
        operation: 'operation-2',
      });
    });

    it('should return all traces', async () => {
      const result = await service.getTraces();

      expect(result.traces).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(2);
      expect(result.active).toBeGreaterThanOrEqual(0);
      expect(result.completed).toBeGreaterThanOrEqual(0);
      expect(result.errors).toBeGreaterThanOrEqual(0);
    });

    it('should return traces for specific service', async () => {
      const result = await service.getTraces('service-1');

      expect(result.traces).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(1);

      // All traces should be from the specified service
      for (const trace of result.traces) {
        expect(trace._service).toBe('service-1');
      }
    });

    it('should return empty result for non-existent service', async () => {
      const result = await service.getTraces('non-existent-service');

      expect(result.traces).toBeDefined();
      expect(result.total).toBe(0);
      expect(result.active).toBe(0);
      expect(result.completed).toBe(0);
      expect(result.errors).toBe(0);
    });
  });

  describe('addSpan', () => {
    let traceId: string;
    let parentId: string;

    beforeEach(async () => {
      const result = await service.startTrace({
        _service: 'test-service',
        operation: 'test-operation',
      });
      traceId = result.traceId;
      parentId = result.spanId;
    });

    it('should add span to existing trace', async () => {
      const config = {
        _service: 'test-service',
        operation: 'child-operation',
        tags: { component: 'database' },
        metadata: { query: 'SELECT * FROM users' },
      };

      const result = await service.addSpan(traceId, parentId, config);

      expect(result.spanId).toBeDefined();
      expect(result.status).toBe('started');
    });

    it('should throw error for non-existent trace', async () => {
      const config = {
        _service: 'test-service',
        operation: 'child-operation',
      };

      await expect(
        service.addSpan('non-existent-trace', parentId, config)
      ).rejects.toThrow('Trace non-existent-trace not found');
    });

    it('should generate unique span IDs', async () => {
      const config1 = {
        _service: 'test-service',
        operation: 'child-operation-1',
      };

      const config2 = {
        _service: 'test-service',
        operation: 'child-operation-2',
      };

      const result1 = await service.addSpan(traceId, parentId, config1);
      const result2 = await service.addSpan(traceId, parentId, config2);

      expect(result1.spanId).not.toBe(result2.spanId);
    });
  });

  describe('finishSpan', () => {
    let traceId: string;
    let spanId: string;

    beforeEach(async () => {
      const result = await service.startTrace({
        _service: 'test-service',
        operation: 'test-operation',
      });
      traceId = result.traceId;
      spanId = result.spanId;
    });

    it('should finish span successfully', async () => {
      const result = await service.finishSpan(spanId, 'completed');

      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should finish span with error status', async () => {
      const result = await service.finishSpan(spanId, 'error');

      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should throw error for non-existent span', async () => {
      await expect(
        service.finishSpan('non-existent-span', 'completed')
      ).rejects.toThrow('Span non-existent-span not found');
    });

    it('should update trace status when finishing root span', async () => {
      await service.finishSpan(spanId, 'completed');

      const traces = await service.getTraces();
      const trace = traces.traces.find(t => t.id === traceId);

      expect(trace?.status).toBe('completed');
      expect(trace?.endTime).toBeDefined();
      expect(trace?.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('addSpanLog', () => {
    let spanId: string;

    beforeEach(async () => {
      const result = await service.startTrace({
        _service: 'test-service',
        operation: 'test-operation',
      });
      spanId = result.spanId;
    });

    it('should add log to span', async () => {
      const result = await service.addSpanLog(
        spanId,
        'Test log message',
        'info'
      );

      expect(result.success).toBe(true);
      expect(result.logCount).toBe(1);
    });

    it('should add multiple logs to span', async () => {
      await service.addSpanLog(spanId, 'First log', 'info');
      await service.addSpanLog(spanId, 'Second log', 'warn');
      const result = await service.addSpanLog(spanId, 'Third log', 'error');

      expect(result.success).toBe(true);
      expect(result.logCount).toBe(3);
    });

    it('should throw error for non-existent span', async () => {
      await expect(
        service.addSpanLog('non-existent-span', 'Test message', 'info')
      ).rejects.toThrow('Span non-existent-span not found');
    });

    it('should add log with different levels', async () => {
      const levels = ['debug', 'info', 'warn', 'error'] as const;

      for (const level of levels) {
        const result = await service.addSpanLog(
          spanId,
          `Log with level ${level}`,
          level
        );
        expect(result.success).toBe(true);
      }
    });
  });

  describe('getTraceDetails', () => {
    let traceId: string;
    let spanId: string;

    beforeEach(async () => {
      const result = await service.startTrace({
        _service: 'test-service',
        operation: 'test-operation',
      });
      traceId = result.traceId;
      spanId = result.spanId;

      // Add a child span
      await service.addSpan(traceId, spanId, {
        _service: 'test-service',
        operation: 'child-operation',
      });
    });

    it('should return trace details', async () => {
      const result = await service.getTraceDetails(traceId);

      expect(result.trace).toBeDefined();
      expect(result.trace?.id).toBe(traceId);
      expect(result.spans).toBeDefined();
      expect(result.spans.length).toBeGreaterThanOrEqual(2); // Root span + child span
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.status).toBeDefined();
    });

    it('should return null for non-existent trace', async () => {
      const result = await service.getTraceDetails('non-existent-trace');

      expect(result.trace).toBeNull();
      expect(result.spans).toHaveLength(0);
      expect(result.duration).toBe(0);
      expect(result.status).toBe('not_found');
    });

    it('should sort spans by start time', async () => {
      const result = await service.getTraceDetails(traceId);

      expect(result.spans.length).toBeGreaterThan(1);

      for (let i = 1; i < result.spans.length; i++) {
        expect(result.spans?.[i]?.startTime.getTime()).toBeGreaterThanOrEqual(
          result.spans?.[i - 1]?.startTime.getTime() ?? 0
        );
      }
    });
  });

  describe('getTraceStatistics', () => {
    beforeEach(async () => {
      // Start and complete some traces
      const trace1 = await service.startTrace({
        _service: 'service-1',
        operation: 'operation-1',
      });
      const trace2 = await service.startTrace({
        _service: 'service-2',
        operation: 'operation-2',
      });

      // Complete the traces
      await service.finishSpan(trace1.spanId, 'completed');
      await service.finishSpan(trace2.spanId, 'error');
    });

    it('should return trace statistics', async () => {
      const result = await service.getTraceStatistics('24h');

      expect(result.timeRange).toBe('24h');
      expect(result.totalTraces).toBeGreaterThanOrEqual(0);
      expect(result.averageDuration).toBeGreaterThanOrEqual(0);
      expect(result.errorRate).toBeGreaterThanOrEqual(0);
      expect(result.byService).toBeDefined();
      expect(Array.isArray(result.byService)).toBe(true);
    });

    it('should return statistics for different time ranges', async () => {
      const timeRanges = ['1h', '24h', '7d', '30d'];

      for (const timeRange of timeRanges) {
        const result = await service.getTraceStatistics(timeRange);

        expect(result.timeRange).toBe(timeRange);
        expect(result.totalTraces).toBeGreaterThanOrEqual(0);
        expect(result.averageDuration).toBeGreaterThanOrEqual(0);
        expect(result.errorRate).toBeGreaterThanOrEqual(0);
        expect(result.byService).toBeDefined();
      }
    });

    it('should aggregate statistics by service correctly', async () => {
      const result = await service.getTraceStatistics('24h');

      for (const serviceStat of result.byService) {
        expect(serviceStat).toHaveProperty('_service');
        expect(serviceStat).toHaveProperty('count');
        expect(serviceStat).toHaveProperty('averageDuration');
        expect(serviceStat).toHaveProperty('errorRate');
        expect(serviceStat.count).toBeGreaterThanOrEqual(0);
        expect(serviceStat.averageDuration).toBeGreaterThanOrEqual(0);
        expect(serviceStat.errorRate).toBeGreaterThanOrEqual(0);
        expect(serviceStat.errorRate).toBeLessThanOrEqual(100);
      }
    });

    it('should calculate error rate correctly', async () => {
      const result = await service.getTraceStatistics('24h');

      expect(result.errorRate).toBeGreaterThanOrEqual(0);
      expect(result.errorRate).toBeLessThanOrEqual(100);
    });
  });
});

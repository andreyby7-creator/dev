import { ConfigService } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { createMockConfigService } from '../../../test/mocks/config.service.mock';
import { PipelineMonitoringService } from '../pipeline-monitoring.service';

describe('PipelineMonitoringService', () => {
  let service: PipelineMonitoringService;

  beforeEach(async () => {
    const mockConfigService = createMockConfigService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        PipelineMonitoringService,
      ],
    }).compile();

    service = module.get<PipelineMonitoringService>(PipelineMonitoringService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordEvent', () => {
    it('should record pipeline event successfully', async () => {
      const event = {
        type: 'build_started' as const,
        buildId: 'build-123',
        stage: 'build',
        metadata: { test: true },
      };

      await service.recordEvent(event);

      const events = await service.getPipelineEvents('build-123');
      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe('build_started');
      expect(events[0]?.buildId).toBe('build-123');
    });

    it('should create alert for failed pipeline', async () => {
      const event = {
        type: 'pipeline_failed' as const,
        buildId: 'build-123',
        stage: 'test',
        metadata: { test: true },
        error: 'Test failed',
      };

      await service.recordEvent(event);

      const alerts = await service.getPipelineAlerts(false, 'high', 'failure');
      expect(alerts).toHaveLength(1);
      expect(alerts[0]?.type).toBe('failure');
      expect(alerts[0]?.severity).toBe('high');
    });

    it('should create alert for slow pipeline stage', async () => {
      const event = {
        type: 'build_completed' as const,
        buildId: 'build-123',
        stage: 'build',
        metadata: { test: true },
        duration: 700000, // > 10 minutes
        success: true,
      };

      await service.recordEvent(event);

      const alerts = await service.getPipelineAlerts(
        false,
        'medium',
        'performance'
      );
      expect(alerts).toHaveLength(1);
      expect(alerts[0]?.type).toBe('performance');
      expect(alerts[0]?.severity).toBe('medium');
    });
  });

  describe('getPipelineMetrics', () => {
    beforeEach(async () => {
      // Add some test events
      await service.recordEvent({
        type: 'build_started',
        buildId: 'build-1',
        stage: 'build',
        metadata: {},
      });
      await service.recordEvent({
        type: 'build_completed',
        buildId: 'build-1',
        stage: 'build',
        metadata: {},
        duration: 120000,
        success: true,
      });
      await service.recordEvent({
        type: 'test_started',
        buildId: 'build-1',
        stage: 'test',
        metadata: {},
      });
      await service.recordEvent({
        type: 'test_completed',
        buildId: 'build-1',
        stage: 'test',
        metadata: {},
        duration: 180000,
        success: true,
      });
      await service.recordEvent({
        type: 'deploy_started',
        buildId: 'build-1',
        stage: 'deploy',
        metadata: {},
      });
      await service.recordEvent({
        type: 'deploy_completed',
        buildId: 'build-1',
        stage: 'deploy',
        metadata: {},
        duration: 60000,
        success: true,
      });
    });

    it('should return pipeline metrics', async () => {
      const metrics = await service.getPipelineMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.totalBuilds).toBe(1);
      expect(metrics.successfulBuilds).toBe(1);
      expect(metrics.failedBuilds).toBe(0);
      expect(metrics.averageBuildTime).toBe(120000);
      expect(metrics.averageTestTime).toBe(180000);
      expect(metrics.averageDeployTime).toBe(60000);
      expect(metrics.successRate).toBe(100);
      expect(metrics.failureRate).toBe(0);
      expect(metrics.trends).toBeDefined();
    });

    it('should filter metrics by time range', async () => {
      const from = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      const to = new Date();
      const timeRange = { from, to };

      const metrics = await service.getPipelineMetrics(timeRange);

      expect(metrics).toBeDefined();
    });
  });

  describe('getPipelineAlerts', () => {
    beforeEach(async () => {
      // Create some test alerts
      await service.recordEvent({
        type: 'pipeline_failed',
        buildId: 'build-1',
        stage: 'test',
        metadata: {},
        error: 'Test failed',
      });
      await service.recordEvent({
        type: 'build_completed',
        buildId: 'build-2',
        stage: 'build',
        metadata: {},
        duration: 700000, // Slow build
        success: true,
      });
    });

    it('should return all alerts', async () => {
      const alerts = await service.getPipelineAlerts();

      expect(Array.isArray(alerts)).toBe(true);
      expect(alerts.length).toBeGreaterThan(0);
    });

    it('should filter alerts by resolved status', async () => {
      const unresolvedAlerts = await service.getPipelineAlerts(false);
      const resolvedAlerts = await service.getPipelineAlerts(true);

      expect(Array.isArray(unresolvedAlerts)).toBe(true);
      expect(Array.isArray(resolvedAlerts)).toBe(true);
    });

    it('should filter alerts by severity', async () => {
      const highSeverityAlerts = await service.getPipelineAlerts(
        undefined,
        'high'
      );
      const mediumSeverityAlerts = await service.getPipelineAlerts(
        undefined,
        'medium'
      );

      expect(Array.isArray(highSeverityAlerts)).toBe(true);
      expect(Array.isArray(mediumSeverityAlerts)).toBe(true);
    });

    it('should filter alerts by type', async () => {
      const failureAlerts = await service.getPipelineAlerts(
        undefined,
        undefined,
        'failure'
      );
      const performanceAlerts = await service.getPipelineAlerts(
        undefined,
        undefined,
        'performance'
      );

      expect(Array.isArray(failureAlerts)).toBe(true);
      expect(Array.isArray(performanceAlerts)).toBe(true);
    });
  });

  describe('resolveAlert', () => {
    it('should resolve alert successfully', async () => {
      // Create an alert first
      await service.recordEvent({
        type: 'pipeline_failed',
        buildId: 'build-1',
        stage: 'test',
        metadata: {},
        error: 'Test failed',
      });

      const alerts = await service.getPipelineAlerts(false);
      expect(alerts.length).toBeGreaterThan(0);

      const alertId = alerts[0]?.id;
      const result = await service.resolveAlert(alertId!);

      expect(result.success).toBe(true);

      const resolvedAlerts = await service.getPipelineAlerts(true);
      expect(resolvedAlerts.length).toBeGreaterThan(0);
    });

    it('should handle non-existent alert', async () => {
      const result = await service.resolveAlert('non-existent-alert');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Alert not found');
    });
  });

  describe('getPipelineEvents', () => {
    beforeEach(async () => {
      // Add some test events
      await service.recordEvent({
        type: 'build_started',
        buildId: 'build-1',
        stage: 'build',
        metadata: {},
      });
      await service.recordEvent({
        type: 'build_completed',
        buildId: 'build-1',
        stage: 'build',
        metadata: {},
        duration: 120000,
        success: true,
      });
      await service.recordEvent({
        type: 'build_started',
        buildId: 'build-2',
        stage: 'build',
        metadata: {},
      });
    });

    it('should return all events', async () => {
      const events = await service.getPipelineEvents();

      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThan(0);
    });

    it('should filter events by build ID', async () => {
      const events = await service.getPipelineEvents('build-1');

      expect(Array.isArray(events)).toBe(true);
      events.forEach(event => {
        expect(event.buildId).toBe('build-1');
      });
    });

    it('should filter events by type', async () => {
      const events = await service.getPipelineEvents(
        undefined,
        'build_started'
      );

      expect(Array.isArray(events)).toBe(true);
      events.forEach(event => {
        expect(event.type).toBe('build_started');
      });
    });

    it('should filter events by time range', async () => {
      const from = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const to = new Date();
      const timeRange = { from, to };

      const events = await service.getPipelineEvents(
        undefined,
        undefined,
        timeRange
      );

      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe('getBuildTimeline', () => {
    it('should return build timeline', async () => {
      const buildId = 'build-1';

      // Add events for the build
      await service.recordEvent({
        type: 'build_started',
        buildId,
        stage: 'build',
        metadata: {},
      });
      await service.recordEvent({
        type: 'build_completed',
        buildId,
        stage: 'build',
        metadata: {},
        duration: 120000,
        success: true,
      });

      const timeline = await service.getBuildTimeline(buildId);

      expect(Array.isArray(timeline)).toBe(true);
      expect(timeline.length).toBe(2);
      expect(timeline[0]?.type).toBe('build_started');
      expect(timeline[1]?.type).toBe('build_completed');
    });
  });

  describe('getPerformanceInsights', () => {
    beforeEach(async () => {
      // Add some test events with different durations
      await service.recordEvent({
        type: 'build_completed',
        buildId: 'build-1',
        stage: 'build',
        metadata: {},
        duration: 120000, // 2 minutes
        success: true,
      });
      await service.recordEvent({
        type: 'test_completed',
        buildId: 'build-1',
        stage: 'test',
        metadata: {},
        duration: 300000, // 5 minutes
        success: true,
      });
      await service.recordEvent({
        type: 'deploy_completed',
        buildId: 'build-1',
        stage: 'deploy',
        metadata: {},
        duration: 60000, // 1 minute
        success: true,
      });
    });

    it('should return performance insights', async () => {
      const insights = await service.getPerformanceInsights();

      expect(insights).toBeDefined();
      expect(insights.slowestStages).toBeDefined();
      expect(Array.isArray(insights.slowestStages)).toBe(true);
      expect(insights.bottlenecks).toBeDefined();
      expect(Array.isArray(insights.bottlenecks)).toBe(true);
      expect(insights.recommendations).toBeDefined();
      expect(Array.isArray(insights.recommendations)).toBe(true);
    });

    it('should filter insights by time range', async () => {
      const from = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const to = new Date();
      const timeRange = { from, to };

      const insights = await service.getPerformanceInsights(timeRange);

      expect(insights).toBeDefined();
    });
  });
});

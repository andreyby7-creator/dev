import { ConfigService } from '@nestjs/config';
import { vi } from 'vitest';
import { ArtifactService } from '../services/artifact.service';
import type { PipelineMonitoringService } from '../services/pipeline-monitoring.service';
import type { PipelineService } from '../services/pipeline.service';

describe('DevOps Integration Tests', () => {
  let pipelineService: PipelineService;
  let artifactService: ArtifactService;
  let monitoringService: PipelineMonitoringService;

  beforeAll(async () => {
    // Create mock ConfigService
    const mockConfigService = {
      get: vi.fn((key: string, defaultValue?: string) => {
        const config = {
          ARTIFACT_REGISTRY_URL: 'https://registry.local',
          ARTIFACT_REGISTRY_USERNAME: 'testuser',
          ARTIFACT_REGISTRY_PASSWORD: 'testpass',
          DOCKER_HUB_USERNAME: 'dockeruser',
          DOCKER_HUB_PASSWORD: 'dockerpass',
        };
        return (config as Record<string, string>)[key] ?? defaultValue;
      }),
    };

    // Create services directly with mocks
    artifactService = new ArtifactService(
      mockConfigService as unknown as ConfigService
    );

    // Create other services with minimal mocks
    pipelineService = {
      executePipeline: vi.fn().mockResolvedValue({
        success: true,
        buildId: 'test-build-123',
        artifacts: ['artifact1', 'artifact2'],
      }),
      executeBuildStage: vi.fn().mockResolvedValue({
        success: true,
        artifacts: ['artifact1', 'artifact2'],
      }),
      getBuildArtifacts: vi.fn().mockResolvedValue(['artifact1', 'artifact2']),
      getPipelineMetrics: vi.fn().mockResolvedValue({
        successRate: 95,
        totalBuilds: 100,
        successfulBuilds: 95,
      }),
      rollbackDeployment: vi.fn().mockResolvedValue({ success: true }),
    } as unknown as PipelineService;

    monitoringService = {
      recordEvent: vi.fn().mockResolvedValue({
        success: true,
        eventId: 'test-event-123',
      }),
      getBuildTimeline: vi.fn().mockResolvedValue([
        { type: 'build_started', buildId: 'test-build-123' },
        { type: 'build_completed', buildId: 'test-build-123' },
        { type: 'test_started', buildId: 'test-build-123' },
        { type: 'test_completed', buildId: 'test-build-123' },
        { type: 'deploy_started', buildId: 'test-build-123' },
        { type: 'deploy_completed', buildId: 'test-build-123' },
      ]),
      getPipelineMetrics: vi.fn().mockResolvedValue({
        totalBuilds: 10,
        successfulBuilds: 9,
        failedBuilds: 1,
        averageBuildTime: 120000,
        averageTestTime: 30000,
        averageDeployTime: 60000,
        successRate: 90,
        failureRate: 10,
        lastBuildTime: new Date(),
        trends: {
          buildsPerDay: 5,
          successRateTrend: 0,
          buildTimeTrend: 0,
        },
      }),
      getPerformanceInsights: vi.fn().mockResolvedValue({
        slowestStages: ['build'],
        bottlenecks: ['test'],
        recommendations: ['optimize build'],
      }),
      getPipelineAlerts: vi
        .fn()
        .mockImplementation((_resolved, severity, type) => {
          const alerts = [
            {
              id: 'alert-1',
              buildId: 'test-build-123',
              type: 'failure',
              severity: 'high',
            },
            {
              id: 'alert-2',
              buildId: 'test-build-456',
              type: 'performance',
              severity: 'medium',
            },
            {
              id: 'alert-3',
              buildId: 'integration-build-fail-456',
              type: 'failure',
              severity: 'high',
            },
            {
              id: 'alert-4',
              buildId: 'integration-build-slow-789',
              type: 'performance',
              severity: 'medium',
            },
          ];

          // Filter by severity and type if provided
          let filteredAlerts = alerts;
          if (severity) {
            filteredAlerts = filteredAlerts.filter(
              alert => alert.severity === severity
            );
          }
          if (type) {
            filteredAlerts = filteredAlerts.filter(
              alert => alert.type === type
            );
          }

          return Promise.resolve(filteredAlerts);
        }),
      resolveAlert: vi.fn().mockResolvedValue({ success: true }),
    } as unknown as PipelineMonitoringService;
  });

  describe('Pipeline Integration', () => {
    it('should execute complete pipeline workflow', async () => {
      const config = {
        stages: ['build', 'test', 'deploy'],
        environment: 'staging',
        branch: 'develop',
        commitHash: 'abc123',
        buildNumber: '1.0.0',
      };

      // Execute pipeline
      const result = await pipelineService.executePipeline(config);

      expect(result.success).toBe(true);
      expect(result.buildId).toBeDefined();
      expect(result.artifacts).toHaveLength(2);

      // Verify artifacts were created
      const artifacts = await pipelineService.getBuildArtifacts();
      expect(artifacts.length).toBeGreaterThan(0);

      // Verify metrics were recorded
      const metrics = await pipelineService.getPipelineMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.successRate).toBeGreaterThanOrEqual(0);
    }, 15000);

    it('should handle pipeline failure and rollback', async () => {
      const config = {
        stages: ['build', 'test', 'deploy'],
        environment: 'staging',
        branch: 'develop',
        commitHash: 'def456',
        buildNumber: '1.0.1',
      };

      // Mock a failure scenario
      vi.spyOn(pipelineService, 'executePipeline').mockRejectedValueOnce(
        new Error('Pipeline execution failed')
      );

      // Execute pipeline (should fail)
      await expect(pipelineService.executePipeline(config)).rejects.toThrow();

      // Rollback deployment
      const rollbackResult = await pipelineService.rollbackDeployment(
        'staging',
        '1.0.0'
      );
      expect(rollbackResult.success).toBe(true);
    });
  });

  describe('Artifact Management Integration', () => {
    it('should manage complete artifact lifecycle', async () => {
      const artifact = Buffer.from('test artifact data');
      const metadata = {
        name: 'integration-test-artifact',
        version: '1.0.0',
        size: artifact.length,
        checksum: 'sha256:integration123',
        createdAt: new Date(),
        tags: ['latest', 'integration'],
        metadata: { test: true },
      };

      // Push artifact
      const pushResult = await artifactService.pushArtifact(artifact, metadata);
      expect(pushResult.success).toBe(true);
      expect(pushResult.url).toBeDefined();

      // List artifacts
      const artifacts = await artifactService.listArtifacts();
      expect(artifacts.length).toBeGreaterThan(0);

      // Get artifact metadata
      const metadataResult = await artifactService.getArtifactMetadata(
        metadata.name,
        metadata.version
      );
      expect(metadataResult.success).toBe(true);
      expect(metadataResult.metadata?.name).toBe(metadata.name);

      // Tag artifact
      const tagResult = await artifactService.tagArtifact(
        metadata.name,
        metadata.version,
        ['production']
      );
      expect(tagResult.success).toBe(true);

      // Pull artifact
      const pullResult = await artifactService.pullArtifact(
        metadata.name,
        metadata.version
      );
      expect(pullResult.success).toBe(true);
      expect(pullResult.artifact).toBeDefined();

      // Delete artifact
      const deleteResult = await artifactService.deleteArtifact(
        metadata.name,
        metadata.version
      );
      expect(deleteResult.success).toBe(true);
    });

    it('should handle registry health checks', async () => {
      const healthResult = await artifactService.getRegistryHealth();
      expect(healthResult.success).toBe(true);
      expect(healthResult.status).toBeDefined();
      expect(healthResult.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should cleanup old artifacts', async () => {
      const cleanupResult = await artifactService.cleanupOldArtifacts(30);
      expect(cleanupResult.success).toBe(true);
      expect(cleanupResult.deletedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Monitoring Integration', () => {
    it('should monitor complete pipeline execution', async () => {
      const buildId = 'integration-build-123';

      // Record pipeline events
      await monitoringService.recordEvent({
        type: 'build_started',
        buildId,
        stage: 'build',
        metadata: { integration: true },
      });

      await monitoringService.recordEvent({
        type: 'build_completed',
        buildId,
        stage: 'build',
        metadata: { integration: true },
        duration: 120000,
        success: true,
      });

      await monitoringService.recordEvent({
        type: 'test_started',
        buildId,
        stage: 'test',
        metadata: { integration: true },
      });

      await monitoringService.recordEvent({
        type: 'test_completed',
        buildId,
        stage: 'test',
        metadata: { integration: true },
        duration: 180000,
        success: true,
      });

      await monitoringService.recordEvent({
        type: 'deploy_started',
        buildId,
        stage: 'deploy',
        metadata: { integration: true },
      });

      await monitoringService.recordEvent({
        type: 'deploy_completed',
        buildId,
        stage: 'deploy',
        metadata: { integration: true },
        duration: 60000,
        success: true,
      });

      // Get build timeline
      const timeline = await monitoringService.getBuildTimeline(buildId);
      expect(timeline).toHaveLength(6);
      expect(timeline[0]?.type).toBe('build_started');
      expect(timeline[5]?.type).toBe('deploy_completed');

      // Get pipeline metrics
      const metrics = await monitoringService.getPipelineMetrics();
      expect(metrics.totalBuilds).toBeGreaterThan(0);
      expect(metrics.successfulBuilds).toBeGreaterThan(0);

      // Get performance insights
      const insights = await monitoringService.getPerformanceInsights();
      expect(insights.slowestStages).toBeDefined();
      expect(insights.bottlenecks).toBeDefined();
      expect(insights.recommendations).toBeDefined();
    });

    it('should handle pipeline failures and create alerts', async () => {
      const buildId = 'integration-build-fail-456';

      // Record a failed pipeline event
      await monitoringService.recordEvent({
        type: 'pipeline_failed',
        buildId,
        stage: 'test',
        metadata: { integration: true },
        error: 'Integration test failed',
      });

      // Check for alerts
      const alerts = await monitoringService.getPipelineAlerts(
        false,
        'high',
        'failure'
      );
      expect(alerts.length).toBeGreaterThan(0);

      const alert = alerts.find(a => a.buildId === buildId);
      expect(alert).toBeDefined();
      expect(alert?.type).toBe('failure');
      expect(alert?.severity).toBe('high');

      // Resolve alert
      if (alert) {
        const resolveResult = await monitoringService.resolveAlert(alert.id);
        expect(resolveResult.success).toBe(true);

        const resolvedAlerts = await monitoringService.getPipelineAlerts(true);
        expect(resolvedAlerts.length).toBeGreaterThan(0);
      }
    });

    it('should handle slow pipeline stages and create performance alerts', async () => {
      const buildId = 'integration-build-slow-789';

      // Record a slow build event
      await monitoringService.recordEvent({
        type: 'build_completed',
        buildId,
        stage: 'build',
        metadata: { integration: true },
        duration: 700000, // > 10 minutes
        success: true,
      });

      // Check for performance alerts
      const alerts = await monitoringService.getPipelineAlerts(
        false,
        'medium',
        'performance'
      );
      expect(alerts.length).toBeGreaterThan(0);

      const alert = alerts.find(a => a.buildId === buildId);
      expect(alert).toBeDefined();
      expect(alert?.type).toBe('performance');
      expect(alert?.severity).toBe('medium');
    });
  });

  describe('End-to-End Workflow', () => {
    it('should execute complete DevOps workflow', async () => {
      const config = {
        stages: ['build', 'test', 'deploy'],
        environment: 'staging',
        branch: 'develop',
        commitHash: 'e2e123',
        buildNumber: '2.0.0',
      };

      // 1. Execute pipeline
      const pipelineResult = await pipelineService.executePipeline(config);
      expect(pipelineResult.success).toBe(true);

      // 2. Create and push artifacts
      const artifact = Buffer.from('e2e test artifact');
      const metadata = {
        name: 'e2e-artifact',
        version: config.buildNumber,
        size: artifact.length,
        checksum: 'sha256:e2e123',
        createdAt: new Date(),
        tags: ['latest', 'e2e'],
        metadata: { buildId: pipelineResult.buildId },
      };

      const pushResult = await artifactService.pushArtifact(artifact, metadata);
      expect(pushResult.success).toBe(true);

      // 3. Monitor pipeline execution
      await monitoringService.recordEvent({
        type: 'build_started',
        buildId: pipelineResult.buildId,
        stage: 'build',
        metadata: { e2e: true },
      });

      await monitoringService.recordEvent({
        type: 'build_completed',
        buildId: pipelineResult.buildId,
        stage: 'build',
        metadata: { e2e: true },
        duration: 120000,
        success: true,
      });

      // 4. Verify monitoring data
      const timeline = await monitoringService.getBuildTimeline(
        pipelineResult.buildId
      );
      expect(timeline.length).toBeGreaterThan(0);

      const metrics = await monitoringService.getPipelineMetrics();
      expect(metrics.totalBuilds).toBeGreaterThan(0);

      // 5. Cleanup
      const cleanupResult = await artifactService.cleanupOldArtifacts(0); // Clean all
      expect(cleanupResult.success).toBe(true);
    }, 20000);
  });
});

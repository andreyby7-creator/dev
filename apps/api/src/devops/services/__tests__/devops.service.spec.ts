import type { ConfigService } from '@nestjs/config';
import { vi } from 'vitest';
import type { ArtifactService } from '../artifact.service';
import { DevOpsService } from '../devops.service';
import type {
  PipelineMetrics,
  PipelineMonitoringService,
} from '../pipeline-monitoring.service';
import type { PipelineService } from '../pipeline.service';

describe('DevOpsService', () => {
  let service: DevOpsService;
  let pipelineService: PipelineService;
  let artifactService: ArtifactService;
  let monitoringService: PipelineMonitoringService;
  let configService: ConfigService;

  beforeEach(async () => {
    // Создаем моки сервисов
    pipelineService = {
      getPipelineMetrics: vi.fn(),
      executePipeline: vi.fn(),
      getPipelineStatus: vi.fn(),
      getPipelineHistory: vi.fn(),
      rollbackDeployment: vi.fn(),
    } as unknown as PipelineService;

    artifactService = {
      getRegistryHealth: vi.fn(),
      listArtifacts: vi.fn(),
      getArtifactMetrics: vi.fn(),
      getArtifactStatus: vi.fn(),
    } as unknown as ArtifactService;

    monitoringService = {
      getPipelineMetrics: vi.fn(),
      getPipelineAlerts: vi.fn(),
      getPipelineEvents: vi.fn(),
      recordEvent: vi.fn(),
      getMonitoringStatus: vi.fn(),
      getMonitoringHealth: vi.fn(),
    } as unknown as PipelineMonitoringService;

    configService = {
      get: vi.fn((key: string, defaultValue?: string | boolean | undefined) => {
        const config = {
          PIPELINE_MONITORING_ENABLED: true,
        };
        return (
          (config as Record<string, string | boolean>)[key] ?? defaultValue
        );
      }),
    } as unknown as ConfigService;

    // Создаем сервис напрямую с моками
    service = new DevOpsService(
      configService,
      pipelineService,
      artifactService,
      monitoringService
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDevOpsHealth', () => {
    it('should return healthy status when all components are healthy', async () => {
      // Mock healthy responses
      vi.spyOn(pipelineService, 'getPipelineMetrics').mockResolvedValue({
        buildTime: 120000,
        testTime: 30000,
        deployTime: 60000,
        averageBuildTime: 120000,
        successRate: 100,
        failureRate: 0,
      });

      vi.spyOn(artifactService, 'getRegistryHealth').mockResolvedValue({
        success: true,
        status: 'healthy',
        responseTime: 100,
      });

      vi.spyOn(monitoringService, 'getPipelineMetrics').mockResolvedValue({
        totalBuilds: 10,
        successfulBuilds: 10,
        failedBuilds: 0,
        averageBuildTime: 120000,
        averageTestTime: 30000,
        averageDeployTime: 60000,
        successRate: 100,
        failureRate: 0,
        lastBuildTime: new Date(),
        trends: {
          buildsPerDay: 5,
          successRateTrend: 0,
          buildTimeTrend: 0,
        },
      } as PipelineMetrics);

      const result = await service.getDevOpsHealth();

      expect(result.status).toBe('healthy');
      expect(result.components.pipeline).toBe('healthy');
      expect(result.components.artifacts).toBe('healthy');
      expect(result.components.monitoring).toBe('healthy');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should return degraded status when some components are degraded', async () => {
      // Mock degraded responses
      vi.spyOn(pipelineService, 'getPipelineMetrics').mockResolvedValue({
        buildTime: 120000,
        testTime: 30000,
        deployTime: 60000,
        successRate: 80,
        failureRate: 20,
        averageBuildTime: 120000,
      });

      vi.spyOn(artifactService, 'getRegistryHealth').mockResolvedValue({
        success: true,
        status: 'degraded',
        responseTime: 2000,
      });

      vi.spyOn(monitoringService, 'getPipelineMetrics').mockResolvedValue({
        totalBuilds: 0,
        successfulBuilds: 0,
        failedBuilds: 0,
        averageBuildTime: 120000,
        averageTestTime: 30000,
        averageDeployTime: 60000,
        successRate: 100,
        failureRate: 0,
        lastBuildTime: new Date(),
        trends: {
          buildsPerDay: 0,
          successRateTrend: 0,
          buildTimeTrend: 0,
        },
      } as PipelineMetrics);

      const result = await service.getDevOpsHealth();

      expect(result.status).toBe('degraded');
      expect(result.components.pipeline).toBe('degraded');
      expect(result.components.artifacts).toBe('degraded');
      expect(result.components.monitoring).toBe('degraded');
    });

    it('should return unhealthy status when components fail', async () => {
      // Mock failure
      vi.spyOn(pipelineService, 'getPipelineMetrics').mockRejectedValue(
        new Error('Service unavailable')
      );

      const result = await service.getDevOpsHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.components.pipeline).toBe('unhealthy');
      expect(result.components.artifacts).toBe('unhealthy');
      expect(result.components.monitoring).toBe('unhealthy');
    });
  });

  describe('getDashboardData', () => {
    it('should return dashboard data successfully', async () => {
      const mockArtifacts = [
        {
          id: '1',
          name: 'artifact1',
          version: '1.0.0',
          size: 1024,
          checksum: 'abc123',
          createdAt: new Date(),
          tags: ['latest'],
          metadata: {},
        },
        {
          id: '2',
          name: 'artifact2',
          version: '1.0.1',
          size: 2048,
          checksum: 'def456',
          createdAt: new Date(),
          tags: ['latest'],
          metadata: {},
        },
      ];

      const mockAlerts = [
        {
          id: '1',
          type: 'failure',
          severity: 'high',
          title: 'Build failed',
          description: 'Test',
          buildId: 'build-1',
          stage: 'test',
          timestamp: new Date(),
          resolved: false,
          metadata: {},
        },
        {
          id: '2',
          type: 'performance',
          severity: 'medium',
          title: 'Slow build',
          description: 'Test',
          buildId: 'build-2',
          stage: 'build',
          timestamp: new Date(),
          resolved: false,
          metadata: {},
        },
      ];

      const mockEvents = [
        {
          id: '1',
          type: 'build_started',
          buildId: 'build-1',
          stage: 'build',
          timestamp: new Date(),
          metadata: {},
        },
        {
          id: '2',
          type: 'build_completed',
          buildId: 'build-1',
          stage: 'build',
          timestamp: new Date(),
          metadata: {},
          duration: 120000,
          success: true,
        },
      ];

      vi.spyOn(pipelineService, 'getPipelineMetrics').mockResolvedValue({
        buildTime: 120000,
        testTime: 30000,
        deployTime: 60000,
        successRate: 100,
        failureRate: 0,
        averageBuildTime: 120000,
      });
      vi.spyOn(artifactService, 'listArtifacts').mockResolvedValue(
        mockArtifacts
      );
      vi.spyOn(monitoringService, 'getPipelineAlerts').mockResolvedValue(
        mockAlerts.map(alert => ({
          ...alert,
          type: alert.type as
            | 'security'
            | 'performance'
            | 'quality'
            | 'failure',
          severity: alert.severity as 'low' | 'medium' | 'high' | 'critical',
        }))
      );
      vi.spyOn(monitoringService, 'getPipelineEvents').mockResolvedValue(
        mockEvents.map(event => ({
          ...event,
          type: event.type as
            | 'build_started'
            | 'build_completed'
            | 'test_started'
            | 'test_completed'
            | 'deploy_started'
            | 'deploy_completed'
            | 'pipeline_failed',
        }))
      );

      const result = await service.getDashboardData();

      expect(result.pipelineMetrics).toBeDefined();
      expect(result.artifactStats.total).toBe(2);
      expect(result.artifactStats.latest).toHaveLength(2);
      expect(result.monitoringAlerts.total).toBe(2);
      expect(result.monitoringAlerts.critical).toBe(0);
      expect(result.monitoringAlerts.high).toBe(1);
      expect(result.recentActivity).toHaveLength(2);
    });

    it('should handle errors gracefully', async () => {
      vi.spyOn(pipelineService, 'getPipelineMetrics').mockRejectedValue(
        new Error('Service error')
      );

      await expect(service.getDashboardData()).rejects.toThrow('Service error');
    });
  });

  describe('executeFullWorkflow', () => {
    it('should execute full workflow successfully', async () => {
      const config = {
        environment: 'staging',
        branch: 'develop',
        commitHash: 'abc123',
        buildNumber: '1.0.0',
      };

      const mockPipelineResult = {
        success: true,
        buildId: 'build-123',
        artifacts: [],
        metrics: {
          buildTime: 120000,
          testTime: 180000,
          deployTime: 60000,
          successRate: 100,
          failureRate: 0,
          averageBuildTime: 120000,
        },
      };

      vi.spyOn(pipelineService, 'executePipeline').mockResolvedValue(
        mockPipelineResult
      );
      vi.spyOn(monitoringService, 'recordEvent').mockResolvedValue(undefined);

      const result = await service.executeFullWorkflow(config);

      expect(result.success).toBe(true);
      expect(result.workflowId).toBeDefined();
      expect(result.stages).toHaveLength(4);
      expect(result.stages.every(stage => stage.status === 'completed')).toBe(
        true
      );
      expect(pipelineService.executePipeline).toHaveBeenCalledWith({
        stages: ['build', 'test', 'deploy'],
        environment: config.environment,
        branch: config.branch,
        commitHash: config.commitHash,
        buildNumber: config.buildNumber,
      });
    });

    it('should handle workflow failure', async () => {
      const config = {
        environment: 'staging',
        branch: 'develop',
        commitHash: 'abc123',
        buildNumber: '1.0.0',
      };

      const mockPipelineResult = {
        success: false,
        buildId: 'build-123',
        artifacts: [],
        metrics: {
          buildTime: 120000,
          testTime: 180000,
          deployTime: 60000,
          successRate: 0,
          failureRate: 100,
          averageBuildTime: 120000,
        },
      };

      vi.spyOn(pipelineService, 'executePipeline').mockResolvedValue(
        mockPipelineResult
      );
      vi.spyOn(monitoringService, 'recordEvent').mockResolvedValue(undefined);

      const result = await service.executeFullWorkflow(config);

      expect(result.success).toBe(false);
      expect(result.workflowId).toBeDefined();
      expect(result.stages).toHaveLength(4);
      expect(result.stages[0]?.status).toBe('failed');
      expect(result.stages[0]?.error).toBe('Pipeline execution failed');
    });
  });

  describe('getDevOpsConfig', () => {
    it('should return DevOps configuration', () => {
      const config = service.getDevOpsConfig();

      expect(config.environments).toEqual([
        'development',
        'staging',
        'production',
      ]);
      expect(config.deploymentStrategies).toEqual([
        'rolling',
        'blue-green',
        'canary',
      ]);
      expect(config.artifactRegistries).toEqual([
        'local-registry',
        'docker-hub',
      ]);
      expect(config.monitoringEnabled).toBe(true);
    });
  });
});

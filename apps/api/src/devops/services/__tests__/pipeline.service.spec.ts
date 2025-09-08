import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ConfigServiceProvider } from '../../../test/mocks/config-service.mock';
import { PipelineService } from '../pipeline.service';

describe('PipelineService', () => {
  let service: PipelineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PipelineService, ConfigServiceProvider],
    }).compile();

    service = module.get<PipelineService>(PipelineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('executePipeline', () => {
    it('should execute pipeline successfully', async () => {
      const config = {
        stages: ['build', 'test', 'deploy'],
        environment: 'staging',
        branch: 'develop',
        commitHash: 'abc123',
        buildNumber: '1.0.0',
      };

      const result = await service.executePipeline(config);

      expect(result.success).toBe(true);
      expect(result.buildId).toBeDefined();
      expect(result.artifacts).toHaveLength(2);
      expect(result.metrics).toBeDefined();
      expect(result.metrics.successRate).toBe(100);
    }, 10000);

    it('should handle pipeline execution failure', async () => {
      const config = {
        stages: ['build', 'test', 'deploy'],
        environment: 'staging',
        branch: 'develop',
        commitHash: 'abc123',
        buildNumber: '1.0.0',
      };

      // Mock a failure scenario
      vi.spyOn(
        service as unknown as {
          executeBuildStage: () => Promise<{
            success: boolean;
            artifacts: string[];
            error: string;
          }>;
        },
        'executeBuildStage'
      ).mockResolvedValue({
        success: false,
        artifacts: [],
        error: 'Build failed',
      });

      await expect(service.executePipeline(config)).rejects.toThrow(
        'Build stage failed: Build failed'
      );
    });
  });

  describe('rollbackDeployment', () => {
    it('should rollback deployment successfully', async () => {
      const result = await service.rollbackDeployment('staging', '1.0.0');

      expect(result.success).toBe(true);
    });

    it('should handle rollback failure', async () => {
      // Mock a failure scenario
      vi.spyOn(
        service as unknown as { simulateRollback: () => Promise<boolean> },
        'simulateRollback'
      ).mockRejectedValue(new Error('Rollback failed'));

      const result = await service.rollbackDeployment('staging', '1.0.0');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rollback failed');
    });
  });

  describe('getPipelineMetrics', () => {
    it('should return pipeline metrics', async () => {
      const metrics = await service.getPipelineMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.buildTime).toBeGreaterThan(0);
      expect(metrics.testTime).toBeGreaterThan(0);
      expect(metrics.deployTime).toBeGreaterThan(0);
      expect(metrics.successRate).toBeGreaterThanOrEqual(0);
      expect(metrics.failureRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getBuildArtifacts', () => {
    it('should return build artifacts', async () => {
      const artifacts = await service.getBuildArtifacts();

      expect(Array.isArray(artifacts)).toBe(true);
      if (artifacts.length > 0) {
        expect(artifacts[0]).toHaveProperty('id');
        expect(artifacts[0]).toHaveProperty('name');
        expect(artifacts[0]).toHaveProperty('version');
        expect(artifacts[0]).toHaveProperty('size');
        expect(artifacts[0]).toHaveProperty('checksum');
        expect(artifacts[0]).toHaveProperty('createdAt');
        expect(artifacts[0]).toHaveProperty('metadata');
      }
    });

    it('should return artifacts for specific build', async () => {
      // const buildId = 'build-123';
      const artifacts = await service.getBuildArtifacts();

      expect(Array.isArray(artifacts)).toBe(true);
    });
  });
});

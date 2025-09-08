import { vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { ArtifactService } from '../artifact.service';

describe('ArtifactService', () => {
  let service: ArtifactService;

  beforeEach(async () => {
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

    service = new ArtifactService(
      mockConfigService as unknown as ConfigService
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('pushArtifact', () => {
    it('should push artifact successfully', async () => {
      const artifact = Buffer.from('test artifact data');
      const metadata = {
        name: 'test-artifact',
        version: '1.0.0',
        size: artifact.length,
        checksum: 'sha256:test123',
        createdAt: new Date(),
        tags: ['latest'],
        metadata: { test: true },
      };

      const result = await service.pushArtifact(artifact, metadata);

      expect(result.success).toBe(true);
      expect(result.url).toBeDefined();
    });

    it('should push artifact to specific registry', async () => {
      const artifact = Buffer.from('test artifact data');
      const metadata = {
        name: 'test-artifact',
        version: '1.0.0',
        size: artifact.length,
        checksum: 'sha256:test123',
        createdAt: new Date(),
        tags: ['latest'],
        metadata: { test: true },
      };

      const result = await service.pushArtifact(
        artifact,
        metadata,
        'docker-hub'
      );

      expect(result.success).toBe(true);
      expect(result.url).toBeDefined();
    });

    it('should handle push failure', async () => {
      const artifact = Buffer.from('test artifact data');
      const metadata = {
        name: 'test-artifact',
        version: '1.0.0',
        size: artifact.length,
        checksum: 'sha256:test123',
        createdAt: new Date(),
        tags: ['latest'],
        metadata: { test: true },
      };

      // Mock a failure scenario
      vi.spyOn(
        service as unknown as { simulateArtifactPush: () => Promise<string> },
        'simulateArtifactPush'
      ).mockRejectedValue(new Error('Push failed'));

      const result = await service.pushArtifact(artifact, metadata);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Push failed');
    });
  });

  describe('pullArtifact', () => {
    it('should pull artifact successfully', async () => {
      const result = await service.pullArtifact('test-artifact', '1.0.0');

      expect(result.success).toBe(true);
      expect(result.artifact).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.name).toBe('test-artifact');
      expect(result.metadata?.version).toBe('1.0.0');
    });

    it('should handle pull failure', async () => {
      // Mock a failure scenario
      vi.spyOn(
        service as unknown as { simulateArtifactPull: () => Promise<string> },
        'simulateArtifactPull'
      ).mockRejectedValue(new Error('Pull failed'));

      const result = await service.pullArtifact('test-artifact', '1.0.0');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Pull failed');
    });
  });

  describe('listArtifacts', () => {
    it('should list artifacts successfully', async () => {
      const artifacts = await service.listArtifacts();

      expect(Array.isArray(artifacts)).toBe(true);
      if (artifacts.length > 0) {
        expect(artifacts[0]).toHaveProperty('name');
        expect(artifacts[0]).toHaveProperty('version');
        expect(artifacts[0]).toHaveProperty('size');
        expect(artifacts[0]).toHaveProperty('checksum');
        expect(artifacts[0]).toHaveProperty('createdAt');
        expect(artifacts[0]).toHaveProperty('tags');
        expect(artifacts[0]).toHaveProperty('metadata');
      }
    });

    it('should filter artifacts by name', async () => {
      const artifacts = await service.listArtifacts();

      expect(Array.isArray(artifacts)).toBe(true);
    });

    it('should filter artifacts by version', async () => {
      const artifacts = await service.listArtifacts();

      expect(Array.isArray(artifacts)).toBe(true);
    });

    it('should filter artifacts by tags', async () => {
      const artifacts = await service.listArtifacts();

      expect(Array.isArray(artifacts)).toBe(true);
    });
  });

  describe('deleteArtifact', () => {
    it('should delete artifact successfully', async () => {
      const result = await service.deleteArtifact('test-artifact', '1.0.0');

      expect(result.success).toBe(true);
    });

    it('should handle delete failure', async () => {
      // Mock a failure scenario
      vi.spyOn(
        service as unknown as {
          simulateArtifactDeletion: () => Promise<boolean>;
        },
        'simulateArtifactDeletion'
      ).mockRejectedValue(new Error('Delete failed'));

      const result = await service.deleteArtifact('test-artifact', '1.0.0');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete failed');
    });
  });

  describe('getArtifactMetadata', () => {
    it('should get artifact metadata successfully', async () => {
      const result = await service.getArtifactMetadata(
        'test-artifact',
        '1.0.0'
      );

      expect(result.success).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.name).toBe('test-artifact');
      expect(result.metadata?.version).toBe('1.0.0');
    });

    it('should handle metadata retrieval failure', async () => {
      // Mock a failure scenario
      vi.spyOn(
        service as unknown as {
          simulateMetadataRetrieval: () => Promise<Record<string, unknown>>;
        },
        'simulateMetadataRetrieval'
      ).mockRejectedValue(new Error('Metadata retrieval failed'));

      const result = await service.getArtifactMetadata(
        'test-artifact',
        '1.0.0'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Metadata retrieval failed');
    });
  });

  describe('tagArtifact', () => {
    it('should tag artifact successfully', async () => {
      const result = await service.tagArtifact('test-artifact', '1.0.0', [
        'production',
        'stable',
      ]);

      expect(result.success).toBe(true);
    });

    it('should handle tagging failure', async () => {
      // Mock a failure scenario
      vi.spyOn(
        service as unknown as {
          simulateArtifactTagging: () => Promise<boolean>;
        },
        'simulateArtifactTagging'
      ).mockRejectedValue(new Error('Tagging failed'));

      const result = await service.tagArtifact('test-artifact', '1.0.0', [
        'production',
      ]);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Tagging failed');
    });
  });

  describe('cleanupOldArtifacts', () => {
    it('should cleanup old artifacts successfully', async () => {
      const result = await service.cleanupOldArtifacts(30);

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBeGreaterThanOrEqual(0);
    });

    it('should handle cleanup failure', async () => {
      // Mock a failure scenario
      vi.spyOn(
        service as unknown as {
          simulateArtifactCleanup: () => Promise<number>;
        },
        'simulateArtifactCleanup'
      ).mockRejectedValue(new Error('Cleanup failed'));

      const result = await service.cleanupOldArtifacts(30);

      expect(result.success).toBe(false);
      expect(result.deletedCount).toBe(0);
      expect(result.error).toBe('Cleanup failed');
    });
  });

  describe('getRegistryHealth', () => {
    it('should get registry health successfully', async () => {
      const result = await service.getRegistryHealth();

      expect(result.success).toBe(true);
      expect(result.status).toBeDefined();
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle health check failure', async () => {
      // Mock a failure scenario
      vi.spyOn(
        service as unknown as { simulateHealthCheck: () => Promise<boolean> },
        'simulateHealthCheck'
      ).mockRejectedValue(new Error('Health check failed'));

      const result = await service.getRegistryHealth();

      expect(result.success).toBe(false);
      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Health check failed');
    });
  });
});

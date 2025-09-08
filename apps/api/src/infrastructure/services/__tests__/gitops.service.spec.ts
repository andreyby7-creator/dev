import type { ConfigService } from '@nestjs/config';
import { vi } from 'vitest';
import { GitOpsService } from '../gitops.service';

describe('GitOpsService', () => {
  let service: GitOpsService;
  let configService: ConfigService;

  beforeEach(async () => {
    // Создаем мок ConfigService
    configService = {
      get: vi.fn((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          GITOPS_ENABLED: true,
          GITOPS_SYNC_INTERVAL: 300,
          GITOPS_TIMEOUT: 600,
          GITOPS_RETRY_COUNT: 3,
        };
        return config[key] ?? defaultValue;
      }),
      getOrThrow: vi.fn((key: string) => {
        const config = {
          GITOPS_ENABLED: true,
          GITOPS_SYNC_INTERVAL: 300,
          GITOPS_TIMEOUT: 600,
          GITOPS_RETRY_COUNT: 3,
        };
        if (key in config) return (config as Record<string, unknown>)[key];
        throw new Error(`Configuration key "${key}" not found`);
      }),
    } as unknown as ConfigService;

    // Создаем сервис напрямую с моком
    service = new GitOpsService(configService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRepositories', () => {
    it('should return GitOps repositories', async () => {
      const result = await service.getRepositories();

      expect(result.success).toBe(true);
      expect(result.repositories).toHaveLength(3);
      expect(result.repositories?.[0]?.name).toBe('salespot-infrastructure');
      expect(result.repositories?.[0]?.status).toBe('synced');
    });
  });

  describe('syncRepository', () => {
    it('should sync repository', async () => {
      const syncConfig = {
        repositoryId: 'repo-1',
        environment: 'production',
        application: 'web-app',
        autoSync: true,
        syncPolicy: 'manual' as const,
      };

      const result = await service.syncRepository(syncConfig);

      expect(result.success).toBe(true);
      expect(result.syncId).toBeDefined();
    });
  });

  describe('getStatus', () => {
    it('should return GitOps status', async () => {
      const result = await service.getStatus();

      expect(result.success).toBe(true);
      expect(result.status).toBeDefined();
      expect(result.status?.repositories).toBe(3);
      expect(result.status?.applications).toBe(8);
      expect(result.status?.environments).toBe(3);
    });
  });

  describe('getApplications', () => {
    it('should return GitOps applications', async () => {
      const result = await service.getApplications();

      expect(result.success).toBe(true);
      expect(result.applications).toHaveLength(7);
      expect(result.applications?.[0]?.name).toBe('web-app');
      expect(result.applications?.[0]?.status).toBe('healthy');
    });
  });

  describe('getSyncHistory', () => {
    it('should return sync history for all repositories', async () => {
      const result = await service.getSyncHistory();

      expect(result.success).toBe(true);
      expect(result.history).toHaveLength(4);
      expect(result.history?.[0]?.repositoryId).toBe('repo-1');
    });

    it('should return sync history for specific repository', async () => {
      const result = await service.getSyncHistory('repo-1');

      expect(result.success).toBe(true);
      expect(result.history).toHaveLength(2);
      expect(result.history?.[0]?.repositoryId).toBe('repo-1');
    });
  });

  describe('getSyncStatus', () => {
    it('should return sync status', async () => {
      // First sync a repository
      const syncConfig = {
        repositoryId: 'repo-1',
        environment: 'production',
        application: 'web-app',
        autoSync: true,
        syncPolicy: 'manual' as const,
      };

      const sync = await service.syncRepository(syncConfig);
      expect(sync.success).toBe(true);

      // Then get status
      const result = await service.getSyncStatus(sync.syncId!);

      expect(result.success).toBe(true);
      expect(result.syncStatus).toBeDefined();
      expect(result.syncStatus?.repositoryId).toBe('repo-1');
    });

    it('should return error for non-existent sync', async () => {
      const result = await service.getSyncStatus('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Sync not found');
    });
  });

  describe('validateRepository', () => {
    it('should validate repository URL', async () => {
      const result = await service.validateRepository(
        'https://github.com/salespot/infrastructure.git'
      );

      expect(result.success).toBe(true);
      expect(result.valid).toBe(true);
    });

    it('should return validation errors for invalid URL', async () => {
      const result = await service.validateRepository('');

      expect(result.success).toBe(true);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Repository URL is required');
    });

    it('should return validation errors for unsupported platform', async () => {
      const result = await service.validateRepository(
        'https://unsupported.com/repo.git'
      );

      expect(result.success).toBe(true);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Repository must be hosted on a supported Git platform'
      );
    });
  });

  describe('getRepositoryHealth', () => {
    it('should return repository health', async () => {
      const result = await service.getRepositoryHealth('repo-1');

      expect(result.success).toBe(true);
      expect(result.health).toBeDefined();
      expect(result.health?.status).toBe('healthy');
      expect(
        (result.health as { applications?: { total: number } })?.applications
          ?.total
      ).toBe(3);
    });
  });
});

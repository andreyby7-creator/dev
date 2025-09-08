import type { ConfigService } from '@nestjs/config';
import { vi } from 'vitest';
import { BackupService } from '../backup.service';

describe('BackupService', () => {
  let service: BackupService;
  let configService: ConfigService;

  beforeEach(async () => {
    // Создаем мок ConfigService
    configService = {
      get: vi.fn((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          BACKUP_ENABLED: true,
          BACKUP_PATH: '/backups',
          BACKUP_RETENTION_DAYS: 30,
          BACKUP_COMPRESSION: true,
          BACKUP_ENCRYPTION: true,
        };
        return config[key] ?? defaultValue;
      }),
      getOrThrow: vi.fn((key: string) => {
        const config = {
          BACKUP_ENABLED: true,
          BACKUP_PATH: '/backups',
          BACKUP_RETENTION_DAYS: 30,
          BACKUP_COMPRESSION: true,
          BACKUP_ENCRYPTION: true,
        };
        if (key in config) return (config as Record<string, unknown>)[key];
        throw new Error(`Configuration key "${key}" not found`);
      }),
    } as unknown as ConfigService;

    // Создаем сервис напрямую с моком
    service = new BackupService(configService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStrategies', () => {
    it('should return backup strategies', async () => {
      const result = await service.getStrategies();
      expect(result).toBeInstanceOf(Object);
      expect(result.success).toBe(true);
      expect(result.strategies).toBeInstanceOf(Array);
      expect(result.strategies).toHaveLength(5);
    });
  });

  describe('executeBackup', () => {
    it('should execute backup successfully', async () => {
      const backupConfig = {
        strategy: 'daily-full',
        source: '/data',
        destination: '/backups',
        name: 'test-backup',
        options: {
          compression: true,
          encryption: true,
        },
      };

      const result = await service.executeBackup(backupConfig);
      expect(result).toBeInstanceOf(Object);
      expect(result.success).toBe(true);
      expect(result.jobId).toBeDefined();
    });
  });

  describe('getStatus', () => {
    it('should return backup status', async () => {
      const result = await service.getStatus();
      expect(result).toBeInstanceOf(Object);
      expect(result.success).toBe(true);
      expect(result.status).toBeDefined();
      expect(result.status?.totalBackups).toBeDefined();
    });
  });

  describe('restoreBackup', () => {
    it('should restore backup successfully', async () => {
      const restoreConfig = {
        backupId: 'test-backup-id',
        destination: '/restore',
        options: {
          overwrite: true,
        },
      };

      const result = await service.restoreBackup(restoreConfig);
      expect(result).toBeInstanceOf(Object);
      expect(result.success).toBe(true);
      expect(result.restoreId).toBeDefined();
    });
  });

  describe('getBackupJobs', () => {
    it('should return backup jobs', async () => {
      const result = await service.getBackupJobs();
      expect(result).toBeInstanceOf(Object);
      expect(result.success).toBe(true);
      expect(result.jobs).toBeInstanceOf(Array);
    });
  });

  describe('getRestoreJobs', () => {
    it('should return restore jobs', async () => {
      const result = await service.getRestoreJobs();
      expect(result).toBeInstanceOf(Object);
      expect(result.success).toBe(true);
      expect(result.jobs).toBeInstanceOf(Array);
    });
  });

  describe('getBackupJobStatus', () => {
    it('should return backup job status', async () => {
      const result = await service.getBackupJobStatus('test-job-id');
      expect(result).toBeInstanceOf(Object);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Backup job not found');
    });
  });

  describe('getRestoreJobStatus', () => {
    it('should return restore job status', async () => {
      const result = await service.getRestoreJobStatus('test-restore-id');
      expect(result).toBeInstanceOf(Object);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Restore job not found');
    });
  });

  describe('validateBackupStrategy', () => {
    it('should validate backup strategy', async () => {
      const strategy = {
        id: 'test-strategy',
        name: 'Test Strategy',
        type: 'full' as const,
        description: 'Test description',
        schedule: '0 2 * * *',
        retention: {
          days: 7,
        },
        compression: true,
        encryption: true,
        destinations: ['local-storage'],
      };

      const result = await service.validateBackupStrategy(strategy);
      expect(result).toBeInstanceOf(Object);
      expect(result.success).toBe(true);
      expect(result.valid).toBe(true);
    });
  });

  describe('getBackupMetrics', () => {
    it('should return backup metrics', async () => {
      const result = await service.getBackupMetrics();
      expect(result).toBeInstanceOf(Object);
      expect(result.success).toBe(true);
      expect(result.metrics).toBeDefined();
    });
  });
});

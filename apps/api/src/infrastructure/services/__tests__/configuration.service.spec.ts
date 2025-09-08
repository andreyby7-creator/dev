import type { ConfigService } from '@nestjs/config';
import { vi } from 'vitest';
import { ConfigurationService } from '../configuration.service';

describe('ConfigurationService', () => {
  let service: ConfigurationService;
  let configService: ConfigService;

  beforeEach(async () => {
    // Создаем мок ConfigService
    configService = {
      get: vi.fn((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          CONFIG_ENABLED: true,
          CONFIG_PATH: '/configs',
          CONFIG_TIMEOUT: 300,
          CONFIG_RETRY_COUNT: 3,
        };
        return config[key] ?? defaultValue;
      }),
      getOrThrow: vi.fn((key: string) => {
        const config = {
          CONFIG_ENABLED: true,
          CONFIG_PATH: '/configs',
          CONFIG_TIMEOUT: 300,
          CONFIG_RETRY_COUNT: 3,
        };
        if (key in config) return (config as Record<string, unknown>)[key];
        throw new Error(`Configuration key "${key}" not found`);
      }),
    } as unknown as ConfigService;

    // Создаем сервис напрямую с моком
    service = new ConfigurationService(configService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTemplates', () => {
    it('should return configuration templates', async () => {
      const result = await service.getTemplates();

      expect(result.success).toBe(true);
      expect(result.templates).toHaveLength(3);
      expect(result.templates?.[0]?.id).toBe('vpc-config');
      expect(result.templates?.[0]?.type).toBe('infrastructure');
    });
  });

  describe('applyConfiguration', () => {
    it('should apply configuration', async () => {
      const config = {
        templateId: 'vpc-config',
        environment: 'production',
        variables: {
          environment: 'production',
          region: 'us-east-1',
        },
      };

      const result = await service.applyConfiguration(config);

      expect(result.success).toBe(true);
      expect(result.statusId).toBeDefined();
    });

    it('should apply configuration with dry run', async () => {
      const config = {
        templateId: 'vpc-config',
        environment: 'production',
        variables: {
          environment: 'production',
          region: 'us-east-1',
        },
        dryRun: true,
      };

      const result = await service.applyConfiguration(config);

      expect(result.success).toBe(true);
      expect(result.statusId).toBeDefined();
    });
  });

  describe('getStatus', () => {
    it('should return configuration status', async () => {
      const result = await service.getStatus();

      expect(result.success).toBe(true);
      expect(result.statuses).toBeDefined();
    });
  });

  describe('validateConfiguration', () => {
    it('should validate configuration', async () => {
      const template = {
        id: 'test-template',
        name: 'Test Template',
        description: 'Test template',
        type: 'infrastructure' as const,
        version: '1.0.0',
        content: {},
        variables: [
          {
            name: 'environment',
            type: 'string',
            required: true,
          },
        ],
      };

      const variables = {
        environment: 'production',
      };

      const result = await service.validateConfiguration(template, variables);

      expect(result.success).toBe(true);
      expect(result.validation?.valid).toBe(true);
    });

    it('should return validation errors for missing required variables', async () => {
      const template = {
        id: 'test-template',
        name: 'Test Template',
        description: 'Test template',
        type: 'infrastructure' as const,
        version: '1.0.0',
        content: {},
        variables: [
          {
            name: 'environment',
            type: 'string',
            required: true,
          },
        ],
      };

      const variables = {};

      const result = await service.validateConfiguration(template, variables);

      expect(result.success).toBe(true);
      expect(result.validation?.valid).toBe(false);
      expect(result.validation?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: "Required variable 'environment' is missing",
          }),
        ])
      );
    });
  });

  describe('getConfigurationHistory', () => {
    it('should return configuration history', async () => {
      const result = await service.getConfigurationHistory('vpc-config');

      expect(result.success).toBe(true);
      expect(result.history).toHaveLength(3);
      expect(result.history?.[0]?.version).toBe('1.2.0');
    });
  });

  describe('rollbackConfiguration', () => {
    it('should rollback configuration', async () => {
      const result = await service.rollbackConfiguration('vpc-config', '1.1.0');

      expect(result.success).toBe(true);
    });
  });
});

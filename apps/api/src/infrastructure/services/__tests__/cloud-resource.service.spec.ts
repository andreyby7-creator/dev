import type { ConfigService } from '@nestjs/config';
import { vi } from 'vitest';
import { CloudResourceService } from '../cloud-resource.service';

describe('CloudResourceService', () => {
  let service: CloudResourceService;
  let configService: ConfigService;

  beforeEach(async () => {
    // Создаем мок ConfigService
    configService = {
      get: vi.fn((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          CLOUD_PROVIDER: 'aws',
          CLOUD_REGION: 'us-east-1',
          CLOUD_ENABLED: true,
          CLOUD_TIMEOUT: 300,
          CLOUD_RETRY_COUNT: 3,
        };
        return config[key] ?? defaultValue;
      }),
      getOrThrow: vi.fn((key: string) => {
        const config = {
          CLOUD_PROVIDER: 'aws',
          CLOUD_REGION: 'us-east-1',
          CLOUD_ENABLED: true,
          CLOUD_TIMEOUT: 300,
          CLOUD_RETRY_COUNT: 3,
        };
        if (key in config) return (config as Record<string, unknown>)[key];
        throw new Error(`Configuration key "${key}" not found`);
      }),
    } as unknown as ConfigService;

    // Создаем сервис напрямую с моком
    service = new CloudResourceService(configService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getResources', () => {
    it('should return all cloud resources', async () => {
      const result = await service.getResources();

      expect(result.success).toBe(true);
      expect(result.resources).toHaveLength(6);
      expect(result.resources?.[0]?.provider).toBe('aws');
    });

    it('should return resources for specific provider', async () => {
      const result = await service.getResources('aws');

      expect(result.success).toBe(true);
      expect(result.resources).toHaveLength(5);
      expect(result.resources?.[0]?.provider).toBe('aws');
    });
  });

  describe('provisionResource', () => {
    it('should provision cloud resource', async () => {
      const resourceConfig = {
        provider: 'aws',
        type: 'EC2 Instance',
        region: 'us-east-1',
        name: 'test-instance',
        configuration: {
          instanceType: 't3.micro',
          ami: 'ami-12345678',
        },
        tags: {
          Environment: 'test',
        },
      };

      const result = await service.provisionResource(resourceConfig);

      expect(result.success).toBe(true);
      expect(result._resourceId).toBeDefined();
    });
  });

  describe('deprovisionResource', () => {
    it('should deprovision cloud resource', async () => {
      const result = await service.deprovisionResource('i-1234567890abcdef0');

      expect(result.success).toBe(true);
    });
  });

  describe('getProviders', () => {
    it('should return cloud providers', async () => {
      const result = await service.getProviders();

      expect(result.success).toBe(true);
      expect(result.providers).toHaveLength(4);
      expect(result.providers?.[0]?.name).toBe('AWS');
      expect(result.providers?.[0]?.type).toBe('aws');
    });
  });

  describe('getResourceMetrics', () => {
    it('should return resource metrics', async () => {
      const result = await service.getResourceMetrics('i-1234567890abcdef0');

      expect(result.success).toBe(true);
      expect(result.metrics).toBeDefined();
      expect(
        (
          result.metrics as {
            cpu?: { utilization: number };
            memory?: { utilization: number };
          }
        )?.cpu?.utilization
      ).toBe(45.2);
      expect(
        (
          result.metrics as {
            cpu?: { utilization: number };
            memory?: { utilization: number };
          }
        )?.memory?.utilization
      ).toBe(67.8);
    });
  });

  describe('updateResourceTags', () => {
    it('should update resource tags', async () => {
      const tags = {
        Environment: 'production',
        Project: 'salespot',
      };

      const result = await service.updateResourceTags(
        'i-1234567890abcdef0',
        tags
      );

      expect(result.success).toBe(true);
    });
  });

  describe('getResourceCosts', () => {
    it('should return resource costs', async () => {
      const result = await service.getResourceCosts(
        'i-1234567890abcdef0',
        '30d'
      );

      expect(result.success).toBe(true);
      expect(result.costs).toBeDefined();
      expect(result.costs?.total).toBe(125.5);
      expect(result.costs?.currency).toBe('USD');
    });
  });
});

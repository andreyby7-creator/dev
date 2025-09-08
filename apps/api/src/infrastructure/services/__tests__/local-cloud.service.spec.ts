import type { ConfigService } from '@nestjs/config';
import { vi } from 'vitest';
import { LocalCloudService } from '../local-cloud.service';

describe('LocalCloudService', () => {
  let service: LocalCloudService;
  let configService: ConfigService;

  beforeEach(async () => {
    configService = {
      get: vi.fn((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          LOCAL_CLOUD_ENABLED: true,
          LOCAL_CLOUD_PROVIDERS: 'hoster-by,cloud-flex-a1,becloud,local',
          LOCAL_CLOUD_DEFAULT_REGION: 'Minsk, Belarus',
          LOCAL_CLOUD_COMPLIANCE_ENABLED: true,
        };
        return config[key] ?? defaultValue;
      }),
      getOrThrow: vi.fn((key: string) => {
        const config = {
          LOCAL_CLOUD_ENABLED: true,
          LOCAL_CLOUD_PROVIDERS: 'hoster-by,cloud-flex-a1,becloud,local',
          LOCAL_CLOUD_DEFAULT_REGION: 'Minsk, Belarus',
          LOCAL_CLOUD_COMPLIANCE_ENABLED: true,
        };
        const value = (config as Record<string, unknown>)[key];
        if (value == null) {
          throw new Error(`Configuration key "${key}" not found`);
        }
        return value;
      }),
    } as unknown as ConfigService;
    service = new LocalCloudService(configService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProviders', () => {
    it('should return local cloud providers', async () => {
      const result = await service.getProviders();

      expect(result.success).toBe(true);
      expect(result.providers).toHaveLength(4);
      expect(result.providers?.[0]?.name).toBe('Hoster.by');
      expect(result.providers?.[0]?.type).toBe('hoster-by');
      expect(result.providers?.[0]?.compliance?.gdpr).toBe(true);
    });
  });

  describe('provisionResource', () => {
    it('should provision local cloud resource', async () => {
      const resourceConfig = {
        provider: 'hoster-by',
        type: 'Virtual Machine',
        name: 'test-vm',
        region: 'Minsk, Belarus',
        configuration: {
          instanceType: 'Standard-2',
          cpu: 2,
          memory: '4GB',
        },
        compliance: {
          dataResidency: true,
          encryption: true,
          backup: true,
        },
      };

      const result = await service.provisionResource(resourceConfig);

      expect(result.success).toBe(true);
      expect(result._resourceId).toBeDefined();
    });
  });

  describe('getComplianceStatus', () => {
    it('should return compliance status', async () => {
      const result = await service.getComplianceStatus();

      expect(result.success).toBe(true);
      expect(result.compliance).toHaveLength(3);
      expect(result.compliance?.[0]?.provider).toBe('Hoster.by');
      expect(result.compliance?.[0]?.overall).toBe('compliant');
      expect(result.compliance?.[0]?.checks).toHaveLength(4);
    });
  });

  describe('getLocalResources', () => {
    it('should return all local resources', async () => {
      const result = await service.getLocalResources();

      expect(result.success).toBe(true);
      expect(result.resources).toHaveLength(4);
      expect(result.resources?.[0]?.provider).toBe('hoster-by');
    });

    it('should return resources for specific provider', async () => {
      const result = await service.getLocalResources('hoster-by');

      expect(result.success).toBe(true);
      expect(result.resources).toHaveLength(1);
      expect(result.resources?.[0]?.provider).toBe('hoster-by');
    });
  });

  describe('validateCompliance', () => {
    it('should validate compliance', async () => {
      const result = await service.validateCompliance('hoster-vm-1');

      expect(result.success).toBe(true);
      expect(result.compliant).toBe(true);
    });
  });

  describe('getProviderCapabilities', () => {
    it('should return provider capabilities', async () => {
      const result = await service.getProviderCapabilities('hoster-by');

      expect(result.success).toBe(true);
      expect(result.capabilities).toContain('Virtual Machines');
      expect(result.capabilities).toContain('Dedicated Servers');
      expect(result.capabilities).toContain('Cloud Storage');
    });

    it('should return empty capabilities for unknown provider', async () => {
      const result = await service.getProviderCapabilities('unknown-provider');

      expect(result.success).toBe(true);
      expect(result.capabilities).toHaveLength(0);
    });
  });
});

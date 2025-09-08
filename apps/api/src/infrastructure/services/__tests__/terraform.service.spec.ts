import type { ConfigService } from '@nestjs/config';
import { vi } from 'vitest';
import { TerraformService } from '../terraform.service';

describe('TerraformService', () => {
  let service: TerraformService;
  let configService: ConfigService;

  beforeEach(async () => {
    configService = {
      get: vi.fn((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          TERRAFORM_ENABLED: true,
          TERRAFORM_PATH: '/usr/bin/terraform',
          TERRAFORM_WORKSPACE: 'default',
          TERRAFORM_STATE_BACKEND: 'local',
        };
        return config[key] ?? defaultValue;
      }),
      getOrThrow: vi.fn((key: string) => {
        const config = {
          TERRAFORM_ENABLED: true,
          TERRAFORM_PATH: '/usr/bin/terraform',
          TERRAFORM_WORKSPACE: 'default',
          TERRAFORM_STATE_BACKEND: 'local',
        };
        const value = (config as Record<string, unknown>)[key];
        if (value == null) {
          throw new Error(`Configuration key "${key}" not found`);
        }
        return value;
      }),
    } as unknown as ConfigService;
    service = new TerraformService(configService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getState', () => {
    it('should return Terraform state', async () => {
      const result = await service.getState();

      expect(result.success).toBe(true);
      expect(result.state).toBeDefined();
      expect(result.state?.version).toBe(4);
      expect(result.state?.terraform_version).toBe('1.5.0');
      expect(result.state?.resources).toHaveLength(1);
    });
  });

  describe('plan', () => {
    it('should create Terraform plan', async () => {
      const config = {
        provider: 'aws',
        region: 'us-east-1',
        resources: [
          {
            type: 'aws_vpc',
            name: 'main',
            config: {
              cidr_block: '10.0.0.0/16',
            },
          },
        ],
      };

      const result = await service.plan(config);

      expect(result.success).toBe(true);
      expect(result.plan).toBeDefined();
      expect(result.plan?.resource_changes).toHaveLength(1);
      expect(result.plan?.resource_changes?.[0]?.address).toBe('aws_vpc.main');
    });
  });

  describe('apply', () => {
    it('should apply Terraform configuration', async () => {
      const config = {
        provider: 'aws',
        region: 'us-east-1',
        resources: [
          {
            type: 'aws_vpc',
            name: 'main',
            config: {
              cidr_block: '10.0.0.0/16',
            },
          },
        ],
      };

      const result = await service.apply(config);

      expect(result.success).toBe(true);
      expect(result.outputs).toBeDefined();
      expect(result.outputs?.vpc_id).toBe('vpc-12345678');
    });
  });

  describe('destroy', () => {
    it('should destroy Terraform resources', async () => {
      const config = {
        provider: 'aws',
        region: 'us-east-1',
        resources: [
          {
            type: 'aws_vpc',
            name: 'main',
            config: {
              cidr_block: '10.0.0.0/16',
            },
          },
        ],
      };

      const result = await service.destroy(config);

      expect(result.success).toBe(true);
    });
  });

  describe('validate', () => {
    it('should validate Terraform configuration', async () => {
      const config = {
        provider: 'aws',
        region: 'us-east-1',
        resources: [
          {
            type: 'aws_vpc',
            name: 'main',
            config: {
              cidr_block: '10.0.0.0/16',
            },
          },
        ],
      };

      const result = await service.validate(config);

      expect(result.success).toBe(true);
      expect(result.valid).toBe(true);
    });

    it('should return validation errors for invalid config', async () => {
      const config = {
        provider: '',
        resources: [],
      };

      const result = await service.validate(config);

      expect(result.success).toBe(true);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Provider is required');
      expect(result.errors).toContain('At least one resource is required');
    });
  });

  describe('getWorkspaces', () => {
    it('should return available workspaces', async () => {
      const result = await service.getWorkspaces();

      expect(result.success).toBe(true);
      expect(result.workspaces).toContain('default');
      expect(result.workspaces).toContain('staging');
      expect(result.workspaces).toContain('production');
    });
  });

  describe('selectWorkspace', () => {
    it('should select workspace', async () => {
      const result = await service.selectWorkspace('staging');

      expect(result.success).toBe(true);
    });
  });
});

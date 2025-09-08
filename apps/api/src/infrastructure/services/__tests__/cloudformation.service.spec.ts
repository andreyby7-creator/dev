import type { ConfigService } from '@nestjs/config';
import { vi } from 'vitest';
import { CloudFormationService } from '../cloudformation.service';

describe('CloudFormationService', () => {
  let service: CloudFormationService;
  let configService: ConfigService;

  beforeEach(async () => {
    // Создаем мок ConfigService
    configService = {
      get: vi.fn((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          CLOUDFORMATION_ENABLED: true,
          CLOUDFORMATION_REGION: 'us-east-1',
          CLOUDFORMATION_TIMEOUT: 300,
          CLOUDFORMATION_RETRY_COUNT: 3,
        };
        return config[key] ?? defaultValue;
      }),
      getOrThrow: vi.fn((key: string) => {
        const config = {
          CLOUDFORMATION_ENABLED: true,
          CLOUDFORMATION_REGION: 'us-east-1',
          CLOUDFORMATION_TIMEOUT: 300,
          CLOUDFORMATION_RETRY_COUNT: 3,
        };
        if (key in config) return (config as Record<string, unknown>)[key];
        throw new Error(`Configuration key "${key}" not found`);
      }),
    } as unknown as ConfigService;

    // Создаем сервис напрямую с моком
    service = new CloudFormationService(configService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStacks', () => {
    it('should return CloudFormation stacks', async () => {
      const result = await service.getStacks();

      expect(result.success).toBe(true);
      expect(result.stacks).toHaveLength(3);
      expect(result.stacks?.[0]?.name).toBe('production-vpc-stack');
      expect(result.stacks?.[0]?.status).toBe('CREATE_COMPLETE');
    });
  });

  describe('createStack', () => {
    it('should create CloudFormation stack', async () => {
      const stackConfig = {
        name: 'test-stack',
        template: {
          name: 'test-template',
          description: 'Test template',
          parameters: [],
          resources: {
            TestResource: {
              Type: 'AWS::S3::Bucket',
              Properties: {
                BucketName: 'test-bucket',
              },
            },
          },
          outputs: {
            BucketName: {
              Value: { Ref: 'TestResource' },
              Description: 'S3 Bucket Name',
            },
          },
        },
        parameters: {
          Environment: 'test',
        },
      };

      const result = await service.createStack(stackConfig);

      expect(result.success).toBe(true);
      expect(result.stackId).toBeDefined();
    });
  });

  describe('updateStack', () => {
    it('should update CloudFormation stack', async () => {
      const stackConfig = {
        template: {
          name: 'test-template',
          description: 'Test template',
          parameters: [],
          resources: {
            TestResource: {
              Type: 'AWS::S3::Bucket',
              Properties: {
                BucketName: 'test-bucket-updated',
              },
            },
          },
          outputs: {
            BucketName: {
              Value: { Ref: 'TestResource' },
              Description: 'S3 Bucket Name',
            },
          },
        },
        parameters: {
          Environment: 'test',
        },
      };

      const result = await service.updateStack('test-stack', stackConfig);

      expect(result.success).toBe(true);
      expect(result.stackId).toBeDefined();
    });
  });

  describe('deleteStack', () => {
    it('should delete CloudFormation stack', async () => {
      const result = await service.deleteStack('test-stack');

      expect(result.success).toBe(true);
    });
  });

  describe('getStackEvents', () => {
    it('should return stack events', async () => {
      const result = await service.getStackEvents('production-vpc-stack');

      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(5);
      expect(result.events?.[0]?.resourceType).toBe('AWS::EC2::VPC');
    });
  });

  describe('getStackResources', () => {
    it('should return stack resources', async () => {
      const result = await service.getStackResources('production-vpc-stack');

      expect(result.success).toBe(true);
      expect(result.resources).toHaveLength(5);
      expect(result.resources?.[0]?.name).toBe('ProductionVPC');
      expect(result.resources?.[0]?.type).toBe('AWS::EC2::VPC');
    });
  });

  describe('validateTemplate', () => {
    it('should validate template', async () => {
      const template = {
        name: 'test-template',
        description: 'Test template',
        parameters: [],
        resources: {
          TestResource: {
            Type: 'AWS::S3::Bucket',
            Properties: {
              BucketName: 'test-bucket',
            },
          },
        },
        outputs: {
          BucketName: {
            Value: { Ref: 'TestResource' },
            Description: 'S3 Bucket Name',
          },
        },
      };

      const result = await service.validateTemplate(template);

      expect(result.success).toBe(true);
      expect(result.valid).toBe(true);
    });

    it('should return validation errors for invalid template', async () => {
      const template = {
        name: '',
        description: 'Test template',
        parameters: [],
        resources: {},
        outputs: {},
      };

      const result = await service.validateTemplate(template);

      expect(result.success).toBe(true);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Template name is required');
      expect(result.errors).toContain('At least one resource is required');
    });
  });

  describe('getStackOutputs', () => {
    it('should return stack outputs', async () => {
      const result = await service.getStackOutputs('production-vpc-stack');

      expect(result.success).toBe(true);
      expect(result.outputs).toBeDefined();
      expect(result.outputs?.VpcId).toBe('vpc-12345678');
    });
  });
});

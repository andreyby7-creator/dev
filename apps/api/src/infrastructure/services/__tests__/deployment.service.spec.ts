import type { ConfigService } from '@nestjs/config';
import { vi } from 'vitest';
import { DeploymentService } from '../deployment.service';

describe('DeploymentService', () => {
  let service: DeploymentService;
  let configService: ConfigService;

  beforeEach(async () => {
    // Создаем мок ConfigService
    configService = {
      get: vi.fn((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          DEPLOYMENT_ENABLED: true,
          DEPLOYMENT_TIMEOUT: 300,
          DEPLOYMENT_RETRY_COUNT: 3,
          DEPLOYMENT_STRATEGY: 'rolling-update',
        };
        return config[key] ?? defaultValue;
      }),
      getOrThrow: vi.fn((key: string) => {
        const config = {
          DEPLOYMENT_ENABLED: true,
          DEPLOYMENT_TIMEOUT: 300,
          DEPLOYMENT_RETRY_COUNT: 3,
          DEPLOYMENT_STRATEGY: 'rolling-update',
        };
        if (key in config) return (config as Record<string, unknown>)[key];
        throw new Error(`Configuration key "${key}" not found`);
      }),
    } as unknown as ConfigService;

    // Создаем сервис напрямую с моком
    service = new DeploymentService(configService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStrategies', () => {
    it('should return deployment strategies', async () => {
      const result = await service.getStrategies();

      expect(result.success).toBe(true);
      expect(result.strategies).toHaveLength(4);
      expect(result.strategies?.[0]?.name).toBe('rolling-update');
      expect(result.strategies?.[0]?.type).toBe('rolling');
    });
  });

  describe('executeDeployment', () => {
    it('should execute deployment', async () => {
      const deploymentConfig = {
        name: 'web-app',
        strategy: 'rolling-update',
        environment: 'production',
        image: 'nginx:1.21',
        replicas: 3,
        parameters: {
          maxUnavailable: 1,
        },
      };

      const result = await service.executeDeployment(deploymentConfig);

      expect(result.success).toBe(true);
      expect(result.deploymentId).toBeDefined();
    });
  });

  describe('getHistory', () => {
    it('should return deployment history', async () => {
      const result = await service.getHistory();

      expect(result.success).toBe(true);
      expect(result.history).toHaveLength(3);
      expect(result.history?.[0]?.version).toBe('v1.0.0');
    });
  });

  describe('getDeploymentStatus', () => {
    it('should return deployment status', async () => {
      // First execute a deployment
      const deploymentConfig = {
        name: 'web-app',
        strategy: 'rolling-update',
        environment: 'production',
        image: 'nginx:1.21',
        replicas: 3,
      };

      const deployment = await service.executeDeployment(deploymentConfig);
      expect(deployment.success).toBe(true);

      // Then get status
      const result = await service.getDeploymentStatus(
        deployment.deploymentId!
      );

      expect(result.success).toBe(true);
      expect(result.deployment).toBeDefined();
      expect(result.deployment?.name).toBe('web-app');
    });

    it('should return error for non-existent deployment', async () => {
      const result = await service.getDeploymentStatus('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Deployment not found');
    });
  });

  describe('rollbackDeployment', () => {
    it('should rollback deployment', async () => {
      // First execute a deployment
      const deploymentConfig = {
        name: 'web-app',
        strategy: 'rolling-update',
        environment: 'production',
        image: 'nginx:1.21',
        replicas: 3,
      };

      const deployment = await service.executeDeployment(deploymentConfig);
      expect(deployment.success).toBe(true);

      // Then rollback
      const result = await service.rollbackDeployment(
        deployment.deploymentId!,
        'v1.0.0'
      );

      expect(result.success).toBe(true);
    });
  });

  describe('scaleDeployment', () => {
    it('should scale deployment', async () => {
      // First execute a deployment
      const deploymentConfig = {
        name: 'web-app',
        strategy: 'rolling-update',
        environment: 'production',
        image: 'nginx:1.21',
        replicas: 3,
      };

      const deployment = await service.executeDeployment(deploymentConfig);
      expect(deployment.success).toBe(true);

      // Then scale
      const result = await service.scaleDeployment(deployment.deploymentId!, 5);

      expect(result.success).toBe(true);
    });
  });

  describe('getDeploymentMetrics', () => {
    it('should return deployment metrics', async () => {
      const result = await service.getDeploymentMetrics('deploy-1');

      expect(result.success).toBe(true);
      expect(result.metrics).toBeDefined();
      expect(result.metrics?.availability).toBe(99.9);
      expect(
        (result.metrics as { responseTime?: { average: number } })?.responseTime
          ?.average
      ).toBe(150);
    });
  });

  describe('validateDeployment', () => {
    it('should validate deployment configuration', async () => {
      const deploymentConfig = {
        name: 'web-app',
        strategy: 'rolling-update',
        environment: 'production',
        image: 'nginx:1.21',
        replicas: 3,
      };

      const result = await service.validateDeployment(deploymentConfig);

      expect(result.success).toBe(true);
      expect(result.valid).toBe(true);
    });

    it('should return validation errors for invalid configuration', async () => {
      const deploymentConfig = {
        name: null,
        strategy: null,
        environment: null,
        image: null,
        replicas: 0,
      };

      const result = await service.validateDeployment(deploymentConfig);

      expect(result.success).toBe(true);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Deployment name is required');
      expect(result.errors).toContain('Deployment strategy is required');
      expect(result.errors).toContain('Environment is required');
      expect(result.errors).toContain('Image is required');
      expect(result.errors).toContain('Replicas must be at least 1');
    });
  });
});

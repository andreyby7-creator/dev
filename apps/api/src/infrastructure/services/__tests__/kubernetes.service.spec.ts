import type { ConfigService } from '@nestjs/config';
import { vi } from 'vitest';
import { KubernetesService } from '../kubernetes.service';

describe('KubernetesService', () => {
  let service: KubernetesService;
  let configService: ConfigService;

  beforeEach(async () => {
    configService = {
      get: vi.fn((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          KUBERNETES_ENABLED: true,
          KUBERNETES_CLUSTER_URL: 'https://k8s.example.com',
          KUBERNETES_TOKEN: 'test-token',
          KUBERNETES_NAMESPACE: 'default',
        };
        return config[key] ?? defaultValue;
      }),
      getOrThrow: vi.fn((key: string) => {
        const config = {
          KUBERNETES_ENABLED: true,
          KUBERNETES_CLUSTER_URL: 'https://k8s.example.com',
          KUBERNETES_TOKEN: 'test-token',
          KUBERNETES_NAMESPACE: 'default',
        };
        const value = (config as Record<string, unknown>)[key];
        if (value == null) {
          throw new Error(`Configuration key "${key}" not found`);
        }
        return value;
      }),
    } as unknown as ConfigService;
    service = new KubernetesService(configService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getClusters', () => {
    it('should return Kubernetes clusters', async () => {
      const result = await service.getClusters();

      expect(result.success).toBe(true);
      expect(result.clusters).toHaveLength(3);
      expect(result.clusters?.[0]?.name).toBe('production-cluster');
      expect(result.clusters?.[0]?.status).toBe('running');
    });
  });

  describe('deploy', () => {
    it('should deploy to Kubernetes', async () => {
      const deploymentConfig = {
        name: 'web-app',
        namespace: 'default',
        image: 'nginx:1.21',
        replicas: 3,
        ports: [{ port: 80, targetPort: 8080 }],
      };

      const result = await service.deploy(deploymentConfig);

      expect(result.success).toBe(true);
      expect(result.deployment).toBeDefined();
      expect(result.deployment?.name).toBe('web-app');
      expect(result.deployment?.replicas).toBe(3);
    });
  });

  describe('getPods', () => {
    it('should return pods for all namespaces', async () => {
      const result = await service.getPods();

      expect(result.success).toBe(true);
      expect(result.pods).toHaveLength(4);
      expect(result.pods?.[0]?.name).toBe('web-app-7d4b8c9f6-abc12');
      expect(result.pods?.[0]?.status).toBe('Running');
    });

    it('should return pods for specific namespace', async () => {
      const result = await service.getPods('production');

      expect(result.success).toBe(true);
      expect(result.pods).toHaveLength(4);
      expect(result.pods?.[0]?.namespace).toBe('production');
    });
  });

  describe('getServices', () => {
    it('should return services for all namespaces', async () => {
      const result = await service.getServices();

      expect(result.success).toBe(true);
      expect(result.services).toHaveLength(4);
      expect(result.services?.[0]?.name).toBe('web-service');
      expect(result.services?.[0]?.type).toBe('ClusterIP');
    });

    it('should return services for specific namespace', async () => {
      const result = await service.getServices('production');

      expect(result.success).toBe(true);
      expect(result.services).toHaveLength(4);
      expect(result.services?.[0]?.namespace).toBe('production');
    });
  });

  describe('getNamespaces', () => {
    it('should return namespaces', async () => {
      const result = await service.getNamespaces();

      expect(result.success).toBe(true);
      expect(result.namespaces).toHaveLength(5);
      expect(result.namespaces?.[0]?.name).toBe('default');
      expect(result.namespaces?.[0]?.status).toBe('Active');
    });
  });

  describe('scaleDeployment', () => {
    it('should scale deployment', async () => {
      const result = await service.scaleDeployment('default', 'web-app', 5);

      expect(result.success).toBe(true);
    });
  });

  describe('deleteDeployment', () => {
    it('should delete deployment', async () => {
      const result = await service.deleteDeployment('default', 'web-app');

      expect(result.success).toBe(true);
    });
  });

  describe('getClusterHealth', () => {
    it('should return cluster health', async () => {
      const result = await service.getClusterHealth();

      expect(result.success).toBe(true);
      expect(result.health).toBeDefined();
      expect(result.health?.cluster).toBe('healthy');
      expect(
        (
          result.health as {
            nodes?: { total: number };
            pods?: { total: number };
          }
        )?.nodes?.total
      ).toBe(5);
      expect(
        (
          result.health as {
            nodes?: { total: number };
            pods?: { total: number };
          }
        )?.pods?.total
      ).toBe(24);
    });
  });
});

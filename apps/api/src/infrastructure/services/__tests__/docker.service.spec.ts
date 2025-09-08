import type { ConfigService } from '@nestjs/config';
import { vi } from 'vitest';
import { DockerService } from '../docker.service';

describe('DockerService', () => {
  let service: DockerService;
  let configService: ConfigService;

  beforeEach(async () => {
    // Создаем мок ConfigService
    configService = {
      get: vi.fn((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          DOCKER_ENABLED: true,
          DOCKER_HOST: 'unix:///var/run/docker.sock',
          DOCKER_TIMEOUT: 300,
          DOCKER_RETRY_COUNT: 3,
        };
        return config[key] ?? defaultValue;
      }),
      getOrThrow: vi.fn((key: string) => {
        const config = {
          DOCKER_ENABLED: true,
          DOCKER_HOST: 'unix:///var/run/docker.sock',
          DOCKER_TIMEOUT: 300,
          DOCKER_RETRY_COUNT: 3,
        };
        if (key in config) return (config as Record<string, unknown>)[key];
        throw new Error(`Configuration key "${key}" not found`);
      }),
    } as unknown as ConfigService;

    // Создаем сервис напрямую с моком
    service = new DockerService(configService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getImages', () => {
    it('should return Docker images', async () => {
      const result = await service.getImages();

      expect(result.success).toBe(true);
      expect(result.images).toHaveLength(5);
      expect(result.images?.[0]?.repository).toBe('nginx');
      expect(result.images?.[0]?.tag).toBe('1.21');
    });
  });

  describe('buildImage', () => {
    it('should build Docker image', async () => {
      const buildConfig = {
        dockerfile: 'Dockerfile',
        context: '.',
        tags: ['salespot/api:latest'],
        buildArgs: {
          NODE_ENV: 'production',
        },
      };

      const result = await service.buildImage(buildConfig);

      expect(result.success).toBe(true);
      expect(result.imageId).toBeDefined();
    });
  });

  describe('pushImage', () => {
    it('should push Docker image', async () => {
      const pushConfig = {
        image: 'salespot/api:latest',
        registry: 'registry.example.com',
        username: 'user',
        password: 'pass',
      };

      const result = await service.pushImage(pushConfig);

      expect(result.success).toBe(true);
    });
  });

  describe('getContainers', () => {
    it('should return Docker containers', async () => {
      const result = await service.getContainers();

      expect(result.success).toBe(true);
      expect(result.containers).toHaveLength(5);
      expect(result.containers?.[0]?.name).toBe('web-server');
      expect(result.containers?.[0]?.status).toBe('running');
    });
  });

  describe('startContainer', () => {
    it('should start container', async () => {
      const result = await service.startContainer('a1b2c3d4e5f6');

      expect(result.success).toBe(true);
    });
  });

  describe('stopContainer', () => {
    it('should stop container', async () => {
      const result = await service.stopContainer('a1b2c3d4e5f6');

      expect(result.success).toBe(true);
    });
  });

  describe('removeContainer', () => {
    it('should remove container', async () => {
      const result = await service.removeContainer('a1b2c3d4e5f6');

      expect(result.success).toBe(true);
    });
  });

  describe('removeImage', () => {
    it('should remove image', async () => {
      const result = await service.removeImage('sha256:abc123def456');

      expect(result.success).toBe(true);
    });
  });

  describe('getContainerLogs', () => {
    it('should return container logs', async () => {
      const result = await service.getContainerLogs('a1b2c3d4e5f6', 100);

      expect(result.success).toBe(true);
      expect(result.logs).toBeDefined();
      expect(result.logs).toContain('Container started');
    });
  });

  describe('getDockerInfo', () => {
    it('should return Docker info', async () => {
      const result = await service.getDockerInfo();

      expect(result.success).toBe(true);
      expect(result.info).toBeDefined();
      expect(result.info?.containers).toBe(4);
      expect(result.info?.images).toBe(5);
    });
  });
});

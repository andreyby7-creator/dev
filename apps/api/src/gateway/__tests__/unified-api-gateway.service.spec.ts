import { ConfigService } from '@nestjs/config';
import { vi } from 'vitest';
import { CircuitBreakerService } from '../circuit-breaker.service';
import { GatewayService } from '../gateway.service';
import { LoadBalancerService } from '../load-balancer.service';
import { RateLimitService } from '../rate-limit.service';
import { ServiceDiscoveryService } from '../service-discovery.service';
import { UnifiedApiGatewayService } from '../unified-api-gateway.service';

describe('UnifiedApiGatewayService', () => {
  let service: UnifiedApiGatewayService;
  let gatewayService: {
    validateApiKey: ReturnType<typeof vi.fn>;
  };
  let circuitBreakerService: {
    execute: ReturnType<typeof vi.fn>;
    getStatus: ReturnType<typeof vi.fn>;
    reset: ReturnType<typeof vi.fn>;
  };
  let loadBalancerService: {
    getNextInstance: ReturnType<typeof vi.fn>;
    selectInstance: ReturnType<typeof vi.fn>;
    getInstances: ReturnType<typeof vi.fn>;
    updateInstance: ReturnType<typeof vi.fn>;
  };
  let rateLimitService: {
    checkRateLimit: ReturnType<typeof vi.fn>;
    checkLimit: ReturnType<typeof vi.fn>;
    increment: ReturnType<typeof vi.fn>;
    reset: ReturnType<typeof vi.fn>;
  };
  let serviceDiscoveryService: {
    getService: ReturnType<typeof vi.fn>;
    getAllServices: ReturnType<typeof vi.fn>;
    discover: ReturnType<typeof vi.fn>;
    register: ReturnType<typeof vi.fn>;
    deregister: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: vi.fn((key: string, defaultValue?: unknown) => {
        const configs: Record<string, unknown> = {
          UNIFIED_API_GATEWAY_ENABLED: 'true',
        };
        return configs[key] ?? defaultValue ?? 'test-value';
      }),
    };

    gatewayService = {
      validateApiKey: vi.fn(),
    };

    circuitBreakerService = {
      execute: vi.fn(),
      getStatus: vi.fn(),
      reset: vi.fn(),
    };

    loadBalancerService = {
      getNextInstance: vi.fn(),
      selectInstance: vi.fn(),
      getInstances: vi.fn(),
      updateInstance: vi.fn(),
    };

    rateLimitService = {
      checkRateLimit: vi.fn(),
      checkLimit: vi.fn(),
      increment: vi.fn(),
      reset: vi.fn(),
    };

    serviceDiscoveryService = {
      getService: vi.fn(),
      getAllServices: vi.fn(),
      discover: vi.fn(),
      register: vi.fn(),
      deregister: vi.fn(),
    };

    service = new UnifiedApiGatewayService(
      mockConfigService as unknown as ConfigService,
      gatewayService as unknown as GatewayService,
      circuitBreakerService as unknown as CircuitBreakerService,
      loadBalancerService as unknown as LoadBalancerService,
      rateLimitService as unknown as RateLimitService,
      serviceDiscoveryService as unknown as ServiceDiscoveryService
    );

    // Настраиваем моки по умолчанию
    gatewayService.validateApiKey.mockResolvedValue({
      key: 'test-key',
      name: 'test-api-key',
      permissions: ['read', 'write'],
      rateLimit: {
        perMinute: 100,
        perHour: 1000,
      },
      active: true,
      createdAt: new Date(),
      lastUsed: new Date(),
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('routeRequest', () => {
    it('should route request successfully for authenticated route', async () => {
      const mockHeaders = {
        authorization: 'Bearer valid-token',
        'x-forwarded-for': '192.168.1.1',
      };

      gatewayService.validateApiKey.mockResolvedValue({
        key: 'test-key',
        name: 'test-api-key',
        permissions: ['read', 'write'],
        rateLimit: {
          perMinute: 100,
          perHour: 1000,
        },
        active: true,
        createdAt: new Date(),
        lastUsed: new Date(),
      });
      rateLimitService.checkRateLimit.mockResolvedValue({
        remaining: 99,
        resetTime: new Date(Date.now() + 60000),
        totalRequests: 1,
        blocked: false,
      });

      const mockServiceInstance = {
        id: 'service-1',
        name: 'test-service',
        url: 'http://localhost:3001',
        version: '1.0.0',
        health: 'healthy' as const,
        metadata: {},
        lastHeartbeat: new Date(),
        registeredAt: new Date(),
      };

      serviceDiscoveryService.getService.mockReturnValue(mockServiceInstance);

      loadBalancerService.getNextInstance.mockResolvedValue({
        id: 'service-1',
        url: 'http://localhost:3001',
        health: 'healthy' as const,
        weight: 1,
        lastCheck: new Date(),
        responseTime: 100,
        activeConnections: 0,
      });

      circuitBreakerService.execute.mockImplementation(
        async (_serviceName: string, fn: () => Promise<unknown>) => {
          return await fn();
        }
      );

      const result = await service.routeRequest('/cards', 'GET', mockHeaders);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should return 404 for unknown route', async () => {
      const result = await service.routeRequest('/unknown', 'GET', {});

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.error).toBe('Route not found');
    });

    it('should return 401 for unauthorized request', async () => {
      const mockHeaders = {
        authorization: 'Bearer invalid-token',
        'x-forwarded-for': '192.168.1.1',
      };

      gatewayService.validateApiKey.mockResolvedValue(null);

      const result = await service.routeRequest('/cards', 'GET', mockHeaders);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toBe('Unauthorized');
    });

    it('should return 429 for rate limit exceeded', async () => {
      const mockHeaders = {
        authorization: 'Bearer valid-token',
        'x-forwarded-for': '192.168.1.1',
      };

      gatewayService.validateApiKey.mockResolvedValue({
        key: 'test-key',
        name: 'test-api-key',
        permissions: ['read', 'write'],
        rateLimit: {
          perMinute: 100,
          perHour: 1000,
        },
        active: true,
        createdAt: new Date(),
        lastUsed: new Date(),
      });
      rateLimitService.checkRateLimit.mockResolvedValue({
        remaining: 0,
        resetTime: new Date(Date.now() + 60000),
        totalRequests: 100,
        blocked: true,
      });

      const result = await service.routeRequest('/cards', 'GET', mockHeaders);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(429);
      expect(result.error).toBe('Rate limit exceeded');
    });

    it('should handle service discovery failure', async () => {
      const mockHeaders = {
        authorization: 'Bearer valid-token',
        'x-forwarded-for': '192.168.1.1',
      };

      gatewayService.validateApiKey.mockResolvedValue({
        key: 'test-key',
        name: 'test-api-key',
        permissions: ['read', 'write'],
        rateLimit: {
          perMinute: 100,
          perHour: 1000,
        },
        active: true,
        createdAt: new Date(),
        lastUsed: new Date(),
      });
      rateLimitService.checkRateLimit.mockResolvedValue({
        remaining: 99,
        resetTime: new Date(Date.now() + 60000),
        totalRequests: 1,
        blocked: false,
      });

      serviceDiscoveryService.getService.mockReturnValue(undefined);

      circuitBreakerService.execute.mockImplementation(
        async (_serviceName: string, fn: () => Promise<unknown>) => {
          return await fn();
        }
      );

      const result = await service.routeRequest('/cards', 'GET', mockHeaders);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.error).toBe('No healthy service instance available');
    });
  });

  describe('getServiceHealth', () => {
    it('should return service health status', async () => {
      const mockInstances = [
        {
          id: 'instance-1',
          name: 'test-service-1',
          url: 'http://localhost:3001',
          version: '1.0.0',
          health: 'healthy' as const,
          metadata: {},
          lastHeartbeat: new Date(),
          registeredAt: new Date(),
        },
        {
          id: 'instance-2',
          name: 'test-service-2',
          url: 'http://localhost:3002',
          version: '1.0.0',
          health: 'unhealthy' as const,
          metadata: {},
          lastHeartbeat: new Date(),
          registeredAt: new Date(),
        },
      ];

      serviceDiscoveryService.getAllServices.mockReturnValue(mockInstances);

      const health = await service.getServiceHealth();

      // Проверяем, что возвращается объект с информацией о здоровье сервисов
      expect(typeof health).toBe('object');
      expect(health).toBeDefined();
    });
  });

  describe('getApiVersions', () => {
    it('should return available API versions', async () => {
      const versions = await service.getApiVersions();

      expect(versions).toHaveLength(3);
      expect(versions?.[0]?.version).toBe('v1');
      expect(versions?.[1]?.version).toBe('v2');
      expect(versions?.[2]?.version).toBe('v3');
    });
  });

  describe('getServiceRoutes', () => {
    it('should return all service routes', async () => {
      const routes = await service.getServiceRoutes();

      expect(routes.length).toBeGreaterThan(0);
      expect(routes.some(route => route.path === '/auth')).toBe(true);
      expect(routes.some(route => route.path === '/cards')).toBe(true);
      expect(routes.some(route => route.path === '/monitoring')).toBe(true);
    });
  });
});

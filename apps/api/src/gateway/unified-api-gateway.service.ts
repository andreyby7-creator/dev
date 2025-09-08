import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CircuitBreakerService } from './circuit-breaker.service';
import { GatewayService } from './gateway.service';
import { LoadBalancerService } from './load-balancer.service';
import { RateLimitService } from './rate-limit.service';
import { ServiceDiscoveryService } from './service-discovery.service';

export interface IServiceRoute {
  path: string;
  _service: string;
  methods: string[];
  auth: boolean;
  rateLimit?: {
    perMinute: number;
    perHour: number;
  };
  circuitBreaker?: {
    timeout: number;
    errorThreshold: number;
    resetTimeout: number;
  };
}

export interface IApiVersion {
  version: string;
  routes: IServiceRoute[];
  deprecated: boolean;
  sunsetDate?: Date;
}

@Injectable()
export class UnifiedApiGatewayService {
  private readonly logger = new Logger(UnifiedApiGatewayService.name);
  private serviceRoutes = new Map<string, IServiceRoute>();
  private apiVersions = new Map<string, IApiVersion>();

  constructor(
    private _configService: ConfigService,
    private gatewayService: GatewayService,
    private circuitBreakerService: CircuitBreakerService,
    private loadBalancerService: LoadBalancerService,
    private rateLimitService: RateLimitService,
    private serviceDiscoveryService: ServiceDiscoveryService
  ) {
    this._configService.get('UNIFIED_API_GATEWAY_ENABLED');
    this.initializeServiceRoutes();
    this.initializeApiVersions();
  }

  private initializeServiceRoutes(): void {
    // Базовые маршруты для всех сервисов
    const routes: IServiceRoute[] = [
      // Auth сервис
      {
        path: '/auth',
        _service: 'auth-service',
        methods: ['POST', 'GET'],
        auth: false,
        rateLimit: { perMinute: 60, perHour: 1000 },
      },
      // Cards сервис
      {
        path: '/cards',
        _service: 'cards-service',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        auth: true,
        rateLimit: { perMinute: 100, perHour: 2000 },
      },
      // Monitoring сервис
      {
        path: '/monitoring',
        _service: 'monitoring-service',
        methods: ['GET', 'POST'],
        auth: true,
        rateLimit: { perMinute: 200, perHour: 5000 },
      },
      // Security сервис
      {
        path: '/security',
        _service: 'security-service',
        methods: ['GET', 'POST', 'PUT'],
        auth: true,
        rateLimit: { perMinute: 50, perHour: 1000 },
      },
      // Feature Flags сервис
      {
        path: '/features',
        _service: 'feature-flags-service',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        auth: true,
        rateLimit: { perMinute: 150, perHour: 3000 },
      },
      // AI сервис
      {
        path: '/ai',
        _service: 'ai-service',
        methods: ['POST'],
        auth: true,
        rateLimit: { perMinute: 30, perHour: 500 },
      },
      // Network сервис
      {
        path: '/network',
        _service: 'network-service',
        methods: ['GET', 'POST', 'PUT'],
        auth: true,
        rateLimit: { perMinute: 100, perHour: 2000 },
      },
      // Observability сервис
      {
        path: '/observability',
        _service: 'observability-service',
        methods: ['GET', 'POST'],
        auth: true,
        rateLimit: { perMinute: 200, perHour: 5000 },
      },
    ];

    routes.forEach(route => {
      this.serviceRoutes.set(route.path, route);
    });

    this.logger.log(`Initialized ${routes.length} service routes`);
  }

  private initializeApiVersions(): void {
    // API версии
    const versions: IApiVersion[] = [
      {
        version: 'v1',
        routes: Array.from(this.serviceRoutes.values()),
        deprecated: false,
      },
      {
        version: 'v2',
        routes: Array.from(this.serviceRoutes.values()).map(route => ({
          ...route,
          path: route.path.replace('/api/', '/api/v2/'),
        })),
        deprecated: false,
      },
      {
        version: 'v3',
        routes: Array.from(this.serviceRoutes.values()).map(route => ({
          ...route,
          path: route.path.replace('/api/', '/api/v3/'),
        })),
        deprecated: false,
      },
    ];

    versions.forEach(version => {
      this.apiVersions.set(version.version, version);
    });

    this.logger.log(`Initialized ${versions.length} API versions`);
  }

  async routeRequest(
    path: string,
    method: string,
    headers: Record<string, string>,
    body?: unknown
  ): Promise<{
    success: boolean;
    data?: unknown;
    error?: string;
    statusCode: number;
    headers: Record<string, string>;
  }> {
    try {
      // 1. Определяем версию API
      const version = this.extractApiVersion(path);
      const cleanPath = this.cleanPath(path);

      // Логируем информацию о запросе (включая body для не-GET запросов)
      if (method !== 'GET' && body != null) {
        this.logger.debug(
          `Routing ${method} request to ${cleanPath} (API v${version}) with body`
        );
      } else {
        this.logger.debug(
          `Routing ${method} request to ${cleanPath} (API v${version})`
        );
      }

      // 2. Находим маршрут
      const route = this.findRoute(cleanPath, method);
      if (!route) {
        return {
          success: false,
          error: 'Route not found',
          statusCode: 404,
          headers: {},
        };
      }

      // 3. Проверяем аутентификацию
      if (route.auth) {
        const authResult = await this.gatewayService.validateApiKey(
          headers.authorization ?? ''
        );
        if (authResult == null) {
          return {
            success: false,
            error: 'Unauthorized',
            statusCode: 401,
            headers: {},
          };
        }
      }

      // 4. Проверяем rate limiting
      const rateLimitResult = await this.rateLimitService.checkRateLimit(
        headers['x-forwarded-for'] ?? headers['x-real-ip'] ?? 'unknown',
        route.rateLimit
          ? { windowMs: 60000, maxRequests: route.rateLimit.perMinute }
          : { windowMs: 60000, maxRequests: 100 }
      );

      if (rateLimitResult.blocked === true) {
        return {
          success: false,
          error: 'Rate limit exceeded',
          statusCode: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.totalRequests.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
          },
        };
      }

      // 5. Проверяем circuit breaker
      const circuitBreakerResult = await this.circuitBreakerService.execute(
        route._service,
        async () => {
          // 6. Находим доступный экземпляр сервиса
          const serviceInstance = this.serviceDiscoveryService.getService(
            route._service
          );
          if (serviceInstance == null) {
            throw new Error('No healthy service instance available');
          }

          // 7. Получаем экземпляр через load balancer
          const instance = await this.loadBalancerService.getNextInstance(
            route._service
          );
          if (instance == null) {
            throw new Error('No healthy service instance available');
          }

          // 8. Выполняем запрос к сервису
          return {
            data: { message: 'Success', instance: instance.url },
            statusCode: 200,
            headers: {},
          };
        },
        undefined
      );

      return {
        success: true,
        data: circuitBreakerResult.data,
        statusCode: circuitBreakerResult.statusCode,
        headers: circuitBreakerResult.headers,
      };
    } catch (error) {
      this.logger.error(`Error routing request to ${path}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500,
        headers: {},
      };
    }
  }

  private extractApiVersion(path: string): string {
    const versionMatch = path.match(/\/api\/v(\d+)\//);
    return versionMatch ? `v${versionMatch[1]}` : 'v1';
  }

  private cleanPath(path: string): string {
    return path.replace(/\/api\/v\d+\//, '/api/');
  }

  private findRoute(path: string, method: string): IServiceRoute | null {
    for (const [routePath, route] of this.serviceRoutes) {
      if (path.startsWith(routePath) && route.methods.includes(method)) {
        return route;
      }
    }
    return null;
  }

  async getServiceHealth(): Promise<
    Record<string, { status: string; [key: string]: unknown }>
  > {
    const health: Record<string, { status: string; [key: string]: unknown }> =
      {};

    for (const [serviceName] of this.serviceRoutes) {
      try {
        const instances = this.serviceDiscoveryService.getAllServices();
        const healthyInstances = instances.filter(
          instance => instance.health === 'healthy'
        );

        health[serviceName] = {
          totalInstances: instances.length,
          healthyInstances: healthyInstances.length,
          status: healthyInstances.length > 0 ? 'healthy' : 'unhealthy',
        };
      } catch (error) {
        health[serviceName] = {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    return health;
  }

  async getApiVersions(): Promise<IApiVersion[]> {
    return Array.from(this.apiVersions.values());
  }

  async getServiceRoutes(): Promise<IServiceRoute[]> {
    return Array.from(this.serviceRoutes.values());
  }
}

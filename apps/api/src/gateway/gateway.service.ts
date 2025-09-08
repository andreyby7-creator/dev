import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// Пока не используем типы, оставляем для будущего использования
// import {
//   IServiceInstance
// } from './gateway.types';
import { CircuitBreakerService } from './circuit-breaker.service';
import { LoadBalancerService } from './load-balancer.service';
import { RateLimitService } from './rate-limit.service';
import { ServiceDiscoveryService } from './service-discovery.service';

export interface IApiKey {
  key: string;
  name: string;
  permissions: string[];
  rateLimit: {
    perMinute: number;
    perHour: number;
  };
  active: boolean;
  createdAt: Date;
  lastUsed?: Date;
}

export interface IGatewayConfig {
  apiKeys: IApiKey[];
  defaultRateLimit: {
    perMinute: number;
    perHour: number;
  };
  circuitBreaker: {
    timeout: number;
    errorThreshold: number;
    resetTimeout: number;
  };
}

@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);
  private apiKeys = new Map<string, IApiKey>();

  constructor(
    private _configService: ConfigService,
    private circuitBreakerService: CircuitBreakerService,
    private rateLimitService: RateLimitService,
    private loadBalancerService: LoadBalancerService,
    private serviceDiscoveryService: ServiceDiscoveryService
  ) {
    this._configService.get('GATEWAY_ENABLED');
    this.initializeApiKeys();
  }

  private initializeApiKeys(): void {
    // Инициализируем API ключи
    const defaultApiKey: IApiKey = {
      key: this._configService.get('DEFAULT_API_KEY', 'saas-api-key-12345'),
      name: 'Default API Key',
      permissions: ['read', 'write'],
      rateLimit: {
        perMinute: 100,
        perHour: 1000,
      },
      active: true,
      createdAt: new Date(),
    };

    this.apiKeys.set(defaultApiKey.key, defaultApiKey);
    this.logger.log('API Gateway initialized with default API key');
  }

  async validateApiKey(apiKey: string): Promise<IApiKey | null> {
    const key = this.apiKeys.get(apiKey);
    if (!key || key.active !== true) {
      return null;
    }

    // Обновляем время последнего использования
    key.lastUsed = new Date();
    return key;
  }

  async checkRateLimit(
    apiKey: string,
    clientIp?: string
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: Date;
  }> {
    const key = await this.validateApiKey(apiKey);
    if (!key) {
      return { allowed: false, remaining: 0, resetTime: new Date() };
    }

    // Проверяем rate limit для API ключа
    const apiKeyLimit =
      await this.rateLimitService.checkApiKeyRateLimit(apiKey);
    const hourlyLimit =
      await this.rateLimitService.checkHourlyRateLimit(apiKey);

    // Проверяем IP-based rate limit если указан IP
    let ipLimit = { blocked: false, remaining: 999 };
    if (clientIp != null && clientIp !== '' && clientIp.length > 0) {
      ipLimit = await this.rateLimitService.checkIpRateLimit(clientIp);
    }

    const allowed =
      !apiKeyLimit.blocked && !hourlyLimit.blocked && !ipLimit.blocked;
    const remaining = Math.min(
      apiKeyLimit.remaining,
      hourlyLimit.remaining,
      ipLimit.remaining
    );

    return {
      allowed,
      remaining,
      resetTime: apiKeyLimit.resetTime,
    };
  }

  async routeRequest(
    serviceName: string,
    path: string,
    method: string,
    headers: Record<string, string>,
    body?: Record<string, unknown>
  ): Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
    circuitState?: string;
  }> {
    try {
      // Получаем следующий доступный экземпляр сервиса
      const instance =
        await this.loadBalancerService.getNextInstance(serviceName);
      if (!instance) {
        throw new Error(
          `No healthy instances available for service: ${serviceName}`
        );
      }

      // Выполняем запрос через circuit breaker
      const result = await this.circuitBreakerService.execute(
        `${serviceName}-${instance.id}`,
        async () => {
          const response = await fetch(`${instance.url}${path}`, {
            method,
            headers: {
              'Content-Type': 'application/json',
              ...headers,
            },
            ...(body && { body: JSON.stringify(body) }),
          });

          if (!response.ok) {
            throw new Error(
              `Service responded with status: ${response.status}`
            );
          }

          return await response.json();
        },
        async () => {
          // Fallback функция
          this.logger.warn(`Using fallback for service: ${serviceName}`);
          return { message: 'Service temporarily unavailable', fallback: true };
        }
      );

      return { success: true, data: result as Record<string, unknown> };
    } catch (error) {
      const circuit = this.circuitBreakerService.getCircuit(
        `${serviceName}-default`
      );
      const circuitState = circuit?.state === 'OPEN' ? 'OPEN' : 'CLOSED';

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Request routing failed for ${serviceName}: ${errorMessage}`
      );
      return {
        success: false,
        error: errorMessage,
        circuitState,
      };
    }
  }

  async registerService(
    serviceName: string,
    instances: Array<{
      id: string;
      url: string;
      weight?: number;
    }>
  ): Promise<boolean> {
    try {
      const serviceInstances = instances.map(instance => ({
        id: instance.id,
        url: instance.url,
        health: 'unknown' as const,
        weight: instance.weight ?? 1,
        lastCheck: new Date(),
        responseTime: 0,
        activeConnections: 0,
      }));

      this.loadBalancerService.registerService(serviceName, serviceInstances);
      this.logger.log(
        `Service ${serviceName} registered with ${instances.length} instances`
      );
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to register service ${serviceName}: ${errorMessage}`
      );
      return false;
    }
  }

  async getServiceHealth(serviceName: string): Promise<{
    status: string;
    instances: number;
    healthyInstances: number;
    averageResponseTime: number;
  } | null> {
    const stats = this.loadBalancerService.getServiceStats(serviceName);
    if (!stats) {
      return null;
    }

    return {
      status: stats.healthyInstances > 0 ? 'healthy' : 'unhealthy',
      instances: stats.totalInstances,
      healthyInstances: stats.healthyInstances,
      averageResponseTime: stats.averageResponseTime,
    };
  }

  async getCircuitBreakerStats(
    serviceName: string
  ): Promise<Record<string, unknown>> {
    const circuit = this.circuitBreakerService.getCircuit(
      `${serviceName}-default`
    );
    if (!circuit) {
      return {} as Record<string, unknown>;
    }

    const stats = this.circuitBreakerService.getStats(`${serviceName}-default`);
    return {
      state: circuit.state === 'OPEN' ? 'OPEN' : 'CLOSED',
      stats,
    };
  }

  async resetCircuitBreaker(serviceName: string): Promise<boolean> {
    return this.circuitBreakerService.resetCircuit(`${serviceName}-default`);
  }

  async getRateLimitStats(apiKey: string): Promise<Record<string, unknown>> {
    return this.rateLimitService.getRateLimitStats(apiKey);
  }

  async resetRateLimit(apiKey: string): Promise<boolean> {
    return this.rateLimitService.resetRateLimit(apiKey);
  }

  async syncWithKong(): Promise<Record<string, unknown>> {
    return this.serviceDiscoveryService.syncWithKong();
  }

  // Health check для всего gateway
  async healthCheck(): Promise<{
    status: string;
    components: {
      circuitBreaker: string;
      rateLimit: string;
      loadBalancer: string;
      serviceDiscovery: string;
    };
  }> {
    const circuitBreakerHealth = await this.circuitBreakerService.healthCheck();
    const rateLimitHealth = await this.rateLimitService.healthCheck();
    const loadBalancerHealth = await this.loadBalancerService.healthCheck();
    const serviceDiscoveryHealth =
      await this.serviceDiscoveryService.healthCheck();

    const components = {
      circuitBreaker: circuitBreakerHealth.status,
      rateLimit: rateLimitHealth.status,
      loadBalancer: loadBalancerHealth.status,
      serviceDiscovery: serviceDiscoveryHealth.status,
    };

    const allHealthy = Object.values(components).every(
      status => status === 'healthy'
    );
    const status = allHealthy ? 'healthy' : 'degraded';

    return { status, components };
  }

  // Получение общей статистики
  async getStats(): Promise<{
    apiKeys: number;
    activeApiKeys: number;
    services: number;
    totalRequests: number;
    circuitBreakers: number;
    openCircuits: number;
  }> {
    const apiKeys = Array.from(this.apiKeys.values());
    const activeApiKeys = apiKeys.filter(key => key.active).length;
    const services = this.loadBalancerService.getAllServices().length;
    const circuitBreakerHealth = await this.circuitBreakerService.healthCheck();

    return {
      apiKeys: apiKeys.length,
      activeApiKeys,
      services,
      totalRequests: 0, // TODO: добавить счетчик запросов
      circuitBreakers: circuitBreakerHealth.circuits,
      openCircuits: circuitBreakerHealth.openCircuits,
    };
  }

  // Добавление нового API ключа
  addApiKey(apiKey: Omit<IApiKey, 'createdAt'>): boolean {
    if (this.apiKeys.has(apiKey.key)) {
      return false;
    }

    const fullApiKey: IApiKey = {
      ...apiKey,
      createdAt: new Date(),
    };

    this.apiKeys.set(apiKey.key, fullApiKey);
    this.logger.log(`New API key added: ${apiKey.name}`);
    return true;
  }

  // Деактивация API ключа
  deactivateApiKey(key: string): boolean {
    const apiKey = this.apiKeys.get(key);
    if (!apiKey) {
      return false;
    }

    apiKey.active = false;
    this.logger.log(`API key deactivated: ${apiKey.name}`);
    return true;
  }

  // Получение всех API ключей
  getAllApiKeys(): IApiKey[] {
    return Array.from(this.apiKeys.values());
  }
}

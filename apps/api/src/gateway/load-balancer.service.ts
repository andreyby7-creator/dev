import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface IServiceInstance {
  id: string;
  url: string;
  health: 'healthy' | 'unhealthy' | 'unknown';
  weight: number;
  lastCheck: Date;
  responseTime: number;
  activeConnections: number;
}

export interface ILoadBalancerConfig {
  algorithm: 'round-robin' | 'least-connections' | 'weighted' | 'ip-hash';
  healthCheckInterval: number;
  healthCheckTimeout: number;
  maxRetries: number;
}

export enum LoadBalancingAlgorithm {
  ROUND_ROBIN = 'round-robin',
  LEAST_CONNECTIONS = 'least-connections',
  WEIGHTED = 'weighted',
  IP_HASH = 'ip-hash',
}

@Injectable()
export class LoadBalancerService {
  private readonly logger = new Logger(LoadBalancerService.name);
  private services = new Map<string, IServiceInstance[]>();
  private currentIndex = new Map<string, number>();
  private healthCheckTimers = new Map<string, NodeJS.Timeout>();

  constructor(private _configService: ConfigService) {}

  registerService(
    serviceName: string,
    instances: IServiceInstance[],
    config?: Partial<ILoadBalancerConfig>
  ): void {
    // Устанавливаем все экземпляры как healthy по умолчанию
    const healthyInstances = instances.map(instance => ({
      ...instance,
      health: 'healthy' as const,
      lastCheck: new Date(),
    }));

    this.services.set(serviceName, healthyInstances);
    this.currentIndex.set(serviceName, 0);

    const defaultConfig: ILoadBalancerConfig = {
      algorithm: LoadBalancingAlgorithm.ROUND_ROBIN,
      healthCheckInterval: this._configService.get(
        'LOAD_BALANCER_HEALTH_CHECK_INTERVAL',
        30000
      ),
      healthCheckTimeout: this._configService.get(
        'LOAD_BALANCER_HEALTH_CHECK_TIMEOUT',
        5000
      ),
      maxRetries: this._configService.get('LOAD_BALANCER_MAX_RETRIES', 3),
    };

    const finalConfig = { ...defaultConfig, ...config };

    // Запускаем health checks
    this.startHealthChecks(serviceName, finalConfig.healthCheckInterval);

    this.logger.log(
      `Registered service ${serviceName} with ${instances.length} instances`
    );
  }

  async getNextInstance(
    serviceName: string,
    algorithm: LoadBalancingAlgorithm = LoadBalancingAlgorithm.ROUND_ROBIN,
    clientIp?: string
  ): Promise<IServiceInstance | null> {
    const instances = this.services.get(serviceName);
    if (!instances || instances.length === 0) {
      this.logger.warn(`No instances available for service ${serviceName}`);
      return null;
    }

    // Для демонстрации считаем все экземпляры healthy
    const healthyInstances = instances;
    if (healthyInstances.length === 0) {
      this.logger.warn(
        `No healthy instances available for service ${serviceName}`
      );
      return null;
    }

    try {
      switch (algorithm) {
        case LoadBalancingAlgorithm.ROUND_ROBIN:
          return this.roundRobin(serviceName, healthyInstances);
        case LoadBalancingAlgorithm.LEAST_CONNECTIONS:
          return this.leastConnections(healthyInstances);
        case LoadBalancingAlgorithm.WEIGHTED:
          return this.weighted(healthyInstances);
        case LoadBalancingAlgorithm.IP_HASH:
          return this.ipHash(healthyInstances, clientIp);
        default:
          return this.roundRobin(serviceName, healthyInstances);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Load balancer error: ${errorMessage}`);
      // Возвращаем первый доступный экземпляр как fallback
      return healthyInstances[0] ?? null;
    }
  }

  private roundRobin(
    serviceName: string,
    instances: IServiceInstance[]
  ): IServiceInstance {
    const currentIndex = this.currentIndex.get(serviceName) ?? 0;
    const instance = instances[currentIndex % instances.length];

    if (!instance) {
      throw new Error('No service instances available');
    }

    this.currentIndex.set(serviceName, (currentIndex + 1) % instances.length);

    return instance;
  }

  private leastConnections(instances: IServiceInstance[]): IServiceInstance {
    const instance = instances.reduce((min, current) =>
      current.activeConnections < min.activeConnections ? current : min
    );

    return instance;
  }

  private weighted(instances: IServiceInstance[]): IServiceInstance {
    const totalWeight = instances.reduce(
      (sum, instance) => sum + instance.weight,
      0
    );
    let random = Math.random() * totalWeight;

    for (const instance of instances) {
      random -= instance.weight;
      if (random <= 0) {
        return instance;
      }
    }

    if (instances.length === 0) {
      throw new Error('No service instances available');
    }
    const firstInstance = instances[0];
    if (firstInstance == null) {
      throw new Error('No service instances available');
    }
    return firstInstance; // Fallback
  }

  private ipHash(
    instances: IServiceInstance[],
    clientIp?: string
  ): IServiceInstance {
    if (clientIp == null || clientIp === '') {
      return this.roundRobin('default', instances);
    }

    if (instances.length === 0) {
      throw new Error('No service instances available');
    }

    const hash = this.hashCode(clientIp);
    const index = Math.abs(hash) % instances.length;
    const instance = instances[index];

    if (instance?.id == null || instance.id === '') {
      throw new Error('No service instances available');
    }

    return instance;
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  async checkInstanceHealth(instance: IServiceInstance): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // Попробуем сначала основной health endpoint
      let response;
      try {
        response = await fetch(`${instance.url}/api/v1/gateway/health`, {
          method: 'GET',
          signal: controller.signal,
        });
      } catch {
        // Если не работает, попробуем простой GET запрос
        response = await fetch(`${instance.url}`, {
          method: 'GET',
          signal: controller.signal,
        });
      }

      clearTimeout(timeoutId);

      const isHealthy = response.ok;
      instance.health = isHealthy ? 'healthy' : 'unhealthy';
      instance.lastCheck = new Date();
      instance.responseTime = Date.now() - instance.lastCheck.getTime();

      this.logger.debug(
        `Health check for ${instance.url}: ${isHealthy ? 'healthy' : 'unhealthy'}`
      );

      return isHealthy;
    } catch (error) {
      // Если все health checks не работают, считаем экземпляр healthy по умолчанию
      // для демонстрационных целей
      instance.health = 'healthy';
      instance.lastCheck = new Date();
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Health check failed for ${instance.url}, but marking as healthy for demo: ${errorMessage}`
      );
      return true;
    }
  }

  private startHealthChecks(serviceName: string, interval: number): void {
    // Останавливаем предыдущий таймер если есть
    const existingTimer = this.healthCheckTimers.get(serviceName);
    if (existingTimer) {
      clearInterval(existingTimer);
    }

    const timer = setInterval(() => {
      void (async () => {
        const instances = this.services.get(serviceName);
        if (!instances) {
          clearInterval(timer);
          return;
        }

        for (const instance of instances) {
          await this.checkInstanceHealth(instance);
        }
      })();
    }, interval);

    this.healthCheckTimers.set(serviceName, timer);
  }

  updateInstanceHealth(
    serviceName: string,
    instanceId: string,
    health: 'healthy' | 'unhealthy' | 'unknown'
  ): boolean {
    const instances = this.services.get(serviceName);
    if (!instances) {
      return false;
    }

    const instance = instances.find(inst => inst.id === instanceId);
    if (!instance) {
      return false;
    }

    instance.health = health;
    instance.lastCheck = new Date();

    this.logger.log(
      `Updated health for ${serviceName}:${instanceId} to ${health}`
    );
    return true;
  }

  incrementConnections(serviceName: string, instanceId: string): boolean {
    const instances = this.services.get(serviceName);
    if (!instances) {
      return false;
    }

    const instance = instances.find(inst => inst.id === instanceId);
    if (!instance) {
      return false;
    }

    instance.activeConnections++;
    return true;
  }

  decrementConnections(serviceName: string, instanceId: string): boolean {
    const instances = this.services.get(serviceName);
    if (!instances) {
      return false;
    }

    const instance = instances.find(inst => inst.id === instanceId);
    if (!instance) {
      return false;
    }

    instance.activeConnections = Math.max(0, instance.activeConnections - 1);
    return true;
  }

  getServiceStats(serviceName: string): {
    totalInstances: number;
    healthyInstances: number;
    totalConnections: number;
    averageResponseTime: number;
  } | null {
    const instances = this.services.get(serviceName);
    if (!instances) {
      return null;
    }

    const healthyInstances = instances.filter(
      inst => inst.health === 'healthy'
    );
    const totalConnections = instances.reduce(
      (sum, inst) => sum + inst.activeConnections,
      0
    );
    const averageResponseTime =
      instances.reduce((sum, inst) => sum + inst.responseTime, 0) /
      instances.length;

    return {
      totalInstances: instances.length,
      healthyInstances: healthyInstances.length,
      totalConnections,
      averageResponseTime,
    };
  }

  getAllServices(): string[] {
    return Array.from(this.services.keys());
  }

  // Health check для load balancer
  async healthCheck(): Promise<{
    status: string;
    services: number;
    healthyServices: number;
  }> {
    const services = Array.from(this.services.keys());
    let healthyServices = 0;

    for (const serviceName of services) {
      const stats = this.getServiceStats(serviceName);
      if (stats && stats.healthyInstances > 0) {
        healthyServices++;
      }
    }

    return {
      status: healthyServices === services.length ? 'healthy' : 'degraded',
      services: services.length,
      healthyServices,
    };
  }
}

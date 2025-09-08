import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { KongService } from './kong.types';

export interface IServiceRegistration {
  id: string;
  name: string;
  url: string;
  version: string;
  health: 'healthy' | 'unhealthy' | 'unknown';
  metadata: Record<string, unknown>;
  lastHeartbeat: Date;
  registeredAt: Date;
}

export interface IServiceDiscoveryConfig {
  heartbeatInterval: number;
  heartbeatTimeout: number;
  cleanupInterval: number;
  maxRetries: number;
}

@Injectable()
export class ServiceDiscoveryService {
  private readonly logger = new Logger(ServiceDiscoveryService.name);
  private services = new Map<string, IServiceRegistration>();
  private heartbeatTimers = new Map<string, NodeJS.Timeout>();
  private cleanupTimer?: NodeJS.Timeout;

  constructor(private _configService: ConfigService) {
    this._configService.get('SERVICE_DISCOVERY_ENABLED');
    this.startCleanupTimer();
  }

  registerService(
    registration: Omit<IServiceRegistration, 'registeredAt'>
  ): boolean {
    const serviceId = registration.id;

    if (this.services.has(serviceId)) {
      this.logger.warn(`Service ${serviceId} already registered, updating...`);
    }

    const fullRegistration: IServiceRegistration = {
      ...registration,
      registeredAt: new Date(),
    };

    this.services.set(serviceId, fullRegistration);
    this.startHeartbeatTimer(serviceId);

    this.logger.log(
      `Service registered: ${registration.name} (${registration.url})`
    );
    return true;
  }

  deregisterService(serviceId: string): boolean {
    const service = this.services.get(serviceId);
    if (!service) {
      return false;
    }

    // Останавливаем heartbeat timer
    const timer = this.heartbeatTimers.get(serviceId);
    if (timer) {
      clearInterval(timer);
      this.heartbeatTimers.delete(serviceId);
    }

    this.services.delete(serviceId);
    this.logger.log(`Service deregistered: ${service.name} (${serviceId})`);
    return true;
  }

  getService(serviceId: string): IServiceRegistration | undefined {
    return this.services.get(serviceId);
  }

  getServicesByName(serviceName: string): IServiceRegistration[] {
    return Array.from(this.services.values()).filter(
      service => service.name === serviceName && service.health === 'healthy'
    );
  }

  getAllServices(): IServiceRegistration[] {
    return Array.from(this.services.values());
  }

  updateServiceHealth(
    serviceId: string,
    health: 'healthy' | 'unhealthy' | 'unknown'
  ): boolean {
    const service = this.services.get(serviceId);
    if (!service) {
      return false;
    }

    service.health = health;
    service.lastHeartbeat = new Date();

    this.logger.debug(`Updated health for ${service.name}: ${health}`);
    return true;
  }

  updateServiceMetadata(
    serviceId: string,
    metadata: Record<string, unknown>
  ): boolean {
    const service = this.services.get(serviceId);
    if (!service) {
      return false;
    }

    service.metadata = { ...service.metadata, ...metadata };
    service.lastHeartbeat = new Date();

    this.logger.debug(`Updated metadata for ${service.name}`);
    return true;
  }

  heartbeat(serviceId: string): boolean {
    const service = this.services.get(serviceId);
    if (!service) {
      return false;
    }

    service.lastHeartbeat = new Date();
    this.logger.debug(`Heartbeat received from ${service.name}`);
    return true;
  }

  private startHeartbeatTimer(serviceId: string): void {
    const heartbeatInterval = this._configService.get(
      'SERVICE_DISCOVERY_HEARTBEAT_INTERVAL',
      30000
    );

    // Останавливаем предыдущий таймер если есть
    const existingTimer = this.heartbeatTimers.get(serviceId);
    if (existingTimer) {
      clearInterval(existingTimer);
    }

    const timer = setInterval(() => {
      const service = this.services.get(serviceId);
      if (!service) {
        clearInterval(timer);
        this.heartbeatTimers.delete(serviceId);
        return;
      }

      // Проверяем, не пропустил ли сервис heartbeat
      const heartbeatTimeout = this._configService.get(
        'SERVICE_DISCOVERY_HEARTBEAT_TIMEOUT',
        90000
      );
      const timeSinceLastHeartbeat =
        Date.now() - service.lastHeartbeat.getTime();

      if (timeSinceLastHeartbeat > heartbeatTimeout) {
        this.logger.warn(
          `Service ${service.name} missed heartbeat, marking as unhealthy`
        );
        service.health = 'unhealthy';
      }
    }, heartbeatInterval);

    this.heartbeatTimers.set(serviceId, timer);
  }

  private startCleanupTimer(): void {
    const cleanupInterval = this._configService.get(
      'SERVICE_DISCOVERY_CLEANUP_INTERVAL',
      300000
    ); // 5 минут

    this.cleanupTimer = setInterval(() => {
      this.cleanupStaleServices();
    }, cleanupInterval);
  }

  private cleanupStaleServices(): void {
    const now = Date.now();
    const maxAge = this._configService.get('SERVICE_DISCOVERY_MAX_AGE', 300000); // 5 минут

    for (const [serviceId, service] of this.services.entries()) {
      const age = now - service.lastHeartbeat.getTime();

      if (age > maxAge) {
        this.logger.warn(
          `Removing stale service: ${service.name} (${serviceId})`
        );
        this.deregisterService(serviceId);
      }
    }
  }

  // Kong Admin API интеграция
  async syncWithKong(): Promise<{
    synced: number;
    errors: number;
    details: string[];
  }> {
    const kongAdminUrl = this._configService.get(
      'KONG_ADMIN_URL',
      'http://localhost:8001'
    );
    const results = {
      synced: 0,
      errors: 0,
      details: [] as string[],
    };

    try {
      // Получаем сервисы из Kong
      const response = await fetch(`${kongAdminUrl}/services`);
      if (!response.ok) {
        throw new Error(`Kong Admin API error: ${response.status}`);
      }

      const kongServices = await response.json();

      const kongServicesData = kongServices as { data?: KongService[] };
      for (const kongService of kongServicesData.data ?? []) {
        try {
          // Регистрируем сервис в нашем discovery
          const registration: Omit<IServiceRegistration, 'registeredAt'> = {
            id: kongService.id,
            name: kongService.name,
            url: kongService.url,
            version: kongService.version ?? '1.0.0',
            health: 'unknown',
            metadata: {
              kong_id: kongService.id,
              kong_created_at: kongService.created_at,
              kong_updated_at: kongService.updated_at,
              kong_protocol: kongService.protocol,
              kong_host: kongService.host,
              kong_port: kongService.port,
              kong_path: kongService.path,
            },
            lastHeartbeat: new Date(),
          };

          this.registerService(registration);
          results.synced++;
          results.details.push(`Synced: ${kongService.name}`);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          results.errors++;
          results.details.push(
            `Error syncing ${kongService.name}: ${errorMessage}`
          );
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      results.errors++;
      results.details.push(`Kong sync failed: ${errorMessage}`);
    }

    return results;
  }

  // Health check для service discovery
  async healthCheck(): Promise<{
    status: string;
    totalServices: number;
    healthyServices: number;
    lastSync: Date;
  }> {
    const totalServices = this.services.size;
    const healthyServices = Array.from(this.services.values()).filter(
      service => service.health === 'healthy'
    ).length;

    return {
      status: healthyServices === totalServices ? 'healthy' : 'degraded',
      totalServices,
      healthyServices,
      lastSync: new Date(),
    };
  }

  // Получение статистики
  getStats(): {
    totalServices: number;
    healthyServices: number;
    unhealthyServices: number;
    averageUptime: number;
    servicesByVersion: Record<string, number>;
  } {
    const services = Array.from(this.services.values());
    const healthyServices = services.filter(s => s.health === 'healthy').length;
    const unhealthyServices = services.filter(
      s => s.health === 'unhealthy'
    ).length;

    // Группировка по версиям
    const servicesByVersion: Record<string, number> = {};
    services.forEach(service => {
      const version = service.version;
      servicesByVersion[version] = (servicesByVersion[version] ?? 0) + 1;
    });

    // Среднее время работы
    const now = Date.now();
    const uptimes = services.map(
      service => now - service.registeredAt.getTime()
    );
    const averageUptime =
      uptimes.length > 0
        ? uptimes.reduce((a, b) => a + b, 0) / uptimes.length
        : 0;

    return {
      totalServices: services.length,
      healthyServices,
      unhealthyServices,
      averageUptime,
      servicesByVersion,
    };
  }

  onModuleDestroy() {
    // Очистка таймеров при завершении работы
    for (const timer of this.heartbeatTimers.values()) {
      clearInterval(timer);
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}

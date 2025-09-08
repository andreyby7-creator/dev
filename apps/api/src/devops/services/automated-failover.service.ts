import { Injectable, Logger } from '@nestjs/common';

// Типы
type DataCenterType = 'PRIMARY' | 'SECONDARY' | 'BACKUP';
type FailoverStatus =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'FAILED'
  | 'SWITCHING'
  | 'RECOVERING';
type ServiceType =
  | 'API'
  | 'DATABASE'
  | 'CACHE'
  | 'STORAGE'
  | 'CDN'
  | 'LOAD_BALANCER';

// Интерфейсы
export interface IDataCenter {
  id: string;
  name: string;
  type: DataCenterType;
  region: string;
  country: string;
  endpoint: string;
  healthCheckUrl: string;
  isActive: boolean;
  priority: number;
  capacity: {
    cpu: number;
    memory: number;
    storage: number;
    network: number;
  };
  services: IService[];
  lastHealthCheck: string;
  status: FailoverStatus;
}

export interface IService {
  id: string;
  name: string;
  type: ServiceType;
  endpoint: string;
  healthCheckUrl: string;
  isActive: boolean;
  status: FailoverStatus;
  lastHealthCheck: string;
  responseTime: number;
  errorRate: number;
  uptime: number;
}

export interface IFailoverConfig {
  enabled: boolean;
  autoFailover: boolean;
  healthCheckInterval: number;
  failoverThreshold: number;
  recoveryThreshold: number;
  maxFailoverAttempts: number;
  failoverTimeout: number;
  notificationChannels: string[];
  dataCenters: IDataCenter[];
}

export interface IFailoverEvent {
  id: string;
  timestamp: string;
  type: 'FAILOVER' | 'RECOVERY' | 'HEALTH_CHECK' | 'MANUAL_SWITCH';
  sourceDataCenter: string;
  targetDataCenter: string;
  reason: string;
  services: string[];
  duration?: number;
  status: 'SUCCESS' | 'FAILED' | 'IN_PROGRESS';
  metadata: Record<string, unknown>;
}

export interface IHealthCheckResult {
  dataCenterId: string;
  timestamp: string;
  status: FailoverStatus;
  responseTime: number;
  services: {
    serviceId: string;
    status: FailoverStatus;
    responseTime: number;
    errorRate: number;
  }[];
  errors: string[];
}

@Injectable()
export class AutomatedFailoverService {
  private readonly logger = new Logger(AutomatedFailoverService.name);
  private readonly dataCenters: Map<string, IDataCenter> = new Map();
  private readonly failoverEvents: IFailoverEvent[] = [];
  private readonly healthCheckResults: IHealthCheckResult[] = [];
  private config!: IFailoverConfig;
  private healthCheckInterval: NodeJS.Timeout | undefined;

  constructor() {
    this.initializeDefaultConfig();
    this.initializeDefaultDataCenters();
  }

  /**
   * Инициализировать конфигурацию по умолчанию
   */
  private initializeDefaultConfig(): void {
    this.config = {
      enabled: true,
      autoFailover: true,
      healthCheckInterval: 30000, // 30 секунд
      failoverThreshold: 3, // 3 неудачных проверки
      recoveryThreshold: 5, // 5 успешных проверок
      maxFailoverAttempts: 3,
      failoverTimeout: 300000, // 5 минут
      notificationChannels: ['email', 'telegram', 'slack'],
      dataCenters: [],
    };
  }

  /**
   * Инициализировать дата-центры по умолчанию
   */
  private initializeDefaultDataCenters(): void {
    const defaultDataCenters: IDataCenter[] = [
      {
        id: 'dc-minsk-primary',
        name: 'Minsk Primary DC',
        type: 'PRIMARY',
        region: 'Minsk',
        country: 'BY',
        endpoint: 'https://api-minsk.salespot.by',
        healthCheckUrl: 'https://api-minsk.salespot.by/health',
        isActive: true,
        priority: 1,
        capacity: {
          cpu: 80,
          memory: 64,
          storage: 1000,
          network: 1000,
        },
        services: [
          {
            id: 'api-minsk',
            name: 'API Service',
            type: 'API',
            endpoint: 'https://api-minsk.salespot.by',
            healthCheckUrl: 'https://api-minsk.salespot.by/health',
            isActive: true,
            status: 'HEALTHY',
            lastHealthCheck: new Date().toISOString(),
            responseTime: 50,
            errorRate: 0.01,
            uptime: 99.9,
          },
          {
            id: 'db-minsk',
            name: 'Database Service',
            type: 'DATABASE',
            endpoint: 'postgresql://db-minsk.salespot.by:5432',
            healthCheckUrl: 'https://db-minsk.salespot.by/health',
            isActive: true,
            status: 'HEALTHY',
            lastHealthCheck: new Date().toISOString(),
            responseTime: 20,
            errorRate: 0.001,
            uptime: 99.99,
          },
        ],
        lastHealthCheck: new Date().toISOString(),
        status: 'HEALTHY',
      },
      {
        id: 'dc-minsk-secondary',
        name: 'Minsk Secondary DC',
        type: 'SECONDARY',
        region: 'Minsk',
        country: 'BY',
        endpoint: 'https://api-minsk-2.salespot.by',
        healthCheckUrl: 'https://api-minsk-2.salespot.by/health',
        isActive: false,
        priority: 2,
        capacity: {
          cpu: 60,
          memory: 48,
          storage: 800,
          network: 800,
        },
        services: [
          {
            id: 'api-minsk-2',
            name: 'API Service',
            type: 'API',
            endpoint: 'https://api-minsk-2.salespot.by',
            healthCheckUrl: 'https://api-minsk-2.salespot.by/health',
            isActive: false,
            status: 'HEALTHY',
            lastHealthCheck: new Date().toISOString(),
            responseTime: 60,
            errorRate: 0.02,
            uptime: 99.8,
          },
          {
            id: 'db-minsk-2',
            name: 'Database Service',
            type: 'DATABASE',
            endpoint: 'postgresql://db-minsk-2.salespot.by:5432',
            healthCheckUrl: 'https://db-minsk-2.salespot.by/health',
            isActive: false,
            status: 'HEALTHY',
            lastHealthCheck: new Date().toISOString(),
            responseTime: 25,
            errorRate: 0.002,
            uptime: 99.98,
          },
        ],
        lastHealthCheck: new Date().toISOString(),
        status: 'HEALTHY',
      },
      {
        id: 'dc-moscow-backup',
        name: 'Moscow Backup DC',
        type: 'BACKUP',
        region: 'Moscow',
        country: 'RU',
        endpoint: 'https://api-moscow.salespot.ru',
        healthCheckUrl: 'https://api-moscow.salespot.ru/health',
        isActive: false,
        priority: 3,
        capacity: {
          cpu: 40,
          memory: 32,
          storage: 500,
          network: 500,
        },
        services: [
          {
            id: 'api-moscow',
            name: 'API Service',
            type: 'API',
            endpoint: 'https://api-moscow.salespot.ru',
            healthCheckUrl: 'https://api-moscow.salespot.ru/health',
            isActive: false,
            status: 'HEALTHY',
            lastHealthCheck: new Date().toISOString(),
            responseTime: 80,
            errorRate: 0.05,
            uptime: 99.5,
          },
          {
            id: 'db-moscow',
            name: 'Database Service',
            type: 'DATABASE',
            endpoint: 'postgresql://db-moscow.salespot.ru:5432',
            healthCheckUrl: 'https://db-moscow.salespot.ru/health',
            isActive: false,
            status: 'HEALTHY',
            lastHealthCheck: new Date().toISOString(),
            responseTime: 35,
            errorRate: 0.005,
            uptime: 99.95,
          },
        ],
        lastHealthCheck: new Date().toISOString(),
        status: 'HEALTHY',
      },
    ];

    for (const dc of defaultDataCenters) {
      this.dataCenters.set(dc.id, dc);
    }
    this.config.dataCenters = defaultDataCenters;
  }

  /**
   * Запустить автоматический failover
   */
  async startAutomatedFailover(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.warn('Automated failover is disabled');
      return;
    }

    this.logger.log('Starting automated failover monitoring');

    // Остановить существующий интервал если есть
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Запустить периодические проверки здоровья
    this.healthCheckInterval = setInterval(() => {
      void this.performHealthChecks();
    }, this.config.healthCheckInterval);

    // Выполнить первую проверку сразу
    await this.performHealthChecks();
  }

  /**
   * Остановить автоматический failover
   */
  async stopAutomatedFailover(): Promise<void> {
    if (this.healthCheckInterval != null) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
    this.logger.log('Automated failover monitoring stopped');
  }

  /**
   * Выполнить проверки здоровья всех дата-центров
   */
  async performHealthChecks(): Promise<IHealthCheckResult[]> {
    const results: IHealthCheckResult[] = [];

    for (const [dcId, dataCenter] of this.dataCenters) {
      const result = await this.checkDataCenterHealth(dataCenter);
      results.push(result);

      // Обновить статус дата-центра
      dataCenter.status = result.status;
      dataCenter.lastHealthCheck = result.timestamp;

      // Обновить статусы сервисов
      for (const serviceResult of result.services) {
        const service = dataCenter.services.find(
          s => s.id === serviceResult.serviceId
        );
        if (service) {
          service.status = serviceResult.status;
          service.lastHealthCheck = result.timestamp;
          service.responseTime = serviceResult.responseTime;
          service.errorRate = serviceResult.errorRate;
        }
      }

      this.dataCenters.set(dcId, dataCenter);
    }

    this.healthCheckResults.push(...results);

    // Проверить необходимость failover
    if (this.config.autoFailover) {
      await this.checkFailoverNeeded();
    }

    return results;
  }

  /**
   * Проверить здоровье конкретного дата-центра
   */
  private async checkDataCenterHealth(
    dataCenter: IDataCenter
  ): Promise<IHealthCheckResult> {
    const timestamp = new Date().toISOString();
    const errors: string[] = [];
    let overallStatus: FailoverStatus = 'HEALTHY';
    let totalResponseTime = 0;
    let serviceCount = 0;

    const serviceResults: IHealthCheckResult['services'] = [];

    for (const service of dataCenter.services) {
      try {
        const serviceResult = await this.checkServiceHealth(service);
        serviceResults.push(serviceResult);
        totalResponseTime += serviceResult.responseTime;
        serviceCount++;

        if (serviceResult.status === 'FAILED') {
          overallStatus = 'FAILED';
          errors.push(`Service ${service.name} is down`);
        } else if (
          serviceResult.status === 'DEGRADED' &&
          overallStatus === 'HEALTHY'
        ) {
          overallStatus = 'DEGRADED';
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Service ${service.name} check failed: ${errorMessage}`);
        serviceResults.push({
          serviceId: service.id,
          status: 'FAILED',
          responseTime: 0,
          errorRate: 1.0,
        });
        overallStatus = 'FAILED';
      }
    }

    return {
      dataCenterId: dataCenter.id,
      timestamp,
      status: overallStatus,
      responseTime: serviceCount > 0 ? totalResponseTime / serviceCount : 0,
      services: serviceResults,
      errors,
    };
  }

  /**
   * Проверить здоровье конкретного сервиса
   */
  private async checkServiceHealth(service: IService): Promise<{
    serviceId: string;
    status: FailoverStatus;
    responseTime: number;
    errorRate: number;
  }> {
    const startTime = Date.now();
    let status: FailoverStatus = 'HEALTHY';
    let errorRate = 0;

    try {
      // Симуляция проверки здоровья сервиса
      const responseTime = Math.random() * 100 + 20; // 20-120ms
      await this.delay(responseTime);

      // Симуляция случайных ошибок
      if (Math.random() < 0.05) {
        // 5% вероятность ошибки
        status = 'DEGRADED';
        errorRate = 0.05;
      }

      if (Math.random() < 0.01) {
        // 1% вероятность полного отказа
        status = 'FAILED';
        errorRate = 1.0;
      }

      return {
        serviceId: service.id,
        status,
        responseTime,
        errorRate,
      };
    } catch {
      return {
        serviceId: service.id,
        status: 'FAILED',
        responseTime: Date.now() - startTime,
        errorRate: 1.0,
      };
    }
  }

  /**
   * Проверить необходимость failover
   */
  private async checkFailoverNeeded(): Promise<void> {
    const activeDataCenter = Array.from(this.dataCenters.values()).find(
      dc => dc.isActive
    );
    if (!activeDataCenter) {
      this.logger.error('No active data center found');
      return;
    }

    // Проверить статус активного дата-центра
    if (
      activeDataCenter.status === 'FAILED' ||
      activeDataCenter.status === 'DEGRADED'
    ) {
      const failoverCount = this.getFailoverCount(activeDataCenter.id);

      if (failoverCount >= this.config.failoverThreshold) {
        await this.performFailover(activeDataCenter.id);
      }
    }
  }

  /**
   * Выполнить failover
   */
  async performFailover(fromDataCenterId: string): Promise<IFailoverEvent> {
    this.logger.log(`Initiating failover from ${fromDataCenterId}`);

    const event: IFailoverEvent = {
      id: `failover-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'FAILOVER',
      sourceDataCenter: fromDataCenterId,
      targetDataCenter: '',
      reason: 'Health check failure',
      services: [],
      status: 'IN_PROGRESS',
      metadata: {},
    };

    try {
      // Найти подходящий дата-центр для failover
      const targetDataCenter = this.findBestTargetDataCenter(fromDataCenterId);
      if (!targetDataCenter) {
        throw new Error('No suitable target data center found');
      }

      event.targetDataCenter = targetDataCenter.id;
      event.services = targetDataCenter.services.map(s => s.id);

      // Выполнить переключение
      await this.switchToDataCenter(targetDataCenter.id);

      event.status = 'SUCCESS';
      event.duration = Date.now() - new Date(event.timestamp).getTime();

      this.logger.log(
        `Failover completed successfully to ${targetDataCenter.id}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      event.status = 'FAILED';
      event.metadata.error = errorMessage;
      this.logger.error(`Failover failed: ${errorMessage}`);
    }

    this.failoverEvents.push(event);
    return event;
  }

  /**
   * Найти лучший целевой дата-центр
   */
  private findBestTargetDataCenter(
    excludeDataCenterId: string
  ): IDataCenter | undefined {
    const availableDataCenters = Array.from(this.dataCenters.values())
      .filter(dc => dc.id !== excludeDataCenterId && dc.status === 'HEALTHY')
      .sort((a, b) => a.priority - b.priority);

    return availableDataCenters[0];
  }

  /**
   * Переключиться на дата-центр
   */
  private async switchToDataCenter(dataCenterId: string): Promise<void> {
    // Деактивировать текущий активный дата-центр
    for (const [dcId, dataCenter] of this.dataCenters) {
      if (dataCenter.isActive) {
        dataCenter.isActive = false;
        for (const service of dataCenter.services) {
          service.isActive = false;
        }
        this.dataCenters.set(dcId, dataCenter);
      }
    }

    // Активировать новый дата-центр
    const targetDataCenter = this.dataCenters.get(dataCenterId);
    if (targetDataCenter) {
      targetDataCenter.isActive = true;
      for (const service of targetDataCenter.services) {
        service.isActive = true;
      }
      this.dataCenters.set(dataCenterId, targetDataCenter);
    }

    // Симуляция времени переключения
    await this.delay(5000);
  }

  /**
   * Получить количество failover для дата-центра
   */
  private getFailoverCount(dataCenterId: string): number {
    const recentEvents = this.failoverEvents.filter(
      event =>
        event.sourceDataCenter === dataCenterId &&
        event.type === 'FAILOVER' &&
        Date.now() - new Date(event.timestamp).getTime() < 300000 // 5 минут
    );
    return recentEvents.length;
  }

  /**
   * Получить конфигурацию
   */
  getConfig(): IFailoverConfig {
    return { ...this.config };
  }

  /**
   * Обновить конфигурацию
   */
  updateConfig(config: Partial<IFailoverConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.log('Failover configuration updated');
  }

  /**
   * Получить все дата-центры
   */
  getDataCenters(): IDataCenter[] {
    return Array.from(this.dataCenters.values());
  }

  /**
   * Получить активный дата-центр
   */
  getActiveDataCenter(): IDataCenter | undefined {
    return Array.from(this.dataCenters.values()).find(dc => dc.isActive);
  }

  /**
   * Получить историю failover событий
   */
  getFailoverEvents(limit = 100): IFailoverEvent[] {
    return this.failoverEvents.slice(-limit);
  }

  /**
   * Получить результаты проверок здоровья
   */
  getHealthCheckResults(limit = 100): IHealthCheckResult[] {
    return this.healthCheckResults.slice(-limit);
  }

  /**
   * Ручное переключение на дата-центр
   */
  async manualSwitch(
    dataCenterId: string,
    reason: string
  ): Promise<IFailoverEvent> {
    const activeDataCenter = this.getActiveDataCenter();
    if (!activeDataCenter) {
      throw new Error('No active data center found');
    }

    // Проверить существование целевого дата-центра
    const targetDataCenter = this.dataCenters.get(dataCenterId);
    if (!targetDataCenter) {
      throw new Error('Data center not found');
    }

    const event: IFailoverEvent = {
      id: `manual-switch-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'MANUAL_SWITCH',
      sourceDataCenter: activeDataCenter.id,
      targetDataCenter: dataCenterId,
      reason,
      services: [],
      status: 'IN_PROGRESS',
      metadata: {},
    };

    try {
      await this.switchToDataCenter(dataCenterId);
      event.status = 'SUCCESS';
      event.duration = Date.now() - new Date(event.timestamp).getTime();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      event.status = 'FAILED';
      event.metadata.error = errorMessage;
    }

    this.failoverEvents.push(event);
    return event;
  }

  /**
   * Задержка для симуляции
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

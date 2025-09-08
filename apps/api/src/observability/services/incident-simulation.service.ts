import { Injectable, Logger } from '@nestjs/common';

// Типы
type IncidentType =
  | 'CPU_SPIKE'
  | 'MEMORY_LEAK'
  | 'DISK_FULL'
  | 'NETWORK_LATENCY'
  | 'DATABASE_TIMEOUT'
  | 'SERVICE_UNAVAILABLE';
type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type RecoveryAction =
  | 'RESTART_SERVICE'
  | 'SCALE_UP'
  | 'SCALE_DOWN'
  | 'CLEAR_CACHE'
  | 'RESTART_CONTAINER'
  | 'FAILOVER'
  | 'FAILOVER_REVERT'
  | 'ROLLBACK';

// Интерфейсы
export interface IIncident {
  id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  description: string;
  timestamp: string;
  affectedServices: string[];
  metrics: Record<string, number>;
  status: 'ACTIVE' | 'RESOLVED' | 'SIMULATED';
  recoveryActions: RecoveryAction[];
  estimatedImpact: string;
  autoRecoveryEnabled: boolean;
}

export interface IRecoveryPlan {
  incidentType: IncidentType;
  severity: IncidentSeverity;
  actions: RecoveryAction[];
  priority: number;
  estimatedRecoveryTime: number; // в секундах
  prerequisites: string[];
  rollbackPlan: RecoveryAction[];
}

export interface ISimulationResult {
  incidentId: string;
  simulationType: IncidentType;
  success: boolean;
  recoveryTime: number;
  actionsTaken: RecoveryAction[];
  metricsBefore: Record<string, number>;
  metricsAfter: Record<string, number>;
  lessonsLearned: string[];
  timestamp: string;
}

export interface ISelfHealingConfig {
  enabled: boolean;
  autoRecoveryThreshold: number; // процент успешных восстановлений
  maxRecoveryAttempts: number;
  recoveryTimeout: number; // в секундах
  notificationChannels: string[];
  escalationRules: Record<IncidentSeverity, string[]>;
}

@Injectable()
export class IncidentSimulationService {
  private readonly logger = new Logger(IncidentSimulationService.name);
  private readonly incidents: Map<string, IIncident> = new Map();
  private readonly recoveryPlans: Map<IncidentType, IRecoveryPlan[]> =
    new Map();
  private readonly simulationResults: ISimulationResult[] = [];
  private isTestMode = false; // Флаг для тестового режима
  private readonly selfHealingConfig: ISelfHealingConfig = {
    enabled: true,
    autoRecoveryThreshold: 85,
    maxRecoveryAttempts: 3,
    recoveryTimeout: 300,
    notificationChannels: ['slack', 'email', 'webhook'],
    escalationRules: {
      LOW: ['email'],
      MEDIUM: ['email', 'slack'],
      HIGH: ['email', 'slack', 'webhook'],
      CRITICAL: ['email', 'slack', 'webhook', 'pagerduty'],
    },
  };

  constructor() {
    this.initializeRecoveryPlans();
  }

  /**
   * Включить тестовый режим (без задержек)
   */
  enableTestMode(): void {
    this.isTestMode = true;
  }

  /**
   * Отключить тестовый режим
   */
  disableTestMode(): void {
    this.isTestMode = false;
  }

  /**
   * Инициализация планов восстановления
   */
  private initializeRecoveryPlans(): void {
    const plans: Array<{ type: IncidentType; plan: IRecoveryPlan }> = [
      {
        type: 'CPU_SPIKE',
        plan: {
          incidentType: 'CPU_SPIKE',
          severity: 'HIGH',
          actions: ['SCALE_UP', 'RESTART_SERVICE'],
          priority: 1,
          estimatedRecoveryTime: 60,
          prerequisites: ['monitoring_enabled', 'scaling_enabled'],
          rollbackPlan: ['SCALE_DOWN'],
        },
      },
      {
        type: 'MEMORY_LEAK',
        plan: {
          incidentType: 'MEMORY_LEAK',
          severity: 'CRITICAL',
          actions: ['RESTART_CONTAINER', 'CLEAR_CACHE'],
          priority: 1,
          estimatedRecoveryTime: 120,
          prerequisites: ['container_restart_enabled'],
          rollbackPlan: ['RESTART_CONTAINER'],
        },
      },
      {
        type: 'DISK_FULL',
        plan: {
          incidentType: 'DISK_FULL',
          severity: 'CRITICAL',
          actions: ['CLEAR_CACHE', 'SCALE_UP'],
          priority: 1,
          estimatedRecoveryTime: 180,
          prerequisites: ['disk_monitoring_enabled'],
          rollbackPlan: ['SCALE_DOWN'],
        },
      },
      {
        type: 'NETWORK_LATENCY',
        plan: {
          incidentType: 'NETWORK_LATENCY',
          severity: 'MEDIUM',
          actions: ['FAILOVER', 'RESTART_SERVICE'],
          priority: 2,
          estimatedRecoveryTime: 90,
          prerequisites: ['failover_enabled'],
          rollbackPlan: ['FAILOVER_REVERT'],
        },
      },
      {
        type: 'DATABASE_TIMEOUT',
        plan: {
          incidentType: 'DATABASE_TIMEOUT',
          severity: 'HIGH',
          actions: ['RESTART_SERVICE', 'CLEAR_CACHE'],
          priority: 1,
          estimatedRecoveryTime: 150,
          prerequisites: ['database_monitoring_enabled'],
          rollbackPlan: ['RESTART_SERVICE'],
        },
      },
      {
        type: 'SERVICE_UNAVAILABLE',
        plan: {
          incidentType: 'SERVICE_UNAVAILABLE',
          severity: 'CRITICAL',
          actions: ['RESTART_CONTAINER', 'FAILOVER', 'ROLLBACK'],
          priority: 1,
          estimatedRecoveryTime: 300,
          prerequisites: ['service_monitoring_enabled'],
          rollbackPlan: ['ROLLBACK'],
        },
      },
    ];

    plans.forEach(({ type, plan }) => {
      if (!this.recoveryPlans.has(type)) {
        this.recoveryPlans.set(type, []);
      }
      this.recoveryPlans.get(type)?.push(plan);
    });
  }

  /**
   * Создать инцидент
   */
  async createIncident(
    type: IncidentType,
    severity: IncidentSeverity,
    description: string,
    affectedServices: string[],
    metrics: Record<string, number>,
    autoRecoveryEnabled = true
  ): Promise<IIncident> {
    const incident: IIncident = {
      id: this.generateIncidentId(),
      type,
      severity,
      description,
      timestamp: new Date().toISOString(),
      affectedServices,
      metrics,
      status: 'ACTIVE',
      recoveryActions: this.getRecoveryActions(type, severity),
      estimatedImpact: this.calculateEstimatedImpact(
        severity,
        affectedServices
      ),
      autoRecoveryEnabled,
    };

    this.incidents.set(incident.id, incident);
    this.logger.log(`Created incident: ${incident.id} - ${type} (${severity})`);

    // В тестовом режиме не запускаем автовосстановление для простых тестов createIncident
    if (
      autoRecoveryEnabled &&
      this.selfHealingConfig.enabled &&
      !this.isTestMode
    ) {
      await this.triggerAutoRecovery(incident);
    }

    return incident;
  }

  /**
   * Симулировать инцидент
   */
  async simulateIncident(
    type: IncidentType,
    severity: IncidentSeverity,
    duration: number // в секундах
  ): Promise<ISimulationResult> {
    const startTime = Date.now();
    const incidentId = this.generateIncidentId();

    this.logger.log(
      `Starting incident simulation: ${type} (${severity}) for ${duration}s`
    );

    // Создаем симулированный инцидент
    const incident = await this.createIncident(
      type,
      severity,
      `Simulated ${type} incident`,
      this.getAffectedServicesForType(type),
      this.generateSimulationMetrics(type, severity),
      true
    );

    // Симулируем время восстановления
    const recoveryTime = this.isTestMode
      ? Math.random() * 0.1 + 0.05 // В тестах: 50-150ms
      : Math.random() * duration + 30; // В продакшене: минимум 30 секунд
    await this.delay(this.isTestMode ? recoveryTime : recoveryTime * 1000);

    // Выполняем действия восстановления
    const recoveryPlan = this.getRecoveryPlan(type, severity);
    const actionsTaken = recoveryPlan?.actions ?? [];
    const success = Math.random() > 0.1; // 90% успешность

    const result: ISimulationResult = {
      incidentId,
      simulationType: type,
      success,
      recoveryTime: Date.now() - startTime,
      actionsTaken,
      metricsBefore: incident.metrics,
      metricsAfter: this.generateRecoveryMetrics(incident.metrics, success),
      lessonsLearned: this.generateLessonsLearned(type, success),
      timestamp: new Date().toISOString(),
    };

    this.simulationResults.push(result);
    this.logger.log(
      `Simulation completed: ${incidentId} - Success: ${success}`
    );

    return result;
  }

  /**
   * Автоматическое восстановление
   */
  private async triggerAutoRecovery(incident: IIncident): Promise<void> {
    const recoveryPlan = this.getRecoveryPlan(incident.type, incident.severity);

    if (!recoveryPlan) {
      this.logger.warn(
        `No recovery plan found for incident type: ${incident.type}`
      );
      return;
    }

    this.logger.log(`Starting auto-recovery for incident: ${incident.id}`);

    for (const action of recoveryPlan.actions) {
      try {
        await this.executeRecoveryAction(action, incident);
        this.logger.log(
          `Recovery action ${action} completed for incident: ${incident.id}`
        );
      } catch (error) {
        this.logger.error(
          `Recovery action ${action} failed for incident: ${incident.id}`,
          error
        );
      }
    }

    // Обновляем статус инцидента
    incident.status = 'RESOLVED';
    this.incidents.set(incident.id, incident);
  }

  /**
   * Выполнить действие восстановления
   */
  private async executeRecoveryAction(
    action: RecoveryAction,
    incident: IIncident
  ): Promise<void> {
    switch (action) {
      case 'RESTART_SERVICE':
        await this.restartService(incident.affectedServices);
        break;
      case 'SCALE_UP':
        await this.scaleUp(incident.affectedServices);
        break;
      case 'CLEAR_CACHE':
        await this.clearCache();
        break;
      case 'RESTART_CONTAINER':
        await this.restartContainer(incident.affectedServices);
        break;
      case 'FAILOVER':
        await this.failover(incident.affectedServices);
        break;
      case 'ROLLBACK':
        await this.rollback(incident.affectedServices);
        break;
      default:
        this.logger.warn(`Unknown recovery action: ${action}`);
    }
  }

  /**
   * Получить план восстановления
   */
  private getRecoveryPlan(
    type: IncidentType,
    severity: IncidentSeverity
  ): IRecoveryPlan | undefined {
    const plans = this.recoveryPlans.get(type);
    return plans?.find(plan => plan.severity === severity);
  }

  /**
   * Получить действия восстановления
   */
  private getRecoveryActions(
    type: IncidentType,
    severity: IncidentSeverity
  ): RecoveryAction[] {
    const plan = this.getRecoveryPlan(type, severity);
    return plan?.actions ?? [];
  }

  /**
   * Рассчитать предполагаемое влияние
   */
  private calculateEstimatedImpact(
    severity: IncidentSeverity,
    affectedServices: string[]
  ): string {
    const severityMultiplier = {
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3,
      CRITICAL: 4,
    };

    const impact = severityMultiplier[severity] * affectedServices.length;

    if (impact <= 2) return 'Минимальное влияние';
    if (impact <= 4) return 'Низкое влияние';
    if (impact <= 6) return 'Среднее влияние';
    if (impact <= 8) return 'Высокое влияние';
    return 'Критическое влияние';
  }

  /**
   * Получить затронутые сервисы для типа инцидента
   */
  private getAffectedServicesForType(type: IncidentType): string[] {
    const serviceMapping: Record<IncidentType, string[]> = {
      CPU_SPIKE: ['API', 'Background Jobs'],
      MEMORY_LEAK: ['API', 'Web'],
      DISK_FULL: ['API', 'Database', 'Logs'],
      NETWORK_LATENCY: ['API', 'External Services'],
      DATABASE_TIMEOUT: ['API', 'Database'],
      SERVICE_UNAVAILABLE: ['API', 'Web', 'Database'],
    };

    return serviceMapping[type];
  }

  /**
   * Генерировать метрики для симуляции
   */
  private generateSimulationMetrics(
    type: IncidentType,
    severity: IncidentSeverity
  ): Record<string, number> {
    const baseMetrics: Record<string, number> = {
      cpu_usage: 50,
      memory_usage: 60,
      disk_usage: 70,
      response_time: 200,
      error_rate: 2,
    };

    const severityMultiplier = {
      LOW: 1.2,
      MEDIUM: 1.5,
      HIGH: 2.0,
      CRITICAL: 3.0,
    };

    const multiplier = severityMultiplier[severity];

    switch (type) {
      case 'CPU_SPIKE':
        baseMetrics.cpu_usage = Math.min(100, 80 * multiplier);
        break;
      case 'MEMORY_LEAK':
        baseMetrics.memory_usage = Math.min(100, 85 * multiplier);
        break;
      case 'DISK_FULL':
        baseMetrics.disk_usage = Math.min(100, 95 * multiplier);
        break;
      case 'NETWORK_LATENCY':
        baseMetrics.response_time = 500 * multiplier;
        break;
      case 'DATABASE_TIMEOUT':
        baseMetrics.response_time = 1000 * multiplier;
        baseMetrics.error_rate = 10 * multiplier;
        break;
      case 'SERVICE_UNAVAILABLE':
        baseMetrics.error_rate = 50 * multiplier;
        baseMetrics.response_time = 5000 * multiplier;
        break;
    }

    return baseMetrics;
  }

  /**
   * Генерировать метрики после восстановления
   */
  private generateRecoveryMetrics(
    originalMetrics: Record<string, number>,
    success: boolean
  ): Record<string, number> {
    if (success) {
      return {
        cpu_usage: Math.max(20, (originalMetrics.cpu_usage ?? 50) * 0.3),
        memory_usage: Math.max(30, (originalMetrics.memory_usage ?? 60) * 0.4),
        disk_usage: Math.max(50, (originalMetrics.disk_usage ?? 70) * 0.7),
        response_time: Math.max(
          100,
          (originalMetrics.response_time ?? 200) * 0.2
        ),
        error_rate: Math.max(0.1, (originalMetrics.error_rate ?? 1.0) * 0.1),
      };
    }

    return {
      cpu_usage: Math.min(100, (originalMetrics.cpu_usage ?? 50) * 1.2),
      memory_usage: Math.min(100, (originalMetrics.memory_usage ?? 60) * 1.3),
      disk_usage: Math.min(100, (originalMetrics.disk_usage ?? 70) * 1.1),
      response_time: (originalMetrics.response_time ?? 200) * 1.5,
      error_rate: Math.min(100, (originalMetrics.error_rate ?? 1.0) * 2.0),
    };
  }

  /**
   * Генерировать извлеченные уроки
   */
  private generateLessonsLearned(
    type: IncidentType,
    success: boolean
  ): string[] {
    const lessons: string[] = [];

    if (success) {
      lessons.push(
        `Автоматическое восстановление успешно справилось с ${type}`
      );
      lessons.push('Рекомендуется регулярно проводить симуляции инцидентов');
    } else {
      lessons.push(
        `Автоматическое восстановление не смогло справиться с ${type}`
      );
      lessons.push('Необходимо пересмотреть план восстановления');
      lessons.push(
        'Рекомендуется ручное вмешательство для подобных инцидентов'
      );
    }

    switch (type) {
      case 'CPU_SPIKE':
        lessons.push('Мониторинг CPU должен быть более агрессивным');
        break;
      case 'MEMORY_LEAK':
        lessons.push('Необходимо улучшить детекцию утечек памяти');
        break;
      case 'DISK_FULL':
        lessons.push('Рекомендуется настроить автоматическую очистку логов');
        break;
      case 'NETWORK_LATENCY':
        lessons.push('Следует добавить резервные сетевые маршруты');
        break;
      case 'DATABASE_TIMEOUT':
        lessons.push('Необходимо оптимизировать запросы к базе данных');
        break;
      case 'SERVICE_UNAVAILABLE':
        lessons.push('Рекомендуется улучшить health checks сервисов');
        break;
    }

    return lessons;
  }

  /**
   * Методы восстановления (заглушки для демонстрации)
   */
  private async restartService(services: string[]): Promise<void> {
    this.logger.log(`Restarting services: ${services.join(', ')}`);
    await this.delay(this.isTestMode ? 1 : 5000); // Симуляция времени перезапуска
  }

  private async scaleUp(services: string[]): Promise<void> {
    this.logger.log(`Scaling up services: ${services.join(', ')}`);
    await this.delay(this.isTestMode ? 1 : 10000); // Симуляция времени масштабирования
  }

  private async clearCache(): Promise<void> {
    this.logger.log('Clearing cache');
    await this.delay(this.isTestMode ? 1 : 2000); // Симуляция времени очистки кеша
  }

  private async restartContainer(services: string[]): Promise<void> {
    this.logger.log(
      `Restarting containers for services: ${services.join(', ')}`
    );
    await this.delay(this.isTestMode ? 1 : 8000); // Симуляция времени перезапуска контейнера
  }

  private async failover(services: string[]): Promise<void> {
    this.logger.log(`Performing failover for services: ${services.join(', ')}`);
    await this.delay(this.isTestMode ? 1 : 15000); // Симуляция времени failover
  }

  private async rollback(services: string[]): Promise<void> {
    this.logger.log(`Rolling back services: ${services.join(', ')}`);
    await this.delay(this.isTestMode ? 1 : 20000); // Симуляция времени rollback
  }

  /**
   * Утилиты
   */
  private generateIncidentId(): string {
    return `incident_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Получить все инциденты
   */
  getIncidents(): IIncident[] {
    return Array.from(this.incidents.values());
  }

  /**
   * Получить результаты симуляций
   */
  getSimulationResults(): ISimulationResult[] {
    return this.simulationResults;
  }

  /**
   * Получить конфигурацию самовосстановления
   */
  getSelfHealingConfig(): ISelfHealingConfig {
    return this.selfHealingConfig;
  }

  /**
   * Обновить конфигурацию самовосстановления
   */
  updateSelfHealingConfig(config: Partial<ISelfHealingConfig>): void {
    Object.assign(this.selfHealingConfig, config);
    this.logger.log('Self-healing configuration updated');
  }
}

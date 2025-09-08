import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

export enum IncidentType {
  CPU_SPIKE = 'CPU_SPIKE',
  MEMORY_LEAK = 'MEMORY_LEAK',
  DISK_FULL = 'DISK_FULL',
  NETWORK_LATENCY = 'NETWORK_LATENCY',
  DATABASE_TIMEOUT = 'DATABASE_TIMEOUT',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

export enum IncidentSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum RecoveryAction {
  RESTART = 'RESTART',
  SCALE_UP = 'SCALE_UP',
  FAILOVER = 'FAILOVER',
  ROLLBACK = 'ROLLBACK',
  ALERT = 'ALERT',
  NOTIFY = 'NOTIFY',
  ESCALATE = 'ESCALATE',
}

export interface IIncidentPlan {
  id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  description: string;
  actions: RecoveryAction[];
  priority: number;
  autoRecovery: boolean;
  escalationThreshold: number;
  notificationChannels: string[];
}

export interface IIncident {
  id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  description: string;
  timestamp: Date;
  status: 'ACTIVE' | 'RESOLVED' | 'ESCALATED';
  recoveryActions: RecoveryAction[];
  autoRecoveryAttempts: number;
  maxRecoveryAttempts: number;
  escalationLevel: number;
}

export interface IIncidentStats {
  totalIncidents: number;
  resolvedIncidents: number;
  escalatedIncidents: number;
  averageResolutionTime: number;
  autoRecoverySuccessRate: number;
  incidentsByType: Record<IncidentType, number>;
  incidentsBySeverity: Record<IncidentSeverity, number>;
  incidentsByStatus: Record<string, number>;
}

@Injectable()
export class IncidentSimulationService {
  private readonly logger = new Logger(IncidentSimulationService.name);
  private incidents: Map<string, IIncident> = new Map();
  private incidentPlans: Map<IncidentType, IIncidentPlan> = new Map();
  private autoRecoveryEnabled = true;
  private maxAutoRecoveryAttempts = 3;
  private autoRecoveryDelay = 30000; // 30 секунд между попытками автовосстановления
  private isTestMode = process.env.NODE_ENV === 'test'; // Флаг для тестов

  constructor() {
    this.initializeIncidentPlans();
  }

  private initializeIncidentPlans(): void {
    const plans: IIncidentPlan[] = [
      {
        id: 'cpu-spike-plan',
        type: IncidentType.CPU_SPIKE,
        severity: IncidentSeverity.MEDIUM,
        description: 'План восстановления при скачке CPU',
        actions: [RecoveryAction.SCALE_UP, RecoveryAction.ALERT],
        priority: 2,
        autoRecovery: true,
        escalationThreshold: 5,
        notificationChannels: ['email', 'slack'],
      },
      {
        id: 'memory-leak-plan',
        type: IncidentType.MEMORY_LEAK,
        severity: IncidentSeverity.HIGH,
        description: 'План восстановления при утечке памяти',
        actions: [
          RecoveryAction.RESTART,
          RecoveryAction.SCALE_UP,
          RecoveryAction.ALERT,
        ],
        priority: 1,
        autoRecovery: true,
        escalationThreshold: 3,
        notificationChannels: ['email', 'slack', 'sms'],
      },
      {
        id: 'disk-full-plan',
        type: IncidentType.DISK_FULL,
        severity: IncidentSeverity.CRITICAL,
        description: 'План восстановления при заполнении диска',
        actions: [RecoveryAction.ALERT, RecoveryAction.ESCALATE],
        priority: 0,
        autoRecovery: false,
        escalationThreshold: 1,
        notificationChannels: ['email', 'slack', 'sms', 'phone'],
      },
      {
        id: 'network-latency-plan',
        type: IncidentType.NETWORK_LATENCY,
        severity: IncidentSeverity.MEDIUM,
        description: 'План восстановления при высокой задержке сети',
        actions: [RecoveryAction.FAILOVER, RecoveryAction.ALERT],
        priority: 2,
        autoRecovery: true,
        escalationThreshold: 5,
        notificationChannels: ['email', 'slack'],
      },
      {
        id: 'database-timeout-plan',
        type: IncidentType.DATABASE_TIMEOUT,
        severity: IncidentSeverity.HIGH,
        description: 'План восстановления при таймаутах БД',
        actions: [
          RecoveryAction.FAILOVER,
          RecoveryAction.RESTART,
          RecoveryAction.ALERT,
        ],
        priority: 1,
        autoRecovery: true,
        escalationThreshold: 3,
        notificationChannels: ['email', 'slack', 'sms'],
      },
      {
        id: 'service-unavailable-plan',
        type: IncidentType.SERVICE_UNAVAILABLE,
        severity: IncidentSeverity.CRITICAL,
        description: 'План восстановления при недоступности сервиса',
        actions: [
          RecoveryAction.FAILOVER,
          RecoveryAction.RESTART,
          RecoveryAction.ESCALATE,
        ],
        priority: 0,
        autoRecovery: true,
        escalationThreshold: 2,
        notificationChannels: ['email', 'slack', 'sms', 'phone'],
      },
    ];

    plans.forEach(plan => {
      this.incidentPlans.set(plan.type, plan);
    });
  }

  async simulateIncident(
    type: IncidentType,
    severity?: IncidentSeverity
  ): Promise<IIncident> {
    const plan = this.incidentPlans.get(type);
    if (!plan) {
      throw new Error(`No incident plan found for type: ${type}`);
    }

    const incident: IIncident = {
      id: `incident-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity: severity ?? plan.severity,
      description: plan.description,
      timestamp: new Date(),
      status: 'ACTIVE',
      recoveryActions: [...plan.actions],
      autoRecoveryAttempts: 0,
      maxRecoveryAttempts: this.maxAutoRecoveryAttempts,
      escalationLevel: 0,
    };

    this.incidents.set(incident.id, incident);
    this.logger.warn(`Incident simulated: ${type} - ${incident.severity}`);

    // Автоматическое самовосстановление
    if (this.autoRecoveryEnabled && plan.autoRecovery) {
      await this.attemptAutoRecovery(incident);
    }

    // Уведомления
    await this.sendNotifications(plan);

    return incident;
  }

  private async attemptAutoRecovery(incident: IIncident): Promise<void> {
    if (incident.autoRecoveryAttempts >= incident.maxRecoveryAttempts) {
      this.logger.error(
        `Max auto-recovery attempts reached for incident: ${incident.id}`
      );
      incident.status = 'ESCALATED';
      return;
    }

    incident.autoRecoveryAttempts++;
    this.logger.log(
      `Attempting auto-recovery for incident: ${incident.id} (attempt ${incident.autoRecoveryAttempts})`
    );

    try {
      // Симуляция восстановления
      await this.executeRecoveryActions();

      // Проверка успешности восстановления
      const isRecovered = await this.checkRecoveryStatus();

      if (isRecovered) {
        incident.status = 'RESOLVED';
        this.logger.log(`Incident auto-recovered: ${incident.id}`);
      } else if (!this.isTestMode) {
        // Повторная попытка через некоторое время (только в продакшене)
        (
          globalThis as unknown as {
            setTimeout: (fn: () => void, ms: number) => void;
          }
        ).setTimeout(() => {
          void this.attemptAutoRecovery(incident);
        }, this.autoRecoveryDelay);
      }
    } catch (error) {
      this.logger.error(
        `Auto-recovery failed for incident: ${incident.id}`,
        error
      );
      if (!this.isTestMode) {
        // Повторная попытка через некоторое время (только в продакшене)
        (
          globalThis as unknown as {
            setTimeout: (fn: () => void, ms: number) => void;
          }
        ).setTimeout(() => {
          void this.attemptAutoRecovery(incident);
        }, this.autoRecoveryDelay);
      }
    }
  }

  private async executeRecoveryActions(): Promise<void> {
    this.logger.log('Executing recovery actions');
  }

  private async checkRecoveryStatus(): Promise<boolean> {
    // Симуляция проверки статуса восстановления
    if (this.isTestMode) {
      // В тестовом режиме выполняем мгновенно
      return Math.random() > 0.3; // 70% успех
    }
    // В продакшене используем задержку
    await new Promise<void>(resolve =>
      (
        globalThis as unknown as {
          setTimeout: (fn: () => void, ms: number) => void;
        }
      ).setTimeout(() => resolve(), 1000)
    );
    return Math.random() > 0.3; // 70% успех
  }

  private async sendNotifications(plan: IIncidentPlan): Promise<void> {
    // Симуляция отправки уведомлений
    for (const channel of plan.notificationChannels) {
      try {
        await this.sendNotificationToChannel(channel);
      } catch (error) {
        this.logger.error(
          `Failed to send notification to channel: ${channel}`,
          error
        );
      }
    }
  }

  private async sendNotificationToChannel(channel: string): Promise<void> {
    // Симуляция отправки уведомления в канал
    if (this.isTestMode) {
      // В тестовом режиме выполняем мгновенно
      this.logger.log(`Notification sent to channel: ${channel}`);
      return;
    }
    // В продакшене используем задержку
    await new Promise<void>(resolve =>
      (
        globalThis as unknown as {
          setTimeout: (fn: () => void, ms: number) => void;
        }
      ).setTimeout(() => resolve(), 500)
    );
    this.logger.log(`Notification sent to channel: ${channel}`);
  }

  async getIncident(id: string): Promise<IIncident | null> {
    return this.incidents.get(id) ?? null;
  }

  async getAllIncidents(): Promise<IIncident[]> {
    return Array.from(this.incidents.values());
  }

  async getActiveIncidents(): Promise<IIncident[]> {
    return Array.from(this.incidents.values()).filter(
      incident => incident.status === 'ACTIVE'
    );
  }

  async resolveIncident(id: string): Promise<void> {
    const incident = this.incidents.get(id);
    if (incident) {
      incident.status = 'RESOLVED';
      this.logger.log(`Incident ${id} manually resolved`);
    }
  }

  async escalateIncident(id: string): Promise<void> {
    const incident = this.incidents.get(id);
    if (incident) {
      incident.status = 'ESCALATED';
      incident.escalationLevel++;
      this.logger.warn(
        `Incident ${id} escalated to level ${incident.escalationLevel}`
      );
    }
  }

  async getIncidentStats(): Promise<IIncidentStats> {
    const incidents = Array.from(this.incidents.values());
    const resolved = incidents.filter(i => i.status === 'RESOLVED').length;
    const escalated = incidents.filter(i => i.status === 'ESCALATED').length;

    const incidentsByType: Record<IncidentType, number> = {} as Record<
      IncidentType,
      number
    >;
    const incidentsBySeverity: Record<IncidentSeverity, number> = {} as Record<
      IncidentSeverity,
      number
    >;

    incidents.forEach(incident => {
      const incidentType = incident.type;
      incidentsByType[incidentType] += 1;

      const incidentSeverity = incident.severity;
      incidentsBySeverity[incidentSeverity] += 1;
    });

    return {
      totalIncidents: incidents.length,
      resolvedIncidents: resolved,
      escalatedIncidents: escalated,
      averageResolutionTime: incidents.length > 0 ? 15 : 0, // Симуляция
      autoRecoverySuccessRate: incidents.length > 0 ? 0.75 : 0, // Симуляция
      incidentsByType,
      incidentsBySeverity,
      incidentsByStatus: {
        ACTIVE: incidents.filter(i => i.status === 'ACTIVE').length,
        RESOLVED: incidents.filter(i => i.status === 'RESOLVED').length,
        ESCALATED: incidents.filter(i => i.status === 'ESCALATED').length,
      },
    };
  }

  async updateAutoRecoveryConfig(
    enabled: boolean,
    maxAttempts?: number
  ): Promise<void> {
    this.autoRecoveryEnabled = enabled;
    if (maxAttempts !== undefined) {
      this.maxAutoRecoveryAttempts = maxAttempts;
    }
    this.logger.log(
      `Auto-recovery config updated: enabled=${enabled}, maxAttempts=${this.maxAutoRecoveryAttempts}`
    );
  }

  async clearIncidents(): Promise<void> {
    this.incidents.clear();
    this.logger.log('All incidents cleared');
  }

  // Планировщик для автоматической очистки старых инцидентов
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldIncidents(): Promise<void> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [id, incident] of this.incidents.entries()) {
      if (incident.timestamp < oneWeekAgo && incident.status === 'RESOLVED') {
        this.incidents.delete(id);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} old resolved incidents`);
    }
  }
}

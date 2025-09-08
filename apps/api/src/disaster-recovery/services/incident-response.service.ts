import { Injectable, Logger } from '@nestjs/common';
import type {
  CreateIncidentResponseDto,
  UpdateIncidentResponseDto,
} from '../dto/disaster-recovery.dto';
import type {
  IIncidentAction,
  IIncidentResponse,
} from '../interfaces/disaster-recovery.interface';

@Injectable()
export class IncidentResponseService {
  private readonly logger = new Logger(IncidentResponseService.name);
  private readonly incidents = new Map<string, IIncidentResponse>();
  private readonly incidentHistory: Array<{
    timestamp: Date;
    incidentId: string;
    action: string;
    details: string;
    result: string;
  }> = [];

  constructor() {
    this.initializeDefaultIncidents();
  }

  /**
   * Инициализация базовых инцидентов
   */
  private initializeDefaultIncidents(): void {
    const defaultIncidents: IIncidentResponse[] = [
      {
        id: 'incident-power-outage-minsk',
        type: 'power-outage',
        severity: 'high',
        affectedDcs: ['dc-minsk-primary', 'dc-minsk-secondary'],
        description: 'Отключение электроснабжения в дата-центре Минск',
        detectedAt: new Date(),
        status: 'resolved',
        actions: [
          {
            id: 'action-1',
            description:
              'Автоматическое переключение на резервный источник питания',
            type: 'automatic',
            status: 'completed',
            startedAt: new Date(),
            completedAt: new Date(),
            result: 'Успешно переключено на UPS',
          },
        ],
        playbook: 'power-outage-response',
      },
      {
        id: 'incident-network-failure-moscow',
        type: 'network-failure',
        severity: 'medium',
        affectedDcs: ['dc-moscow-primary'],
        description: 'Сбой сетевого оборудования в дата-центре Москва',
        detectedAt: new Date(),
        status: 'responding',
        actions: [
          {
            id: 'action-2',
            description: 'Переключение на резервный канал связи',
            type: 'automatic',
            status: 'in-progress',
            startedAt: new Date(),
          },
        ],
        playbook: 'network-failure-response',
      },
    ];

    defaultIncidents.forEach(incident =>
      this.incidents.set(incident.id, incident)
    );
    this.logger.log(`Initialized ${defaultIncidents.length} default incidents`);
  }

  /**
   * Получение всех инцидентов
   */
  async getAllIncidents(): Promise<IIncidentResponse[]> {
    return Array.from(this.incidents.values());
  }

  /**
   * Получение инцидента по ID
   */
  async getIncidentById(id: string): Promise<IIncidentResponse | null> {
    return this.incidents.get(id) ?? null;
  }

  /**
   * Создание нового инцидента
   */
  async createIncident(
    createDto: CreateIncidentResponseDto
  ): Promise<IIncidentResponse> {
    const id = `incident-${Date.now()}`;
    const incident: IIncidentResponse = {
      id,
      type: createDto.type,
      severity: createDto.severity,
      affectedDcs: createDto.affectedDcs,
      description: createDto.description,
      detectedAt: new Date(),
      status: 'detected',
      actions: [],
      playbook: createDto.playbook,
    };

    this.incidents.set(id, incident);
    this.logger.log(`Created incident: ${id}`);

    // Логируем создание инцидента
    this.logIncidentAction(
      id,
      'created',
      `Incident created: ${createDto.type}`
    );

    return incident;
  }

  /**
   * Обновление инцидента
   */
  async updateIncident(
    id: string,
    updateDto: UpdateIncidentResponseDto
  ): Promise<IIncidentResponse | null> {
    const incident = this.incidents.get(id);
    if (!incident) {
      return null;
    }

    const updatedIncident: IIncidentResponse = {
      ...incident,
      type: updateDto.type ?? incident.type,
      severity: updateDto.severity ?? incident.severity,
      affectedDcs: updateDto.affectedDcs ?? incident.affectedDcs,
      description: updateDto.description ?? incident.description,
      status: updateDto.status ?? incident.status,
      playbook: updateDto.playbook ?? incident.playbook,
    };

    this.incidents.set(id, updatedIncident);
    this.logger.log(`Updated incident: ${id}`);

    // Логируем обновление инцидента
    this.logIncidentAction(
      id,
      'updated',
      `Incident updated: ${updateDto.type ?? incident.type}`
    );

    return updatedIncident;
  }

  /**
   * Удаление инцидента
   */
  async deleteIncident(id: string): Promise<boolean> {
    const deleted = this.incidents.delete(id);
    if (deleted) {
      this.logger.log(`Deleted incident: ${id}`);
      this.logIncidentAction(id, 'deleted', 'Incident deleted');
    }
    return deleted;
  }

  /**
   * Добавление действия к инциденту
   */
  async addActionToIncident(
    incidentId: string,
    action: Omit<IIncidentAction, 'id'>
  ): Promise<IIncidentAction | null> {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      return null;
    }

    const newAction: IIncidentAction = {
      id: `action-${Date.now()}`,
      ...action,
    };

    incident.actions.push(newAction);
    this.incidents.set(incidentId, incident);

    this.logger.log(
      `Added action to incident ${incidentId}: ${action.description}`
    );
    this.logIncidentAction(
      incidentId,
      'action-added',
      `Action added: ${action.description}`
    );

    return newAction;
  }

  /**
   * Обновление статуса действия
   */
  async updateActionStatus(
    incidentId: string,
    actionId: string,
    status: IIncidentAction['status'],
    result?: string,
    error?: string
  ): Promise<IIncidentAction | null> {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      return null;
    }

    const action = incident.actions.find(a => a.id === actionId);
    if (!action) {
      return null;
    }

    action.status = status;
    if (status === 'in-progress' && !action.startedAt) {
      action.startedAt = new Date();
    } else if (status === 'completed' && !action.completedAt) {
      action.completedAt = new Date();
    }

    if (result != null && result !== '') {
      action.result = result;
    }
    if (error != null && error !== '') {
      action.error = error;
    }

    this.incidents.set(incidentId, incident);

    this.logger.log(
      `Updated action status in incident ${incidentId}: ${actionId} -> ${status}`
    );
    this.logIncidentAction(
      incidentId,
      'action-updated',
      `Action ${actionId} status updated to ${status}`
    );

    return action;
  }

  /**
   * Автоматическое выполнение процедур восстановления
   */
  async executeRecoveryProcedures(incidentId: string): Promise<{
    success: boolean;
    actionsExecuted: number;
    totalActions: number;
    errors: string[];
  }> {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      return {
        success: false,
        actionsExecuted: 0,
        totalActions: 0,
        errors: ['Incident not found'],
      };
    }

    if (incident.status === 'resolved') {
      return {
        success: true,
        actionsExecuted: 0,
        totalActions: 0,
        errors: ['Incident already resolved'],
      };
    }

    this.logger.log(
      `Executing recovery procedures for incident: ${incidentId}`
    );

    const errors: string[] = [];
    let actionsExecuted = 0;
    const totalActions = incident.actions.length;

    // Выполняем автоматические действия
    for (const action of incident.actions) {
      if (action.type === 'automatic' && action.status === 'pending') {
        try {
          await this.executeAction(action);
          await this.updateActionStatus(
            incidentId,
            action.id,
            'completed',
            'Action executed successfully'
          );
          actionsExecuted++;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          await this.updateActionStatus(
            incidentId,
            action.id,
            'failed',
            undefined,
            errorMessage
          );
          errors.push(`Action ${action.id}: ${errorMessage}`);
        }
      }
    }

    // Проверяем, все ли действия выполнены
    const allActionsCompleted = incident.actions.every(
      action => action.status === 'completed'
    );
    if (allActionsCompleted) {
      incident.status = 'resolved';
      incident.resolvedAt = new Date();
      this.incidents.set(incidentId, incident);

      this.logIncidentAction(
        incidentId,
        'resolved',
        'All recovery procedures completed'
      );
    }

    const success = errors.length === 0;

    return {
      success,
      actionsExecuted,
      totalActions,
      errors,
    };
  }

  /**
   * Выполнение действия
   */
  private async executeAction(action: IIncidentAction): Promise<void> {
    this.logger.log(`Executing action: ${action.description}`);

    // Симуляция выполнения действия
    await this.delay(1000 + Math.random() * 2000);

    // В реальной реализации здесь были бы реальные действия
    this.logger.log(`Action completed: ${action.description}`);
  }

  /**
   * Получение инцидентов по типу
   */
  async findIncidentsByType(
    type: IIncidentResponse['type']
  ): Promise<IIncidentResponse[]> {
    return Array.from(this.incidents.values()).filter(
      incident => incident.type === type
    );
  }

  /**
   * Получение инцидентов по серьезности
   */
  async findIncidentsBySeverity(
    severity: IIncidentResponse['severity']
  ): Promise<IIncidentResponse[]> {
    return Array.from(this.incidents.values()).filter(
      incident => incident.severity === severity
    );
  }

  /**
   * Получение инцидентов по статусу
   */
  async findIncidentsByStatus(
    status: IIncidentResponse['status']
  ): Promise<IIncidentResponse[]> {
    return Array.from(this.incidents.values()).filter(
      incident => incident.status === status
    );
  }

  /**
   * Получение активных инцидентов
   */
  async getActiveIncidents(): Promise<IIncidentResponse[]> {
    return Array.from(this.incidents.values()).filter(
      incident => incident.status !== 'resolved'
    );
  }

  /**
   * Получение истории инцидентов
   */
  async getIncidentHistory(limit = 100): Promise<typeof this.incidentHistory> {
    return this.incidentHistory.slice(-limit);
  }

  /**
   * Получение статистики по инцидентам
   */
  async getIncidentStatistics(): Promise<{
    totalIncidents: number;
    activeIncidents: number;
    resolvedIncidents: number;
    incidentsByType: Record<string, number>;
    incidentsBySeverity: Record<string, number>;
    averageResolutionTime: number;
    lastIncident?: Date;
  }> {
    const incidents = Array.from(this.incidents.values());

    const totalIncidents = incidents.length;
    const activeIncidents = incidents.filter(
      incident =>
        incident.status === 'detected' || incident.status === 'responding'
    ).length;
    const resolvedIncidents = incidents.filter(
      incident => incident.status === 'resolved'
    ).length;

    const incidentsByType: Record<string, number> = {};
    const incidentsBySeverity: Record<string, number> = {};

    incidents.forEach(incident => {
      incidentsByType[incident.type] =
        (incidentsByType[incident.type] ?? 0) + 1;
      incidentsBySeverity[incident.severity] =
        (incidentsBySeverity[incident.severity] ?? 0) + 1;
    });

    // Рассчитываем среднее время разрешения
    const resolvedIncidentTimes = incidents
      .filter(
        incident =>
          incident.status === 'resolved' && incident.resolvedAt != null
      )
      .map(incident => {
        if (incident.resolvedAt == null) return 0;
        return incident.resolvedAt.getTime() - incident.detectedAt.getTime();
      })
      .filter(time => time > 0);

    const averageResolutionTime =
      resolvedIncidentTimes.length > 0
        ? resolvedIncidentTimes.reduce(
            (sum: number, time: number) => sum + time,
            0
          ) / resolvedIncidentTimes.length
        : 0;

    const lastIncident =
      incidents.length > 0
        ? new Date(Math.max(...incidents.map(i => i.detectedAt.getTime())))
        : undefined;

    return {
      totalIncidents,
      activeIncidents,
      resolvedIncidents,
      incidentsByType,
      incidentsBySeverity,
      averageResolutionTime,
      ...(lastIncident && { lastIncident }),
    };
  }

  /**
   * Логирование действий с инцидентами
   */
  private logIncidentAction(
    incidentId: string,
    action: string,
    details: string
  ): void {
    this.incidentHistory.push({
      timestamp: new Date(),
      incidentId,
      action,
      details,
      result: '', // Initialize result as empty string
    });

    // Ограничиваем историю последними 1000 записями
    if (this.incidentHistory.length > 1000) {
      this.incidentHistory.shift();
    }
  }

  /**
   * Задержка для симуляции
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve =>
      (
        globalThis as unknown as {
          setTimeout: (fn: () => void, ms: number) => void;
        }
      ).setTimeout(resolve, ms)
    );
  }

  /**
   * Управление инцидентами
   */
  manageIncident(config: {
    type: string;
    severity: string;
    description: string;
  }): {
    incidentId: string;
    type: string;
    severity: string;
    status: 'detected' | 'responding' | 'resolved';
  } {
    const incidentId = `incident-${Date.now()}`;

    return {
      incidentId,
      type: config.type,
      severity: config.severity,
      status: 'detected',
    };
  }

  /**
   * Создание плана восстановления
   */
  createRecoveryPlan(incidentId: string): {
    incidentId: string;
    planId: string;
    steps: string[];
    estimatedTime: number;
  } {
    return {
      incidentId,
      planId: `plan-${Date.now()}`,
      steps: ['Analyze incident', 'Implement solution', 'Verify recovery'],
      estimatedTime: 30, // минуты
    };
  }

  /**
   * Выполнение плана восстановления
   */
  executeRecoveryPlan(planId: string): {
    planId: string;
    status: 'running' | 'completed' | 'failed';
    progress: number;
  } {
    return {
      planId,
      status: 'completed',
      progress: 100,
    };
  }

  /**
   * Эскалация инцидента
   */
  escalateIncident(incidentId: string): {
    incidentId: string;
    status: 'escalated' | 'failed';
    escalationLevel: number;
  } {
    return {
      incidentId,
      status: 'escalated',
      escalationLevel: 2,
    };
  }
}

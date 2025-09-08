import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';

// Zod схемы для валидации
const SecurityIncidentSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum(['open', 'investigating', 'contained', 'resolved', 'closed']),
  type: z.enum([
    'data_breach',
    'malware',
    'ddos',
    'phishing',
    'insider_threat',
    'vulnerability_exploit',
    'unauthorized_access',
    'other',
  ]),
  source: z.string(),
  affectedSystems: z.array(z.string()),
  affectedUsers: z.number(),
  discoveredAt: z.date(),
  reportedBy: z.string(),
  assignedTo: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  tags: z.array(z.string()).optional(),
  evidence: z
    .array(
      z.object({
        type: z.string(),
        description: z.string(),
        timestamp: z.date(),
        source: z.string(),
      })
    )
    .optional(),
  timeline: z
    .array(
      z.object({
        timestamp: z.date(),
        action: z.string(),
        actor: z.string(),
        details: z.string(),
      })
    )
    .optional(),
  resolution: z.string().optional(),
  lessonsLearned: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Zod схемы для валидации
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const IncidentResponseSchema = z.object({
  id: z.string(),
  incidentId: z.string(),
  type: z.enum(['containment', 'eradication', 'recovery', 'lessons_learned']),
  responseType: z.enum([
    'containment',
    'eradication',
    'recovery',
    'lessons_learned',
  ]),
  status: z.enum(['planned', 'in_progress', 'completed', 'failed']),
  assignedTo: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string(),
  action: z.string(),
  executedBy: z.string(),
  executedAt: z.date(),
  actions: z
    .array(
      z.object({
        action: z.string(),
        status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
        assignedTo: z.string(),
        dueDate: z.date(),
        completedAt: z.date().optional(),
        notes: z.string().optional(),
      })
    )
    .optional(),
  startDate: z.date(),
  endDate: z.date().optional(),
  success: z.boolean().optional(),
  lessonsLearned: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const EscalationPolicySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  timeToEscalate: z.number(), // в минутах
  escalationLevels: z.array(
    z.object({
      level: z.number(),
      role: z.string(),
      contact: z.string(),
      notificationMethod: z.enum(['email', 'sms', 'slack', 'phone']),
      timeToRespond: z.number(), // в минутах
    })
  ),
  enabled: z.boolean(),
});

// TypeScript типы из схем
type SecurityIncident = z.infer<typeof SecurityIncidentSchema>;
type IncidentResponse = z.infer<typeof IncidentResponseSchema>;
type EscalationPolicy = z.infer<typeof EscalationPolicySchema>;

// Интерфейсы для статистики и мониторинга
export interface IncidentStats {
  totalIncidents: number;
  openIncidents: number;
  resolvedIncidents: number;
  incidentsBySeverity: Record<string, number>;
  incidentsByType: Record<string, number>;
  incidentsByStatus: Record<string, number>;
  averageResolutionTime: number; // в часах
  mttr: number; // Mean Time To Resolution в часах
  mtta: number; // Mean Time To Acknowledge в часах
  topAffectedSystems: Array<{ system: string; count: number }>;
  recentIncidents: SecurityIncident[];
}

export interface IncidentMetrics {
  totalIncidents: number;
  criticalIncidents: number;
  highIncidents: number;
  mediumIncidents: number;
  lowIncidents: number;
  openIncidents: number;
  resolvedIncidents: number;
  averageResolutionTime: number;
  incidentsThisMonth: number;
  incidentsThisWeek: number;
  incidentsToday: number;
}

@Injectable()
export class IncidentResponseService {
  private readonly logger = new Logger(IncidentResponseService.name);
  private readonly incidents: SecurityIncident[] = [];
  private readonly responses: IncidentResponse[] = [];
  private readonly escalationPolicies: EscalationPolicy[] = [];

  constructor() {
    this.initializeIncidentResponse();
  }

  private initializeIncidentResponse(): void {
    this.logger.log('Incident Response service initialized');
  }

  // Управление инцидентами
  async createIncident(incidentData: unknown): Promise<SecurityIncident> {
    const validatedIncident = SecurityIncidentSchema.parse(incidentData);

    // Автоматически определяем приоритет на основе серьезности
    validatedIncident.priority = validatedIncident.severity;

    this.incidents.push(validatedIncident);
    this.logger.warn(
      `Security incident created: ${validatedIncident.title} (${validatedIncident.id}) - ${validatedIncident.severity}`
    );

    // Запускаем автоматическое реагирование
    await this.triggerAutomaticResponse(validatedIncident);

    return validatedIncident;
  }

  async getIncidentById(incidentId: string): Promise<SecurityIncident | null> {
    return this.incidents.find(i => i.id === incidentId) ?? null;
  }

  async getAllIncidents(): Promise<SecurityIncident[]> {
    return this.incidents;
  }

  async getOpenIncidents(): Promise<SecurityIncident[]> {
    return this.incidents.filter(i => i.status !== 'closed');
  }

  async getIncidentsBySeverity(
    severity: SecurityIncident['severity']
  ): Promise<SecurityIncident[]> {
    return this.incidents.filter(i => i.severity === severity);
  }

  async getIncidentsByType(
    type: SecurityIncident['type']
  ): Promise<SecurityIncident[]> {
    return this.incidents.filter(i => i.type === type);
  }

  async updateIncident(
    incidentId: string,
    updates: Partial<SecurityIncident>
  ): Promise<SecurityIncident | null> {
    const incident = this.incidents.find(i => i.id === incidentId);
    if (!incident) {
      return null;
    }

    Object.assign(incident, updates, { updatedAt: new Date() });
    this.logger.log(`Incident updated: ${incidentId}`);

    // Добавляем запись в timeline
    if (incident.timeline) {
      incident.timeline.push({
        timestamp: new Date(),
        action: 'Incident updated',
        actor: 'system',
        details: `Updated fields: ${Object.keys(updates).join(', ')}`,
      });
    }

    return incident;
  }

  async assignIncident(incidentId: string, assignedTo: string): Promise<void> {
    const incident = this.incidents.find(i => i.id === incidentId);
    if (incident) {
      incident.assignedTo = assignedTo;
      incident.updatedAt = new Date();

      if (incident.timeline) {
        incident.timeline.push({
          timestamp: new Date(),
          action: 'Incident assigned',
          actor: 'system',
          details: `Assigned to: ${assignedTo}`,
        });
      }

      this.logger.log(`Incident assigned: ${incidentId} to ${assignedTo}`);
    }
  }

  async updateIncidentStatus(
    incidentId: string,
    status: SecurityIncident['status'],
    actor: string,
    details?: string
  ): Promise<void> {
    const incident = this.incidents.find(i => i.id === incidentId);
    if (incident) {
      incident.status = status;
      incident.updatedAt = new Date();

      if (incident.timeline) {
        incident.timeline.push({
          timestamp: new Date(),
          action: `Status changed to ${status}`,
          actor,
          details: details ?? `Status updated to ${status}`,
        });
      }

      this.logger.log(`Incident status updated: ${incidentId} -> ${status}`);
    }
  }

  // Управление реагированием
  async addResponse(
    incidentId: string,
    responseData: {
      responseType: IncidentResponse['responseType'];
      action: string;
      description: string;
      executedBy: string;
    }
  ): Promise<IncidentResponse> {
    const response: IncidentResponse = {
      id: `response-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      incidentId,
      type: responseData.responseType,
      responseType: responseData.responseType,
      status: 'completed',
      assignedTo: responseData.executedBy,
      priority: 'medium',
      description: responseData.description,
      action: responseData.action,
      executedBy: responseData.executedBy,
      executedAt: new Date(),
      startDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.responses.push(response);
    this.logger.log(
      `Response added to incident ${incidentId}: ${responseData.action}`
    );

    // Обновляем timeline инцидента
    const incident = this.incidents.find(i => i.id === incidentId);
    if (incident?.timeline) {
      incident.timeline.push({
        timestamp: new Date(),
        action: responseData.action,
        actor: responseData.executedBy,
        details: responseData.description,
      });
    }

    return response;
  }

  async getResponsesForIncident(
    incidentId: string
  ): Promise<IncidentResponse[]> {
    return this.responses.filter(r => r.incidentId === incidentId);
  }

  // Автоматическое реагирование
  private async triggerAutomaticResponse(
    incident: SecurityIncident
  ): Promise<void> {
    // Автоматические действия в зависимости от типа и серьезности инцидента
    switch (incident.type) {
      case 'data_breach':
        await this.handleDataBreach(incident);
        break;
      case 'ddos':
        await this.handleDdosAttack(incident);
        break;
      case 'malware':
        await this.handleMalwareIncident(incident);
        break;
      case 'unauthorized_access':
        await this.handleUnauthorizedAccess(incident);
        break;
      default:
        await this.handleGenericIncident(incident);
    }

    // Проверяем необходимость эскалации
    await this.checkEscalation(incident);
  }

  private async handleDataBreach(incident: SecurityIncident): Promise<void> {
    // Автоматические действия при утечке данных
    await this.addResponse(incident.id, {
      responseType: 'containment',
      action: 'Isolate affected systems',
      description:
        'Automatically isolated systems to prevent further data exposure',
      executedBy: 'system',
    });

    await this.addResponse(incident.id, {
      responseType: 'containment',
      action: 'Block suspicious IP addresses',
      description: 'Blocked IP addresses associated with the breach',
      executedBy: 'system',
    });

    this.logger.warn(
      `Data breach response triggered for incident: ${incident.id}`
    );
  }

  private async handleDdosAttack(incident: SecurityIncident): Promise<void> {
    // Автоматические действия при DDoS атаке
    await this.addResponse(incident.id, {
      responseType: 'containment',
      action: 'Enable DDoS protection',
      description: 'Activated DDoS mitigation services',
      executedBy: 'system',
    });

    await this.addResponse(incident.id, {
      responseType: 'containment',
      action: 'Scale up resources',
      description: 'Automatically scaled up infrastructure to handle traffic',
      executedBy: 'system',
    });

    this.logger.warn(`DDoS response triggered for incident: ${incident.id}`);
  }

  private async handleMalwareIncident(
    incident: SecurityIncident
  ): Promise<void> {
    // Автоматические действия при обнаружении вредоносного ПО
    await this.addResponse(incident.id, {
      responseType: 'containment',
      action: 'Quarantine affected systems',
      description: 'Automatically quarantined systems with detected malware',
      executedBy: 'system',
    });

    await this.addResponse(incident.id, {
      responseType: 'eradication',
      action: 'Initiate malware scan',
      description: 'Started comprehensive malware scan across all systems',
      executedBy: 'system',
    });

    this.logger.warn(`Malware response triggered for incident: ${incident.id}`);
  }

  private async handleUnauthorizedAccess(
    incident: SecurityIncident
  ): Promise<void> {
    // Автоматические действия при несанкционированном доступе
    await this.addResponse(incident.id, {
      responseType: 'containment',
      action: 'Revoke suspicious sessions',
      description: 'Automatically revoked all suspicious user sessions',
      executedBy: 'system',
    });

    await this.addResponse(incident.id, {
      responseType: 'containment',
      action: 'Enable enhanced monitoring',
      description:
        'Activated enhanced security monitoring for affected systems',
      executedBy: 'system',
    });

    this.logger.warn(
      `Unauthorized access response triggered for incident: ${incident.id}`
    );
  }

  private async handleGenericIncident(
    incident: SecurityIncident
  ): Promise<void> {
    // Общие автоматические действия
    await this.addResponse(incident.id, {
      responseType: 'containment',
      action: 'Create incident ticket',
      description: 'Automatically created incident ticket for tracking',
      executedBy: 'system',
    });

    this.logger.warn(`Generic response triggered for incident: ${incident.id}`);
  }

  // Эскалация инцидентов
  private async checkEscalation(incident: SecurityIncident): Promise<void> {
    const policy = this.escalationPolicies.find(
      p => p.severity === incident.severity && p.enabled
    );

    if (policy) {
      // Симулируем эскалацию
      this.logger.warn(
        `Escalation triggered for incident ${incident.id} - ${policy.name}`
      );

      await this.addResponse(incident.id, {
        responseType: 'containment',
        action: 'Escalate incident',
        description: `Incident escalated according to policy: ${policy.name}`,
        executedBy: 'system',
      });
    }
  }

  // Управление политиками эскалации
  async createEscalationPolicy(policyData: unknown): Promise<EscalationPolicy> {
    const validatedPolicy = EscalationPolicySchema.parse(policyData);
    this.escalationPolicies.push(validatedPolicy);
    this.logger.log(`Escalation policy created: ${validatedPolicy.name}`);
    return validatedPolicy;
  }

  async getEscalationPolicies(): Promise<EscalationPolicy[]> {
    return this.escalationPolicies;
  }

  async updateEscalationPolicy(
    policyId: string,
    updates: Partial<EscalationPolicy>
  ): Promise<EscalationPolicy | null> {
    const policy = this.escalationPolicies.find(p => p.id === policyId);
    if (policy) {
      Object.assign(policy, updates);
      this.logger.log(`Escalation policy updated: ${policyId}`);
      return policy;
    }
    return null;
  }

  // Статистика и метрики
  async getIncidentStats(): Promise<IncidentStats> {
    const openIncidents = this.incidents.filter(i => i.status !== 'closed');
    const resolvedIncidents = this.incidents.filter(
      i => i.status === 'resolved' || i.status === 'closed'
    );

    // Инциденты по серьезности
    const incidentsBySeverity = this.incidents.reduce(
      (acc, incident) => {
        acc[incident.severity] = (acc[incident.severity] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Инциденты по типу
    const incidentsByType = this.incidents.reduce(
      (acc, incident) => {
        acc[incident.type] = (acc[incident.type] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Инциденты по статусу
    const incidentsByStatus = this.incidents.reduce(
      (acc, incident) => {
        acc[incident.status] = (acc[incident.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Топ затронутых систем
    const systemCounts = this.incidents.reduce(
      (acc, incident) => {
        incident.affectedSystems.forEach(system => {
          acc[system] = (acc[system] ?? 0) + 1;
        });
        return acc;
      },
      {} as Record<string, number>
    );

    const topAffectedSystems = Object.entries(systemCounts)
      .map(([system, count]) => ({ system, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Последние инциденты
    const recentIncidents = this.incidents
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 20);

    // Среднее время разрешения
    const resolvedIncidentsWithDuration = resolvedIncidents;
    const averageResolutionTime =
      resolvedIncidentsWithDuration.length > 0
        ? resolvedIncidentsWithDuration.reduce((sum, incident) => {
            const duration =
              incident.updatedAt.getTime() - incident.createdAt.getTime();
            return sum + duration;
          }, 0) /
          resolvedIncidentsWithDuration.length /
          (1000 * 60 * 60) // в часах
        : 0;

    return {
      totalIncidents: this.incidents.length,
      openIncidents: openIncidents.length,
      resolvedIncidents: resolvedIncidents.length,
      incidentsBySeverity,
      incidentsByType,
      incidentsByStatus,
      averageResolutionTime,
      mttr: averageResolutionTime, // Mean Time To Resolution
      mtta: 0, // TODO: Calculate Mean Time To Acknowledge
      topAffectedSystems,
      recentIncidents,
    };
  }

  async getIncidentMetrics(): Promise<IncidentMetrics> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const criticalIncidents = this.incidents.filter(
      i => i.severity === 'critical'
    ).length;
    const highIncidents = this.incidents.filter(
      i => i.severity === 'high'
    ).length;
    const mediumIncidents = this.incidents.filter(
      i => i.severity === 'medium'
    ).length;
    const lowIncidents = this.incidents.filter(
      i => i.severity === 'low'
    ).length;
    const openIncidents = this.incidents.filter(
      i => i.status !== 'closed'
    ).length;
    const resolvedIncidents = this.incidents.filter(
      i => i.status === 'resolved' || i.status === 'closed'
    ).length;

    const incidentsToday = this.incidents.filter(
      i => i.createdAt >= oneDayAgo
    ).length;
    const incidentsThisWeek = this.incidents.filter(
      i => i.createdAt >= oneWeekAgo
    ).length;
    const incidentsThisMonth = this.incidents.filter(
      i => i.createdAt >= oneMonthAgo
    ).length;

    // Среднее время разрешения
    const resolvedIncidentsWithDuration = this.incidents.filter(
      i => i.status === 'resolved' || i.status === 'closed'
    );
    const averageResolutionTime =
      resolvedIncidentsWithDuration.length > 0
        ? resolvedIncidentsWithDuration.reduce((sum, incident) => {
            const duration =
              incident.updatedAt.getTime() - incident.createdAt.getTime();
            return sum + duration;
          }, 0) /
          resolvedIncidentsWithDuration.length /
          (1000 * 60 * 60) // в часах
        : 0;

    return {
      totalIncidents: this.incidents.length,
      criticalIncidents,
      highIncidents,
      mediumIncidents,
      lowIncidents,
      openIncidents,
      resolvedIncidents,
      averageResolutionTime,
      incidentsThisMonth,
      incidentsThisWeek,
      incidentsToday,
    };
  }

  // Уведомления и алерты
  async sendIncidentNotification(
    incident: SecurityIncident,
    channel: string
  ): Promise<void> {
    // Симуляция отправки уведомлений
    this.logger.warn(
      `Incident notification sent via ${channel}: ${incident.title} - ${incident.severity}`
    );
  }

  // Health check
  async healthCheck(): Promise<{
    status: string;
    incidents: number;
    responses: number;
    policies: number;
  }> {
    return {
      status: 'healthy',
      incidents: this.incidents.length,
      responses: this.responses.length,
      policies: this.escalationPolicies.length,
    };
  }
}

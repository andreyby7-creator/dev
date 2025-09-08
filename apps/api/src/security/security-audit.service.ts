import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface ISecurityEvent {
  id: string;
  type:
    | 'authentication'
    | 'authorization'
    | 'data_access'
    | 'configuration'
    | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  result: 'success' | 'failure' | 'blocked';
  details: Record<string, unknown>;
  timestamp: Date;
  tags: string[];
}

export interface ISecurityViolation {
  id: string;
  eventId: string;
  type:
    | 'unauthorized_access'
    | 'privilege_escalation'
    | 'data_breach'
    | 'suspicious_activity';
  severity: 'medium' | 'high' | 'critical';
  description: string;
  userId?: string;
  ipAddress?: string;
  resource?: string;
  action?: string;
  evidence: Record<string, unknown>;
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface ISecurityReport {
  id: string;
  type: 'daily' | 'weekly' | 'monthly' | 'incident' | 'compliance';
  period: {
    from: Date;
    to: Date;
  };
  summary: {
    totalEvents: number;
    totalViolations: number;
    criticalViolations: number;
    resolvedViolations: number;
    openViolations: number;
  };
  events: ISecurityEvent[];
  violations: ISecurityViolation[];
  recommendations: string[];
  generatedAt: Date;
  generatedBy: string;
}

export interface ISecurityMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  eventsByResult: Record<string, number>;
  totalViolations: number;
  violationsByType: Record<string, number>;
  violationsByStatus: Record<string, number>;
  topUsers: Array<{
    userId: string;
    eventCount: number;
    violationCount: number;
  }>;
  topResources: Array<{
    _resource: string;
    accessCount: number;
    violationCount: number;
  }>;
  topIPs: Array<{
    ipAddress: string;
    eventCount: number;
    violationCount: number;
  }>;
  timeRange: {
    from: Date;
    to: Date;
  };
}

@Injectable()
export class SecurityAuditService {
  private readonly logger = new Logger(SecurityAuditService.name);
  private securityEvents = new Map<string, ISecurityEvent>();
  private securityViolations = new Map<string, ISecurityViolation>();
  private auditRules = new Map<
    string,
    { id: string; name: string; [key: string]: unknown }
  >();

  constructor(
    private readonly _configService: ConfigService,
    private eventEmitter: EventEmitter2
  ) {
    this.initializeAuditRules();
    this.startAuditMonitoring();
    // Используем _configService
    this._configService.get('AUDIT_ENABLED');
  }

  private initializeAuditRules(): void {
    const rules = [
      {
        id: 'failed_login_threshold',
        name: 'Failed Login Threshold',
        description: 'Alert on multiple failed login attempts',
        condition: {
          type: 'authentication',
          result: 'failure',
          count: 5,
          window: '15m',
        },
        action: 'create_violation',
        severity: 'high',
      },
      {
        id: 'unauthorized_access',
        name: 'Unauthorized Access',
        description: 'Alert on unauthorized access attempts',
        condition: { type: 'authorization', result: 'failure' },
        action: 'create_violation',
        severity: 'critical',
      },
      {
        id: 'privilege_escalation',
        name: 'Privilege Escalation',
        description: 'Alert on privilege escalation attempts',
        condition: { type: 'authorization', action: 'escalate' },
        action: 'create_violation',
        severity: 'critical',
      },
      {
        id: 'suspicious_ip',
        name: 'Suspicious IP',
        description: 'Alert on access from suspicious IP addresses',
        condition: { ipAddress: 'blacklist' },
        action: 'block_and_alert',
        severity: 'high',
      },
      {
        id: 'data_export_anomaly',
        name: 'Data Export Anomaly',
        description: 'Alert on unusual data export patterns',
        condition: { type: 'data_access', action: 'export', volume: 'high' },
        action: 'create_violation',
        severity: 'medium',
      },
    ];

    rules.forEach(rule => {
      this.auditRules.set(rule.id, rule);
    });

    this.logger.log(`Initialized ${rules.length} audit rules`);
  }

  private startAuditMonitoring(): void {
    // Обрабатываем события каждые 10 секунд
    setInterval(() => {
      void this.processAuditEvents();
    }, 10000);
  }

  async logSecurityEvent(
    event: Omit<ISecurityEvent, 'id' | 'timestamp'>
  ): Promise<ISecurityEvent> {
    const id = `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const securityEvent: ISecurityEvent = {
      ...event,
      id,
      timestamp: new Date(),
    };

    this.securityEvents.set(id, securityEvent);

    // Эмитим событие для обработки
    this.eventEmitter.emit('security.event', securityEvent);

    this.logger.log(
      `Security event logged: ${event.type} - ${event.description}`
    );

    return securityEvent;
  }

  async logAuthenticationEvent(
    userId: string,
    result: 'success' | 'failure',
    details: {
      email?: string;
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
      reason?: string;
    }
  ): Promise<ISecurityEvent> {
    return this.logSecurityEvent({
      type: 'authentication',
      severity: result === 'failure' ? 'medium' : 'low',
      category: 'login',
      description:
        result === 'success'
          ? `Successful login for user ${details.email ?? userId}`
          : `Failed login attempt for ${details.email ?? userId}: ${details.reason ?? 'Invalid credentials'}`,
      userId,
      sessionId: details.sessionId ?? '',
      ipAddress: details.ipAddress ?? '',
      userAgent: details.userAgent ?? '',
      result,
      details: {
        email: details.email,
        reason: details.reason,
      },
      tags: ['authentication', result],
    });
  }

  async logAuthorizationEvent(
    userId: string,
    resource: string,
    action: string,
    result: 'success' | 'failure',
    details: {
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
      reason?: string;
    }
  ): Promise<ISecurityEvent> {
    return this.logSecurityEvent({
      type: 'authorization',
      severity: result === 'failure' ? 'high' : 'low',
      category: 'access_control',
      description:
        result === 'success'
          ? `Authorized access to ${resource} for action ${action}`
          : `Unauthorized access attempt to ${resource} for action ${action}: ${details.reason ?? 'Insufficient permissions'}`,
      userId,
      sessionId: details.sessionId ?? '',
      ipAddress: details.ipAddress ?? '',
      userAgent: details.userAgent ?? '',
      resource,
      action,
      result,
      details: {
        reason: details.reason,
      },
      tags: ['authorization', result, resource, action],
    });
  }

  async logDataAccessEvent(
    userId: string,
    resource: string,
    action: string,
    details: {
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
      dataType?: string;
      recordCount?: number;
    }
  ): Promise<ISecurityEvent> {
    return this.logSecurityEvent({
      type: 'data_access',
      severity: 'low',
      category: 'data_operation',
      description: `Data access: ${action} on ${resource}`,
      userId,
      sessionId: details.sessionId ?? '',
      ipAddress: details.ipAddress ?? '',
      userAgent: details.userAgent ?? '',
      resource,
      action,
      result: 'success',
      details: {
        dataType: details.dataType,
        recordCount: details.recordCount,
      },
      tags: ['data_access', resource, action],
    });
  }

  async logConfigurationEvent(
    userId: string,
    configKey: string,
    action: string,
    details: {
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
      oldValue?: unknown;
      newValue?: unknown;
    }
  ): Promise<ISecurityEvent> {
    return this.logSecurityEvent({
      type: 'configuration',
      severity: 'medium',
      category: 'config_change',
      description: `Configuration change: ${action} on ${configKey}`,
      userId,
      sessionId: details.sessionId ?? '',
      ipAddress: details.ipAddress ?? '',
      userAgent: details.userAgent ?? '',
      resource: configKey,
      action,
      result: 'success',
      details: {
        oldValue: details.oldValue,
        newValue: details.newValue,
      },
      tags: ['configuration', configKey, action],
    });
  }

  async createSecurityViolation(
    eventId: string,
    type: ISecurityViolation['type'],
    severity: ISecurityViolation['severity'],
    description: string,
    evidence: Record<string, unknown>,
    userId?: string,
    ipAddress?: string,
    resource?: string,
    action?: string
  ): Promise<ISecurityViolation> {
    const id = `violation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const violation: ISecurityViolation = {
      id,
      eventId,
      type,
      severity,
      description,
      userId: userId ?? '',
      ipAddress: ipAddress ?? '',
      resource: resource ?? '',
      action: action ?? '',
      evidence,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.securityViolations.set(id, violation);

    // Эмитим событие
    this.eventEmitter.emit('security.violation', violation);

    this.logger.warn(`Security violation created: ${type} - ${description}`);

    return violation;
  }

  async getSecurityEvents(filters?: {
    type?: string;
    severity?: string;
    userId?: string;
    from?: Date;
    to?: Date;
    limit?: number;
  }): Promise<ISecurityEvent[]> {
    let events = Array.from(this.securityEvents.values());

    if (filters) {
      if (filters.type != null) {
        events = events.filter(e => e.type === filters.type);
      }
      if (filters.severity != null) {
        events = events.filter(e => e.severity === filters.severity);
      }
      if (filters.userId != null) {
        events = events.filter(e => e.userId === filters.userId);
      }
      if (filters.from != null) {
        events = events.filter(e => e.timestamp >= (filters.from ?? 0));
      }
      if (filters.to != null) {
        events = events.filter(e => e.timestamp <= (filters.to ?? Date.now()));
      }
    }

    events = events.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );

    if (filters?.limit != null && filters.limit > 0) {
      events = events.slice(0, filters.limit);
    }

    return events;
  }

  async getSecurityViolations(filters?: {
    type?: string;
    severity?: string;
    status?: string;
    userId?: string;
    from?: Date;
    to?: Date;
    limit?: number;
  }): Promise<ISecurityViolation[]> {
    let violations = Array.from(this.securityViolations.values());

    if (filters) {
      if (filters.type != null) {
        violations = violations.filter(v => v.type === filters.type);
      }
      if (filters.severity != null) {
        violations = violations.filter(v => v.severity === filters.severity);
      }
      if (filters.status != null) {
        violations = violations.filter(v => v.status === filters.status);
      }
      if (filters.userId != null) {
        violations = violations.filter(v => v.userId === filters.userId);
      }
      if (filters.from != null) {
        violations = violations.filter(
          v => v.createdAt >= (filters.from ?? new Date(0))
        );
      }
      if (filters.to != null) {
        violations = violations.filter(
          v => v.createdAt <= (filters.to ?? new Date())
        );
      }
    }

    violations = violations.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );

    if (filters?.limit != null && filters.limit > 0) {
      violations = violations.slice(0, filters.limit);
    }

    return violations;
  }

  async updateViolationStatus(
    violationId: string,
    status: ISecurityViolation['status'],
    updatedBy: string,
    notes?: string
  ): Promise<ISecurityViolation | null> {
    const violation = this.securityViolations.get(violationId);
    if (!violation) {
      return null;
    }

    violation.status = status;
    violation.updatedAt = new Date();

    if (status === 'resolved') {
      violation.resolvedAt = new Date();
      violation.resolvedBy = updatedBy;
    }

    if (notes != null && notes !== '') {
      violation.evidence.notes = notes;
    }

    this.logger.log(
      `Violation ${violationId} status updated to ${status} by ${updatedBy}`
    );

    return violation;
  }

  async generateSecurityReport(
    type: ISecurityReport['type'],
    period: { from: Date; to: Date },
    generatedBy: string
  ): Promise<ISecurityReport> {
    const events = await this.getSecurityEvents({
      from: period.from,
      to: period.to,
    });
    const violations = await this.getSecurityViolations({
      from: period.from,
      to: period.to,
    });

    const summary = {
      totalEvents: events.length,
      totalViolations: violations.length,
      criticalViolations: violations.filter(v => v.severity === 'critical')
        .length,
      resolvedViolations: violations.filter(v => v.status === 'resolved')
        .length,
      openViolations: violations.filter(v => v.status === 'open').length,
    };

    const recommendations = this.generateRecommendations(events, violations);

    const report: ISecurityReport = {
      id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      period,
      summary,
      events,
      violations,
      recommendations,
      generatedAt: new Date(),
      generatedBy,
    };

    this.logger.log(
      `Security report generated: ${type} for period ${period.from.toISOString()} - ${period.to.toISOString()}`
    );

    return report;
  }

  async getSecurityMetrics(timeRange: {
    from: Date;
    to: Date;
  }): Promise<ISecurityMetrics> {
    const events = await this.getSecurityEvents({
      from: timeRange.from,
      to: timeRange.to,
    });
    const violations = await this.getSecurityViolations({
      from: timeRange.from,
      to: timeRange.to,
    });

    // Агрегируем метрики
    const eventsByType = events.reduce(
      (acc, event) => {
        acc[event.type] = (acc[event.type] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const eventsBySeverity = events.reduce(
      (acc, event) => {
        acc[event.severity] = (acc[event.severity] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const eventsByResult = events.reduce(
      (acc, event) => {
        acc[event.result] = (acc[event.result] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const violationsByType = violations.reduce(
      (acc, violation) => {
        acc[violation.type] = (acc[violation.type] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const violationsByStatus = violations.reduce(
      (acc, violation) => {
        acc[violation.status] = (acc[violation.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Топ пользователи
    const userStats = events.reduce(
      (acc, event) => {
        if (event.userId != null) {
          acc[event.userId] ??= { eventCount: 0, violationCount: 0 };
          const userStat = acc[event.userId];
          if (userStat) userStat.eventCount++;
        }
        return acc;
      },
      {} as Record<string, { eventCount: number; violationCount: number }>
    );

    violations.forEach(violation => {
      if (violation.userId != null) {
        userStats[violation.userId] ??= { eventCount: 0, violationCount: 0 };
        const userStat = userStats[violation.userId];
        if (userStat) userStat.violationCount++;
      }
    });

    const topUsers = Object.entries(userStats)
      .map(([userId, stats]) => ({ userId, ...stats }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 10);

    // Топ ресурсы
    const resourceStats = events.reduce(
      (acc, event) => {
        if (event.resource != null && event.resource !== '') {
          acc[event.resource] ??= { accessCount: 0, violationCount: 0 };
          const resourceStat = acc[event.resource];
          if (resourceStat) resourceStat.accessCount++;
        }
        return acc;
      },
      {} as Record<string, { accessCount: number; violationCount: number }>
    );

    violations.forEach(violation => {
      if (violation.resource != null && violation.resource !== '') {
        resourceStats[violation.resource] ??= {
          accessCount: 0,
          violationCount: 0,
        };
        const resourceStat = resourceStats[violation.resource];
        if (resourceStat) resourceStat.violationCount++;
      }
    });

    const topResources = Object.entries(resourceStats)
      .map(([resource, stats]) => ({ _resource: resource, ...stats }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10);

    // Топ IP адреса
    const ipStats = events.reduce(
      (acc, event) => {
        if (event.ipAddress != null && event.ipAddress !== '') {
          acc[event.ipAddress] ??= { eventCount: 0, violationCount: 0 };
          const ipStat = acc[event.ipAddress];
          if (ipStat) ipStat.eventCount++;
        }
        return acc;
      },
      {} as Record<string, { eventCount: number; violationCount: number }>
    );

    violations.forEach(violation => {
      if (violation.ipAddress != null && violation.ipAddress !== '') {
        ipStats[violation.ipAddress] ??= { eventCount: 0, violationCount: 0 };
        const ipStat = ipStats[violation.ipAddress];
        if (ipStat) ipStat.violationCount++;
      }
    });

    const topIPs = Object.entries(ipStats)
      .map(([ipAddress, stats]) => ({ ipAddress, ...stats }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 10);

    return {
      totalEvents: events.length,
      eventsByType,
      eventsBySeverity,
      eventsByResult,
      totalViolations: violations.length,
      violationsByType,
      violationsByStatus,
      topUsers,
      topResources,
      topIPs,
      timeRange,
    };
  }

  private async processAuditEvents(): Promise<void> {
    // Обрабатываем события для создания нарушений
    const recentEvents = Array.from(this.securityEvents.values())
      .filter(event => event.timestamp > new Date(Date.now() - 300000)) // Последние 5 минут
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    for (const rule of this.auditRules.values()) {
      await this.evaluateRule(rule, recentEvents);
    }
  }

  private async evaluateRule(
    rule: { id: string; name: string; [key: string]: unknown },
    events: ISecurityEvent[]
  ): Promise<void> {
    // Простая реализация оценки правил
    // В реальном приложении здесь была бы более сложная логика

    if (rule.id === 'failed_login_threshold') {
      const failedLogins = events.filter(
        e =>
          e.type === 'authentication' &&
          e.result === 'failure' &&
          e.timestamp > new Date(Date.now() - 15 * 60 * 1000) // Последние 15 минут
      );

      if (failedLogins.length >= 5) {
        const userId = failedLogins[0]?.userId;
        if (
          userId != null &&
          userId !== '' &&
          !this.hasRecentViolation(userId, 'failed_login_threshold')
        ) {
          await this.createSecurityViolation(
            failedLogins[0]?.id ?? '',
            'suspicious_activity',
            'high',
            `Multiple failed login attempts detected for user ${userId}`,
            { failedAttempts: failedLogins.length, timeWindow: '15m' },
            userId,
            failedLogins[0]?.ipAddress ?? ''
          );
        }
      }
    }

    if (rule.id === 'unauthorized_access') {
      const unauthorizedAccess = events.filter(
        e => e.type === 'authorization' && e.result === 'failure'
      );

      for (const event of unauthorizedAccess) {
        if (
          !this.hasRecentViolation(
            event.userId ?? 'unknown',
            'unauthorized_access'
          )
        ) {
          await this.createSecurityViolation(
            event.id,
            'unauthorized_access',
            'critical',
            `Unauthorized access attempt detected`,
            { resource: event.resource, action: event.action },
            event.userId,
            event.ipAddress,
            event.resource,
            event.action
          );
        }
      }
    }
  }

  private hasRecentViolation(userId: string, type: string): boolean {
    const recentViolations = Array.from(
      this.securityViolations.values()
    ).filter(
      v =>
        v.userId === userId &&
        v.type === type &&
        v.createdAt > new Date(Date.now() - 60 * 60 * 1000) // Последний час
    );

    return recentViolations.length > 0;
  }

  private generateRecommendations(
    events: ISecurityEvent[],
    violations: ISecurityViolation[]
  ): string[] {
    const recommendations: string[] = [];

    const failedLogins = events.filter(
      e => e.type === 'authentication' && e.result === 'failure'
    );
    if (failedLogins.length > 10) {
      recommendations.push(
        'Consider implementing account lockout after multiple failed login attempts'
      );
    }

    const unauthorizedAccess = violations.filter(
      v => v.type === 'unauthorized_access'
    );
    if (unauthorizedAccess.length > 5) {
      recommendations.push('Review and strengthen access control policies');
    }

    const criticalViolations = violations.filter(
      v => v.severity === 'critical'
    );
    if (criticalViolations.length > 0) {
      recommendations.push(
        'Immediate attention required for critical security violations'
      );
    }

    const openViolations = violations.filter(v => v.status === 'open');
    if (openViolations.length > 10) {
      recommendations.push(
        'Address open security violations to reduce risk exposure'
      );
    }

    return recommendations;
  }
}

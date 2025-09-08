import { Injectable } from '@nestjs/common';
import { redactedLogger } from '../utils/redacted-logger';

export interface ZtnaPolicy {
  id: string;
  name: string;
  description: string;
  type: 'user' | 'device' | 'application' | 'network';
  conditions: ZtnaCondition[];
  actions: ZtnaAction[];
  priority: number;
  enabled: boolean;
  tags: Record<string, string>;
}

export interface ZtnaCondition {
  field: string;
  operator:
    | 'equals'
    | 'contains'
    | 'starts_with'
    | 'ends_with'
    | 'in'
    | 'not_in'
    | 'greater_than'
    | 'less_than';
  value: string | number | string[];
}

export interface ZtnaAction {
  type:
    | 'allow'
    | 'deny'
    | 'require_mfa'
    | 'limit_bandwidth'
    | 'log'
    | 'redirect';
  parameters: Record<string, unknown>;
}

export interface ZtnaSession {
  id: string;
  userId: string;
  deviceId: string;
  applicationId: string;
  ipAddress: string;
  userAgent: string;
  location: string;
  riskScore: number;
  trustLevel: 'high' | 'medium' | 'low';
  startedAt: Date;
  lastActivity: Date;
  policies: string[];
  mfaVerified: boolean;
  active: boolean;
}

export interface ZtnaEvent {
  id: string;
  timestamp: Date;
  sessionId: string;
  userId: string;
  eventType:
    | 'session_start'
    | 'session_end'
    | 'policy_evaluation'
    | 'access_granted'
    | 'access_denied'
    | 'mfa_required'
    | 'risk_assessment';
  details: Record<string, unknown>;
  riskScore: number;
}

@Injectable()
export class ZtnaService {
  private readonly policies: Map<string, ZtnaPolicy> = new Map();
  private readonly sessions: Map<string, ZtnaSession> = new Map();
  private readonly events: ZtnaEvent[] = [];
  private readonly maxEventsHistory = 10000;

  constructor() {
    this.initializeDefaultPolicies();
    redactedLogger.log('ZTNA Service initialized', 'ZtnaService');
  }

  /**
   * Инициализация стандартных политик ZTNA
   */
  private initializeDefaultPolicies(): void {
    const defaultPolicies: ZtnaPolicy[] = [
      {
        id: 'policy-admin-access',
        name: 'Admin Access Policy',
        description: 'Restrict admin access to trusted devices and locations',
        type: 'user',
        conditions: [
          { field: 'user_role', operator: 'equals', value: 'admin' },
          { field: 'device_trust_level', operator: 'equals', value: 'high' },
          { field: 'location', operator: 'in', value: ['office', 'home'] },
        ],
        actions: [
          { type: 'require_mfa', parameters: { method: 'totp' } },
          { type: 'log', parameters: { level: 'info' } },
        ],
        priority: 1,
        enabled: true,
        tags: { Environment: 'production', Purpose: 'admin' },
      },
      {
        id: 'policy-device-compliance',
        name: 'Device Compliance Policy',
        description: 'Ensure devices meet security requirements',
        type: 'device',
        conditions: [
          { field: 'os_version', operator: 'greater_than', value: '10.0' },
          { field: 'antivirus_status', operator: 'equals', value: 'updated' },
          { field: 'encryption_enabled', operator: 'equals', value: 'true' },
        ],
        actions: [
          { type: 'allow', parameters: {} },
          { type: 'log', parameters: { level: 'info' } },
        ],
        priority: 2,
        enabled: true,
        tags: { Environment: 'production', Purpose: 'compliance' },
      },
      {
        id: 'policy-high-risk-locations',
        name: 'High Risk Location Policy',
        description: 'Additional security for high-risk locations',
        type: 'network',
        conditions: [
          { field: 'location_risk', operator: 'equals', value: 'high' },
          { field: 'connection_type', operator: 'equals', value: 'public' },
        ],
        actions: [
          { type: 'require_mfa', parameters: { method: 'sms' } },
          { type: 'limit_bandwidth', parameters: { limit: '10mbps' } },
          { type: 'log', parameters: { level: 'warning' } },
        ],
        priority: 3,
        enabled: true,
        tags: { Environment: 'production', Purpose: 'security' },
      },
      {
        id: 'policy-application-access',
        name: 'Application Access Policy',
        description: 'Control access to sensitive applications',
        type: 'application',
        conditions: [
          {
            field: 'application_sensitivity',
            operator: 'equals',
            value: 'high',
          },
          { field: 'user_clearance', operator: 'greater_than', value: 3 },
        ],
        actions: [
          { type: 'require_mfa', parameters: { method: 'hardware_token' } },
          { type: 'log', parameters: { level: 'info' } },
        ],
        priority: 4,
        enabled: true,
        tags: { Environment: 'production', Purpose: 'application' },
      },
    ];

    defaultPolicies.forEach(policy => {
      this.policies.set(policy.id, policy);
    });
  }

  /**
   * Создание новой ZTNA сессии
   */
  async createSession(sessionData: {
    userId: string;
    deviceId: string;
    applicationId: string;
    ipAddress: string;
    userAgent: string;
    location: string;
    deviceInfo: Record<string, unknown>;
    userInfo: Record<string, unknown>;
  }): Promise<{
    sessionId: string;
    accessGranted: boolean;
    reason: string;
    mfaRequired: boolean;
  }> {
    const {
      userId,
      deviceId,
      applicationId,
      ipAddress,
      userAgent,
      location,
      deviceInfo,
      userInfo,
    } = sessionData;

    // Оценка риска
    const riskScore = this.calculateRiskScore(deviceInfo, userInfo, location);
    const trustLevel = this.determineTrustLevel(riskScore);

    // Проверка политик
    const policyResult = this.evaluatePolicies({
      userId,
      deviceId,
      applicationId,
      ipAddress,
      userAgent,
      location,
      deviceInfo,
      userInfo,
      riskScore,
      trustLevel,
    });

    const sessionId = `ztna_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const mfaRequired = policyResult.actions.some(
      action => action.type === 'require_mfa'
    );

    if (policyResult.accessGranted) {
      const session: ZtnaSession = {
        id: sessionId,
        userId,
        deviceId,
        applicationId,
        ipAddress,
        userAgent,
        location,
        riskScore,
        trustLevel,
        startedAt: new Date(),
        lastActivity: new Date(),
        policies: policyResult.appliedPolicies,
        mfaVerified: !mfaRequired,
        active: true,
      };

      this.sessions.set(sessionId, session);
      this.logEvent(
        sessionId,
        userId,
        'session_start',
        {
          deviceId,
          applicationId,
          ipAddress,
          location,
          riskScore,
          trustLevel,
          policies: policyResult.appliedPolicies,
        },
        riskScore
      );

      redactedLogger.log(`ZTNA session created: ${sessionId}`, 'ZtnaService', {
        userId,
        riskScore,
        trustLevel,
        mfaRequired,
      });
    }

    return {
      sessionId,
      accessGranted: policyResult.accessGranted,
      reason: policyResult.reason,
      mfaRequired,
    };
  }

  /**
   * Расчет оценки риска
   */
  private calculateRiskScore(
    deviceInfo: Record<string, unknown>,
    userInfo: Record<string, unknown>,
    location: string
  ): number {
    let riskScore = 0;

    // Факторы устройства
    if (
      deviceInfo.os_version != null &&
      typeof deviceInfo.os_version === 'string'
    ) {
      const osVersion = parseFloat(deviceInfo.os_version);
      if (osVersion < 10.0) riskScore += 20;
      if (osVersion < 12.0) riskScore += 10;
    }

    if (deviceInfo.antivirus_status !== 'updated') riskScore += 15;
    if (deviceInfo.encryption_enabled !== true) riskScore += 25;

    // Факторы пользователя
    if (
      userInfo.last_login_days != null &&
      typeof userInfo.last_login_days === 'number'
    ) {
      if (userInfo.last_login_days > 30) riskScore += 10;
    }

    if (
      userInfo.failed_attempts != null &&
      typeof userInfo.failed_attempts === 'number'
    ) {
      if (userInfo.failed_attempts > 3) riskScore += 20;
    }

    // Факторы местоположения
    if (location === 'public') riskScore += 30;
    if (location === 'unknown') riskScore += 40;

    return Math.min(100, riskScore);
  }

  /**
   * Определение уровня доверия
   */
  private determineTrustLevel(riskScore: number): 'high' | 'medium' | 'low' {
    if (riskScore <= 20) return 'high';
    if (riskScore <= 50) return 'medium';
    return 'low';
  }

  /**
   * Оценка политик
   */
  private evaluatePolicies(context: {
    userId: string;
    deviceId: string;
    applicationId: string;
    ipAddress: string;
    userAgent: string;
    location: string;
    deviceInfo: Record<string, unknown>;
    userInfo: Record<string, unknown>;
    riskScore: number;
    trustLevel: 'high' | 'medium' | 'low';
  }): {
    accessGranted: boolean;
    reason: string;
    actions: ZtnaAction[];
    appliedPolicies: string[];
  } {
    const sortedPolicies = Array.from(this.policies.values())
      .filter(policy => policy.enabled)
      .sort((a, b) => a.priority - b.priority);

    const appliedPolicies: string[] = [];
    const actions: ZtnaAction[] = [];

    for (const policy of sortedPolicies) {
      if (this.matchesPolicy(context, policy)) {
        appliedPolicies.push(policy.id);
        actions.push(...policy.actions);

        // Проверка на запрет доступа
        const denyAction = policy.actions.find(
          action => action.type === 'deny'
        );
        if (denyAction) {
          return {
            accessGranted: false,
            reason: `Policy ${policy.name} denied access`,
            actions,
            appliedPolicies,
          };
        }
      }
    }

    // Если нет политик, разрешаем доступ с базовыми ограничениями
    if (appliedPolicies.length === 0) {
      actions.push({ type: 'log', parameters: { level: 'info' } });
    }

    return {
      accessGranted: true,
      reason: 'Access granted based on policies',
      actions,
      appliedPolicies,
    };
  }

  /**
   * Проверка соответствия контекста политике
   */
  private matchesPolicy(
    context: Record<string, unknown>,
    policy: ZtnaPolicy
  ): boolean {
    for (const condition of policy.conditions) {
      if (!this.evaluateCondition(context, condition)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Оценка условия
   */
  private evaluateCondition(
    context: Record<string, unknown>,
    condition: ZtnaCondition
  ): boolean {
    const fieldValue = this.getFieldValue(context, condition.field);

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'contains':
        return (
          typeof fieldValue === 'string' &&
          fieldValue.includes(condition.value as string)
        );
      case 'starts_with':
        return (
          typeof fieldValue === 'string' &&
          fieldValue.startsWith(condition.value as string)
        );
      case 'ends_with':
        return (
          typeof fieldValue === 'string' &&
          fieldValue.endsWith(condition.value as string)
        );
      case 'in':
        return (
          Array.isArray(condition.value) &&
          condition.value.includes(fieldValue as string)
        );
      case 'not_in':
        return (
          Array.isArray(condition.value) &&
          !condition.value.includes(fieldValue as string)
        );
      case 'greater_than':
        return (
          typeof fieldValue === 'number' &&
          fieldValue > (condition.value as number)
        );
      case 'less_than':
        return (
          typeof fieldValue === 'number' &&
          fieldValue < (condition.value as number)
        );
      default:
        return false;
    }
  }

  /**
   * Получение значения поля из контекста
   */
  private getFieldValue(
    context: Record<string, unknown>,
    field: string
  ): unknown {
    const fieldMap: Record<string, string> = {
      user_role: 'userInfo.role',
      device_trust_level: 'trustLevel',
      location: 'location',
      os_version: 'deviceInfo.os_version',
      antivirus_status: 'deviceInfo.antivirus_status',
      encryption_enabled: 'deviceInfo.encryption_enabled',
      location_risk: 'location',
      connection_type: 'location',
      application_sensitivity: 'applicationId',
      user_clearance: 'userInfo.clearance_level',
    };

    const path = fieldMap[field] ?? field;
    return this.getNestedValue(context, path);
  }

  /**
   * Получение вложенного значения
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      if (
        current != null &&
        typeof current === 'object' &&
        !Array.isArray(current)
      ) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj as unknown);
  }

  /**
   * Логирование события
   */
  private logEvent(
    sessionId: string,
    userId: string,
    eventType: ZtnaEvent['eventType'],
    details: Record<string, unknown>,
    riskScore: number
  ): void {
    const event: ZtnaEvent = {
      id: `ztna_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      sessionId,
      userId,
      eventType,
      details,
      riskScore,
    };

    this.events.push(event);
    this.cleanupOldEvents();
  }

  /**
   * Очистка старых событий
   */
  private cleanupOldEvents(): void {
    if (this.events.length > this.maxEventsHistory) {
      this.events.splice(0, this.events.length - this.maxEventsHistory);
    }
  }

  /**
   * Обновление активности сессии
   */
  updateSessionActivity(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session != null && session.active === true) {
      session.lastActivity = new Date();
      return true;
    }
    return false;
  }

  /**
   * Завершение сессии
   */
  endSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session != null && session.active === true) {
      session.active = false;
      this.logEvent(
        sessionId,
        session.userId,
        'session_end',
        {
          duration: Date.now() - session.startedAt.getTime(),
        },
        session.riskScore
      );

      redactedLogger.log(`ZTNA session ended: ${sessionId}`, 'ZtnaService');
      return true;
    }
    return false;
  }

  /**
   * Проверка MFA
   */

  verifyMfa(sessionId: string, _mfaToken: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session != null && session.active === true) {
      // В реальной реализации здесь будет проверка MFA токена
      session.mfaVerified = true;
      this.logEvent(
        sessionId,
        session.userId,
        'mfa_required',
        {
          verified: true,
          method: 'totp',
        },
        session.riskScore
      );

      redactedLogger.log(
        `MFA verified for session: ${sessionId}`,
        'ZtnaService'
      );
      return true;
    }
    return false;
  }

  /**
   * Получение статистики ZTNA
   */
  getZtnaStats() {
    const now = new Date();
    const lastHour = new Date(now.getTime() - 3600000);
    const lastDay = new Date(now.getTime() - 86400000);

    const activeSessions = Array.from(this.sessions.values()).filter(
      s => s.active
    );
    const eventsLastHour = this.events.filter(e => e.timestamp > lastHour);
    const eventsLastDay = this.events.filter(e => e.timestamp > lastDay);

    const sessionsByTrustLevel = {
      high: activeSessions.filter(s => s.trustLevel === 'high').length,
      medium: activeSessions.filter(s => s.trustLevel === 'medium').length,
      low: activeSessions.filter(s => s.trustLevel === 'low').length,
    };

    return {
      totalPolicies: this.policies.size,
      activeSessions: activeSessions.length,
      totalSessions: this.sessions.size,
      sessionsByTrustLevel,
      totalEvents: this.events.length,
      eventsLastHour: eventsLastHour.length,
      eventsLastDay: eventsLastDay.length,
      policies: Array.from(this.policies.values()).map(policy => ({
        id: policy.id,
        name: policy.name,
        description: policy.description,
        type: policy.type,
        priority: policy.priority,
        enabled: policy.enabled,
      })),
      recentSessions: activeSessions.slice(-10).map(session => ({
        id: session.id,
        userId: session.userId,
        applicationId: session.applicationId,
        location: session.location,
        trustLevel: session.trustLevel,
        riskScore: session.riskScore,
        startedAt: session.startedAt,
        mfaVerified: session.mfaVerified,
      })),
      recentEvents: this.events.slice(-10).map(event => ({
        id: event.id,
        timestamp: event.timestamp,
        eventType: event.eventType,
        userId: event.userId,
        riskScore: event.riskScore,
      })),
    };
  }

  /**
   * Добавление новой политики
   */
  addPolicy(policy: Omit<ZtnaPolicy, 'id'>): string {
    const policyId = `policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newPolicy: ZtnaPolicy = {
      ...policy,
      id: policyId,
    };

    this.policies.set(policyId, newPolicy);
    redactedLogger.log(`ZTNA policy added: ${policyId}`, 'ZtnaService');
    return policyId;
  }

  /**
   * Обновление политики
   */
  updatePolicy(policyId: string, updates: Partial<ZtnaPolicy>): boolean {
    const policy = this.policies.get(policyId);
    if (!policy) {
      return false;
    }

    Object.assign(policy, updates);
    redactedLogger.log(`ZTNA policy updated: ${policyId}`, 'ZtnaService');
    return true;
  }

  /**
   * Удаление политики
   */
  removePolicy(policyId: string): boolean {
    const deleted = this.policies.delete(policyId);
    if (deleted) {
      redactedLogger.log(`ZTNA policy removed: ${policyId}`, 'ZtnaService');
    }
    return deleted;
  }

  /**
   * Получение событий за период
   */
  getEventsForPeriod(startTime: Date, endTime: Date): ZtnaEvent[] {
    return this.events.filter(
      e => e.timestamp >= startTime && e.timestamp <= endTime
    );
  }

  /**
   * Получение событий по типу
   */
  getEventsByType(eventType: ZtnaEvent['eventType']): ZtnaEvent[] {
    return this.events.filter(e => e.eventType === eventType);
  }

  /**
   * Получение сессий по пользователю
   */
  getSessionsByUser(userId: string): ZtnaSession[] {
    return Array.from(this.sessions.values()).filter(s => s.userId === userId);
  }

  /**
   * Получение активных сессий
   */
  getActiveSessions(): ZtnaSession[] {
    return Array.from(this.sessions.values()).filter(s => s.active);
  }
}

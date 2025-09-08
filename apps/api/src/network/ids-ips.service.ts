import { Injectable } from '@nestjs/common';
import { redactedLogger } from '../utils/redacted-logger';

export interface IdsRule {
  id: string;
  name: string;
  description: string;
  type: 'signature' | 'anomaly' | 'behavior' | 'heuristic';
  pattern: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'alert' | 'block' | 'log' | 'drop';
  enabled: boolean;
  priority: number;
  threshold: number;
  tags: Record<string, string>;
}

export interface IdsAlert {
  id: string;
  timestamp: Date;
  ruleId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  sourceIp: string;
  destinationIp: string;
  protocol: string;
  port: number;
  payload: string;
  signature: string;
  action: 'alert' | 'block' | 'log' | 'drop';
  blocked: boolean;
  falsePositive: boolean;
  details: Record<string, unknown>;
}

export interface IdsPacket {
  sourceIp: string;
  destinationIp: string;
  protocol: string;
  port: number;
  payload: string;
  headers: Record<string, string>;
  timestamp: Date;
}

export interface IdsStats {
  totalAlerts: number;
  alertsBySeverity: Record<string, number>;
  alertsByAction: Record<string, number>;
  blockedAttacks: number;
  falsePositives: number;
  rulesEnabled: number;
  rulesDisabled: number;
}

@Injectable()
export class IdsIpsService {
  private readonly rules: Map<string, IdsRule> = new Map();
  private readonly alerts: IdsAlert[] = [];
  private readonly blockedIps: Set<string> = new Set();
  private readonly maxAlertsHistory = 10000;
  private readonly maxBlockedIps = 1000;

  constructor() {
    this.initializeDefaultRules();
    redactedLogger.log('IDS/IPS Service initialized', 'IdsIpsService');
  }

  /**
   * Инициализация стандартных правил IDS/IPS
   */
  private initializeDefaultRules(): void {
    const defaultRules: IdsRule[] = [
      {
        id: 'rule-sql-injection',
        name: 'SQL Injection Detection',
        description: 'Detect SQL injection attempts',
        type: 'signature',
        pattern:
          '(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\\s+(ALL|DISTINCT|TOP|FROM|WHERE|INTO|VALUES|SET|TABLE|DATABASE)',
        severity: 'high',
        action: 'block',
        enabled: true,
        priority: 1,
        threshold: 1,
        tags: { Category: 'SQL Injection', CVE: 'N/A' },
      },
      {
        id: 'rule-xss-attack',
        name: 'XSS Attack Detection',
        description: 'Detect cross-site scripting attempts',
        type: 'signature',
        pattern:
          '<script[^>]*>.*?</script>|<javascript:|vbscript:|onload=|onerror=|onclick=',
        severity: 'high',
        action: 'block',
        enabled: true,
        priority: 2,
        threshold: 1,
        tags: { Category: 'XSS', CVE: 'N/A' },
      },
      {
        id: 'rule-brute-force',
        name: 'Brute Force Attack Detection',
        description: 'Detect brute force login attempts',
        type: 'behavior',
        pattern: 'failed_login_attempts',
        severity: 'medium',
        action: 'alert',
        enabled: true,
        priority: 3,
        threshold: 5,
        tags: { Category: 'Brute Force', CVE: 'N/A' },
      },
      {
        id: 'rule-dos-attack',
        name: 'DoS Attack Detection',
        description: 'Detect denial of service attacks',
        type: 'anomaly',
        pattern: 'request_rate',
        severity: 'critical',
        action: 'block',
        enabled: true,
        priority: 4,
        threshold: 100,
        tags: { Category: 'DoS', CVE: 'N/A' },
      },
      {
        id: 'rule-path-traversal',
        name: 'Path Traversal Detection',
        description: 'Detect path traversal attempts',
        type: 'signature',
        pattern: '\\.\\./|%2e%2e%2f|%2e%2e/|\\.\\.%2f',
        severity: 'medium',
        action: 'block',
        enabled: true,
        priority: 5,
        threshold: 1,
        tags: { Category: 'Path Traversal', CVE: 'N/A' },
      },
      {
        id: 'rule-command-injection',
        name: 'Command Injection Detection',
        description: 'Detect command injection attempts',
        type: 'signature',
        pattern:
          ';\\s*(ls|cat|rm|cp|mv|wget|curl|nc|telnet|ssh|ftp|ping|nslookup)',
        severity: 'high',
        action: 'block',
        enabled: true,
        priority: 6,
        threshold: 1,
        tags: { Category: 'Command Injection', CVE: 'N/A' },
      },
      {
        id: 'rule-ldap-injection',
        name: 'LDAP Injection Detection',
        description: 'Detect LDAP injection attempts',
        type: 'signature',
        pattern: '\\(|\\*|\\)|&|\\||!',
        severity: 'medium',
        action: 'alert',
        enabled: true,
        priority: 7,
        threshold: 1,
        tags: { Category: 'LDAP Injection', CVE: 'N/A' },
      },
      {
        id: 'rule-php-injection',
        name: 'PHP Code Injection Detection',
        description: 'Detect PHP code injection attempts',
        type: 'signature',
        pattern:
          '\\<\\?php|\\<\\?=|eval\\(|system\\(|shell_exec\\(|passthru\\(',
        severity: 'high',
        action: 'block',
        enabled: true,
        priority: 8,
        threshold: 1,
        tags: { Category: 'Code Injection', CVE: 'N/A' },
      },
    ];

    defaultRules.forEach(rule => {
      this.rules.set(rule.id, rule);
    });
  }

  /**
   * Анализ сетевого пакета
   */
  async analyzePacket(packet: {
    sourceIp: string;
    destinationIp: string;
    protocol: string;
    port: number;
    payload: string;
    headers: Record<string, string>;
    timestamp: Date;
  }): Promise<{
    threatDetected: boolean;
    blocked: boolean;
    alerts: IdsAlert[];
  }> {
    const { sourceIp, destinationIp, protocol, port, payload, timestamp } =
      packet;

    const alerts: IdsAlert[] = [];
    let blocked = false;

    // Проверка заблокированных IP
    if (this.blockedIps.has(sourceIp)) {
      const alert: IdsAlert = {
        id: `ids_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp,
        ruleId: 'blocked_ip',
        severity: 'medium',
        sourceIp,
        destinationIp,
        protocol,
        port,
        payload: payload.substring(0, 100), // Ограничиваем размер
        signature: 'Blocked IP',
        action: 'block',
        blocked: true,
        falsePositive: false,
        details: { reason: 'IP is in blocklist' },
      };

      alerts.push(alert);
      blocked = true;
    } else {
      // Проверка правил IDS/IPS
      const sortedRules = Array.from(this.rules.values())
        .filter(rule => rule.enabled)
        .sort((a, b) => a.priority - b.priority);

      for (const rule of sortedRules) {
        if (this.matchesRule(packet, rule)) {
          const alert = this.createAlert(packet, rule);
          alerts.push(alert);

          if (rule.action === 'block') {
            this.blockIp(sourceIp);
            blocked = true;
          }
        }
      }
    }

    // Логирование событий
    if (alerts.length > 0) {
      this.alerts.push(...alerts);
      this.cleanupOldAlerts();

      redactedLogger.warn(
        `IDS/IPS threat detected: ${alerts.length} alerts`,
        'IdsIpsService',
        {
          sourceIp,
          destinationIp,
          protocol,
          port,
          blocked,
          alerts: alerts.map(a => ({
            ruleId: a.ruleId,
            severity: a.severity,
            action: a.action,
          })),
        }
      );
    }

    return {
      threatDetected: alerts.length > 0,
      blocked,
      alerts,
    };
  }

  /**
   * Проверка соответствия пакета правилу
   */
  private matchesRule(packet: IdsPacket, rule: IdsRule): boolean {
    const { payload, headers } = packet;

    switch (rule.type) {
      case 'signature':
        return this.checkSignaturePattern(payload, headers, rule.pattern);
      case 'anomaly':
        return this.checkAnomalyPattern(packet, rule);
      case 'behavior':
        return this.checkBehaviorPattern(packet, rule);
      case 'heuristic':
        return this.checkHeuristicPattern(packet, rule);
      default:
        return false;
    }
  }

  /**
   * Проверка сигнатурного паттерна
   */
  private checkSignaturePattern(
    payload: string,
    headers: Record<string, string>,
    pattern: string
  ): boolean {
    const regex = new RegExp(pattern, 'i');

    // Проверка в payload
    if (regex.test(payload)) {
      return true;
    }

    // Проверка в заголовках
    for (const headerValue of Object.values(headers)) {
      if (regex.test(headerValue)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Проверка аномального паттерна
   */
  private checkAnomalyPattern(_packet: IdsPacket, rule: IdsRule): boolean {
    // Простая логика для демонстрации
    if (rule.pattern === 'request_rate') {
      // В реальной реализации здесь будет анализ скорости запросов
      const randomRate = Math.floor(Math.random() * 200);
      return randomRate > rule.threshold;
    }

    return false;
  }

  /**
   * Проверка поведенческого паттерна
   */
  private checkBehaviorPattern(_packet: IdsPacket, rule: IdsRule): boolean {
    // Простая логика для демонстрации
    if (rule.pattern === 'failed_login_attempts') {
      // В реальной реализации здесь будет анализ попыток входа
      const randomAttempts = Math.floor(Math.random() * 10);
      return randomAttempts > rule.threshold;
    }

    return false;
  }

  /**
   * Проверка эвристического паттерна
   */

  private checkHeuristicPattern(packet: IdsPacket, _rule: IdsRule): boolean {
    // Простая логика для демонстрации
    const payload = packet.payload.toLowerCase();

    // Проверка подозрительных паттернов
    const suspiciousPatterns = [
      'admin',
      'password',
      'login',
      'root',
      'shell',
      'exec',
      'system',
    ];

    const matchCount = suspiciousPatterns.filter(pattern =>
      Boolean(payload.includes(pattern))
    ).length;

    return matchCount >= 3; // Если найдено 3+ подозрительных паттерна
  }

  /**
   * Создание алерта
   */
  private createAlert(packet: IdsPacket, rule: IdsRule): IdsAlert {
    const alert: IdsAlert = {
      id: `ids_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: packet.timestamp,
      ruleId: rule.id,
      severity: rule.severity,
      sourceIp: packet.sourceIp,
      destinationIp: packet.destinationIp,
      protocol: packet.protocol,
      port: packet.port,
      payload: packet.payload.substring(0, 100), // Ограничиваем размер
      signature: rule.name,
      action: rule.action,
      blocked: rule.action === 'block',
      falsePositive: false,
      details: {
        ruleType: rule.type,
        pattern: rule.pattern,
        threshold: rule.threshold,
        tags: rule.tags,
      },
    };

    return alert;
  }

  /**
   * Блокировка IP адреса
   */
  private blockIp(ipAddress: string): void {
    this.blockedIps.add(ipAddress);

    // Ограничение размера списка заблокированных IP
    if (this.blockedIps.size > this.maxBlockedIps) {
      const firstIp = this.blockedIps.values().next().value;
      if (firstIp != null) {
        this.blockedIps.delete(firstIp);
      }
    }

    redactedLogger.warn(`IP blocked by IDS/IPS: ${ipAddress}`, 'IdsIpsService');
  }

  /**
   * Очистка старых алертов
   */
  private cleanupOldAlerts(): void {
    if (this.alerts.length > this.maxAlertsHistory) {
      this.alerts.splice(0, this.alerts.length - this.maxAlertsHistory);
    }
  }

  /**
   * Получение статистики IDS/IPS
   */
  getIdsStats(): IdsStats {
    const alertsBySeverity: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    const alertsByAction: Record<string, number> = {
      alert: 0,
      block: 0,
      log: 0,
      drop: 0,
    };

    let blockedAttacks = 0;
    let falsePositives = 0;

    for (const alert of this.alerts) {
      const severityCount = alertsBySeverity[alert.severity];
      if (severityCount != null) {
        alertsBySeverity[alert.severity] = severityCount + 1;
      }
      const actionCount = alertsByAction[alert.action];
      if (actionCount != null) {
        alertsByAction[alert.action] = actionCount + 1;
      }

      if (alert.blocked) {
        blockedAttacks++;
      }

      if (alert.falsePositive) {
        falsePositives++;
      }
    }

    const rulesEnabled = Array.from(this.rules.values()).filter(
      r => r.enabled
    ).length;
    const rulesDisabled = Array.from(this.rules.values()).filter(
      r => r.enabled !== true
    ).length;

    return {
      totalAlerts: this.alerts.length,
      alertsBySeverity,
      alertsByAction,
      blockedAttacks,
      falsePositives,
      rulesEnabled,
      rulesDisabled,
    };
  }

  /**
   * Добавление нового правила
   */
  addRule(rule: Omit<IdsRule, 'id'>): string {
    const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newRule: IdsRule = {
      ...rule,
      id: ruleId,
    };

    this.rules.set(ruleId, newRule);
    redactedLogger.log(`IDS/IPS rule added: ${ruleId}`, 'IdsIpsService');
    return ruleId;
  }

  /**
   * Обновление правила
   */
  updateRule(ruleId: string, updates: Partial<IdsRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      return false;
    }

    Object.assign(rule, updates);
    redactedLogger.log(`IDS/IPS rule updated: ${ruleId}`, 'IdsIpsService');
    return true;
  }

  /**
   * Удаление правила
   */
  removeRule(ruleId: string): boolean {
    const deleted = this.rules.delete(ruleId);
    if (deleted) {
      redactedLogger.log(`IDS/IPS rule removed: ${ruleId}`, 'IdsIpsService');
    }
    return deleted;
  }

  /**
   * Получение алертов за период
   */
  getAlertsForPeriod(startTime: Date, endTime: Date): IdsAlert[] {
    return this.alerts.filter(
      a => a.timestamp >= startTime && a.timestamp <= endTime
    );
  }

  /**
   * Получение алертов по серьезности
   */
  getAlertsBySeverity(
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): IdsAlert[] {
    return this.alerts.filter(a => a.severity === severity);
  }

  /**
   * Получение алертов по правилу
   */
  getAlertsByRule(ruleId: string): IdsAlert[] {
    return this.alerts.filter(a => a.ruleId === ruleId);
  }

  /**
   * Получение заблокированных IP
   */
  getBlockedIps(): string[] {
    return Array.from(this.blockedIps);
  }

  /**
   * Разблокировка IP
   */
  unblockIp(ipAddress: string): boolean {
    const deleted = this.blockedIps.delete(ipAddress);
    if (deleted) {
      redactedLogger.log(`IP unblocked: ${ipAddress}`, 'IdsIpsService');
    }
    return deleted;
  }

  /**
   * Помечение алерта как ложного срабатывания
   */
  markAsFalsePositive(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.falsePositive = true;
      redactedLogger.log(
        `Alert marked as false positive: ${alertId}`,
        'IdsIpsService'
      );
      return true;
    }
    return false;
  }

  /**
   * Получение последних алертов
   */
  getRecentAlerts(limit: number = 10): IdsAlert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Получение критических алертов
   */
  getCriticalAlerts(): IdsAlert[] {
    return this.alerts.filter(a => a.severity === 'critical');
  }

  /**
   * Получение заблокированных атак
   */
  getBlockedAttacks(): IdsAlert[] {
    return this.alerts.filter(a => a.blocked);
  }

  /**
   * Получение статистики по типам атак
   */
  getAttackTypeStats(): Record<string, number> {
    const stats: Record<string, number> = {};

    for (const alert of this.alerts) {
      const tags = alert.details.tags as Record<string, string>;
      const category = tags.Category ?? 'Unknown';
      stats[category] = (stats[category] ?? 0) + 1;
    }

    return stats;
  }

  /**
   * Получение топ IP адресов по количеству алертов
   */
  getTopSourceIps(limit: number = 10): Array<{ ip: string; count: number }> {
    const ipCounts: Record<string, number> = {};

    for (const alert of this.alerts) {
      ipCounts[alert.sourceIp] = (ipCounts[alert.sourceIp] ?? 0) + 1;
    }

    return Object.entries(ipCounts)
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Получение рекомендаций по настройке
   */
  getConfigurationRecommendations(): string[] {
    const recommendations: string[] = [];
    const stats = this.getIdsStats();

    if (stats.falsePositives > stats.totalAlerts * 0.1) {
      recommendations.push(
        'High false positive rate detected. Consider adjusting rule thresholds.'
      );
    }

    if (stats.blockedAttacks < stats.totalAlerts * 0.5) {
      recommendations.push(
        'Low blocking rate. Consider enabling more aggressive blocking rules.'
      );
    }

    if (stats.rulesDisabled > stats.rulesEnabled) {
      recommendations.push(
        'Many rules are disabled. Consider enabling critical security rules.'
      );
    }

    const criticalAlerts = this.getCriticalAlerts();
    if (criticalAlerts.length > 0) {
      recommendations.push(
        `${criticalAlerts.length} critical alerts detected. Immediate attention required.`
      );
    }

    return recommendations;
  }
}

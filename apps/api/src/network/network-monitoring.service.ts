import { Injectable } from '@nestjs/common';
import { redactedLogger } from '../utils/redacted-logger';

export interface NetworkMetrics {
  timestamp: Date;
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
  connections: number;
  latency: number;
  errorRate: number;
  bandwidth: number;
}

export interface TrafficPattern {
  id: string;
  pattern: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  threshold: number;
  currentValue: number;
  alert: boolean;
}

export interface NetworkAlert {
  id: string;
  timestamp: Date;
  type: 'bandwidth' | 'latency' | 'error_rate' | 'connection_limit' | 'anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  source: string;
  resolved: boolean;
  resolvedAt?: Date;
}

@Injectable()
export class NetworkMonitoringService {
  private readonly metrics: NetworkMetrics[] = [];
  private readonly patterns: Map<string, TrafficPattern> = new Map();
  private readonly alerts: NetworkAlert[] = [];
  private readonly maxMetricsHistory = 10000;
  private readonly maxAlertsHistory = 1000;

  constructor() {
    this.initializeTrafficPatterns();
    redactedLogger.log(
      'Network Monitoring Service initialized',
      'NetworkMonitoringService'
    );
  }

  /**
   * Инициализация паттернов трафика
   */
  private initializeTrafficPatterns(): void {
    const defaultPatterns: TrafficPattern[] = [
      {
        id: 'high-bandwidth',
        pattern: 'bandwidth_usage',
        description: 'High bandwidth usage',
        severity: 'high',
        threshold: 80, // 80% of available bandwidth
        currentValue: 0,
        alert: false,
      },
      {
        id: 'high-latency',
        pattern: 'response_time',
        description: 'High response time',
        severity: 'medium',
        threshold: 200, // 200ms
        currentValue: 0,
        alert: false,
      },
      {
        id: 'error-rate',
        pattern: 'error_percentage',
        description: 'High error rate',
        severity: 'critical',
        threshold: 5, // 5%
        currentValue: 0,
        alert: false,
      },
      {
        id: 'connection-spike',
        pattern: 'connection_count',
        description: 'Connection count spike',
        severity: 'high',
        threshold: 1000, // 1000 connections
        currentValue: 0,
        alert: false,
      },
    ];

    defaultPatterns.forEach(pattern => {
      this.patterns.set(pattern.id, pattern);
    });
  }

  /**
   * Сбор метрик сети
   */
  async collectMetrics(): Promise<NetworkMetrics> {
    const metrics: NetworkMetrics = {
      timestamp: new Date(),
      bytesIn: this.generateRandomMetric(1000000, 5000000),
      bytesOut: this.generateRandomMetric(500000, 2000000),
      packetsIn: this.generateRandomMetric(1000, 5000),
      packetsOut: this.generateRandomMetric(500, 2000),
      connections: this.generateRandomMetric(100, 500),
      latency: this.generateRandomMetric(10, 100),
      errorRate: this.generateRandomMetric(0, 2),
      bandwidth: this.generateRandomMetric(50, 90),
    };

    this.metrics.push(metrics);
    this.cleanupOldMetrics();
    this.analyzeTrafficPatterns(metrics);
    this.checkAlerts(metrics);

    redactedLogger.debug(
      'Network metrics collected',
      'NetworkMonitoringService',
      {
        timestamp: metrics.timestamp,
        bandwidth: metrics.bandwidth,
        latency: metrics.latency,
      }
    );

    return metrics;
  }

  /**
   * Генерация случайных метрик для демонстрации
   */
  private generateRandomMetric(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Очистка старых метрик
   */
  private cleanupOldMetrics(): void {
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.splice(0, this.metrics.length - this.maxMetricsHistory);
    }
  }

  /**
   * Анализ паттернов трафика
   */
  private analyzeTrafficPatterns(metrics: NetworkMetrics): void {
    // Анализ использования пропускной способности
    const bandwidthPattern = this.patterns.get('high-bandwidth');
    if (bandwidthPattern) {
      bandwidthPattern.currentValue = metrics.bandwidth;
      bandwidthPattern.alert = metrics.bandwidth > bandwidthPattern.threshold;
    }

    // Анализ задержки
    const latencyPattern = this.patterns.get('high-latency');
    if (latencyPattern) {
      latencyPattern.currentValue = metrics.latency;
      latencyPattern.alert = metrics.latency > latencyPattern.threshold;
    }

    // Анализ ошибок
    const errorPattern = this.patterns.get('error-rate');
    if (errorPattern) {
      errorPattern.currentValue = metrics.errorRate;
      errorPattern.alert = metrics.errorRate > errorPattern.threshold;
    }

    // Анализ соединений
    const connectionPattern = this.patterns.get('connection-spike');
    if (connectionPattern) {
      connectionPattern.currentValue = metrics.connections;
      connectionPattern.alert =
        metrics.connections > connectionPattern.threshold;
    }
  }

  /**
   * Проверка алертов
   */
  private checkAlerts(metrics: NetworkMetrics): void {
    for (const pattern of this.patterns.values()) {
      if (pattern.alert && !this.hasActiveAlert(pattern.id)) {
        this.createAlert(pattern, metrics);
      }
    }
  }

  /**
   * Проверка наличия активного алерта
   */
  private hasActiveAlert(patternId: string): boolean {
    return this.alerts.some(
      alert => alert.source === patternId && !alert.resolved
    );
  }

  /**
   * Создание алерта
   */

  private createAlert(pattern: TrafficPattern, _metrics: NetworkMetrics): void {
    const alert: NetworkAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: this.getAlertType(pattern.pattern),
      severity: pattern.severity,
      message: `${pattern.description}: ${pattern.currentValue} (threshold: ${pattern.threshold})`,
      source: pattern.id,
      resolved: false,
    };

    this.alerts.push(alert);
    this.cleanupOldAlerts();

    redactedLogger.warn(
      `Network alert created: ${alert.message}`,
      'NetworkMonitoringService',
      {
        alertId: alert.id,
        severity: alert.severity,
        type: alert.type,
      }
    );
  }

  /**
   * Определение типа алерта
   */
  private getAlertType(pattern: string): NetworkAlert['type'] {
    switch (pattern) {
      case 'bandwidth_usage':
        return 'bandwidth';
      case 'response_time':
        return 'latency';
      case 'error_percentage':
        return 'error_rate';
      case 'connection_count':
        return 'connection_limit';
      default:
        return 'anomaly';
    }
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
   * Получение статистики мониторинга
   */
  getMonitoringStats() {
    const now = new Date();
    const lastHour = new Date(now.getTime() - 3600000);
    const lastDay = new Date(now.getTime() - 86400000);

    const metricsLastHour = this.metrics.filter(m => m.timestamp > lastHour);
    const metricsLastDay = this.metrics.filter(m => m.timestamp > lastDay);
    const alertsLastHour = this.alerts.filter(a => a.timestamp > lastHour);
    const alertsLastDay = this.alerts.filter(a => a.timestamp > lastDay);

    const activeAlerts = this.alerts.filter(a => !a.resolved);

    return {
      totalMetrics: this.metrics.length,
      metricsLastHour: metricsLastHour.length,
      metricsLastDay: metricsLastDay.length,
      totalAlerts: this.alerts.length,
      activeAlerts: activeAlerts.length,
      alertsLastHour: alertsLastHour.length,
      alertsLastDay: alertsLastDay.length,
      patterns: Array.from(this.patterns.values()).map(p => ({
        id: p.id,
        description: p.description,
        severity: p.severity,
        threshold: p.threshold,
        currentValue: p.currentValue,
        alert: p.alert,
      })),
      recentAlerts: this.alerts.slice(-10).map(a => ({
        id: a.id,
        timestamp: a.timestamp,
        type: a.type,
        severity: a.severity,
        message: a.message,
        resolved: a.resolved,
      })),
    };
  }

  /**
   * Получение метрик за период
   */
  getMetricsForPeriod(startTime: Date, endTime: Date): NetworkMetrics[] {
    return this.metrics.filter(
      m => m.timestamp >= startTime && m.timestamp <= endTime
    );
  }

  /**
   * Разрешение алерта
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();

      redactedLogger.log(
        `Alert resolved: ${alertId}`,
        'NetworkMonitoringService'
      );
      return true;
    }
    return false;
  }

  /**
   * Добавление нового паттерна мониторинга
   */
  addTrafficPattern(
    pattern: Omit<TrafficPattern, 'currentValue' | 'alert'>
  ): void {
    const newPattern: TrafficPattern = {
      ...pattern,
      currentValue: 0,
      alert: false,
    };

    this.patterns.set(pattern.id, newPattern);
    redactedLogger.log(
      `Traffic pattern added: ${pattern.id}`,
      'NetworkMonitoringService'
    );
  }

  /**
   * Обновление порога паттерна
   */
  updatePatternThreshold(patternId: string, newThreshold: number): boolean {
    const pattern = this.patterns.get(patternId);
    if (pattern) {
      pattern.threshold = newThreshold;
      redactedLogger.log(
        `Pattern threshold updated: ${patternId} -> ${newThreshold}`,
        'NetworkMonitoringService'
      );
      return true;
    }
    return false;
  }

  /**
   * Получение активных алертов
   */
  getActiveAlerts(): NetworkAlert[] {
    return this.alerts.filter(a => !a.resolved);
  }

  /**
   * Получение алертов по типу
   */
  getAlertsByType(type: NetworkAlert['type']): NetworkAlert[] {
    return this.alerts.filter(a => a.type === type);
  }

  /**
   * Получение алертов по серьезности
   */
  getAlertsBySeverity(severity: NetworkAlert['severity']): NetworkAlert[] {
    return this.alerts.filter(a => a.severity === severity);
  }
}

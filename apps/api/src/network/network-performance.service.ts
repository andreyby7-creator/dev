import { Injectable } from '@nestjs/common';
import { redactedLogger } from '../utils/redacted-logger';

export interface PerformanceMetrics {
  timestamp: Date;
  throughput: number;
  latency: number;
  packetLoss: number;
  jitter: number;
  bandwidthUtilization: number;
  connectionCount: number;
  errorRate: number;
}

export interface OptimizationRule {
  id: string;
  name: string;
  description: string;
  type:
    | 'bandwidth'
    | 'latency'
    | 'packet_loss'
    | 'connection_limit'
    | 'caching';
  condition: string;
  action: string;
  threshold: number;
  enabled: boolean;
  priority: number;
}

export interface OptimizationAction {
  id: string;
  timestamp: Date;
  ruleId: string;
  type: string;
  description: string;
  parameters: Record<string, unknown>;
  applied: boolean;
  result?: string;
}

@Injectable()
export class NetworkPerformanceService {
  private readonly performanceMetrics: PerformanceMetrics[] = [];
  private readonly optimizationRules: Map<string, OptimizationRule> = new Map();
  private readonly optimizationActions: OptimizationAction[] = [];
  private readonly maxMetricsHistory = 5000;
  private readonly maxActionsHistory = 1000;

  constructor() {
    this.initializeOptimizationRules();
    redactedLogger.log(
      'Network Performance Service initialized',
      'NetworkPerformanceService'
    );
  }

  /**
   * Инициализация правил оптимизации
   */
  private initializeOptimizationRules(): void {
    const defaultRules: OptimizationRule[] = [
      {
        id: 'rule-bandwidth-throttle',
        name: 'Bandwidth Throttling',
        description: 'Throttle bandwidth when utilization exceeds 90%',
        type: 'bandwidth',
        condition: 'bandwidth_utilization > 90',
        action: 'throttle_bandwidth',
        threshold: 90,
        enabled: true,
        priority: 1,
      },
      {
        id: 'rule-latency-optimization',
        name: 'Latency Optimization',
        description: 'Optimize routing when latency exceeds 100ms',
        type: 'latency',
        condition: 'latency > 100',
        action: 'optimize_routing',
        threshold: 100,
        enabled: true,
        priority: 2,
      },
      {
        id: 'rule-packet-loss-recovery',
        name: 'Packet Loss Recovery',
        description: 'Enable packet retransmission when loss exceeds 1%',
        type: 'packet_loss',
        condition: 'packet_loss > 1',
        action: 'enable_retransmission',
        threshold: 1,
        enabled: true,
        priority: 3,
      },
      {
        id: 'rule-connection-pooling',
        name: 'Connection Pooling',
        description: 'Enable connection pooling when connections exceed 500',
        type: 'connection_limit',
        condition: 'connection_count > 500',
        action: 'enable_connection_pooling',
        threshold: 500,
        enabled: true,
        priority: 4,
      },
      {
        id: 'rule-caching-optimization',
        name: 'Caching Optimization',
        description: 'Enable aggressive caching when error rate is low',
        type: 'caching',
        condition: 'error_rate < 0.1',
        action: 'enable_aggressive_caching',
        threshold: 0.1,
        enabled: true,
        priority: 5,
      },
    ];

    defaultRules.forEach(rule => {
      this.optimizationRules.set(rule.id, rule);
    });
  }

  /**
   * Сбор метрик производительности
   */
  async collectPerformanceMetrics(): Promise<PerformanceMetrics> {
    const metrics: PerformanceMetrics = {
      timestamp: new Date(),
      throughput: this.generateRandomMetric(100, 1000), // Mbps
      latency: this.generateRandomMetric(5, 150), // ms
      packetLoss: this.generateRandomMetric(0, 5), // %
      jitter: this.generateRandomMetric(1, 20), // ms
      bandwidthUtilization: this.generateRandomMetric(30, 95), // %
      connectionCount: this.generateRandomMetric(50, 800),
      errorRate: this.generateRandomMetric(0, 2), // %
    };

    this.performanceMetrics.push(metrics);
    this.cleanupOldMetrics();
    this.analyzePerformance(metrics);

    redactedLogger.debug(
      'Performance metrics collected',
      'NetworkPerformanceService',
      {
        timestamp: metrics.timestamp,
        throughput: metrics.throughput,
        latency: metrics.latency,
        bandwidthUtilization: metrics.bandwidthUtilization,
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
    if (this.performanceMetrics.length > this.maxMetricsHistory) {
      this.performanceMetrics.splice(
        0,
        this.performanceMetrics.length - this.maxMetricsHistory
      );
    }
  }

  /**
   * Анализ производительности и применение оптимизаций
   */
  private analyzePerformance(metrics: PerformanceMetrics): void {
    for (const rule of this.optimizationRules.values()) {
      if (!rule.enabled) continue;

      const shouldApply = this.evaluateCondition(metrics, rule);
      if (shouldApply) {
        this.applyOptimization(rule, metrics);
      }
    }
  }

  /**
   * Оценка условия правила
   */
  private evaluateCondition(
    metrics: PerformanceMetrics,
    rule: OptimizationRule
  ): boolean {
    switch (rule.type) {
      case 'bandwidth':
        return metrics.bandwidthUtilization > rule.threshold;
      case 'latency':
        return metrics.latency > rule.threshold;
      case 'packet_loss':
        return metrics.packetLoss > rule.threshold;
      case 'connection_limit':
        return metrics.connectionCount > rule.threshold;
      case 'caching':
        return metrics.errorRate < rule.threshold;
      default:
        return false;
    }
  }

  /**
   * Применение оптимизации
   */
  private applyOptimization(
    rule: OptimizationRule,
    metrics: PerformanceMetrics
  ): void {
    const action: OptimizationAction = {
      id: `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ruleId: rule.id,
      type: rule.type,
      description: rule.description,
      parameters: this.getOptimizationParameters(rule, metrics),
      applied: true,
      result: 'Applied successfully',
    };

    this.optimizationActions.push(action);
    this.cleanupOldActions();

    redactedLogger.log(
      `Optimization applied: ${rule.name}`,
      'NetworkPerformanceService',
      {
        ruleId: rule.id,
        type: rule.type,
        parameters: action.parameters,
      }
    );
  }

  /**
   * Получение параметров оптимизации
   */
  private getOptimizationParameters(
    rule: OptimizationRule,
    metrics: PerformanceMetrics
  ): Record<string, unknown> {
    switch (rule.type) {
      case 'bandwidth':
        return {
          currentUtilization: metrics.bandwidthUtilization,
          targetUtilization: rule.threshold - 10,
          throttlePercentage: Math.min(
            20,
            metrics.bandwidthUtilization - rule.threshold
          ),
        };
      case 'latency':
        return {
          currentLatency: metrics.latency,
          targetLatency: rule.threshold - 20,
          routingOptimization: true,
        };
      case 'packet_loss':
        return {
          currentLoss: metrics.packetLoss,
          targetLoss: rule.threshold / 2,
          retransmissionEnabled: true,
          retryCount: 3,
        };
      case 'connection_limit':
        return {
          currentConnections: metrics.connectionCount,
          maxConnections: rule.threshold,
          poolingEnabled: true,
          poolSize: Math.min(100, metrics.connectionCount - rule.threshold),
        };
      case 'caching':
        return {
          currentErrorRate: metrics.errorRate,
          cacheEnabled: true,
          cacheTTL: 300, // 5 minutes
          aggressiveCaching: true,
        };
      default:
        return {};
    }
  }

  /**
   * Очистка старых действий
   */
  private cleanupOldActions(): void {
    if (this.optimizationActions.length > this.maxActionsHistory) {
      this.optimizationActions.splice(
        0,
        this.optimizationActions.length - this.maxActionsHistory
      );
    }
  }

  /**
   * Получение статистики производительности
   */
  getPerformanceStats() {
    const now = new Date();
    const lastHour = new Date(now.getTime() - 3600000);
    const lastDay = new Date(now.getTime() - 86400000);

    const metricsLastHour = this.performanceMetrics.filter(
      m => m.timestamp > lastHour
    );
    const metricsLastDay = this.performanceMetrics.filter(
      m => m.timestamp > lastDay
    );
    const actionsLastHour = this.optimizationActions.filter(
      a => a.timestamp > lastHour
    );
    const actionsLastDay = this.optimizationActions.filter(
      a => a.timestamp > lastDay
    );

    const currentMetrics =
      this.performanceMetrics[this.performanceMetrics.length - 1];

    return {
      totalMetrics: this.performanceMetrics.length,
      metricsLastHour: metricsLastHour.length,
      metricsLastDay: metricsLastDay.length,
      totalOptimizations: this.optimizationActions.length,
      optimizationsLastHour: actionsLastHour.length,
      optimizationsLastDay: actionsLastDay.length,
      currentMetrics: currentMetrics
        ? {
            throughput: currentMetrics.throughput,
            latency: currentMetrics.latency,
            packetLoss: currentMetrics.packetLoss,
            bandwidthUtilization: currentMetrics.bandwidthUtilization,
            connectionCount: currentMetrics.connectionCount,
            errorRate: currentMetrics.errorRate,
          }
        : null,
      optimizationRules: Array.from(this.optimizationRules.values()).map(
        rule => ({
          id: rule.id,
          name: rule.name,
          description: rule.description,
          type: rule.type,
          threshold: rule.threshold,
          enabled: rule.enabled,
          priority: rule.priority,
        })
      ),
      recentOptimizations: this.optimizationActions.slice(-10).map(action => ({
        id: action.id,
        timestamp: action.timestamp,
        type: action.type,
        description: action.description,
        applied: action.applied,
        result: action.result,
      })),
    };
  }

  /**
   * Получение метрик за период
   */
  getMetricsForPeriod(startTime: Date, endTime: Date): PerformanceMetrics[] {
    return this.performanceMetrics.filter(
      m => m.timestamp >= startTime && m.timestamp <= endTime
    );
  }

  /**
   * Добавление нового правила оптимизации
   */
  addOptimizationRule(rule: Omit<OptimizationRule, 'id'>): string {
    const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newRule: OptimizationRule = {
      ...rule,
      id: ruleId,
    };

    this.optimizationRules.set(ruleId, newRule);
    redactedLogger.log(
      `Optimization rule added: ${ruleId}`,
      'NetworkPerformanceService'
    );
    return ruleId;
  }

  /**
   * Обновление правила оптимизации
   */
  updateOptimizationRule(
    ruleId: string,
    updates: Partial<OptimizationRule>
  ): boolean {
    const rule = this.optimizationRules.get(ruleId);
    if (!rule) {
      return false;
    }

    Object.assign(rule, updates);
    redactedLogger.log(
      `Optimization rule updated: ${ruleId}`,
      'NetworkPerformanceService'
    );
    return true;
  }

  /**
   * Удаление правила оптимизации
   */
  removeOptimizationRule(ruleId: string): boolean {
    const deleted = this.optimizationRules.delete(ruleId);
    if (deleted) {
      redactedLogger.log(
        `Optimization rule removed: ${ruleId}`,
        'NetworkPerformanceService'
      );
    }
    return deleted;
  }

  /**
   * Получение действий оптимизации за период
   */
  getOptimizationsForPeriod(
    startTime: Date,
    endTime: Date
  ): OptimizationAction[] {
    return this.optimizationActions.filter(
      a => a.timestamp >= startTime && a.timestamp <= endTime
    );
  }

  /**
   * Получение действий по типу
   */
  getOptimizationsByType(type: string): OptimizationAction[] {
    return this.optimizationActions.filter(a => a.type === type);
  }

  /**
   * Получение действий по правилу
   */
  getOptimizationsByRule(ruleId: string): OptimizationAction[] {
    return this.optimizationActions.filter(a => a.ruleId === ruleId);
  }

  /**
   * Принудительное применение оптимизации
   */
  forceOptimization(ruleId: string): boolean {
    const rule = this.optimizationRules.get(ruleId);
    if (rule?.enabled !== true) {
      return false;
    }

    const currentMetrics =
      this.performanceMetrics[this.performanceMetrics.length - 1];
    if (currentMetrics == null) {
      return false;
    }

    this.applyOptimization(rule, currentMetrics);
    return true;
  }

  /**
   * Получение рекомендаций по оптимизации
   */
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const currentMetrics =
      this.performanceMetrics[this.performanceMetrics.length - 1];

    if (!currentMetrics) {
      return recommendations;
    }

    if (currentMetrics.bandwidthUtilization > 80) {
      recommendations.push(
        'Consider bandwidth throttling to prevent congestion'
      );
    }

    if (currentMetrics.latency > 100) {
      recommendations.push('Optimize routing to reduce latency');
    }

    if (currentMetrics.packetLoss > 1) {
      recommendations.push(
        'Enable packet retransmission to improve reliability'
      );
    }

    if (currentMetrics.connectionCount > 500) {
      recommendations.push('Implement connection pooling to manage resources');
    }

    if (currentMetrics.errorRate < 0.5) {
      recommendations.push('Enable aggressive caching to improve performance');
    }

    return recommendations;
  }

  /**
   * Получение трендов производительности
   */
  getPerformanceTrends(): Record<
    string,
    { trend: 'improving' | 'stable' | 'declining'; value: number }
  > {
    if (this.performanceMetrics.length < 10) {
      return {};
    }

    const recentMetrics = this.performanceMetrics.slice(-10);
    const olderMetrics = this.performanceMetrics.slice(-20, -10);

    const trends: Record<
      string,
      { trend: 'improving' | 'stable' | 'declining'; value: number }
    > = {};

    // Анализ тренда пропускной способности
    const avgRecentThroughput =
      recentMetrics.reduce((sum, m) => sum + m.throughput, 0) /
      recentMetrics.length;
    const avgOlderThroughput =
      olderMetrics.reduce((sum, m) => sum + m.throughput, 0) /
      olderMetrics.length;
    trends.throughput = {
      trend:
        avgRecentThroughput > avgOlderThroughput
          ? 'improving'
          : avgRecentThroughput < avgOlderThroughput
            ? 'declining'
            : 'stable',
      value: avgRecentThroughput,
    };

    // Анализ тренда задержки
    const avgRecentLatency =
      recentMetrics.reduce((sum, m) => sum + m.latency, 0) /
      recentMetrics.length;
    const avgOlderLatency =
      olderMetrics.reduce((sum, m) => sum + m.latency, 0) / olderMetrics.length;
    trends.latency = {
      trend:
        avgRecentLatency < avgOlderLatency
          ? 'improving'
          : avgRecentLatency > avgOlderLatency
            ? 'declining'
            : 'stable',
      value: avgRecentLatency,
    };

    return trends;
  }
}

import { Injectable, Logger } from '@nestjs/common';

// Типы
type ScalingMetric =
  | 'CPU_USAGE'
  | 'MEMORY_USAGE'
  | 'REQUEST_RATE'
  | 'RESPONSE_TIME'
  | 'ERROR_RATE'
  | 'QUEUE_SIZE';
type ScalingAction = 'SCALE_UP' | 'SCALE_DOWN' | 'SCALE_OUT' | 'SCALE_IN';
type ScalingPolicyType = 'REACTIVE' | 'PREDICTIVE' | 'SCHEDULED' | 'MANUAL';

// Интерфейсы
export interface IScalingPolicy {
  id: string;
  name: string;
  type: ScalingPolicyType;
  _service: string;
  metric: ScalingMetric;
  threshold: number;
  action: ScalingAction;
  minInstances: number;
  maxInstances: number;
  cooldownPeriod: number; // в секундах
  enabled: boolean;
  priority: number;
  conditions: IScalingCondition[];
  schedule?: IScalingSchedule;
  createdAt: string;
  updatedAt: string;
}

export interface IScalingCondition {
  metric: ScalingMetric;
  operator: 'GT' | 'LT' | 'GTE' | 'LTE' | 'EQ';
  value: number;
  duration: number; // в секундах
}

export interface IScalingSchedule {
  cronExpression: string;
  timezone: string;
  minInstances: number;
  maxInstances: number;
}

export interface IScalingDecision {
  policyId: string;
  _service: string;
  action: ScalingAction;
  reason: string;
  currentInstances: number;
  targetInstances: number;
  metrics: Record<string, number>;
  timestamp: string;
  confidence: number; // 0-100
}

export interface IScalingHistory {
  id: string;
  policyId: string;
  _service: string;
  action: ScalingAction;
  fromInstances: number;
  toInstances: number;
  reason: string;
  metrics: Record<string, number>;
  duration: number; // в секундах
  success: boolean;
  timestamp: string;
}

export interface IScalingMetrics {
  cpuUsage: number;
  memoryUsage: number;
  requestRate: number;
  responseTime: number;
  errorRate: number;
  queueSize: number;
  activeConnections: number;
  timestamp: string;
}

export interface IScalingConfig {
  enabled: boolean;
  defaultMinInstances: number;
  defaultMaxInstances: number;
  defaultCooldownPeriod: number;
  maxScalingRate: number; // максимальное количество изменений в минуту
  predictiveScalingEnabled: boolean;
  costOptimizationEnabled: boolean;
  notificationChannels: string[];
}

@Injectable()
export class DynamicScalingService {
  private readonly logger = new Logger(DynamicScalingService.name);
  private readonly policies: Map<string, IScalingPolicy> = new Map();
  private readonly scalingHistory: IScalingHistory[] = [];
  private readonly lastScalingTime: Map<string, number> = new Map();
  private readonly scalingConfig: IScalingConfig = {
    enabled: true,
    defaultMinInstances: 2,
    defaultMaxInstances: 20,
    defaultCooldownPeriod: 300,
    maxScalingRate: 5,
    predictiveScalingEnabled: true,
    costOptimizationEnabled: true,
    notificationChannels: ['slack', 'email'],
  };

  constructor() {
    this.initializeDefaultPolicies();
  }

  /**
   * Инициализация политик по умолчанию
   */
  private initializeDefaultPolicies(): void {
    const defaultPolicies: Omit<
      IScalingPolicy,
      'id' | 'createdAt' | 'updatedAt'
    >[] = [
      {
        name: 'CPU High Usage Scale Up',
        type: 'REACTIVE',
        _service: 'API',
        metric: 'CPU_USAGE',
        threshold: 80,
        action: 'SCALE_UP',
        minInstances: 2,
        maxInstances: 20,
        cooldownPeriod: 300,
        enabled: true,
        priority: 1,
        conditions: [
          {
            metric: 'CPU_USAGE',
            operator: 'GT',
            value: 80,
            duration: 60,
          },
        ],
      },
      {
        name: 'CPU Low Usage Scale Down',
        type: 'REACTIVE',
        _service: 'API',
        metric: 'CPU_USAGE',
        threshold: 30,
        action: 'SCALE_DOWN',
        minInstances: 2,
        maxInstances: 20,
        cooldownPeriod: 600,
        enabled: true,
        priority: 2,
        conditions: [
          {
            metric: 'CPU_USAGE',
            operator: 'LT',
            value: 30,
            duration: 300,
          },
        ],
      },
      {
        name: 'High Request Rate Scale Out',
        type: 'REACTIVE',
        _service: 'API',
        metric: 'REQUEST_RATE',
        threshold: 1000,
        action: 'SCALE_OUT',
        minInstances: 2,
        maxInstances: 20,
        cooldownPeriod: 180,
        enabled: true,
        priority: 1,
        conditions: [
          {
            metric: 'REQUEST_RATE',
            operator: 'GT',
            value: 1000,
            duration: 30,
          },
        ],
      },
      {
        name: 'Business Hours Scale Up',
        type: 'SCHEDULED',
        _service: 'API',
        metric: 'CPU_USAGE',
        threshold: 0,
        action: 'SCALE_UP',
        minInstances: 4,
        maxInstances: 20,
        cooldownPeriod: 0,
        enabled: true,
        priority: 3,
        conditions: [],
        schedule: {
          cronExpression: '0 9 * * 1-5', // 9 AM on weekdays
          timezone: 'UTC',
          minInstances: 4,
          maxInstances: 20,
        },
      },
      {
        name: 'Night Hours Scale Down',
        type: 'SCHEDULED',
        _service: 'API',
        metric: 'CPU_USAGE',
        threshold: 0,
        action: 'SCALE_DOWN',
        minInstances: 2,
        maxInstances: 20,
        cooldownPeriod: 0,
        enabled: true,
        priority: 3,
        conditions: [],
        schedule: {
          cronExpression: '0 22 * * *', // 10 PM daily
          timezone: 'UTC',
          minInstances: 2,
          maxInstances: 20,
        },
      },
    ];

    defaultPolicies.forEach(policy => {
      this.createPolicy(policy);
    });
  }

  /**
   * Создать политику масштабирования
   */
  createPolicy(
    policyData: Omit<IScalingPolicy, 'id' | 'createdAt' | 'updatedAt'>
  ): IScalingPolicy {
    const policy: IScalingPolicy = {
      ...policyData,
      id: this.generatePolicyId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.policies.set(policy.id, policy);
    this.logger.log(
      `Created scaling policy: ${policy.name} for ${policy._service}`
    );

    return policy;
  }

  /**
   * Обновить политику масштабирования
   */
  updatePolicy(
    id: string,
    updates: Partial<IScalingPolicy>
  ): IScalingPolicy | undefined {
    const policy = this.policies.get(id);
    if (!policy) {
      this.logger.warn(`Policy not found: ${id}`);
      return undefined;
    }

    const updatedPolicy: IScalingPolicy = {
      ...policy,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.policies.set(id, updatedPolicy);
    this.logger.log(`Updated scaling policy: ${updatedPolicy.name}`);

    return updatedPolicy;
  }

  /**
   * Удалить политику масштабирования
   */
  deletePolicy(id: string): boolean {
    const policy = this.policies.get(id);
    if (!policy) {
      this.logger.warn(`Policy not found: ${id}`);
      return false;
    }

    this.policies.delete(id);
    this.logger.log(`Deleted scaling policy: ${policy.name}`);

    return true;
  }

  /**
   * Получить политики для сервиса
   */
  getPoliciesForService(_service: string): IScalingPolicy[] {
    return Array.from(this.policies.values()).filter(
      policy => policy._service === _service
    );
  }

  /**
   * Получить все политики
   */
  getAllPolicies(): IScalingPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Оценить необходимость масштабирования
   */
  async evaluateScaling(
    _service: string,
    metrics: IScalingMetrics
  ): Promise<IScalingDecision | undefined> {
    if (!this.scalingConfig.enabled) {
      return undefined;
    }

    const policies = this.getPoliciesForService(_service).filter(
      policy => policy.enabled
    );
    const sortedPolicies = policies.sort((a, b) => a.priority - b.priority);

    for (const policy of sortedPolicies) {
      const decision = await this.evaluatePolicy(policy, metrics);
      if (decision) {
        return decision;
      }
    }

    return undefined;
  }

  /**
   * Оценить политику
   */
  private async evaluatePolicy(
    policy: IScalingPolicy,
    metrics: IScalingMetrics
  ): Promise<IScalingDecision | undefined> {
    // Проверяем cooldown период
    const lastScaling = this.lastScalingTime.get(policy.id);
    const now = Date.now();
    if (
      lastScaling != null &&
      now - lastScaling < policy.cooldownPeriod * 1000
    ) {
      return undefined;
    }

    // Проверяем условия политики
    const conditionsMet = policy.conditions.every(condition => {
      const metricValue = this.getMetricValue(condition.metric, metrics);
      return this.evaluateCondition(
        metricValue,
        condition.operator,
        condition.value
      );
    });

    if (!conditionsMet) {
      return undefined;
    }

    // Проверяем ограничения масштабирования
    const currentInstances = await this.getCurrentInstances(policy._service);
    const targetInstances = this.calculateTargetInstances(
      policy,
      currentInstances,
      metrics
    );

    if (targetInstances === currentInstances) {
      return undefined;
    }

    // Проверяем лимиты
    if (
      targetInstances < policy.minInstances ||
      targetInstances > policy.maxInstances
    ) {
      this.logger.warn(
        `Target instances ${targetInstances} outside limits for policy ${policy.name}`
      );
      return undefined;
    }

    // Проверяем rate limiting
    if (!this.checkScalingRateLimit(policy._service)) {
      this.logger.warn(
        `Scaling rate limit exceeded for service ${policy._service}`
      );
      return undefined;
    }

    const decision: IScalingDecision = {
      policyId: policy.id,
      _service: policy._service,
      action: policy.action,
      reason: this.generateScalingReason(policy, metrics),
      currentInstances,
      targetInstances,
      metrics: {
        cpuUsage: metrics.cpuUsage,
        memoryUsage: metrics.memoryUsage,
        requestRate: metrics.requestRate,
        responseTime: metrics.responseTime,
        errorRate: metrics.errorRate,
        queueSize: metrics.queueSize,
      },
      timestamp: new Date().toISOString(),
      confidence: this.calculateConfidence(policy, metrics),
    };

    // Обновляем время последнего масштабирования
    this.lastScalingTime.set(policy.id, now);

    return decision;
  }

  /**
   * Выполнить масштабирование
   */
  async executeScaling(decision: IScalingDecision): Promise<boolean> {
    const startTime = Date.now();
    this.logger.log(
      `Executing scaling: ${decision.action} for ${decision._service}`
    );

    try {
      // Симуляция выполнения масштабирования
      await this.performScalingAction(decision);

      const duration = (Date.now() - startTime) / 1000;

      // Записываем в историю
      const historyEntry: IScalingHistory = {
        id: this.generateHistoryId(),
        policyId: decision.policyId,
        _service: decision._service,
        action: decision.action,
        fromInstances: decision.currentInstances,
        toInstances: decision.targetInstances,
        reason: decision.reason,
        metrics: decision.metrics,
        duration,
        success: true,
        timestamp: new Date().toISOString(),
      };

      this.scalingHistory.push(historyEntry);
      this.logger.log(
        `Scaling completed successfully: ${decision._service} ${decision.currentInstances} -> ${decision.targetInstances}`
      );

      return true;
    } catch (error) {
      this.logger.error(`Scaling failed: ${decision._service}`, error);

      // Записываем неудачную попытку
      const historyEntry: IScalingHistory = {
        id: this.generateHistoryId(),
        policyId: decision.policyId,
        _service: decision._service,
        action: decision.action,
        fromInstances: decision.currentInstances,
        toInstances: decision.targetInstances,
        reason: decision.reason,
        metrics: decision.metrics,
        duration: (Date.now() - startTime) / 1000,
        success: false,
        timestamp: new Date().toISOString(),
      };

      this.scalingHistory.push(historyEntry);
      return false;
    }
  }

  /**
   * Получить историю масштабирования
   */
  getScalingHistory(service?: string, limit = 100): IScalingHistory[] {
    let history = this.scalingHistory;

    if (service != null && service !== '') {
      history = history.filter(entry => entry._service === service);
    }

    return history
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, limit);
  }

  /**
   * Получить статистику масштабирования
   */
  getScalingStats(
    service?: string,
    timeRange = 24 * 60 * 60 * 1000
  ): {
    totalScalingEvents: number;
    successfulScalingEvents: number;
    failedScalingEvents: number;
    averageScalingTime: number;
    mostCommonAction: ScalingAction;
    scalingFrequency: number; // событий в час
  } {
    const cutoffTime = Date.now() - timeRange;
    let history = this.scalingHistory.filter(
      entry => new Date(entry.timestamp).getTime() > cutoffTime
    );

    if (service != null && service !== '') {
      history = history.filter(entry => entry._service === service);
    }

    const totalScalingEvents = history.length;
    const successfulScalingEvents = history.filter(
      entry => entry.success
    ).length;
    const failedScalingEvents = totalScalingEvents - successfulScalingEvents;
    const averageScalingTime =
      history.length > 0
        ? history.reduce((sum, entry) => sum + entry.duration, 0) /
          history.length
        : 0;

    const actionCounts = history.reduce(
      (counts, entry) => {
        counts[entry.action] = (counts[entry.action] || 0) + 1;
        return counts;
      },
      {} as Record<ScalingAction, number>
    );

    const sortedEntries = Object.entries(actionCounts).sort(
      ([, a], [, b]) => b - a
    );
    const mostCommonAction =
      sortedEntries.length > 0 && sortedEntries[0] != null
        ? (sortedEntries[0][0] as ScalingAction)
        : 'SCALE_UP';

    const scalingFrequency =
      totalScalingEvents / (timeRange / (1000 * 60 * 60));

    return {
      totalScalingEvents,
      successfulScalingEvents,
      failedScalingEvents,
      averageScalingTime,
      mostCommonAction,
      scalingFrequency,
    };
  }

  /**
   * Вспомогательные методы
   */
  private getMetricValue(
    metric: ScalingMetric,
    metrics: IScalingMetrics
  ): number {
    switch (metric) {
      case 'CPU_USAGE':
        return metrics.cpuUsage;
      case 'MEMORY_USAGE':
        return metrics.memoryUsage;
      case 'REQUEST_RATE':
        return metrics.requestRate;
      case 'RESPONSE_TIME':
        return metrics.responseTime;
      case 'ERROR_RATE':
        return metrics.errorRate;
      case 'QUEUE_SIZE':
        return metrics.queueSize;
      default:
        return 0;
    }
  }

  private evaluateCondition(
    value: number,
    operator: string,
    threshold: number
  ): boolean {
    switch (operator) {
      case 'GT':
        return value > threshold;
      case 'LT':
        return value < threshold;
      case 'GTE':
        return value >= threshold;
      case 'LTE':
        return value <= threshold;
      case 'EQ':
        return Math.abs(value - threshold) < 0.01;
      default:
        return false;
    }
  }

  private async getCurrentInstances(_service: string): Promise<number> {
    // Симуляция получения текущего количества инстансов
    const baseInstances: Record<string, number> = {
      API: 3,
      Web: 2,
      Database: 1,
    };

    return baseInstances[_service] ?? 1;
  }

  private calculateTargetInstances(
    policy: IScalingPolicy,
    currentInstances: number,
    metrics: IScalingMetrics
  ): number {
    const metricValue = this.getMetricValue(policy.metric, metrics);

    switch (policy.action) {
      case 'SCALE_UP':
        return Math.min(policy.maxInstances, currentInstances + 1);
      case 'SCALE_DOWN':
        return Math.max(policy.minInstances, currentInstances - 1);
      case 'SCALE_OUT':
        return Math.min(
          policy.maxInstances,
          currentInstances + Math.ceil(metricValue / 100)
        );
      case 'SCALE_IN':
        return Math.max(
          policy.minInstances,
          currentInstances - Math.ceil(metricValue / 100)
        );
      default:
        return currentInstances;
    }
  }

  private checkScalingRateLimit(_service: string): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;

    const recentScalingEvents = this.scalingHistory.filter(
      entry =>
        entry._service === _service &&
        new Date(entry.timestamp).getTime() > oneMinuteAgo
    );

    return recentScalingEvents.length < this.scalingConfig.maxScalingRate;
  }

  private generateScalingReason(
    policy: IScalingPolicy,
    metrics: IScalingMetrics
  ): string {
    const metricValue = this.getMetricValue(policy.metric, metrics);
    return `${policy.metric} (${metricValue.toFixed(2)}) triggered ${policy.action} for ${policy._service}`;
  }

  private calculateConfidence(
    policy: IScalingPolicy,
    metrics: IScalingMetrics
  ): number {
    const metricValue = this.getMetricValue(policy.metric, metrics);
    const threshold = policy.threshold;

    // Простая логика расчета уверенности
    if (policy.action === 'SCALE_UP') {
      return Math.min(100, Math.max(50, (metricValue / threshold) * 100));
    } else {
      return Math.min(100, Math.max(50, (threshold / metricValue) * 100));
    }
  }

  private async performScalingAction(
    decision: IScalingDecision
  ): Promise<void> {
    // Симуляция выполнения действия масштабирования
    const scalingTimes: Record<ScalingAction, number> = {
      SCALE_UP: 5000,
      SCALE_DOWN: 3000,
      SCALE_OUT: 8000,
      SCALE_IN: 6000,
    };

    const scalingTime = scalingTimes[decision.action] || 5000;

    await this.delay(scalingTime);
  }

  private generatePolicyId(): string {
    return `policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateHistoryId(): string {
    return `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Получить конфигурацию масштабирования
   */
  getScalingConfig(): IScalingConfig {
    return this.scalingConfig;
  }

  /**
   * Обновить конфигурацию масштабирования
   */
  updateScalingConfig(config: Partial<IScalingConfig>): void {
    Object.assign(this.scalingConfig, config);
    this.logger.log('Scaling configuration updated');
  }
}

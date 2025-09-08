import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

export enum ScalingPolicyType {
  REACTIVE = 'REACTIVE',
  PREDICTIVE = 'PREDICTIVE',
  SCHEDULED = 'SCHEDULED',
  MANUAL = 'MANUAL',
}

export enum ScalingMetric {
  CPU_USAGE = 'CPU_USAGE',
  MEMORY_USAGE = 'MEMORY_USAGE',
  REQUEST_RATE = 'REQUEST_RATE',
  RESPONSE_TIME = 'RESPONSE_TIME',
  ERROR_RATE = 'ERROR_RATE',
  QUEUE_SIZE = 'QUEUE_SIZE',
}

export enum ScalingAction {
  SCALE_UP = 'SCALE_UP',
  SCALE_DOWN = 'SCALE_DOWN',
  SCALE_OUT = 'SCALE_OUT',
  SCALE_IN = 'SCALE_IN',
}

export interface IScalingPolicy {
  id: string;
  name: string;
  type: ScalingPolicyType;
  _service: string;
  metrics: ScalingMetric[];
  thresholds: Record<ScalingMetric, number>;
  actions: ScalingAction[];
  minInstances: number;
  maxInstances: number;
  cooldownPeriod: number; // в секундах
  priority: number;
  enabled: boolean;
  schedule?: string; // cron expression для SCHEDULED политик
  predictiveWindow?: number; // в минутах для PREDICTIVE политик
}

export interface IScalingDecision {
  id: string;
  policyId: string;
  _service: string;
  action: ScalingAction;
  reason: string;
  timestamp: Date;
  metrics: Record<ScalingMetric, number>;
  executed: boolean;
  executionTime?: Date;
  success?: boolean;
}

export interface IScalingHistory {
  _service: string;
  totalScalingEvents: number;
  successfulScalingEvents: number;
  averageExecutionTime: number;
  lastScalingEvent: Date;
  scalingByAction: Record<ScalingAction, number>;
  scalingByPolicy: Record<string, number>;
}

export interface IScalingStats {
  totalPolicies: number;
  activePolicies: number;
  totalScalingEvents: number;
  successfulScalingEvents: number;
  averageExecutionTime: number;
  services: string[];
  scalingHistory: IScalingHistory[];
}

@Injectable()
export class DynamicScalingService {
  private readonly logger = new Logger(DynamicScalingService.name);
  private policies: Map<string, IScalingPolicy> = new Map();
  private decisions: Map<string, IScalingDecision> = new Map();
  private scalingHistory: Map<string, IScalingHistory> = new Map();
  private lastScalingTime: Map<string, number> = new Map();

  constructor() {
    this.initializeDefaultPolicies();
  }

  private initializeDefaultPolicies(): void {
    const defaultPolicies: IScalingPolicy[] = [
      {
        id: 'cpu-scaling-policy',
        name: 'CPU-based Scaling',
        type: ScalingPolicyType.REACTIVE,
        _service: 'api',
        metrics: [ScalingMetric.CPU_USAGE],
        thresholds: {
          [ScalingMetric.CPU_USAGE]: 80,
          [ScalingMetric.MEMORY_USAGE]: 0,
          [ScalingMetric.REQUEST_RATE]: 0,
          [ScalingMetric.RESPONSE_TIME]: 0,
          [ScalingMetric.ERROR_RATE]: 0,
          [ScalingMetric.QUEUE_SIZE]: 0,
        },
        actions: [ScalingAction.SCALE_UP, ScalingAction.SCALE_OUT],
        minInstances: 3,
        maxInstances: 10,
        cooldownPeriod: 300, // 5 минут
        priority: 1,
        enabled: true,
      },
      {
        id: 'memory-scaling-policy',
        name: 'Memory-based Scaling',
        type: ScalingPolicyType.REACTIVE,
        _service: 'api',
        metrics: [ScalingMetric.MEMORY_USAGE],
        thresholds: {
          [ScalingMetric.CPU_USAGE]: 0,
          [ScalingMetric.MEMORY_USAGE]: 85,
          [ScalingMetric.REQUEST_RATE]: 0,
          [ScalingMetric.RESPONSE_TIME]: 0,
          [ScalingMetric.ERROR_RATE]: 0,
          [ScalingMetric.QUEUE_SIZE]: 0,
        },
        actions: [ScalingAction.SCALE_UP, ScalingAction.SCALE_OUT],
        minInstances: 3,
        maxInstances: 10,
        cooldownPeriod: 300,
        priority: 2,
        enabled: true,
      },
      {
        id: 'request-rate-policy',
        name: 'Request Rate Scaling',
        type: ScalingPolicyType.REACTIVE,
        _service: 'api',
        metrics: [ScalingMetric.REQUEST_RATE],
        thresholds: {
          [ScalingMetric.CPU_USAGE]: 0,
          [ScalingMetric.MEMORY_USAGE]: 0,
          [ScalingMetric.REQUEST_RATE]: 1000, // 1000 req/sec
          [ScalingMetric.RESPONSE_TIME]: 0,
          [ScalingMetric.ERROR_RATE]: 0,
          [ScalingMetric.QUEUE_SIZE]: 0,
        },
        actions: [ScalingAction.SCALE_OUT],
        minInstances: 3,
        maxInstances: 15,
        cooldownPeriod: 180,
        priority: 1,
        enabled: true,
      },
      {
        id: 'response-time-policy',
        name: 'Response Time Scaling',
        type: ScalingPolicyType.REACTIVE,
        _service: 'api',
        metrics: [ScalingMetric.RESPONSE_TIME],
        thresholds: {
          [ScalingMetric.CPU_USAGE]: 0,
          [ScalingMetric.MEMORY_USAGE]: 0,
          [ScalingMetric.REQUEST_RATE]: 0,
          [ScalingMetric.RESPONSE_TIME]: 500, // 500ms
          [ScalingMetric.ERROR_RATE]: 0,
          [ScalingMetric.QUEUE_SIZE]: 0,
        },
        actions: [ScalingAction.SCALE_UP, ScalingAction.SCALE_OUT],
        minInstances: 3,
        maxInstances: 12,
        cooldownPeriod: 240,
        priority: 1,
        enabled: true,
      },
      {
        id: 'error-rate-policy',
        name: 'Error Rate Scaling',
        type: ScalingPolicyType.REACTIVE,
        _service: 'api',
        metrics: [ScalingMetric.ERROR_RATE],
        thresholds: {
          [ScalingMetric.CPU_USAGE]: 0,
          [ScalingMetric.MEMORY_USAGE]: 0,
          [ScalingMetric.REQUEST_RATE]: 0,
          [ScalingMetric.RESPONSE_TIME]: 0,
          [ScalingMetric.ERROR_RATE]: 5, // 5%
          [ScalingMetric.QUEUE_SIZE]: 0,
        },
        actions: [ScalingAction.SCALE_UP],
        minInstances: 3,
        maxInstances: 10,
        cooldownPeriod: 120,
        priority: 0,
        enabled: true,
      },
      {
        id: 'business-hours-policy',
        name: 'Business Hours Scaling',
        type: ScalingPolicyType.SCHEDULED,
        _service: 'api',
        metrics: [ScalingMetric.REQUEST_RATE],
        thresholds: {
          [ScalingMetric.CPU_USAGE]: 0,
          [ScalingMetric.MEMORY_USAGE]: 0,
          [ScalingMetric.REQUEST_RATE]: 500,
          [ScalingMetric.RESPONSE_TIME]: 0,
          [ScalingMetric.ERROR_RATE]: 0,
          [ScalingMetric.QUEUE_SIZE]: 0,
        },
        actions: [ScalingAction.SCALE_UP],
        minInstances: 5,
        maxInstances: 12,
        cooldownPeriod: 600,
        priority: 3,
        enabled: true,
        schedule: '0 9-18 * * 1-5', // 9:00-18:00 по будням
      },
      {
        id: 'predictive-scaling-policy',
        name: 'Predictive Scaling',
        type: ScalingPolicyType.PREDICTIVE,
        _service: 'api',
        metrics: [ScalingMetric.REQUEST_RATE, ScalingMetric.CPU_USAGE],
        thresholds: {
          [ScalingMetric.CPU_USAGE]: 70,
          [ScalingMetric.MEMORY_USAGE]: 0,
          [ScalingMetric.REQUEST_RATE]: 800,
          [ScalingMetric.RESPONSE_TIME]: 0,
          [ScalingMetric.ERROR_RATE]: 0,
          [ScalingMetric.QUEUE_SIZE]: 0,
        },
        actions: [ScalingAction.SCALE_UP, ScalingAction.SCALE_OUT],
        minInstances: 4,
        maxInstances: 12,
        cooldownPeriod: 180,
        priority: 2,
        enabled: true,
        predictiveWindow: 30, // 30 минут
      },
    ];

    defaultPolicies.forEach(policy => {
      this.policies.set(policy.id, policy);
    });

    this.logger.log(
      `Initialized ${defaultPolicies.length} default scaling policies`
    );
  }

  async createPolicy(
    policy: Omit<IScalingPolicy, 'id'>
  ): Promise<IScalingPolicy> {
    const id = `policy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newPolicy: IScalingPolicy = { ...policy, id };

    this.policies.set(id, newPolicy);
    this.logger.log(
      `Created scaling policy: ${newPolicy.name} for service: ${newPolicy._service}`
    );

    return newPolicy;
  }

  async updatePolicy(
    id: string,
    updates: Partial<IScalingPolicy>
  ): Promise<IScalingPolicy | null> {
    const policy = this.policies.get(id);
    if (!policy) {
      return null;
    }

    const updatedPolicy = { ...policy, ...updates };
    this.policies.set(id, updatedPolicy);

    this.logger.log(`Updated scaling policy: ${updatedPolicy.name}`);
    return updatedPolicy;
  }

  async deletePolicy(id: string): Promise<boolean> {
    const policy = this.policies.get(id);
    if (!policy) {
      return false;
    }

    this.policies.delete(id);
    this.logger.log(`Deleted scaling policy: ${policy.name}`);
    return true;
  }

  async getPolicy(id: string): Promise<IScalingPolicy | null> {
    return this.policies.get(id) ?? null;
  }

  async getAllPolicies(): Promise<IScalingPolicy[]> {
    return Array.from(this.policies.values());
  }

  async getPoliciesByService(_service: string): Promise<IScalingPolicy[]> {
    return Array.from(this.policies.values()).filter(
      policy => policy._service === _service
    );
  }

  async getActivePolicies(): Promise<IScalingPolicy[]> {
    return Array.from(this.policies.values()).filter(policy => policy.enabled);
  }

  async evaluateScaling(
    _service: string,
    metrics: Record<ScalingMetric, number>
  ): Promise<IScalingDecision[]> {
    const servicePolicies = await this.getPoliciesByService(_service);
    const activePolicies = servicePolicies.filter(policy => policy.enabled);
    const decisions: IScalingDecision[] = [];

    for (const policy of activePolicies) {
      // Проверяем cooldown период
      const lastScaling =
        this.lastScalingTime.get(`${_service}-${policy.id}`) ?? 0;
      const now = Date.now();
      if (now - lastScaling < policy.cooldownPeriod * 1000) {
        continue;
      }

      // Проверяем метрики
      const shouldScale = this.shouldScale(policy, metrics);
      if (shouldScale) {
        const decision: IScalingDecision = {
          id: `decision-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          policyId: policy.id,
          _service: policy._service,
          action: this.determineScalingAction(policy, metrics),
          reason: `Policy ${policy.name} triggered by metrics: ${Object.keys(shouldScale).join(', ')}`,
          timestamp: new Date(),
          metrics,
          executed: false,
        };

        decisions.push(decision);
        this.decisions.set(decision.id, decision);

        // Обновляем время последнего масштабирования
        this.lastScalingTime.set(`${_service}-${policy.id}`, now);
      }
    }

    // Сортируем решения по приоритету
    decisions.sort((a, b) => {
      const policyA = this.policies.get(a.policyId);
      const policyB = this.policies.get(b.policyId);
      return (policyB?.priority ?? 0) - (policyA?.priority ?? 0);
    });

    return decisions;
  }

  private shouldScale(
    policy: IScalingPolicy,
    metrics: Record<ScalingMetric, number>
  ): Record<ScalingMetric, boolean> | null {
    const triggeredMetrics: Record<ScalingMetric, boolean> = {} as Record<
      ScalingMetric,
      boolean
    >;
    let hasTriggered = false;

    for (const metric of policy.metrics) {
      const currentValue = metrics[metric];
      const threshold = policy.thresholds[metric];

      if (currentValue > threshold) {
        triggeredMetrics[metric] = true;
        hasTriggered = true;
      } else {
        triggeredMetrics[metric] = false;
      }
    }

    return hasTriggered ? triggeredMetrics : null;
  }

  private determineScalingAction(
    policy: IScalingPolicy,
    metrics: Record<ScalingMetric, number>
  ): ScalingAction {
    // Логика выбора действия на основе метрик и политики
    const cpuUsage = metrics[ScalingMetric.CPU_USAGE];
    const memoryUsage = metrics[ScalingMetric.MEMORY_USAGE];
    const requestRate = metrics[ScalingMetric.REQUEST_RATE];
    const responseTime = metrics[ScalingMetric.RESPONSE_TIME];
    const errorRate = metrics[ScalingMetric.ERROR_RATE];

    // Приоритет действий
    if (errorRate > 10) {
      return ScalingAction.SCALE_UP; // Критично - увеличиваем ресурсы
    }

    if (cpuUsage > 90 || memoryUsage > 90) {
      return ScalingAction.SCALE_UP; // Высокая нагрузка - увеличиваем ресурсы
    }

    if (requestRate > 2000 || responseTime > 1000) {
      return ScalingAction.SCALE_OUT; // Много запросов - добавляем инстансы
    }

    if (cpuUsage > 70 || memoryUsage > 70) {
      return ScalingAction.SCALE_UP; // Средняя нагрузка - увеличиваем ресурсы
    }

    // По умолчанию
    return policy.actions[0] ?? ScalingAction.SCALE_UP;
  }

  async executeScaling(decisionId: string): Promise<boolean> {
    const decision = this.decisions.get(decisionId);
    if (!decision || decision.executed) {
      return false;
    }

    try {
      this.logger.log(
        `Executing scaling decision: ${decision.action} for service: ${decision._service}`
      );

      // Симуляция выполнения масштабирования
      const success = await this.performScaling(decision);

      decision.executed = true;
      decision.executionTime = new Date();
      decision.success = success;

      // Обновляем историю масштабирования
      await this.updateScalingHistory(decision);

      this.logger.log(
        `Scaling decision executed successfully: ${decision.action}`
      );
      return success;
    } catch (error) {
      this.logger.error(
        `Failed to execute scaling decision: ${decisionId}`,
        error
      );

      decision.executed = true;
      decision.executionTime = new Date();
      decision.success = false;

      return false;
    }
  }

  private async performScaling(decision: IScalingDecision): Promise<boolean> {
    // Симуляция различных действий масштабирования
    switch (decision.action) {
      case ScalingAction.SCALE_UP:
        return await this.simulateScaleUp();
      case ScalingAction.SCALE_DOWN:
        return await this.simulateScaleDown();
      case ScalingAction.SCALE_OUT:
        return await this.simulateScaleOut();
      case ScalingAction.SCALE_IN:
        return await this.simulateScaleIn();
      default:
        return false;
    }
  }

  private async simulateScaleUp(): Promise<boolean> {
    // Симуляция увеличения ресурсов
    await new Promise<void>(resolve => setTimeout(resolve, 3000));
    return Math.random() > 0.1; // 90% успех
  }

  private async simulateScaleDown(): Promise<boolean> {
    // Симуляция уменьшения ресурсов
    await new Promise<void>(resolve => setTimeout(resolve, 2000));
    return Math.random() > 0.05; // 95% успех
  }

  private async simulateScaleOut(): Promise<boolean> {
    // Симуляция добавления инстансов
    await new Promise<void>(resolve => setTimeout(resolve, 5000));
    return Math.random() > 0.15; // 85% успех
  }

  private async simulateScaleIn(): Promise<boolean> {
    // Симуляция удаления инстансов
    await new Promise<void>(resolve => setTimeout(resolve, 2000));
    return Math.random() > 0.1; // 90% успех
  }

  private async updateScalingHistory(
    decision: IScalingDecision
  ): Promise<void> {
    const serviceName = decision._service;

    // Создаём или получаем существующую историю
    let history = this.scalingHistory.get(serviceName);
    if (!history) {
      history = {
        _service: serviceName,
        totalScalingEvents: 0,
        successfulScalingEvents: 0,
        averageExecutionTime: 0,
        lastScalingEvent: decision.executionTime ?? new Date(),
        scalingByAction: {
          [ScalingAction.SCALE_UP]: 0,
          [ScalingAction.SCALE_DOWN]: 0,
          [ScalingAction.SCALE_OUT]: 0,
          [ScalingAction.SCALE_IN]: 0,
        },
        scalingByPolicy: {} as Record<string, number>,
      };
      this.scalingHistory.set(serviceName, history); // <-- обязательно здесь
    }

    // Обновляем статистику
    history.totalScalingEvents += 1;

    if (decision.success === true) {
      history.successfulScalingEvents += 1;
    }

    // Правильное использование ??= для lastScalingEvent
    history.lastScalingEvent = decision.executionTime ?? new Date();

    // Статистика по действиям
    const action = decision.action;
    history.scalingByAction[action] += 1;

    // Статистика по политикам
    if (decision.policyId) {
      const policyKey = decision.policyId;
      history.scalingByPolicy[policyKey] ??= 0;
      history.scalingByPolicy[policyKey] += 1;
    }

    // Среднее время выполнения
    if (decision.executionTime != null) {
      const executionTime =
        decision.executionTime.getTime() - decision.timestamp.getTime();
      const previousTotal =
        history.averageExecutionTime * (history.totalScalingEvents - 1);
      const totalTime = previousTotal + executionTime;
      history.averageExecutionTime = totalTime / history.totalScalingEvents;
    }

    // Сохраняем объект в Map
    this.scalingHistory.set(serviceName, history);
  }

  async getScalingHistory(service?: string): Promise<IScalingHistory[]> {
    if (service != undefined && service !== '') {
      const history = this.scalingHistory.get(service);
      return history ? [history] : [];
    }
    return Array.from(this.scalingHistory.values());
  }

  async getScalingStats(): Promise<IScalingStats> {
    const policies = Array.from(this.policies.values());
    const decisions = Array.from(this.decisions.values());
    const history = Array.from(this.scalingHistory.values());

    const totalScalingEvents = decisions.length;
    const successfulScalingEvents = decisions.filter(
      d => d.success === true
    ).length;
    const averageExecutionTime =
      history.length > 0
        ? history.reduce((sum, h) => sum + h.averageExecutionTime, 0) /
          history.length
        : 0;

    return {
      totalPolicies: policies.length,
      activePolicies: policies.filter(p => p.enabled).length,
      totalScalingEvents,
      successfulScalingEvents,
      averageExecutionTime,
      services: Array.from(new Set(policies.map(p => p._service))),
      scalingHistory: history,
    };
  }

  async getDecision(id: string): Promise<IScalingDecision | null> {
    return this.decisions.get(id) ?? null;
  }

  async getAllDecisions(): Promise<IScalingDecision[]> {
    return Array.from(this.decisions.values());
  }

  async getDecisionsByService(_service: string): Promise<IScalingDecision[]> {
    return Array.from(this.decisions.values()).filter(
      decision => decision._service === _service
    );
  }

  async getPendingDecisions(): Promise<IScalingDecision[]> {
    return Array.from(this.decisions.values()).filter(
      decision => decision.executed !== true
    );
  }

  // Планировщик для автоматической оценки масштабирования
  @Cron(CronExpression.EVERY_30_SECONDS)
  async autoEvaluateScaling(): Promise<void> {
    const services = Array.from(
      new Set(Array.from(this.policies.values()).map(p => p._service))
    );

    for (const service of services) {
      try {
        // Симуляция метрик для демонстрации
        const metrics = await this.simulateMetrics();
        const decisions = await this.evaluateScaling(service, metrics);

        if (decisions.length > 0) {
          this.logger.log(
            `Auto-evaluation found ${decisions.length} scaling decisions for service: ${service}`
          );

          // Выполняем решения автоматически
          for (const decision of decisions) {
            await this.executeScaling(decision.id);
          }
        }
      } catch (error) {
        this.logger.error(
          `Failed to auto-evaluate scaling for service: ${service}`,
          error
        );
      }
    }
  }

  private async simulateMetrics(): Promise<Record<ScalingMetric, number>> {
    // Симуляция метрик для демонстрации
    const baseMetrics: Record<ScalingMetric, number> = {
      [ScalingMetric.CPU_USAGE]: 30 + Math.random() * 40, // 30-70%
      [ScalingMetric.MEMORY_USAGE]: 40 + Math.random() * 35, // 40-75%
      [ScalingMetric.REQUEST_RATE]: 200 + Math.random() * 800, // 200-1000 req/sec
      [ScalingMetric.RESPONSE_TIME]: 100 + Math.random() * 400, // 100-500ms
      [ScalingMetric.ERROR_RATE]: Math.random() * 3, // 0-3%
      [ScalingMetric.QUEUE_SIZE]: Math.random() * 50, // 0-50
    };

    // Иногда добавляем пиковые нагрузки для демонстрации
    if (Math.random() < 0.1) {
      // 10% шанс
      baseMetrics[ScalingMetric.CPU_USAGE] = 80 + Math.random() * 20; // 80-100%
      baseMetrics[ScalingMetric.REQUEST_RATE] = 1500 + Math.random() * 1000; // 1500-2500 req/sec
    }

    return baseMetrics;
  }

  // Планировщик для очистки старых решений
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldDecisions(): Promise<void> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [id, decision] of this.decisions.entries()) {
      if (decision.timestamp < oneWeekAgo) {
        this.decisions.delete(id);
        cleanedCount += 1;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} old scaling decisions`);
    }
  }
}

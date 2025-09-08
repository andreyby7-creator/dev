import { Injectable } from '@nestjs/common';
import { redactedLogger } from '../../utils/redacted-logger';

interface ScalingRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  duration: number;
  action: 'scale_up' | 'scale_down' | 'enable_feature' | 'disable_feature';
  parameters: Record<string, unknown>;
  enabled: boolean;
  priority: number;
  cooldown: number;
  lastTriggered?: Date;
}

interface ScalingEvent {
  id: string;
  ruleId: string;
  timestamp: Date;
  metric: string;
  value: number;
  threshold: number;
  action: string;
  parameters: Record<string, unknown>;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
}

interface MetricsData {
  name: string;
  value: number;
  timestamp: Date;
  labels?: Record<string, string>;
}

@Injectable()
export class PredictiveScalingHooksService {
  private readonly scalingRules: Map<string, ScalingRule> = new Map();
  private readonly scalingEvents: Map<string, ScalingEvent> = new Map();
  private readonly checkInterval = 30000; // 30 секунд
  private readonly metricsBuffer: MetricsData[] = [];
  private readonly maxBufferSize = 100;

  constructor() {
    this.initializeDefaultRules();
    this.startMonitoring();
    redactedLogger.log(
      'Predictive Scaling Hooks service initialized',
      'PredictiveScalingHooksService'
    );
  }

  private initializeDefaultRules(): void {
    const cpuRule: ScalingRule = {
      id: 'cpu-high-load',
      name: 'CPU High Load Scaling',
      description: 'Автоматическое масштабирование при высокой нагрузке CPU',
      metric: 'cpu_usage_percent',
      condition: 'gt',
      threshold: 80,
      duration: 300,
      action: 'scale_up',
      parameters: { factor: 2, services: ['api', 'worker'] },
      enabled: true,
      priority: 1,
      cooldown: 600,
    };

    this.scalingRules.set(cpuRule.id, cpuRule);
  }

  private startMonitoring(): void {
    setInterval(() => {
      void this.checkScalingRules();
    }, this.checkInterval);
  }

  // Добавление метрики
  recordMetric(
    name: string,
    value: number,
    labels?: Record<string, string>
  ): void {
    const metric: MetricsData = {
      name,
      value,
      timestamp: new Date(),
      labels: labels ?? {},
    };

    this.metricsBuffer.push(metric);

    // Ограничиваем размер буфера
    if (this.metricsBuffer.length > this.maxBufferSize) {
      this.metricsBuffer.shift();
    }

    redactedLogger.debug(
      `Recorded metric: ${name} = ${value}`,
      'PredictiveScalingHooksService'
    );
  }

  // Проверка правил масштабирования
  private async checkScalingRules(): Promise<void> {
    // Логика проверки правил
    redactedLogger.debug(
      'Checking scaling rules',
      'PredictiveScalingHooksService'
    );
  }

  // Оценка условия правила

  // Создание нового правила
  createRule(ruleData: Omit<ScalingRule, 'id'>): ScalingRule {
    const id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const rule: ScalingRule = {
      ...ruleData,
      id,
    };

    this.scalingRules.set(id, rule);
    redactedLogger.log(
      `Created scaling rule: ${rule.name}`,
      'PredictiveScalingHooksService'
    );

    return rule;
  }

  // Получение правила по ID
  getRule(id: string): ScalingRule | null {
    return this.scalingRules.get(id) ?? null;
  }

  // Получение всех правил
  getAllRules(): ScalingRule[] {
    return Array.from(this.scalingRules.values());
  }

  // Получение правил по действию
  getRulesByAction(action: ScalingRule['action']): ScalingRule[] {
    return Array.from(this.scalingRules.values()).filter(
      r => r.action === action
    );
  }

  // Обновление правила
  updateRule(id: string, updates: Partial<ScalingRule>): ScalingRule | null {
    const rule = this.scalingRules.get(id);
    if (!rule) {
      return null;
    }

    const updatedRule: ScalingRule = {
      ...rule,
      ...updates,
    };

    this.scalingRules.set(id, updatedRule);
    redactedLogger.log(
      `Updated scaling rule: ${updatedRule.name}`,
      'PredictiveScalingHooksService'
    );

    return updatedRule;
  }

  // Удаление правила
  deleteRule(id: string): boolean {
    const deleted = this.scalingRules.delete(id);
    if (deleted) {
      redactedLogger.log(
        `Deleted scaling rule: ${id}`,
        'PredictiveScalingHooksService'
      );
    }
    return deleted;
  }

  // Получение события по ID
  getEvent(id: string): ScalingEvent | null {
    return this.scalingEvents.get(id) ?? null;
  }

  // Получение всех событий
  getAllEvents(): ScalingEvent[] {
    return Array.from(this.scalingEvents.values());
  }

  // Получение событий по правилу
  getEventsByRule(ruleId: string): ScalingEvent[] {
    return Array.from(this.scalingEvents.values()).filter(
      e => e.ruleId === ruleId
    );
  }

  // Получение активных событий
  getActiveEvents(): ScalingEvent[] {
    return Array.from(this.scalingEvents.values()).filter(
      e => e.status === 'executing'
    );
  }

  // Получение статистики
  getStatistics(): {
    totalRules: number;
    enabledRules: number;
    totalEvents: number;
    activeEvents: number;
    successfulEvents: number;
    failedEvents: number;
    lastTriggered: Date | null;
  } {
    const events = Array.from(this.scalingEvents.values());
    const rules = Array.from(this.scalingRules.values());

    let lastTriggered: Date | null = null;
    for (const rule of rules) {
      if (
        rule.lastTriggered &&
        (!lastTriggered || rule.lastTriggered > lastTriggered)
      ) {
        lastTriggered = rule.lastTriggered;
      }
    }

    return {
      totalRules: rules.length,
      enabledRules: rules.filter(r => r.enabled).length,
      totalEvents: events.length,
      activeEvents: events.filter(e => e.status === 'executing').length,
      successfulEvents: events.filter(e => e.status === 'completed').length,
      failedEvents: events.filter(e => e.status === 'failed').length,
      lastTriggered,
    };
  }

  // Получение текущих метрик
  getCurrentMetrics(): MetricsData[] {
    return [...this.metricsBuffer];
  }

  // Очистка старых метрик
  clearOldMetrics(olderThanHours: number): number {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    const initialSize = this.metricsBuffer.length;

    const filtered = this.metricsBuffer.filter(m => m.timestamp > cutoff);
    this.metricsBuffer.length = 0;
    this.metricsBuffer.push(...filtered);

    const cleared = initialSize - this.metricsBuffer.length;
    if (cleared > 0) {
      redactedLogger.log(
        `Cleared ${cleared} old metrics`,
        'PredictiveScalingHooksService'
      );
    }

    return cleared;
  }
}

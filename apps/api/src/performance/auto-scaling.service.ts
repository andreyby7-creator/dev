import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface IScalingPolicy {
  id: string;
  name: string;
  description: string;
  _service: string;
  enabled: boolean;
  minReplicas: number;
  maxReplicas: number;
  targetCpu: number;
  targetMemory: number;
  targetRequestsPerSecond: number;
  scaleUpCooldown: number; // seconds
  scaleDownCooldown: number; // seconds
  scaleUpStep: number;
  scaleDownStep: number;
  metrics: {
    cpu: boolean;
    memory: boolean;
    requests: boolean;
    custom: string[];
  };
  conditions: Array<{
    metric: string;
    operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
    threshold: number;
    duration: number; // seconds
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IScalingEvent {
  id: string;
  policyId: string;
  _service: string;
  action: 'scale_up' | 'scale_down' | 'no_action';
  reason: string;
  currentReplicas: number;
  targetReplicas: number;
  actualReplicas: number;
  metrics: {
    cpu: number;
    memory: number;
    requests: number;
    custom: Record<string, number>;
  };
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  error?: string;
}

export interface IServiceMetrics {
  _service: string;
  timestamp: Date;
  replicas: number;
  cpu: {
    current: number;
    average: number;
    peak: number;
  };
  memory: {
    current: number;
    average: number;
    peak: number;
  };
  requests: {
    perSecond: number;
    perMinute: number;
    total: number;
  };
  custom: Record<string, number>;
}

export interface IScalingRecommendation {
  id: string;
  _service: string;
  type: 'scale_up' | 'scale_down' | 'optimize';
  priority: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  currentMetrics: Record<string, number>;
  recommendedAction: string;
  estimatedImpact: string;
  confidence: number; // 0-100
  createdAt: Date;
}

@Injectable()
export class AutoScalingService {
  private readonly logger = new Logger(AutoScalingService.name);
  private scalingPolicies = new Map<string, IScalingPolicy>();
  private scalingEvents = new Map<string, IScalingEvent>();
  private serviceMetrics = new Map<string, IServiceMetrics[]>();
  private lastScalingTime = new Map<string, Date>();
  private scalingRecommendations = new Map<string, IScalingRecommendation>();

  constructor(
    private _configService: ConfigService,
    private eventEmitter: EventEmitter2
  ) {
    this.initializeDefaultPolicies();
    this.startScalingMonitoring();
    // Используем _configService
    this._configService.get('AUTO_SCALING_ENABLED');
  }

  private initializeDefaultPolicies(): void {
    const defaultPolicies: IScalingPolicy[] = [
      {
        id: 'api-service-policy',
        name: 'API Service Scaling Policy',
        description: 'Auto-scaling policy for API services',
        _service: 'api-service',
        enabled: true,
        minReplicas: 2,
        maxReplicas: 10,
        targetCpu: 70,
        targetMemory: 80,
        targetRequestsPerSecond: 100,
        scaleUpCooldown: 300, // 5 minutes
        scaleDownCooldown: 600, // 10 minutes
        scaleUpStep: 2,
        scaleDownStep: 1,
        metrics: {
          cpu: true,
          memory: true,
          requests: true,
          custom: [],
        },
        conditions: [
          {
            metric: 'cpu',
            operator: 'gt',
            threshold: 70,
            duration: 300, // 5 minutes
          },
          {
            metric: 'memory',
            operator: 'gt',
            threshold: 80,
            duration: 300,
          },
          {
            metric: 'requests',
            operator: 'gt',
            threshold: 100,
            duration: 180, // 3 minutes
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'database-service-policy',
        name: 'Database Service Scaling Policy',
        description: 'Auto-scaling policy for database services',
        _service: 'database-service',
        enabled: true,
        minReplicas: 1,
        maxReplicas: 5,
        targetCpu: 60,
        targetMemory: 70,
        targetRequestsPerSecond: 50,
        scaleUpCooldown: 600, // 10 minutes
        scaleDownCooldown: 1200, // 20 minutes
        scaleUpStep: 1,
        scaleDownStep: 1,
        metrics: {
          cpu: true,
          memory: true,
          requests: false,
          custom: ['connection_pool_usage', 'query_time'],
        },
        conditions: [
          {
            metric: 'cpu',
            operator: 'gt',
            threshold: 60,
            duration: 600,
          },
          {
            metric: 'memory',
            operator: 'gt',
            threshold: 70,
            duration: 600,
          },
          {
            metric: 'connection_pool_usage',
            operator: 'gt',
            threshold: 80,
            duration: 300,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'cache-service-policy',
        name: 'Cache Service Scaling Policy',
        description: 'Auto-scaling policy for cache services',
        _service: 'cache-service',
        enabled: true,
        minReplicas: 1,
        maxReplicas: 8,
        targetCpu: 50,
        targetMemory: 60,
        targetRequestsPerSecond: 200,
        scaleUpCooldown: 180, // 3 minutes
        scaleDownCooldown: 600, // 10 minutes
        scaleUpStep: 2,
        scaleDownStep: 1,
        metrics: {
          cpu: true,
          memory: true,
          requests: true,
          custom: ['hit_rate', 'eviction_rate'],
        },
        conditions: [
          {
            metric: 'cpu',
            operator: 'gt',
            threshold: 50,
            duration: 180,
          },
          {
            metric: 'memory',
            operator: 'gt',
            threshold: 60,
            duration: 180,
          },
          {
            metric: 'hit_rate',
            operator: 'lt',
            threshold: 80,
            duration: 300,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    defaultPolicies.forEach(policy => {
      this.scalingPolicies.set(policy.id, policy);
    });

    this.logger.log(
      `Initialized ${defaultPolicies.length} default scaling policies`
    );
  }

  private startScalingMonitoring(): void {
    // Собираем метрики каждые 30 секунд
    setInterval(() => {
      void this.collectServiceMetrics();
    }, 30000);

    // Проверяем условия масштабирования каждую минуту
    setInterval(() => {
      void this.evaluateScalingConditions();
    }, 60000);
  }

  private async collectServiceMetrics(): Promise<void> {
    try {
      const services = ['api-service', 'database-service', 'cache-service'];

      for (const service of services) {
        // Симуляция сбора метрик
        const metrics: IServiceMetrics = {
          _service: service,
          timestamp: new Date(),
          replicas: Math.floor(Math.random() * 5) + 1, // 1-5 реплик
          cpu: {
            current: Math.random() * 100,
            average: Math.random() * 100,
            peak: Math.random() * 100,
          },
          memory: {
            current: Math.random() * 100,
            average: Math.random() * 100,
            peak: Math.random() * 100,
          },
          requests: {
            perSecond: Math.random() * 200,
            perMinute: Math.random() * 200 * 60,
            total: Math.floor(Math.random() * 10000),
          },
          custom: {
            connection_pool_usage: Math.random() * 100,
            query_time: Math.random() * 1000,
            hit_rate: Math.random() * 100,
            eviction_rate: Math.random() * 10,
          },
        };

        const existingMetrics = this.serviceMetrics.get(service) ?? [];
        existingMetrics.push(metrics);

        // Ограничиваем количество метрик (храним последние 100)
        if (existingMetrics.length > 100) {
          existingMetrics.splice(0, existingMetrics.length - 100);
        }

        this.serviceMetrics.set(service, existingMetrics);
      }

      this.logger.debug('Service metrics collected');
    } catch (error) {
      this.logger.error('Error collecting service metrics:', error);
    }
  }

  private async evaluateScalingConditions(): Promise<void> {
    try {
      for (const [, policy] of this.scalingPolicies) {
        if (!policy.enabled) {
          continue;
        }

        await this.evaluatePolicy(policy);
      }
    } catch (error) {
      this.logger.error('Error evaluating scaling conditions:', error);
    }
  }

  private async evaluatePolicy(policy: IScalingPolicy): Promise<void> {
    try {
      const serviceMetrics = this.serviceMetrics.get(policy._service);
      if (!serviceMetrics || serviceMetrics.length === 0) {
        return;
      }

      // Получаем последние метрики
      const recentMetrics = serviceMetrics.slice(-10); // Последние 10 измерений
      const currentMetrics = recentMetrics[recentMetrics.length - 1];

      // Проверяем каждое условие
      let shouldScaleUp = false;
      let shouldScaleDown = false;
      const triggeredConditions: string[] = [];

      for (const condition of policy.conditions) {
        const metricValue = currentMetrics
          ? this.getMetricValue(currentMetrics, condition.metric)
          : 0;
        const conditionMet = this.evaluateCondition(
          metricValue,
          condition.operator,
          condition.threshold
        );

        if (conditionMet) {
          triggeredConditions.push(
            `${condition.metric} ${condition.operator} ${condition.threshold}`
          );

          // Определяем направление масштабирования
          if (condition.operator === 'gt' || condition.operator === 'gte') {
            shouldScaleUp = true;
          } else if (
            condition.operator === 'lt' ||
            condition.operator === 'lte'
          ) {
            shouldScaleDown = true;
          }
        }
      }

      // Проверяем cooldown
      const lastScaling = this.lastScalingTime.get(policy._service);
      const now = new Date();
      const cooldownPeriod = shouldScaleUp
        ? policy.scaleUpCooldown
        : policy.scaleDownCooldown;

      if (
        lastScaling &&
        now.getTime() - lastScaling.getTime() < cooldownPeriod * 1000
      ) {
        return; // В периоде cooldown
      }

      // Выполняем масштабирование
      if (
        shouldScaleUp &&
        currentMetrics &&
        currentMetrics.replicas < policy.maxReplicas
      ) {
        await this.scaleService(
          policy,
          'scale_up',
          triggeredConditions.join(', '),
          currentMetrics
        );
      } else if (
        shouldScaleDown &&
        currentMetrics &&
        currentMetrics.replicas > policy.minReplicas
      ) {
        await this.scaleService(
          policy,
          'scale_down',
          triggeredConditions.join(', '),
          currentMetrics
        );
      }
    } catch (error) {
      this.logger.error(`Error evaluating policy ${policy.id}:`, error);
    }
  }

  private getMetricValue(metrics: IServiceMetrics, metricName: string): number {
    switch (metricName) {
      case 'cpu':
        return metrics.cpu.current;
      case 'memory':
        return metrics.memory.current;
      case 'requests':
        return metrics.requests.perSecond;
      default:
        return metrics.custom[metricName] ?? 0;
    }
  }

  private evaluateCondition(
    value: number,
    operator: string,
    threshold: number
  ): boolean {
    switch (operator) {
      case 'gt':
        return value > threshold;
      case 'lt':
        return value < threshold;
      case 'gte':
        return value >= threshold;
      case 'lte':
        return value <= threshold;
      case 'eq':
        return value === threshold;
      default:
        return false;
    }
  }

  private async scaleService(
    policy: IScalingPolicy,
    action: 'scale_up' | 'scale_down',
    reason: string,
    currentMetrics: IServiceMetrics
  ): Promise<void> {
    const eventId = `scaling-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let targetReplicas = currentMetrics.replicas;
    if (action === 'scale_up') {
      targetReplicas = Math.min(
        currentMetrics.replicas + policy.scaleUpStep,
        policy.maxReplicas
      );
    } else {
      targetReplicas = Math.max(
        currentMetrics.replicas - policy.scaleDownStep,
        policy.minReplicas
      );
    }

    const scalingEvent: IScalingEvent = {
      id: eventId,
      policyId: policy.id,
      _service: policy._service,
      action,
      reason,
      currentReplicas: currentMetrics.replicas,
      targetReplicas,
      actualReplicas: currentMetrics.replicas, // Будет обновлено после завершения
      metrics: {
        cpu: currentMetrics.cpu.current,
        memory: currentMetrics.memory.current,
        requests: currentMetrics.requests.perSecond,
        custom: currentMetrics.custom,
      },
      status: 'pending',
      startTime: new Date(),
    };

    this.scalingEvents.set(eventId, scalingEvent);
    this.lastScalingTime.set(policy._service, new Date());

    // Эмитим событие
    this.eventEmitter.emit('scaling.started', scalingEvent);

    // Симуляция масштабирования
    setTimeout(
      () => {
        void this.completeScaling(eventId, 'completed');
      },
      Math.random() * 30000 + 10000
    ); // 10-40 секунд

    this.logger.log(
      `Scaling ${action} initiated for ${policy._service}: ${currentMetrics.replicas} -> ${targetReplicas} (${reason})`
    );
  }

  async completeScaling(
    eventId: string,
    status: 'completed' | 'failed',
    error?: string
  ): Promise<IScalingEvent> {
    const event = this.scalingEvents.get(eventId);
    if (!event) {
      throw new Error(`Scaling event ${eventId} not found`);
    }

    event.status = status;
    event.endTime = new Date();
    event.duration = event.endTime.getTime() - event.startTime.getTime();

    if (status === 'completed') {
      event.actualReplicas = event.targetReplicas;
    } else {
      event.error = error ?? '';
    }

    // Эмитим событие
    this.eventEmitter.emit('scaling.completed', event);

    this.logger.log(
      `Scaling event ${eventId} completed with status: ${status}`
    );

    return event;
  }

  async createScalingPolicy(
    policy: Omit<IScalingPolicy, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<IScalingPolicy> {
    const id = `policy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newPolicy: IScalingPolicy = {
      ...policy,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.scalingPolicies.set(id, newPolicy);

    this.logger.log(
      `Created scaling policy: ${id} for service ${policy._service}`
    );

    return newPolicy;
  }

  async updateScalingPolicy(
    id: string,
    updates: Partial<IScalingPolicy>
  ): Promise<IScalingPolicy | null> {
    const policy = this.scalingPolicies.get(id);
    if (!policy) {
      return null;
    }

    const updatedPolicy = {
      ...policy,
      ...updates,
      id, // Не позволяем изменять ID
      updatedAt: new Date(),
    };

    this.scalingPolicies.set(id, updatedPolicy);

    this.logger.log(`Updated scaling policy: ${id}`);

    return updatedPolicy;
  }

  async deleteScalingPolicy(id: string): Promise<boolean> {
    const deleted = this.scalingPolicies.delete(id);
    if (deleted) {
      this.logger.log(`Deleted scaling policy: ${id}`);
    }
    return deleted;
  }

  async getScalingPolicy(id: string): Promise<IScalingPolicy | null> {
    return this.scalingPolicies.get(id) ?? null;
  }

  async getAllScalingPolicies(): Promise<IScalingPolicy[]> {
    return Array.from(this.scalingPolicies.values());
  }

  async getScalingEvents(filters?: {
    service?: string;
    action?: string;
    status?: string;
    limit?: number;
  }): Promise<IScalingEvent[]> {
    let events = Array.from(this.scalingEvents.values());

    if (filters) {
      if (filters.service != null) {
        events = events.filter(e => e._service === filters.service);
      }
      if (filters.action != null) {
        events = events.filter(e => e.action === filters.action);
      }
      if (filters.status != null) {
        events = events.filter(e => e.status === filters.status);
      }
    }

    events = events.sort(
      (a, b) => b.startTime.getTime() - a.startTime.getTime()
    );

    if (filters?.limit != null && filters.limit > 0) {
      events = events.slice(0, filters.limit);
    }

    return events;
  }

  async getServiceMetrics(
    _service: string,
    timeRange?: { from: Date; to: Date }
  ): Promise<IServiceMetrics[]> {
    let metrics = this.serviceMetrics.get(_service) ?? [];

    if (timeRange != null) {
      metrics = metrics.filter(
        m => m.timestamp >= timeRange.from && m.timestamp <= timeRange.to
      );
    }

    return metrics.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  async generateScalingRecommendations(
    _service: string
  ): Promise<IScalingRecommendation[]> {
    const metrics = this.serviceMetrics.get(_service);
    if (metrics == null || metrics.length === 0) {
      return [];
    }

    const recentMetrics = metrics.slice(-20); // Последние 20 измерений
    const avgCpu =
      recentMetrics.reduce((sum, m) => sum + m.cpu.current, 0) /
      recentMetrics.length;
    const avgMemory =
      recentMetrics.reduce((sum, m) => sum + m.memory.current, 0) /
      recentMetrics.length;
    const avgRequests =
      recentMetrics.reduce((sum, m) => sum + m.requests.perSecond, 0) /
      recentMetrics.length;
    const currentReplicas =
      recentMetrics[recentMetrics.length - 1]?.replicas ?? 1;

    const recommendations: IScalingRecommendation[] = [];

    // Рекомендация по CPU
    if (avgCpu > 80) {
      recommendations.push({
        id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        _service: _service,
        type: 'scale_up',
        priority: 'high',
        reason: `High CPU usage: ${avgCpu.toFixed(1)}%`,
        currentMetrics: {
          cpu: avgCpu,
          memory: avgMemory,
          requests: avgRequests,
        },
        recommendedAction: `Scale up to ${Math.min(currentReplicas + 2, 10)} replicas`,
        estimatedImpact: 'Reduced response times and improved throughput',
        confidence: 85,
        createdAt: new Date(),
      });
    } else if (avgCpu < 30 && currentReplicas > 1) {
      recommendations.push({
        id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        _service: _service,
        type: 'scale_down',
        priority: 'medium',
        reason: `Low CPU usage: ${avgCpu.toFixed(1)}%`,
        currentMetrics: {
          cpu: avgCpu,
          memory: avgMemory,
          requests: avgRequests,
        },
        recommendedAction: `Scale down to ${Math.max(currentReplicas - 1, 1)} replicas`,
        estimatedImpact: 'Reduced resource costs',
        confidence: 75,
        createdAt: new Date(),
      });
    }

    // Рекомендация по памяти
    if (avgMemory > 85) {
      recommendations.push({
        id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        _service: _service,
        type: 'scale_up',
        priority: 'critical',
        reason: `High memory usage: ${avgMemory.toFixed(1)}%`,
        currentMetrics: {
          cpu: avgCpu,
          memory: avgMemory,
          requests: avgRequests,
        },
        recommendedAction: `Scale up to ${Math.min(currentReplicas + 1, 10)} replicas`,
        estimatedImpact: 'Prevented out-of-memory errors',
        confidence: 90,
        createdAt: new Date(),
      });
    }

    // Рекомендация по оптимизации
    if (avgCpu > 60 && avgMemory > 60) {
      recommendations.push({
        id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        _service: _service,
        type: 'optimize',
        priority: 'medium',
        reason: 'High resource utilization',
        currentMetrics: {
          cpu: avgCpu,
          memory: avgMemory,
          requests: avgRequests,
        },
        recommendedAction: 'Optimize application code and database queries',
        estimatedImpact: 'Improved efficiency and reduced resource usage',
        confidence: 70,
        createdAt: new Date(),
      });
    }

    // Сохраняем рекомендации
    recommendations.forEach(rec => {
      this.scalingRecommendations.set(rec.id, rec);
    });

    return recommendations;
  }

  async getScalingRecommendations(
    service?: string,
    priority?: string
  ): Promise<IScalingRecommendation[]> {
    let recommendations = Array.from(this.scalingRecommendations.values());

    if (service != null) {
      recommendations = recommendations.filter(r => r._service === service);
    }

    if (priority != null) {
      recommendations = recommendations.filter(r => r.priority === priority);
    }

    return recommendations.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async getScalingSummary(): Promise<{
    totalPolicies: number;
    activePolicies: number;
    totalEvents: number;
    eventsByAction: Record<string, number>;
    eventsByStatus: Record<string, number>;
    averageScalingTime: number;
    topScalingServices: Array<{ _service: string; eventCount: number }>;
  }> {
    const policies = Array.from(this.scalingPolicies.values());
    const events = Array.from(this.scalingEvents.values());

    const activePolicies = policies.filter(p => p.enabled).length;

    const eventsByAction = events.reduce(
      (acc, event) => {
        acc[event.action] = (acc[event.action] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const eventsByStatus = events.reduce(
      (acc, event) => {
        acc[event.status] = (acc[event.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const completedEvents = events.filter(e => e.duration != null);
    const averageScalingTime =
      completedEvents.length > 0
        ? completedEvents.reduce((sum, e) => sum + (e.duration ?? 0), 0) /
          completedEvents.length
        : 0;

    const serviceEventCounts = events.reduce(
      (acc, event) => {
        acc[event._service] = (acc[event._service] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const topScalingServices = Object.entries(serviceEventCounts)
      .map(([service, eventCount]) => ({ _service: service, eventCount }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 10);

    return {
      totalPolicies: policies.length,
      activePolicies,
      totalEvents: events.length,
      eventsByAction,
      eventsByStatus,
      averageScalingTime,
      topScalingServices,
    };
  }
}

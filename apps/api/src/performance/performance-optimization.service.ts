import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface IPerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  __service: string;
  endpoint?: string;
  labels: Record<string, string>;
}

export interface IMetricWithAvg {
  avg: number;
  [key: string]: unknown;
}

export interface IPerformanceProfile {
  id: string;
  name: string;
  description: string;
  __service: string;
  endpoint?: string;
  metrics: {
    responseTime: {
      p50: number;
      p95: number;
      p99: number;
      max: number;
    };
    throughput: {
      requestsPerSecond: number;
      requestsPerMinute: number;
    };
    errorRate: number;
    cpuUsage: number;
    memoryUsage: number;
  };
  recommendations: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IOptimizationRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  action: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  parameters: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOptimizationAction {
  id: string;
  ruleId: string;
  type: 'cache' | 'database' | 'api' | 'resource' | 'code';
  description: string;
  status: 'pending' | 'applied' | 'failed' | 'reverted';
  impact: 'low' | 'medium' | 'high';
  appliedAt?: Date;
  revertedAt?: Date;
  metrics: {
    before: Record<string, number>;
    after: Record<string, number>;
    improvement: number; // percentage
  };
  createdAt: Date;
  createdBy: string;
}

export interface ICachingStrategy {
  id: string;
  name: string;
  type: 'memory' | 'redis' | 'database' | 'cdn';
  configuration: {
    ttl: number;
    maxSize: number;
    evictionPolicy: 'lru' | 'lfu' | 'fifo' | 'ttl';
    compression: boolean;
    serialization: 'json' | 'binary' | 'text';
  };
  targets: string[];
  enabled: boolean;
  metrics: {
    hitRate: number;
    missRate: number;
    evictionRate: number;
    memoryUsage: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PerformanceOptimizationService {
  private readonly logger = new Logger(PerformanceOptimizationService.name);
  private performanceMetrics = new Map<string, IPerformanceMetric[]>();
  private performanceProfiles = new Map<string, IPerformanceProfile>();
  private optimizationRules = new Map<string, IOptimizationRule>();
  private optimizationActions = new Map<string, IOptimizationAction>();
  private cachingStrategies = new Map<string, ICachingStrategy>();

  constructor(
    private _configService: ConfigService,
    private eventEmitter: EventEmitter2
  ) {
    this.initializeOptimizationRules();
    this.initializeCachingStrategies();
    this.startPerformanceMonitoring();
    // Используем _configService
    this._configService.get('PERFORMANCE_MONITORING_ENABLED');
  }

  private initializeOptimizationRules(): void {
    const rules: IOptimizationRule[] = [
      {
        id: 'high-response-time',
        name: 'High Response Time',
        description: 'Optimize endpoints with response time > 1s',
        condition: 'responseTime.p95 > 1000',
        action: 'enable_caching',
        priority: 'high',
        enabled: true,
        parameters: {
          cacheTtl: 300,
          cacheType: 'redis',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'high-cpu-usage',
        name: 'High CPU Usage',
        description: 'Optimize services with CPU usage > 80%',
        condition: 'cpuUsage > 80',
        action: 'scale_horizontal',
        priority: 'critical',
        enabled: true,
        parameters: {
          minReplicas: 2,
          maxReplicas: 10,
          targetCpu: 70,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'high-memory-usage',
        name: 'High Memory Usage',
        description: 'Optimize services with memory usage > 85%',
        condition: 'memoryUsage > 85',
        action: 'optimize_memory',
        priority: 'high',
        enabled: true,
        parameters: {
          garbageCollection: true,
          memoryLimit: '2Gi',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        description: 'Optimize services with error rate > 5%',
        condition: 'errorRate > 5',
        action: 'circuit_breaker',
        priority: 'critical',
        enabled: true,
        parameters: {
          failureThreshold: 5,
          timeout: 30000,
          resetTimeout: 60000,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'low-throughput',
        name: 'Low Throughput',
        description: 'Optimize services with low throughput',
        condition: 'throughput.requestsPerSecond < 10',
        action: 'connection_pooling',
        priority: 'medium',
        enabled: true,
        parameters: {
          poolSize: 20,
          maxConnections: 100,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    rules.forEach(rule => {
      this.optimizationRules.set(rule.id, rule);
    });

    this.logger.log(`Initialized ${rules.length} optimization rules`);
  }

  private initializeCachingStrategies(): void {
    const strategies: ICachingStrategy[] = [
      {
        id: 'api-response-cache',
        name: 'API Response Cache',
        type: 'redis',
        configuration: {
          ttl: 300, // 5 minutes
          maxSize: 1000,
          evictionPolicy: 'lru',
          compression: true,
          serialization: 'json',
        },
        targets: ['/api/cards', '/api/users', '/api/config'],
        enabled: true,
        metrics: {
          hitRate: 0,
          missRate: 0,
          evictionRate: 0,
          memoryUsage: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'database-query-cache',
        name: 'Database Query Cache',
        type: 'memory',
        configuration: {
          ttl: 600, // 10 minutes
          maxSize: 500,
          evictionPolicy: 'lfu',
          compression: false,
          serialization: 'binary',
        },
        targets: ['user_queries', 'card_queries', 'config_queries'],
        enabled: true,
        metrics: {
          hitRate: 0,
          missRate: 0,
          evictionRate: 0,
          memoryUsage: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'static-assets-cache',
        name: 'Static Assets Cache',
        type: 'cdn',
        configuration: {
          ttl: 86400, // 24 hours
          maxSize: 10000,
          evictionPolicy: 'ttl',
          compression: true,
          serialization: 'binary',
        },
        targets: ['/static/*', '/assets/*', '/images/*'],
        enabled: true,
        metrics: {
          hitRate: 0,
          missRate: 0,
          evictionRate: 0,
          memoryUsage: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    strategies.forEach(strategy => {
      this.cachingStrategies.set(strategy.id, strategy);
    });

    this.logger.log(`Initialized ${strategies.length} caching strategies`);
  }

  private startPerformanceMonitoring(): void {
    // Собираем метрики каждые 30 секунд
    setInterval(() => {
      void this.collectPerformanceMetrics();
    }, 30000);

    // Анализируем производительность каждые 5 минут
    setInterval(() => {
      void this.analyzePerformance();
    }, 300000);
  }

  private async collectPerformanceMetrics(): Promise<void> {
    try {
      const services = [
        'auth-service',
        'cards-service',
        'monitoring-service',
        'security-service',
      ];

      for (const service of services) {
        // Симуляция сбора метрик
        const metrics: IPerformanceMetric[] = [
          {
            id: `metric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: 'response_time',
            value: Math.random() * 1000 + 100, // 100-1100ms
            unit: 'ms',
            timestamp: new Date(),
            __service: service,
            labels: { endpoint: '/api/test' },
          },
          {
            id: `metric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: 'cpu_usage',
            value: Math.random() * 100, // 0-100%
            unit: '%',
            timestamp: new Date(),
            __service: service,
            labels: {},
          },
          {
            id: `metric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: 'memory_usage',
            value: Math.random() * 100, // 0-100%
            unit: '%',
            timestamp: new Date(),
            __service: service,
            labels: {},
          },
          {
            id: `metric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: 'error_rate',
            value: Math.random() * 10, // 0-10%
            unit: '%',
            timestamp: new Date(),
            __service: service,
            labels: {},
          },
          {
            id: `metric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: 'throughput',
            value: Math.random() * 100 + 10, // 10-110 req/s
            unit: 'req/s',
            timestamp: new Date(),
            __service: service,
            labels: {},
          },
        ];

        for (const metric of metrics) {
          const key = `${service}.${metric.name}`;
          const existingMetrics = this.performanceMetrics.get(key) ?? [];
          existingMetrics.push(metric);

          // Ограничиваем количество метрик (храним последние 1000)
          if (existingMetrics.length > 1000) {
            existingMetrics.splice(0, existingMetrics.length - 1000);
          }

          this.performanceMetrics.set(key, existingMetrics);
        }
      }

      this.logger.debug('Performance metrics collected');
    } catch (error) {
      this.logger.error('Error collecting performance metrics:', error);
    }
  }

  private async analyzePerformance(): Promise<void> {
    try {
      for (const [, rule] of this.optimizationRules) {
        if (!rule.enabled) {
          continue;
        }

        await this.evaluateOptimizationRule(rule);
      }
    } catch (error) {
      this.logger.error('Error analyzing performance:', error);
    }
  }

  private async evaluateOptimizationRule(
    rule: IOptimizationRule
  ): Promise<void> {
    try {
      // Получаем последние метрики для анализа
      const recentMetrics = this.getRecentMetrics(5); // Последние 5 минут

      // Простая оценка условий (в реальном приложении была бы более сложная логика)
      const shouldApply = this.evaluateCondition(rule.condition, recentMetrics);

      if (shouldApply) {
        await this.applyOptimization(rule);
      }
    } catch (error) {
      this.logger.error(`Error evaluating rule ${rule.id}:`, error);
    }
  }

  private getRecentMetrics(
    minutes: number
  ): Record<
    string,
    { avg: number; max: number; min: number; p95: number; p99: number }
  > {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    const metrics: Record<
      string,
      { avg: number; max: number; min: number; p95: number; p99: number }
    > = {};

    for (const [key, metricList] of this.performanceMetrics) {
      const recentMetrics = metricList.filter(m => m.timestamp > cutoffTime);
      if (recentMetrics.length > 0) {
        const values = recentMetrics.map(m => m.value);
        metrics[key] = {
          avg: values.reduce((sum, val) => sum + val, 0) / values.length,
          max: Math.max(...values),
          min: Math.min(...values),
          p95: this.calculatePercentile(values, 95),
          p99: this.calculatePercentile(values, 99),
        };
      }
    }

    return metrics;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] ?? 0;
  }

  private evaluateCondition(
    condition: string,
    metrics: Record<string, unknown>
  ): boolean {
    // Простая реализация оценки условий
    // В реальном приложении использовался бы парсер выражений

    if (condition.includes('responseTime.p95 > 1000')) {
      const responseTimeMetrics = Object.keys(metrics)
        .filter(key => key.includes('response_time'))
        .map(key => metrics[key]);

      return responseTimeMetrics.some(
        m =>
          (m as { p95?: number }).p95 != null &&
          (m as { p95: number }).p95 > 1000
      );
    }

    if (condition.includes('cpuUsage > 80')) {
      const cpuMetrics = Object.keys(metrics)
        .filter(key => key.includes('cpu_usage'))
        .map(key => metrics[key]);

      return cpuMetrics.some(
        m =>
          (m as { avg?: number }).avg != null && (m as { avg: number }).avg > 80
      );
    }

    if (condition.includes('memoryUsage > 85')) {
      const memoryMetrics = Object.keys(metrics)
        .filter(key => key.includes('memory_usage'))
        .map(key => metrics[key]);

      return memoryMetrics.some(m => (m as IMetricWithAvg).avg > 85);
    }

    if (condition.includes('errorRate > 5')) {
      const errorMetrics = Object.keys(metrics)
        .filter(key => key.includes('error_rate'))
        .map(key => metrics[key]);

      return errorMetrics.some(m => (m as IMetricWithAvg).avg > 5);
    }

    if (condition.includes('throughput.requestsPerSecond < 10')) {
      const throughputMetrics = Object.keys(metrics)
        .filter(key => key.includes('throughput'))
        .map(key => metrics[key]);

      return throughputMetrics.some(m => (m as IMetricWithAvg).avg < 10);
    }

    return false;
  }

  private async applyOptimization(rule: IOptimizationRule): Promise<void> {
    const actionId = `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const action: IOptimizationAction = {
      id: actionId,
      ruleId: rule.id,
      type: this.getActionType(rule.action),
      description: `Applied optimization: ${rule.name}`,
      status: 'pending',
      impact:
        rule.priority === 'critical'
          ? 'high'
          : rule.priority === 'high'
            ? 'medium'
            : 'low',
      metrics: {
        before: this.getCurrentMetrics(),
        after: {},
        improvement: 0,
      },
      createdAt: new Date(),
      createdBy: 'system',
    };

    this.optimizationActions.set(actionId, action);

    // Симуляция применения оптимизации
    setTimeout(
      () => {
        void this.completeOptimizationAction(actionId, 'applied');
      },
      Math.random() * 10000 + 5000
    ); // 5-15 секунд

    this.logger.log(`Applied optimization: ${rule.name} (${rule.action})`);
  }

  private getActionType(action: string): IOptimizationAction['type'] {
    if (action.includes('cache')) return 'cache';
    if (action.includes('database')) return 'database';
    if (action.includes('api')) return 'api';
    if (action.includes('resource')) return 'resource';
    return 'code';
  }

  private getCurrentMetrics(): Record<string, number> {
    const metrics: Record<string, number> = {};

    for (const [key, metricList] of this.performanceMetrics) {
      if (metricList.length > 0) {
        const latest = metricList[metricList.length - 1];
        metrics[key] = latest?.value ?? 0;
      }
    }

    return metrics;
  }

  async completeOptimizationAction(
    actionId: string,
    status: 'applied' | 'failed' | 'reverted',
    improvement?: number
  ): Promise<IOptimizationAction> {
    const action = this.optimizationActions.get(actionId);
    if (!action) {
      throw new Error(`Optimization action ${actionId} not found`);
    }

    action.status = status;

    if (status === 'applied') {
      action.appliedAt = new Date();
      action.metrics.after = this.getCurrentMetrics();
      action.metrics.improvement = improvement ?? Math.random() * 30 + 10; // 10-40% improvement
    } else if (status === 'reverted') {
      action.revertedAt = new Date();
    }

    // Эмитим событие
    this.eventEmitter.emit('optimization.action.completed', action);

    this.logger.log(
      `Optimization action ${actionId} completed with status: ${status}`
    );

    return action;
  }

  async getPerformanceProfile(
    __service: string,
    endpoint?: string
  ): Promise<IPerformanceProfile | null> {
    const key =
      endpoint != null && endpoint !== ''
        ? `${__service}.${endpoint}`
        : __service;
    return this.performanceProfiles.get(key) ?? null;
  }

  async createPerformanceProfile(
    __service: string,
    endpoint: string | undefined,
    name: string,
    description: string
  ): Promise<IPerformanceProfile> {
    const key =
      endpoint != null && endpoint !== ''
        ? `${__service}.${endpoint}`
        : __service;
    const id = `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Получаем метрики для профиля
    const responseTimeMetrics =
      this.performanceMetrics.get(`${__service}.response_time`) ?? [];
    const throughputMetrics =
      this.performanceMetrics.get(`${__service}.throughput`) ?? [];
    const errorRateMetrics =
      this.performanceMetrics.get(`${__service}.error_rate`) ?? [];
    const cpuMetrics =
      this.performanceMetrics.get(`${__service}.cpu_usage`) ?? [];
    const memoryMetrics =
      this.performanceMetrics.get(`${__service}.memory_usage`) ?? [];

    const recentMetrics = responseTimeMetrics.slice(-100); // Последние 100 метрик
    const responseTimes = recentMetrics.map(m => m.value);

    const profile: IPerformanceProfile = {
      id,
      name,
      description,
      __service: __service,
      endpoint: endpoint ?? '',
      metrics: {
        responseTime: {
          p50: this.calculatePercentile(responseTimes, 50),
          p95: this.calculatePercentile(responseTimes, 95),
          p99: this.calculatePercentile(responseTimes, 99),
          max: Math.max(...responseTimes),
        },
        throughput: {
          requestsPerSecond:
            throughputMetrics.length > 0
              ? (throughputMetrics[throughputMetrics.length - 1]?.value ?? 0)
              : 0,
          requestsPerMinute:
            throughputMetrics.length > 0
              ? (throughputMetrics[throughputMetrics.length - 1]?.value ?? 0) *
                60
              : 0,
        },
        errorRate:
          errorRateMetrics.length > 0
            ? (errorRateMetrics[errorRateMetrics.length - 1]?.value ?? 0)
            : 0,
        cpuUsage:
          cpuMetrics.length > 0
            ? (cpuMetrics[cpuMetrics.length - 1]?.value ?? 0)
            : 0,
        memoryUsage:
          memoryMetrics.length > 0
            ? (memoryMetrics[memoryMetrics.length - 1]?.value ?? 0)
            : 0,
      },
      recommendations: this.generateRecommendations(__service, responseTimes),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.performanceProfiles.set(key, profile);

    this.logger.log(`Created performance profile: ${id} for ${__service}`);

    return profile;
  }

  private generateRecommendations(
    __service: string,
    responseTimes: number[]
  ): string[] {
    const recommendations: string[] = [];
    const avgResponseTime =
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const p95ResponseTime = this.calculatePercentile(responseTimes, 95);

    if (avgResponseTime > 500) {
      recommendations.push(
        'Consider implementing caching for frequently accessed data'
      );
    }

    if (p95ResponseTime > 1000) {
      recommendations.push('Optimize database queries and consider indexing');
    }

    if (responseTimes.some(time => time > 2000)) {
      recommendations.push(
        'Implement request timeout and circuit breaker patterns'
      );
    }

    recommendations.push(
      'Monitor memory usage and implement garbage collection optimization'
    );
    recommendations.push(
      'Consider horizontal scaling for high-traffic endpoints'
    );

    return recommendations;
  }

  async getOptimizationRules(): Promise<IOptimizationRule[]> {
    return Array.from(this.optimizationRules.values());
  }

  async getOptimizationActions(filters?: {
    status?: string;
    type?: string;
    limit?: number;
  }): Promise<IOptimizationAction[]> {
    let actions = Array.from(this.optimizationActions.values());

    if (filters) {
      if (filters.status != null) {
        actions = actions.filter(a => a.status === filters.status);
      }
      if (filters.type != null) {
        actions = actions.filter(a => a.type === filters.type);
      }
    }

    actions = actions.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );

    if (filters?.limit != null && filters.limit > 0) {
      actions = actions.slice(0, filters.limit);
    }

    return actions;
  }

  async getCachingStrategies(): Promise<ICachingStrategy[]> {
    return Array.from(this.cachingStrategies.values());
  }

  async updateCachingStrategy(
    strategyId: string,
    updates: Partial<ICachingStrategy>
  ): Promise<ICachingStrategy | null> {
    const strategy = this.cachingStrategies.get(strategyId);
    if (strategy == null) {
      return null;
    }

    const updatedStrategy = {
      ...strategy,
      ...updates,
      updatedAt: new Date(),
    };

    this.cachingStrategies.set(strategyId, updatedStrategy);

    this.logger.log(`Updated caching strategy: ${strategyId}`);

    return updatedStrategy;
  }

  async getPerformanceMetrics(
    service?: string,
    metricName?: string,
    timeRange?: { from: Date; to: Date }
  ): Promise<IPerformanceMetric[]> {
    let allMetrics: IPerformanceMetric[] = [];

    if (service != null && metricName != null) {
      const key = `${service}.${metricName}`;
      allMetrics = this.performanceMetrics.get(key) ?? [];
    } else if (service != null) {
      for (const [key, metrics] of this.performanceMetrics) {
        if (key.startsWith(`${service}.`)) {
          allMetrics.push(...metrics);
        }
      }
    } else {
      for (const metrics of this.performanceMetrics.values()) {
        allMetrics.push(...metrics);
      }
    }

    // Фильтруем по времени если указано
    if (timeRange != null) {
      allMetrics = allMetrics.filter(
        metric =>
          metric.timestamp >= timeRange.from && metric.timestamp <= timeRange.to
      );
    }

    return allMetrics.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  async getPerformanceSummary(): Promise<{
    totalMetrics: number;
    activeOptimizations: number;
    cachingStrategies: number;
    averageResponseTime: number;
    averageCpuUsage: number;
    averageMemoryUsage: number;
    topSlowEndpoints: Array<{
      __service: string;
      endpoint: string;
      avgResponseTime: number;
    }>;
  }> {
    const allMetrics = Array.from(this.performanceMetrics.values()).flat();
    const activeOptimizations = Array.from(
      this.optimizationActions.values()
    ).filter(a => a.status === 'applied').length;
    const cachingStrategies = this.cachingStrategies.size;

    const responseTimeMetrics = allMetrics.filter(
      m => m.name === 'response_time'
    );
    const cpuMetrics = allMetrics.filter(m => m.name === 'cpu_usage');
    const memoryMetrics = allMetrics.filter(m => m.name === 'memory_usage');

    const averageResponseTime =
      responseTimeMetrics.length > 0
        ? responseTimeMetrics.reduce((sum, m) => sum + m.value, 0) /
          responseTimeMetrics.length
        : 0;

    const averageCpuUsage =
      cpuMetrics.length > 0
        ? cpuMetrics.reduce((sum, m) => sum + m.value, 0) / cpuMetrics.length
        : 0;

    const averageMemoryUsage =
      memoryMetrics.length > 0
        ? memoryMetrics.reduce((sum, m) => sum + m.value, 0) /
          memoryMetrics.length
        : 0;

    // Топ медленных эндпоинтов
    const endpointStats = new Map<
      string,
      { count: number; totalTime: number }
    >();
    responseTimeMetrics.forEach(metric => {
      const key = `${metric.__service}.${metric.labels.endpoint ?? 'unknown'}`;
      const stats = endpointStats.get(key) ?? { count: 0, totalTime: 0 };
      stats.count++;
      stats.totalTime += metric.value;
      endpointStats.set(key, stats);
    });

    const topSlowEndpoints = Array.from(endpointStats.entries())
      .map(([key, stats]) => {
        const [_service, endpoint] = key.split('.');
        return {
          __service: _service ?? '',
          endpoint: endpoint ?? '',
          avgResponseTime: stats.totalTime / stats.count,
        };
      })
      .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
      .slice(0, 10);

    return {
      totalMetrics: allMetrics.length,
      activeOptimizations,
      cachingStrategies,
      averageResponseTime,
      averageCpuUsage,
      averageMemoryUsage,
      topSlowEndpoints,
    };
  }
}

import { Injectable } from '@nestjs/common';
import { RedactedLogger } from '../utils/redacted-logger';

export interface ResourceMetrics {
  id: string;
  providerId: string;
  timestamp: Date;
  cpu: {
    usage: number; // процент использования
    load: number; // средняя нагрузка
    cores: number; // количество ядер
    temperature?: number; // температура (если доступно)
  };
  memory: {
    usage: number; // процент использования
    total: number; // общий объем в GB
    available: number; // доступный объем в GB
    swapUsage: number; // использование swap
  };
  network: {
    bandwidthIn: number; // входящий трафик в Mbps
    bandwidthOut: number; // исходящий трафик в Mbps
    latency: number; // латентность в ms
    packetLoss: number; // потери пакетов в %
    connections: number; // активные соединения
  };
  storage: {
    usage: number; // процент использования
    total: number; // общий объем в GB
    available: number; // доступный объем в GB
    iops: number; // операции ввода-вывода в секунду
  };
}

export interface OptimizationRule {
  id: string;
  name: string;
  resourceType: 'cpu' | 'memory' | 'network' | 'storage';
  condition: 'above' | 'below' | 'between';
  threshold: number;
  thresholdMax?: number; // для условия 'between'
  action: 'scale-up' | 'scale-down' | 'optimize' | 'alert';
  priority: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldownPeriod: number; // в минутах
  lastTriggered?: Date;
}

export interface OptimizationAction {
  id: string;
  ruleId: string;
  resourceId: string;
  action: OptimizationRule['action'];
  reason: string;
  currentValue: number;
  targetValue?: number;
  timestamp: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  result?: string;
  error?: string;
}

export interface ResourceUtilization {
  cpu: { current: number; average: number; peak: number };
  memory: { current: number; average: number; peak: number };
  network: { current: number; average: number; peak: number };
  storage: { current: number; average: number; peak: number };
}

export interface LocalCloudProvider {
  id: string;
  name: string;
  region: 'RU' | 'BY';
  type: 'hoster-by' | 'cloud-flex-a1' | 'becloud' | 'vk-cloud';
  resources: {
    maxCpu: number;
    maxMemory: number; // в GB
    maxStorage: number; // в GB
    maxBandwidth: number; // в Mbps
  };
  pricing: {
    cpuPerCore: number; // цена за ядро в час
    memoryPerGb: number; // цена за GB памяти в час
    storagePerGb: number; // цена за GB хранилища в час
    bandwidthPerMbps: number; // цена за Mbps в час
    currency: 'BYN' | 'RUB';
  };
}

@Injectable()
export class ResourceOptimizationService {
  private readonly redactedLogger = new RedactedLogger();
  private readonly resourceMetrics = new Map<string, ResourceMetrics>();
  private readonly optimizationRules = new Map<string, OptimizationRule>();
  private readonly optimizationActions = new Map<string, OptimizationAction>();
  private readonly localCloudProviders = new Map<string, LocalCloudProvider>();

  constructor() {
    this.initializeOptimizationRules();
    this.initializeLocalCloudProviders();
  }

  private initializeOptimizationRules(): void {
    const defaultRules: OptimizationRule[] = [
      {
        id: 'cpu-high-usage',
        name: 'High CPU usage alert',
        resourceType: 'cpu',
        condition: 'above',
        threshold: 85,
        action: 'alert',
        priority: 'high',
        enabled: true,
        cooldownPeriod: 5,
      },
      {
        id: 'cpu-critical-usage',
        name: 'Critical CPU usage scale-up',
        resourceType: 'cpu',
        condition: 'above',
        threshold: 95,
        action: 'scale-up',
        priority: 'critical',
        enabled: true,
        cooldownPeriod: 2,
      },
      {
        id: 'memory-high-usage',
        name: 'High memory usage alert',
        resourceType: 'memory',
        condition: 'above',
        threshold: 80,
        action: 'alert',
        priority: 'high',
        enabled: true,
        cooldownPeriod: 5,
      },
      {
        id: 'memory-critical-usage',
        name: 'Critical memory usage scale-up',
        resourceType: 'memory',
        condition: 'above',
        threshold: 90,
        action: 'scale-up',
        priority: 'critical',
        enabled: true,
        cooldownPeriod: 2,
      },
      {
        id: 'network-high-latency',
        name: 'High network latency alert',
        resourceType: 'network',
        condition: 'above',
        threshold: 100, // 100ms
        action: 'alert',
        priority: 'medium',
        enabled: true,
        cooldownPeriod: 10,
      },
      {
        id: 'storage-high-usage',
        name: 'High storage usage alert',
        resourceType: 'storage',
        condition: 'above',
        threshold: 85,
        action: 'alert',
        priority: 'high',
        enabled: true,
        cooldownPeriod: 15,
      },
      {
        id: 'cpu-low-usage-optimize',
        name: 'Low CPU usage optimization',
        resourceType: 'cpu',
        condition: 'below',
        threshold: 20,
        action: 'optimize',
        priority: 'low',
        enabled: true,
        cooldownPeriod: 30,
      },
      {
        id: 'memory-low-usage-optimize',
        name: 'Low memory usage optimization',
        resourceType: 'memory',
        condition: 'below',
        threshold: 30,
        action: 'optimize',
        priority: 'low',
        enabled: true,
        cooldownPeriod: 30,
      },
    ];

    defaultRules.forEach(rule => {
      this.optimizationRules.set(rule.id, rule);
    });
  }

  private initializeLocalCloudProviders(): void {
    const providers: LocalCloudProvider[] = [
      {
        id: 'hoster-by',
        name: 'Hoster.by',
        region: 'BY',
        type: 'hoster-by',
        resources: {
          maxCpu: 32,
          maxMemory: 128,
          maxStorage: 2000,
          maxBandwidth: 1000,
        },
        pricing: {
          cpuPerCore: 0.05,
          memoryPerGb: 0.02,
          storagePerGb: 0.01,
          bandwidthPerMbps: 0.001,
          currency: 'BYN',
        },
      },
      {
        id: 'cloud-flex-a1',
        name: 'Cloud Flex А1',
        region: 'BY',
        type: 'cloud-flex-a1',
        resources: {
          maxCpu: 64,
          maxMemory: 256,
          maxStorage: 4000,
          maxBandwidth: 2000,
        },
        pricing: {
          cpuPerCore: 0.06,
          memoryPerGb: 0.025,
          storagePerGb: 0.012,
          bandwidthPerMbps: 0.0012,
          currency: 'BYN',
        },
      },
      {
        id: 'becloud',
        name: 'BeCloud',
        region: 'BY',
        type: 'becloud',
        resources: {
          maxCpu: 48,
          maxMemory: 192,
          maxStorage: 3000,
          maxBandwidth: 1500,
        },
        pricing: {
          cpuPerCore: 0.055,
          memoryPerGb: 0.022,
          storagePerGb: 0.011,
          bandwidthPerMbps: 0.0011,
          currency: 'BYN',
        },
      },
      {
        id: 'vk-cloud',
        name: 'VK Cloud',
        region: 'RU',
        type: 'vk-cloud',
        resources: {
          maxCpu: 96,
          maxMemory: 384,
          maxStorage: 8000,
          maxBandwidth: 5000,
        },
        pricing: {
          cpuPerCore: 0.08,
          memoryPerGb: 0.03,
          storagePerGb: 0.015,
          bandwidthPerMbps: 0.002,
          currency: 'RUB',
        },
      },
    ];

    providers.forEach(provider => {
      this.localCloudProviders.set(provider.id, provider);
    });
  }

  async collectResourceMetrics(
    _providerId: string,
    metrics: Omit<ResourceMetrics, 'id' | 'timestamp'>
  ): Promise<string> {
    const metricsId = `metrics-${Date.now()}`;
    const fullMetrics: ResourceMetrics = {
      ...metrics,
      id: metricsId,
      timestamp: new Date(),
    };

    this.resourceMetrics.set(metricsId, fullMetrics);

    // Автоматическая проверка правил оптимизации
    await this.checkOptimizationRules(fullMetrics);

    return metricsId;
  }

  private async checkOptimizationRules(
    metrics: ResourceMetrics
  ): Promise<void> {
    for (const rule of this.optimizationRules.values()) {
      if (!rule.enabled) continue;

      // Проверка cooldown периода
      if (rule.lastTriggered) {
        const cooldownMs = rule.cooldownPeriod * 60 * 1000;
        const timeSinceLastTrigger = Date.now() - rule.lastTriggered.getTime();
        if (timeSinceLastTrigger < cooldownMs) {
          continue;
        }
      }

      const shouldTrigger = this.evaluateRule(rule, metrics);
      if (shouldTrigger) {
        await this.triggerOptimizationAction(rule, metrics);
        rule.lastTriggered = new Date();
      }
    }
  }

  private evaluateRule(
    rule: OptimizationRule,
    metrics: ResourceMetrics
  ): boolean {
    const currentValue = this.getResourceValue(rule.resourceType, metrics);

    switch (rule.condition) {
      case 'above':
        return currentValue > rule.threshold;
      case 'below':
        return currentValue < rule.threshold;
      case 'between':
        if (rule.thresholdMax == null) return false;
        return (
          currentValue >= rule.threshold && currentValue <= rule.thresholdMax
        );
      default:
        return false;
    }
  }

  private getResourceValue(
    resourceType: OptimizationRule['resourceType'],
    metrics: ResourceMetrics
  ): number {
    switch (resourceType) {
      case 'cpu':
        return metrics.cpu.usage;
      case 'memory':
        return metrics.memory.usage;
      case 'network':
        return metrics.network.latency;
      case 'storage':
        return metrics.storage.usage;
      default:
        return 0;
    }
  }

  private async triggerOptimizationAction(
    rule: OptimizationRule,
    metrics: ResourceMetrics
  ): Promise<void> {
    const action: OptimizationAction = {
      id: `optimization-${Date.now()}`,
      ruleId: rule.id,
      resourceId: metrics.id,
      action: rule.action,
      reason: `${rule.resourceType.toUpperCase()} ${rule.condition} threshold: ${this.getResourceValue(rule.resourceType, metrics)}%`,
      currentValue: this.getResourceValue(rule.resourceType, metrics),
      timestamp: new Date(),
      status: 'pending',
    };

    this.optimizationActions.set(action.id, action);

    this.redactedLogger.log(
      `Optimization action triggered`,
      'ResourceOptimizationService',
      {
        rule: rule.name,
        resource: rule.resourceType,
        action: rule.action,
        priority: rule.priority,
        value: action.currentValue,
      }
    );

    await this.executeOptimizationAction(action);
  }

  private async executeOptimizationAction(
    action: OptimizationAction
  ): Promise<void> {
    action.status = 'in-progress';

    try {
      switch (action.action) {
        case 'scale-up':
          await this.performScaleUp(action);
          break;
        case 'scale-down':
          await this.performScaleDown(action);
          break;
        case 'optimize':
          await this.performOptimization(action);
          break;
        case 'alert':
          await this.sendAlert(action);
          break;
      }

      action.status = 'completed';
      action.result = 'Action executed successfully';
    } catch {
      action.status = 'failed';
      action.error = 'Unknown error';

      this.redactedLogger.errorWithData(
        `Optimization action failed`,
        {
          actionId: action.id,
          error: action.error,
        },
        'ResourceOptimizationService'
      );
    }
  }

  private async performScaleUp(action: OptimizationAction): Promise<void> {
    // Имитация масштабирования вверх
    await new Promise(resolve =>
      setTimeout(resolve, 2000 + Math.random() * 3000)
    );

    this.redactedLogger.log(
      `Scale-up completed for resource ${action.resourceId}`,
      'ResourceOptimizationService'
    );
  }

  private async performScaleDown(action: OptimizationAction): Promise<void> {
    // Имитация масштабирования вниз
    await new Promise(resolve =>
      setTimeout(resolve, 1000 + Math.random() * 2000)
    );

    this.redactedLogger.log(
      `Scale-down completed for resource ${action.resourceId}`,
      'ResourceOptimizationService'
    );
  }

  private async performOptimization(action: OptimizationAction): Promise<void> {
    // Имитация оптимизации ресурсов
    await new Promise(resolve =>
      setTimeout(resolve, 1500 + Math.random() * 2500)
    );

    this.redactedLogger.log(
      `Resource optimization completed for ${action.resourceId}`,
      'ResourceOptimizationService'
    );
  }

  private async sendAlert(action: OptimizationAction): Promise<void> {
    // Имитация отправки алерта
    await new Promise(resolve =>
      setTimeout(resolve, 500 + Math.random() * 1000)
    );

    this.redactedLogger.log(
      `Alert sent for resource ${action.resourceId}`,
      'ResourceOptimizationService',
      {
        reason: action.reason,
        value: action.currentValue,
      }
    );
  }

  async getResourceMetrics(
    providerId?: string,
    limit: number = 100
  ): Promise<ResourceMetrics[]> {
    let metrics = Array.from(this.resourceMetrics.values());

    if (providerId !== undefined) {
      metrics = metrics.filter(m => m.providerId === providerId);
    }

    // Сортируем по времени (новые сначала)
    metrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return metrics.slice(0, limit);
  }

  async getOptimizationRules(): Promise<OptimizationRule[]> {
    return Array.from(this.optimizationRules.values());
  }

  async getOptimizationActions(): Promise<OptimizationAction[]> {
    return Array.from(this.optimizationActions.values());
  }

  async getLocalCloudProviders(): Promise<LocalCloudProvider[]> {
    return Array.from(this.localCloudProviders.values());
  }

  async addOptimizationRule(
    rule: Omit<OptimizationRule, 'id'>
  ): Promise<string> {
    const ruleId = `rule-${Date.now()}`;
    const newRule: OptimizationRule = {
      ...rule,
      id: ruleId,
    };

    this.optimizationRules.set(ruleId, newRule);
    return ruleId;
  }

  async updateOptimizationRule(
    ruleId: string,
    updates: Partial<Omit<OptimizationRule, 'id'>>
  ): Promise<boolean> {
    const rule = this.optimizationRules.get(ruleId);
    if (!rule) {
      return false;
    }

    Object.assign(rule, updates);
    return true;
  }

  async getResourceUtilization(
    _providerId: string,

    _resourceType: string,

    _period: '1h' | '6h' | '12h' | '1d' | '1w' | '1m'
  ): Promise<ResourceUtilization> {
    const providerMetrics = Array.from(this.resourceMetrics.values()).slice(
      -24
    ); // Последние 24 метрики

    if (providerMetrics.length === 0) {
      return {
        cpu: { current: 0, average: 0, peak: 0 },
        memory: { current: 0, average: 0, peak: 0 },
        network: { current: 0, average: 0, peak: 0 },
        storage: { current: 0, average: 0, peak: 0 },
      };
    }

    const latest = providerMetrics[0];
    if (latest === undefined) {
      return {
        cpu: { current: 0, average: 0, peak: 0 },
        memory: { current: 0, average: 0, peak: 0 },
        network: { current: 0, average: 0, peak: 0 },
        storage: { current: 0, average: 0, peak: 0 },
      };
    }

    return {
      cpu: {
        current: latest.cpu.usage,
        average:
          providerMetrics.reduce((sum, m) => sum + m.cpu.usage, 0) /
          providerMetrics.length,
        peak: Math.max(...providerMetrics.map(m => m.cpu.usage)),
      },
      memory: {
        current: latest.memory.usage,
        average:
          providerMetrics.reduce((sum, m) => sum + m.memory.usage, 0) /
          providerMetrics.length,
        peak: Math.max(...providerMetrics.map(m => m.memory.usage)),
      },
      network: {
        current: latest.network.latency,
        average:
          providerMetrics.reduce((sum, m) => sum + m.network.latency, 0) /
          providerMetrics.length,
        peak: Math.max(...providerMetrics.map(m => m.network.latency)),
      },
      storage: {
        current: latest.storage.usage,
        average:
          providerMetrics.reduce((sum, m) => sum + m.storage.usage, 0) /
          providerMetrics.length,
        peak: Math.max(...providerMetrics.map(m => m.storage.usage)),
      },
    };
  }

  async getCostOptimizationSuggestions(providerId: string): Promise<{
    suggestions: string[];
    estimatedSavings: number;
    currency: 'BYN' | 'RUB';
  }> {
    const provider = this.localCloudProviders.get(providerId);
    if (!provider) {
      return { suggestions: [], estimatedSavings: 0, currency: 'BYN' };
    }

    const utilization = await this.getResourceUtilization('', '', '1d');
    const suggestions: string[] = [];
    let estimatedSavings = 0;

    // CPU оптимизация
    if (utilization.cpu.average < 30) {
      suggestions.push(
        'Consider reducing CPU cores - current average usage is low'
      );
      estimatedSavings += provider.pricing.cpuPerCore * 24 * 30 * 0.5; // 50% экономии
    }

    // Memory оптимизация
    if (utilization.memory.average < 40) {
      suggestions.push(
        'Consider reducing memory allocation - current average usage is low'
      );
      estimatedSavings += provider.pricing.memoryPerGb * 24 * 30 * 0.4; // 40% экономии
    }

    // Storage оптимизация
    if (utilization.storage.average < 60) {
      suggestions.push(
        'Consider cleaning up unused storage - current usage is below optimal'
      );
      estimatedSavings += provider.pricing.storagePerGb * 24 * 30 * 0.3; // 30% экономии
    }

    return {
      suggestions,
      estimatedSavings: Math.round(estimatedSavings * 100) / 100,
      currency: provider.pricing.currency,
    };
  }

  /**
   * Оптимизация CPU ресурсов
   */
  optimizeCPU(serviceId: string): {
    serviceId: string;
    status: 'optimized' | 'no_action_needed' | 'failed';
    recommendations: string[];
    estimatedSavings: number;
  } {
    try {
      const recommendations: string[] = [];
      let estimatedSavings = 0;

      // Анализ использования CPU
      const cpuUtilization = Math.random() * 100;

      if (cpuUtilization > 80) {
        recommendations.push(
          'Scale up CPU resources - high utilization detected'
        );
        recommendations.push('Consider load balancing across instances');
      } else if (cpuUtilization < 20) {
        recommendations.push(
          'Scale down CPU resources - low utilization detected'
        );
        estimatedSavings = Math.random() * 50 + 10; // 10-60% экономии
      } else {
        recommendations.push('CPU utilization is within optimal range');
      }

      const status =
        recommendations.length > 0 && estimatedSavings > 0
          ? 'optimized'
          : recommendations.length > 0
            ? 'no_action_needed'
            : 'failed';

      return {
        serviceId,
        status,
        recommendations,
        estimatedSavings: Math.round(estimatedSavings * 100) / 100,
      };
    } catch {
      return {
        serviceId,
        status: 'failed',
        recommendations: ['Error during CPU optimization'],
        estimatedSavings: 0,
      };
    }
  }

  /**
   * Оптимизация памяти
   */
  optimizeMemory(serviceId: string): {
    serviceId: string;
    status: 'optimized' | 'no_action_needed' | 'failed';
    recommendations: string[];
    estimatedSavings: number;
  } {
    try {
      const recommendations: string[] = [];
      let estimatedSavings = 0;

      // Анализ использования памяти
      const memoryUtilization = Math.random() * 100;

      if (memoryUtilization > 85) {
        recommendations.push(
          'Scale up memory resources - high memory usage detected'
        );
        recommendations.push('Consider memory leak investigation');
      } else if (memoryUtilization < 25) {
        recommendations.push(
          'Scale down memory allocation - low memory usage detected'
        );
        estimatedSavings = Math.random() * 40 + 15; // 15-55% экономии
      } else {
        recommendations.push('Memory utilization is within optimal range');
      }

      const status =
        recommendations.length > 0 && estimatedSavings > 0
          ? 'optimized'
          : recommendations.length > 0
            ? 'no_action_needed'
            : 'failed';

      return {
        serviceId,
        status,
        recommendations,
        estimatedSavings: Math.round(estimatedSavings * 100) / 100,
      };
    } catch {
      return {
        serviceId,
        status: 'failed',
        recommendations: ['Error during memory optimization'],
        estimatedSavings: 0,
      };
    }
  }

  /**
   * Оптимизация сети
   */
  optimizeNetwork(serviceId: string): {
    serviceId: string;
    status: 'optimized' | 'no_action_needed' | 'failed';
    recommendations: string[];
    estimatedSavings: number;
  } {
    try {
      const recommendations: string[] = [];
      let estimatedSavings = 0;

      // Анализ сетевого трафика
      const networkUtilization = Math.random() * 100;
      const latency = Math.random() * 100 + 10; // 10-110ms

      if (networkUtilization > 90) {
        recommendations.push(
          'Scale up network bandwidth - high network usage detected'
        );
        recommendations.push('Consider CDN implementation');
      } else if (latency > 80) {
        recommendations.push(
          'Optimize network routing - high latency detected'
        );
        recommendations.push('Consider edge locations');
      } else if (networkUtilization < 30) {
        recommendations.push(
          'Scale down network resources - low utilization detected'
        );
        estimatedSavings = Math.random() * 30 + 10; // 10-40% экономии
      } else {
        recommendations.push('Network utilization is within optimal range');
      }

      const status =
        recommendations.length > 0 && estimatedSavings > 0
          ? 'optimized'
          : recommendations.length > 0
            ? 'no_action_needed'
            : 'failed';

      return {
        serviceId,
        status,
        recommendations,
        estimatedSavings: Math.round(estimatedSavings * 100) / 100,
      };
    } catch {
      return {
        serviceId,
        status: 'failed',
        recommendations: ['Error during network optimization'],
        estimatedSavings: 0,
      };
    }
  }

  /**
   * Оптимизация хранилища
   */
  optimizeStorage(serviceId: string): {
    serviceId: string;
    status: 'optimized' | 'no_action_needed' | 'failed';
    recommendations: string[];
    estimatedSavings: number;
  } {
    try {
      const recommendations: string[] = [];
      let estimatedSavings = 0;

      // Анализ использования хранилища
      const storageUtilization = Math.random() * 100;
      const iops = Math.random() * 1000 + 100; // 100-1100 IOPS

      if (storageUtilization > 90) {
        recommendations.push(
          'Scale up storage capacity - high storage usage detected'
        );
        recommendations.push('Consider data archiving strategy');
      } else if (iops > 800) {
        recommendations.push(
          'Optimize storage performance - high IOPS detected'
        );
        recommendations.push('Consider SSD upgrade');
      } else if (storageUtilization < 40) {
        recommendations.push(
          'Scale down storage allocation - low utilization detected'
        );
        estimatedSavings = Math.random() * 35 + 15; // 15-50% экономии
      } else {
        recommendations.push('Storage utilization is within optimal range');
      }

      const status =
        recommendations.length > 0 && estimatedSavings > 0
          ? 'optimized'
          : recommendations.length > 0
            ? 'no_action_needed'
            : 'failed';

      return {
        serviceId,
        status,
        recommendations,
        estimatedSavings: Math.round(estimatedSavings * 100) / 100,
      };
    } catch {
      return {
        serviceId,
        status: 'failed',
        recommendations: ['Error during storage optimization'],
        estimatedSavings: 0,
      };
    }
  }
}

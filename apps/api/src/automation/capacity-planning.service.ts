import { Injectable } from '@nestjs/common';
import { RedactedLogger } from '../utils/redacted-logger';

export interface PerformanceBaseline {
  id: string;
  name: string;
  description: string;
  resourceType:
    | 'cpu'
    | 'memory'
    | 'storage'
    | 'network'
    | 'database'
    | 'application';
  metric: string;
  baselineValue: number;
  unit: string;
  confidence: number; // 0-1, уровень уверенности в базовом значении
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';
  createdAt: Date;
  updatedAt: Date;
  dataPoints: number; // количество точек данных для расчета
}

export interface CapacityForecast {
  id: string;
  resourceType: PerformanceBaseline['resourceType'];
  baselineId: string;
  forecastPeriod: '1h' | '6h' | '12h' | '1d' | '1w' | '1m' | '3m' | '6m' | '1y';
  forecastDate: Date;
  predictedValue: number;
  confidence: number;
  upperBound: number;
  lowerBound: number;
  growthRate: number; // процент роста в месяц
  factors: string[]; // факторы, влияющие на прогноз
}

export interface ResourceCapacity {
  id: string;
  name: string;
  type: PerformanceBaseline['resourceType'];
  currentCapacity: number;
  unit: string;
  maxCapacity: number;
  utilization: number; // текущее использование в процентах
  growthTrend: 'stable' | 'increasing' | 'decreasing' | 'volatile';
  lastUpdated: Date;
  recommendations: string[];
}

export interface LocalClient {
  id: string;
  name: string;
  region: 'RU' | 'BY';
  industry:
    | 'ecommerce'
    | 'finance'
    | 'healthcare'
    | 'education'
    | 'government'
    | 'other';
  size: 'small' | 'medium' | 'large' | 'enterprise';
  criticality: 'low' | 'medium' | 'high' | 'critical';
  sla: {
    uptime: number; // требуемый uptime в процентах
    responseTime: number; // требуемое время ответа в ms
    recoveryTime: number; // требуемое время восстановления в минутах
  };
  peakHours: {
    start: string; // HH:MM
    end: string; // HH:MM
    days: number[]; // 0-6 (воскресенье-суббота)
  };
  seasonalPatterns: Array<{
    name: string;
    startMonth: number; // 1-12
    endMonth: number; // 1-12
    multiplier: number; // множитель нагрузки
  }>;
}

export interface CapacityRecommendation {
  id: string;
  clientId: string;
  resourceType: PerformanceBaseline['resourceType'];
  type: 'scale-up' | 'scale-down' | 'optimize' | 'migrate' | 'add-redundancy';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  estimatedCost: number;
  currency: 'BYN' | 'RUB' | 'USD';
  implementationEffort: 'low' | 'medium' | 'high';
  expectedImpact: 'minimal' | 'moderate' | 'significant';
  timeline: 'immediate' | '1week' | '1month' | '3months';
  createdAt: Date;
  status: 'pending' | 'approved' | 'implemented' | 'rejected';
}

export interface PerformanceAnalysis {
  id: string;
  clientId: string;
  baselineId: string;
  analysisDate: Date;
  currentValue: number;
  baselineValue: number;
  deviation: number; // отклонение от базового значения в процентах
  status: 'normal' | 'warning' | 'critical' | 'improved';
  factors: string[]; // факторы, влияющие на производительность
  recommendations: string[];
}

@Injectable()
export class CapacityPlanningService {
  private readonly redactedLogger = new RedactedLogger();
  private readonly performanceBaselines = new Map<
    string,
    PerformanceBaseline
  >();
  private readonly capacityForecasts = new Map<string, CapacityForecast>();
  private readonly resourceCapacities = new Map<string, ResourceCapacity>();
  private readonly localClients = new Map<string, LocalClient>();
  private readonly capacityRecommendations = new Map<
    string,
    CapacityRecommendation
  >();
  private readonly performanceAnalyses = new Map<string, PerformanceAnalysis>();

  constructor() {
    this.initializeLocalClients();
    this.initializePerformanceBaselines();
    this.initializeResourceCapacities();
  }

  private initializeLocalClients(): void {
    const clients: LocalClient[] = [
      {
        id: 'client-by-ecommerce-1',
        name: 'BY-Ecommerce-1',
        region: 'BY',
        industry: 'ecommerce',
        size: 'medium',
        criticality: 'high',
        sla: {
          uptime: 99.9,
          responseTime: 200,
          recoveryTime: 15,
        },
        peakHours: {
          start: '18:00',
          end: '22:00',
          days: [1, 2, 3, 4, 5, 6], // понедельник-суббота
        },
        seasonalPatterns: [
          {
            name: 'Новогодний сезон',
            startMonth: 12,
            endMonth: 1,
            multiplier: 2.5,
          },
          {
            name: 'Черная пятница',
            startMonth: 11,
            endMonth: 11,
            multiplier: 3.0,
          },
        ],
      },
      {
        id: 'client-ru-finance-1',
        name: 'RU-Finance-1',
        region: 'RU',
        industry: 'finance',
        size: 'large',
        criticality: 'critical',
        sla: {
          uptime: 99.99,
          responseTime: 100,
          recoveryTime: 5,
        },
        peakHours: {
          start: '09:00',
          end: '18:00',
          days: [1, 2, 3, 4, 5], // понедельник-пятница
        },
        seasonalPatterns: [
          {
            name: 'Квартальный отчет',
            startMonth: 3,
            endMonth: 3,
            multiplier: 1.8,
          },
          {
            name: 'Годовой отчет',
            startMonth: 12,
            endMonth: 12,
            multiplier: 2.2,
          },
        ],
      },
      {
        id: 'client-by-government-1',
        name: 'BY-Government-1',
        region: 'BY',
        industry: 'government',
        size: 'enterprise',
        criticality: 'critical',
        sla: {
          uptime: 99.95,
          responseTime: 150,
          recoveryTime: 10,
        },
        peakHours: {
          start: '08:00',
          end: '17:00',
          days: [1, 2, 3, 4, 5], // понедельник-пятница
        },
        seasonalPatterns: [
          {
            name: 'Бюджетный период',
            startMonth: 10,
            endMonth: 12,
            multiplier: 1.5,
          },
        ],
      },
    ];

    clients.forEach(client => {
      this.localClients.set(client.id, client);
    });
  }

  private initializePerformanceBaselines(): void {
    const baselines: PerformanceBaseline[] = [
      {
        id: 'baseline-cpu-general',
        name: 'General CPU Performance Baseline',
        description:
          'Базовый показатель производительности CPU для общих нагрузок',
        resourceType: 'cpu',
        metric: 'cpu_usage_percent',
        baselineValue: 45,
        unit: '%',
        confidence: 0.85,
        period: 'hourly',
        createdAt: new Date(),
        updatedAt: new Date(),
        dataPoints: 720, // 30 дней по часам
      },
      {
        id: 'baseline-memory-general',
        name: 'General Memory Performance Baseline',
        description:
          'Базовый показатель производительности памяти для общих нагрузок',
        resourceType: 'memory',
        metric: 'memory_usage_percent',
        baselineValue: 60,
        unit: '%',
        confidence: 0.82,
        period: 'hourly',
        createdAt: new Date(),
        updatedAt: new Date(),
        dataPoints: 720,
      },
      {
        id: 'baseline-database-response',
        name: 'Database Response Time Baseline',
        description: 'Базовый показатель времени ответа базы данных',
        resourceType: 'database',
        metric: 'query_response_time_ms',
        baselineValue: 25,
        unit: 'ms',
        confidence: 0.78,
        period: 'hourly',
        createdAt: new Date(),
        updatedAt: new Date(),
        dataPoints: 720,
      },
      {
        id: 'baseline-network-latency',
        name: 'Network Latency Baseline',
        description: 'Базовый показатель сетевой латентности',
        resourceType: 'network',
        metric: 'network_latency_ms',
        baselineValue: 15,
        unit: 'ms',
        confidence: 0.8,
        period: 'hourly',
        createdAt: new Date(),
        updatedAt: new Date(),
        dataPoints: 720,
      },
    ];

    baselines.forEach(baseline => {
      this.performanceBaselines.set(baseline.id, baseline);
    });
  }

  private initializeResourceCapacities(): void {
    const capacities: ResourceCapacity[] = [
      {
        id: 'capacity-cpu-cluster-1',
        name: 'CPU Cluster 1',
        type: 'cpu',
        currentCapacity: 32,
        unit: 'cores',
        maxCapacity: 64,
        utilization: 50,
        growthTrend: 'increasing',
        lastUpdated: new Date(),
        recommendations: [
          'Мониторить рост нагрузки',
          'Рассмотреть масштабирование через 3 месяца',
        ],
      },
      {
        id: 'capacity-memory-cluster-1',
        name: 'Memory Cluster 1',
        type: 'memory',
        currentCapacity: 128,
        unit: 'GB',
        maxCapacity: 256,
        utilization: 65,
        growthTrend: 'stable',
        lastUpdated: new Date(),
        recommendations: [
          'Текущее использование в норме',
          'Планировать обновление через 6 месяцев',
        ],
      },
      {
        id: 'capacity-storage-cluster-1',
        name: 'Storage Cluster 1',
        type: 'storage',
        currentCapacity: 2000,
        unit: 'GB',
        maxCapacity: 4000,
        utilization: 75,
        growthTrend: 'increasing',
        lastUpdated: new Date(),
        recommendations: [
          'Высокое использование хранилища',
          'Рассмотреть очистку неиспользуемых данных',
          'Планировать расширение через 2 месяца',
        ],
      },
    ];

    capacities.forEach(capacity => {
      this.resourceCapacities.set(capacity.id, capacity);
    });
  }

  async createPerformanceBaseline(
    baseline: Omit<PerformanceBaseline, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const baselineId = `baseline-${Date.now()}`;
    const now = new Date();

    const fullBaseline: PerformanceBaseline = {
      ...baseline,
      id: baselineId,
      createdAt: now,
      updatedAt: now,
    };

    this.performanceBaselines.set(baselineId, fullBaseline);

    this.redactedLogger.log(
      `Performance baseline created`,
      'CapacityPlanningService',
      {
        baselineId,
        name: baseline.name,
        resourceType: baseline.resourceType,
        metric: baseline.metric,
      }
    );

    return baselineId;
  }

  async updatePerformanceBaseline(
    baselineId: string,
    updates: Partial<Omit<PerformanceBaseline, 'id' | 'createdAt'>>
  ): Promise<boolean> {
    const baseline = this.performanceBaselines.get(baselineId);
    if (!baseline) {
      return false;
    }

    Object.assign(baseline, updates);
    baseline.updatedAt = new Date();

    return true;
  }

  async generateCapacityForecast(
    baselineId: string,
    forecastPeriod: CapacityForecast['forecastPeriod'],
    forecastDate: Date
  ): Promise<string> {
    const baseline = this.performanceBaselines.get(baselineId);
    if (!baseline) {
      throw new Error('Performance baseline not found');
    }

    // Простая модель прогнозирования на основе линейного роста
    const growthRate = this.calculateGrowthRate(baseline);
    const monthsToForecast = this.getMonthsFromPeriod(forecastPeriod);

    const predictedValue =
      baseline.baselineValue * (1 + (growthRate * monthsToForecast) / 100);
    const confidence = Math.max(
      0.5,
      baseline.confidence - monthsToForecast * 0.05
    );

    const forecast: Omit<CapacityForecast, 'id' | 'createdAt'> = {
      resourceType: baseline.resourceType,
      baselineId,
      forecastPeriod,
      forecastDate,
      predictedValue: Math.round(predictedValue * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      upperBound: predictedValue * 1.2,
      lowerBound: predictedValue * 0.8,
      growthRate,
      factors: this.identifyGrowthFactors(baseline),
    };

    const fullForecast: CapacityForecast = {
      ...forecast,
      id: `forecast-${Date.now()}`,
    };

    this.capacityForecasts.set(fullForecast.id, fullForecast);

    this.redactedLogger.log(
      `Capacity forecast generated`,
      'CapacityPlanningService',
      {
        forecastId: fullForecast.id,
        baselineId,
        period: forecastPeriod,
        predictedValue: forecast.predictedValue,
        confidence: forecast.confidence,
      }
    );

    return fullForecast.id;
  }

  private calculateGrowthRate(baseline: PerformanceBaseline): number {
    // Имитация расчета темпа роста на основе исторических данных
    const baseGrowthRate = 5; // базовый рост 5% в месяц

    // Корректируем на основе типа ресурса
    switch (baseline.resourceType) {
      case 'cpu':
        return baseGrowthRate * 1.2; // CPU растет быстрее
      case 'memory':
        return baseGrowthRate * 1.1; // Память растет умеренно
      case 'storage':
        return baseGrowthRate * 1.5; // Хранилище растет быстрее всего
      case 'network':
        return baseGrowthRate * 0.8; // Сеть растет медленнее
      default:
        return baseGrowthRate;
    }
  }

  private getMonthsFromPeriod(
    period: CapacityForecast['forecastPeriod']
  ): number {
    switch (period) {
      case '1h':
      case '6h':
      case '12h':
      case '1d':
        return 0.1; // менее месяца
      case '1w':
        return 0.25; // неделя
      case '1m':
        return 1;
      case '3m':
        return 3;
      case '6m':
        return 6;
      case '1y':
        return 12;
      default:
        return 1;
    }
  }

  private identifyGrowthFactors(baseline: PerformanceBaseline): string[] {
    const factors: string[] = [];

    switch (baseline.resourceType) {
      case 'cpu':
        factors.push('Увеличение пользовательской нагрузки');
        factors.push('Новые функции приложения');
        factors.push('Сезонные пики трафика');
        break;
      case 'memory':
        factors.push('Кэширование данных');
        factors.push('Увеличение размера сессий');
        factors.push('Новые модули системы');
        break;
      case 'storage':
        factors.push('Рост пользовательского контента');
        factors.push('Логи и аналитика');
        factors.push('Резервные копии');
        break;
      case 'network':
        factors.push('Увеличение трафика');
        factors.push('Новые региональные офисы');
        factors.push('Интеграции с внешними сервисами');
        break;
    }

    return factors;
  }

  async analyzeClientPerformance(
    clientId: string,
    baselineId: string,
    currentValue: number
  ): Promise<string> {
    const client = this.localClients.get(clientId);
    const baseline = this.performanceBaselines.get(baselineId);

    if (!client || !baseline) {
      throw new Error('Client or baseline not found');
    }

    const deviation =
      ((currentValue - baseline.baselineValue) / baseline.baselineValue) * 100;
    const status = this.determinePerformanceStatus(
      deviation,
      client.criticality
    );

    const analysis: PerformanceAnalysis = {
      id: `analysis-${Date.now()}`,
      clientId,
      baselineId,
      analysisDate: new Date(),
      currentValue,
      baselineValue: baseline.baselineValue,
      deviation: Math.round(deviation * 100) / 100,
      status,
      factors: this.analyzePerformanceFactors(deviation, baseline, client),
      recommendations: this.generatePerformanceRecommendations(
        deviation,
        status,
        baseline,
        client
      ),
    };

    this.performanceAnalyses.set(analysis.id, analysis);

    // Генерируем рекомендации по мощности если нужно
    if (status === 'critical' || status === 'warning') {
      await this.generateCapacityRecommendations(clientId, baseline, deviation);
    }

    return analysis.id;
  }

  private determinePerformanceStatus(
    deviation: number,
    criticality: LocalClient['criticality']
  ): PerformanceAnalysis['status'] {
    const criticalityMultiplier = {
      low: 1.5,
      medium: 1.2,
      high: 1.0,
      critical: 0.8,
    };

    const threshold = 20 * criticalityMultiplier[criticality];

    if (Math.abs(deviation) > threshold) {
      return 'critical';
    } else if (Math.abs(deviation) > threshold * 0.6) {
      return 'warning';
    } else if (deviation < -10) {
      return 'improved';
    } else {
      return 'normal';
    }
  }

  private analyzePerformanceFactors(
    deviation: number,
    _baseline: PerformanceBaseline,
    client: LocalClient
  ): string[] {
    const factors: string[] = [];

    if (deviation > 0) {
      factors.push('Увеличение нагрузки выше базового уровня');

      // Проверяем сезонные паттерны
      const currentMonth = new Date().getMonth() + 1;
      const seasonalPattern = client.seasonalPatterns.find(
        pattern =>
          currentMonth >= pattern.startMonth && currentMonth <= pattern.endMonth
      );

      if (seasonalPattern) {
        factors.push(`Сезонный рост: ${seasonalPattern.name}`);
      }

      // Проверяем пиковые часы
      const currentHour = new Date().getHours();
      const currentDay = new Date().getDay();
      const startHour = client.peakHours.start.split(':')[0];
      const endHour = client.peakHours.end.split(':')[0];

      if (
        startHour != null &&
        endHour != null &&
        startHour !== '' &&
        endHour !== ''
      ) {
        const isPeakHour =
          client.peakHours.days.includes(currentDay) &&
          currentHour >= parseInt(startHour) &&
          currentHour <= parseInt(endHour);

        if (isPeakHour) {
          factors.push('Пиковые часы работы');
        }
      }
    } else if (deviation < 0) {
      factors.push('Снижение нагрузки ниже базового уровня');
      factors.push('Возможная оптимизация ресурсов');
    }

    return factors;
  }

  private generatePerformanceRecommendations(
    deviation: number,
    status: PerformanceAnalysis['status'],
    _baseline: PerformanceBaseline,
    client: LocalClient
  ): string[] {
    const recommendations: string[] = [];

    if (status === 'critical' || status === 'warning') {
      if (deviation > 0) {
        recommendations.push('Немедленно увеличить ресурсы');
        recommendations.push('Активировать автоматическое масштабирование');
        recommendations.push('Проверить настройки оптимизации');
      }
    } else if (status === 'improved') {
      recommendations.push('Рассмотреть возможность снижения ресурсов');
      recommendations.push('Оптимизировать стоимость инфраструктуры');
    }

    // Рекомендации на основе критичности клиента
    if (client.criticality === 'critical') {
      recommendations.push('Добавить резервные мощности');
      recommendations.push('Улучшить мониторинг производительности');
    }

    return recommendations;
  }

  private async generateCapacityRecommendations(
    clientId: string,
    baseline: PerformanceBaseline,
    deviation: number
  ): Promise<void> {
    const recommendation: CapacityRecommendation = {
      id: `recommendation-${Date.now()}`,
      clientId,
      resourceType: baseline.resourceType,
      type: deviation > 0 ? 'scale-up' : 'optimize',
      priority: Math.abs(deviation) > 50 ? 'critical' : 'high',
      description: `Требуется ${deviation > 0 ? 'увеличение' : 'оптимизация'} ресурсов ${baseline.resourceType}`,
      estimatedCost: this.estimateRecommendationCost(baseline, deviation),
      currency: 'BYN',
      implementationEffort: Math.abs(deviation) > 30 ? 'high' : 'medium',
      expectedImpact: Math.abs(deviation) > 50 ? 'significant' : 'moderate',
      timeline: Math.abs(deviation) > 50 ? 'immediate' : '1week',
      createdAt: new Date(),
      status: 'pending',
    };

    this.capacityRecommendations.set(recommendation.id, recommendation);
  }

  private estimateRecommendationCost(
    baseline: PerformanceBaseline,
    deviation: number
  ): number {
    // Простая оценка стоимости на основе типа ресурса и отклонения
    const baseCosts = {
      cpu: 100,
      memory: 80,
      storage: 50,
      network: 120,
      database: 200,
      application: 150,
    };

    const baseCost = baseCosts[baseline.resourceType] || 100;
    const deviationMultiplier = Math.abs(deviation) / 100;

    return Math.round(baseCost * deviationMultiplier * 100) / 100;
  }

  async getClientCapacityReport(clientId: string): Promise<{
    client: LocalClient;
    currentPerformance: PerformanceAnalysis[];
    forecasts: CapacityForecast[];
    recommendations: CapacityRecommendation[];
    resourceUtilization: ResourceCapacity[];
  }> {
    const client = this.localClients.get(clientId);
    if (!client) {
      throw new Error('Client not found');
    }

    const currentPerformance = Array.from(this.performanceAnalyses.values())
      .filter(analysis => analysis.clientId === clientId)
      .sort((a, b) => b.analysisDate.getTime() - a.analysisDate.getTime());

    const forecasts = Array.from(this.capacityForecasts.values()).filter(
      forecast => this.performanceBaselines.has(forecast.baselineId)
    );

    const recommendations = Array.from(this.capacityRecommendations.values())
      .filter(rec => rec.clientId === clientId)
      .sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

    const resourceUtilization = Array.from(this.resourceCapacities.values());

    return {
      client,
      currentPerformance,
      forecasts,
      recommendations,
      resourceUtilization,
    };
  }

  async getPerformanceBaselines(): Promise<PerformanceBaseline[]> {
    return Array.from(this.performanceBaselines.values());
  }

  async getCapacityForecasts(): Promise<CapacityForecast[]> {
    return Array.from(this.capacityForecasts.values());
  }

  async getResourceCapacities(): Promise<ResourceCapacity[]> {
    return Array.from(this.resourceCapacities.values());
  }

  async getLocalClients(): Promise<LocalClient[]> {
    return Array.from(this.localClients.values());
  }

  async getCapacityRecommendations(): Promise<CapacityRecommendation[]> {
    return Array.from(this.capacityRecommendations.values());
  }

  async getPerformanceAnalyses(): Promise<PerformanceAnalysis[]> {
    return Array.from(this.performanceAnalyses.values());
  }

  async addLocalClient(client: Omit<LocalClient, 'id'>): Promise<string> {
    const clientId = `client-${Date.now()}`;
    const newClient: LocalClient = {
      ...client,
      id: clientId,
    };

    this.localClients.set(clientId, newClient);
    return clientId;
  }

  async updateCapacityRecommendation(
    recommendationId: string,
    updates: Partial<Omit<CapacityRecommendation, 'id' | 'createdAt'>>
  ): Promise<boolean> {
    const recommendation = this.capacityRecommendations.get(recommendationId);
    if (!recommendation) {
      return false;
    }

    Object.assign(recommendation, updates);
    return true;
  }

  /**
   * Анализ текущей емкости
   */
  analyzeCurrentCapacity(serviceId: string): {
    serviceId: string;
    cpu: { current: number; max: number; utilization: number };
    memory: { current: number; max: number; utilization: number };
    storage: { current: number; max: number; utilization: number };
    recommendations: string[];
  } {
    const cpuCurrent = Math.random() * 8 + 2; // 2-10 ядер
    const cpuMax = 16;
    const memoryCurrent = Math.random() * 32 + 8; // 8-40 GB
    const memoryMax = 64;
    const storageCurrent = Math.random() * 500 + 100; // 100-600 GB
    const storageMax = 1000;

    const recommendations: string[] = [];

    if (cpuCurrent / cpuMax > 0.8) {
      recommendations.push('Consider scaling up CPU resources');
    }
    if (memoryCurrent / memoryMax > 0.8) {
      recommendations.push('Consider scaling up memory resources');
    }
    if (storageCurrent / storageMax > 0.8) {
      recommendations.push('Consider scaling up storage capacity');
    }

    return {
      serviceId,
      cpu: {
        current: Math.round(cpuCurrent * 100) / 100,
        max: cpuMax,
        utilization: Math.round((cpuCurrent / cpuMax) * 100 * 100) / 100,
      },
      memory: {
        current: Math.round(memoryCurrent * 100) / 100,
        max: memoryMax,
        utilization: Math.round((memoryCurrent / memoryMax) * 100 * 100) / 100,
      },
      storage: {
        current: Math.round(storageCurrent * 100) / 100,
        max: storageMax,
        utilization:
          Math.round((storageCurrent / storageMax) * 100 * 100) / 100,
      },
      recommendations,
    };
  }

  /**
   * Прогнозирование потребностей в емкости
   */
  forecastCapacityNeeds(
    serviceId: string,
    period: string
  ): {
    serviceId: string;
    period: string;
    predictions: Array<{
      resourceType: string;
      currentValue: number;
      predictedValue: number;
      growthRate: number;
      confidence: number;
    }>;
    recommendations: string[];
  } {
    const predictions = [
      {
        resourceType: 'cpu',
        currentValue: Math.random() * 8 + 2,
        predictedValue: Math.random() * 12 + 4,
        growthRate: Math.random() * 20 + 5,
        confidence: Math.random() * 30 + 70,
      },
      {
        resourceType: 'memory',
        currentValue: Math.random() * 32 + 8,
        predictedValue: Math.random() * 48 + 16,
        growthRate: Math.random() * 25 + 10,
        confidence: Math.random() * 25 + 75,
      },
      {
        resourceType: 'storage',
        currentValue: Math.random() * 500 + 100,
        predictedValue: Math.random() * 750 + 200,
        growthRate: Math.random() * 30 + 15,
        confidence: Math.random() * 20 + 80,
      },
    ];

    const recommendations = predictions
      .filter(p => p.growthRate > 20)
      .map(
        p =>
          `Plan for ${p.resourceType.toUpperCase()} scaling - expected growth: ${Math.round(p.growthRate)}%`
      );

    return {
      serviceId,
      period,
      predictions: predictions.map(p => ({
        ...p,
        currentValue: Math.round(p.currentValue * 100) / 100,
        predictedValue: Math.round(p.predictedValue * 100) / 100,
        growthRate: Math.round(p.growthRate * 100) / 100,
        confidence: Math.round(p.confidence * 100) / 100,
      })),
      recommendations,
    };
  }

  /**
   * Создание плана масштабирования
   */
  createScalingPlan(serviceId: string): {
    serviceId: string;
    recommendations: Array<{
      resourceType: string;
      action: string;
      priority: 'immediate' | 'short_term' | 'long_term';
      estimatedCost: number;
      timeline: string;
    }>;
    priority: 'immediate' | 'short_term' | 'long_term';
    totalEstimatedCost: number;
  } {
    const recommendations = [
      {
        resourceType: 'CPU',
        action: 'Scale up from 4 to 8 cores',
        priority: 'short_term' as const,
        estimatedCost: 150,
        timeline: '2 weeks',
      },
      {
        resourceType: 'Memory',
        action: 'Increase from 16GB to 32GB',
        priority: 'short_term' as const,
        estimatedCost: 200,
        timeline: '2 weeks',
      },
      {
        resourceType: 'Storage',
        action: 'Expand from 500GB to 1TB',
        priority: 'long_term' as const,
        estimatedCost: 100,
        timeline: '3 months',
      },
    ];

    const totalEstimatedCost = recommendations.reduce(
      (sum, rec) => sum + rec.estimatedCost,
      0
    );
    const priority = recommendations.some(
      (r: { priority: string }) => r.priority === 'immediate'
    )
      ? 'immediate'
      : recommendations.some(
            (r: { priority: string }) => r.priority === 'short_term'
          )
        ? 'short_term'
        : 'long_term';

    return {
      serviceId,
      recommendations,
      priority,
      totalEstimatedCost,
    };
  }

  /**
   * Выполнение стресс-тестирования
   */
  async performStressTest(
    serviceId: string,
    testScenario: {
      cpuLoad: number;
      memoryLoad: number;
      storageLoad: number;
      networkLoad: number;
      duration: number;
    }
  ): Promise<{
    serviceId: string;
    success: boolean;
    recommendations: string[];
    metrics: {
      maxCpuUsage: number;
      maxMemoryUsage: number;
      maxStorageUsage: number;
      maxNetworkUsage: number;
    };
  }> {
    const duration = testScenario.duration;

    // Имитация стресс-теста
    await new Promise(resolve =>
      setTimeout(resolve, Math.min(duration * 1000, 100))
    );

    const maxCpuUsage = Math.min(
      testScenario.cpuLoad + Math.random() * 20,
      100
    );
    const maxMemoryUsage = Math.min(
      testScenario.memoryLoad + Math.random() * 15,
      100
    );
    const maxStorageUsage = Math.min(
      testScenario.storageLoad + Math.random() * 10,
      100
    );
    const maxNetworkUsage = Math.min(
      testScenario.networkLoad + Math.random() * 25,
      100
    );

    const recommendations: string[] = [];
    let success = true;

    if (maxCpuUsage > 90) {
      recommendations.push('CPU usage exceeded 90% - consider scaling up');
      success = false;
    }
    if (maxMemoryUsage > 90) {
      recommendations.push('Memory usage exceeded 90% - consider scaling up');
      success = false;
    }
    if (maxStorageUsage > 90) {
      recommendations.push('Storage usage exceeded 90% - consider expansion');
      success = false;
    }
    if (maxNetworkUsage > 90) {
      recommendations.push(
        'Network usage exceeded 90% - consider bandwidth upgrade'
      );
      success = false;
    }

    if (recommendations.length === 0) {
      recommendations.push('System handled stress test successfully');
    }

    return {
      serviceId,
      success,
      recommendations,
      metrics: {
        maxCpuUsage: Math.round(maxCpuUsage * 100) / 100,
        maxMemoryUsage: Math.round(maxMemoryUsage * 100) / 100,
        maxStorageUsage: Math.round(maxStorageUsage * 100) / 100,
        maxNetworkUsage: Math.round(maxNetworkUsage * 100) / 100,
      },
    };
  }
}

import { Injectable } from '@nestjs/common';
import { RedactedLogger } from '../utils/redacted-logger';

export interface OptimizationRecommendation {
  id: string;
  type:
    | 'resource-downsize'
    | 'provider-migration'
    | 'reserved-instance'
    | 'storage-optimization'
    | 'network-optimization'
    | 'scheduling-optimization';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'immediate' | 'short-term' | 'long-term';
  title: string;
  description: string;
  currentState: {
    cost: number;
    currency: 'BYN' | 'RUB' | 'USD';
    resources: string[];
    utilization: Record<string, number>; // процент использования ресурсов
  };
  proposedState: {
    cost: number;
    currency: 'BYN' | 'RUB' | 'USD';
    resources: string[];
    estimatedSavings: number;
    savingsPercentage: number;
  };
  implementation: {
    effort: 'low' | 'medium' | 'high';
    estimatedTime: number; // в часах
    risk: 'low' | 'medium' | 'high';
    steps: string[];
    rollbackPlan: string;
  };
  aiConfidence: number; // 0-1, уверенность ИИ в рекомендации
  factors: string[]; // факторы, влияющие на рекомендацию
  createdAt: Date;
  status: 'pending' | 'approved' | 'implemented' | 'rejected' | 'expired';
  approvedAt?: Date;
  implementedAt?: Date;
  actualSavings?: number;
}

export interface ResourceUsagePattern {
  id: string;
  resourceId: string;
  resourceType: 'cpu' | 'memory' | 'storage' | 'network' | 'database';
  providerId: string;
  region: 'RU' | 'BY';
  timeSeries: Array<{
    timestamp: Date;
    usage: number;
    cost: number;
    currency: 'BYN' | 'RUB' | 'USD';
  }>;
  patterns: {
    daily: number[]; // 24 часа
    weekly: number[]; // 7 дней
    monthly: number[]; // 30 дней
    seasonal: number[]; // 12 месяцев
  };
  anomalies: Array<{
    timestamp: Date;
    type: 'spike' | 'drop' | 'trend-change';
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
  lastAnalyzed: Date;
}

export interface CostPrediction {
  id: string;
  resourceId: string;
  predictionPeriod: '1d' | '1w' | '1m' | '3m' | '6m' | '1y';
  predictionDate: Date;
  predictedCost: number;
  currency: 'BYN' | 'RUB' | 'USD';
  confidence: number; // 0-1
  factors: string[];
  upperBound: number;
  lowerBound: number;
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  recommendations: string[];
}

export interface AIOptimizationModel {
  id: string;
  name: string;
  version: string;
  type:
    | 'cost-optimization'
    | 'resource-prediction'
    | 'anomaly-detection'
    | 'pattern-analysis';
  algorithm:
    | 'linear-regression'
    | 'neural-network'
    | 'random-forest'
    | 'time-series'
    | 'ensemble';
  trainingData: {
    startDate: Date;
    endDate: Date;
    records: number;
    accuracy: number;
  };
  performance: {
    precision: number;
    recall: number;
    f1Score: number;
    mse: number; // Mean Squared Error
  };
  lastTrained: Date;
  status: 'active' | 'training' | 'deprecated' | 'error';
  configuration: Record<string, unknown>;
}

export interface OptimizationExecution {
  id: string;
  recommendationId: string;
  status: 'scheduled' | 'running' | 'completed' | 'failed' | 'rolled-back';
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  executor: string; // кто выполняет
  progress: number; // 0-100
  logs: string[];
  errors: string[];
  rollbackReason?: string;
  actualSavings?: number;
}

export interface CostOptimizationMetrics {
  totalRecommendations: number;
  implementedRecommendations: number;
  totalSavings: number;
  averageSavings: number;
  successRate: number;
  topOptimizations: Array<{
    type: string;
    savings: number;
    count: number;
  }>;
  regionalBreakdown: Array<{
    region: 'RU' | 'BY';
    savings: number;
    recommendations: number;
  }>;
  providerBreakdown: Array<{
    provider: string;
    savings: number;
    recommendations: number;
  }>;
}

@Injectable()
export class CostOptimizationAIService {
  private readonly redactedLogger = new RedactedLogger(
    CostOptimizationAIService.name
  );
  private readonly optimizationRecommendations = new Map<
    string,
    OptimizationRecommendation
  >();
  private readonly resourceUsagePatterns = new Map<
    string,
    ResourceUsagePattern
  >();
  private readonly costPredictions = new Map<string, CostPrediction>();
  private readonly aiModels = new Map<string, AIOptimizationModel>();
  private readonly optimizationExecutions = new Map<
    string,
    OptimizationExecution
  >();

  constructor() {
    this.initializeAIModels();
    this.initializeResourceUsagePatterns();
  }

  private initializeAIModels(): void {
    const models: AIOptimizationModel[] = [
      {
        id: 'model-cost-optimization-v1',
        name: 'Cost Optimization Model v1',
        version: '1.0.0',
        type: 'cost-optimization',
        algorithm: 'ensemble',
        trainingData: {
          startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // год назад
          endDate: new Date(),
          records: 50000,
          accuracy: 0.89,
        },
        performance: {
          precision: 0.87,
          recall: 0.91,
          f1Score: 0.89,
          mse: 0.023,
        },
        lastTrained: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // неделю назад
        status: 'active',
        configuration: {
          learning_rate: 0.001,
          batch_size: 64,
          epochs: 100,
          validation_split: 0.2,
        },
      },
      {
        id: 'model-resource-prediction-v1',
        name: 'Resource Prediction Model v1',
        version: '1.0.0',
        type: 'resource-prediction',
        algorithm: 'time-series',
        trainingData: {
          startDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 6 месяцев назад
          endDate: new Date(),
          records: 25000,
          accuracy: 0.92,
        },
        performance: {
          precision: 0.9,
          recall: 0.94,
          f1Score: 0.92,
          mse: 0.018,
        },
        lastTrained: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 дня назад
        status: 'active',
        configuration: {
          window_size: 24,
          forecast_horizon: 168,
          seasonality: 24,
        },
      },
      {
        id: 'model-anomaly-detection-v1',
        name: 'Anomaly Detection Model v1',
        version: '1.0.0',
        type: 'anomaly-detection',
        algorithm: 'neural-network',
        trainingData: {
          startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 3 месяца назад
          endDate: new Date(),
          records: 15000,
          accuracy: 0.95,
        },
        performance: {
          precision: 0.93,
          recall: 0.97,
          f1Score: 0.95,
          mse: 0.012,
        },
        lastTrained: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // день назад
        status: 'active',
        configuration: {
          threshold: 0.85,
          sensitivity: 0.8,
          auto_learning: true,
        },
      },
    ];

    models.forEach(model => {
      this.aiModels.set(model.id, model);
    });
  }

  private initializeResourceUsagePatterns(): void {
    const patterns: ResourceUsagePattern[] = [
      {
        id: 'pattern-cpu-server-1',
        resourceId: 'server-1',
        resourceType: 'cpu',
        providerId: 'hoster-by',
        region: 'BY',
        timeSeries: this.generateTimeSeriesData('cpu'),
        patterns: {
          daily: [
            20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 75, 70, 65, 60,
            55, 50, 45, 40, 35, 30, 25,
          ],
          weekly: [45, 50, 55, 60, 65, 70, 75],
          monthly: [55, 58, 62, 65, 68, 72, 75, 78, 82, 85, 88, 92],
          seasonal: [60, 65, 70, 75, 80, 85, 90, 85, 80, 75, 70, 65],
        },
        anomalies: [
          {
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            type: 'spike',
            severity: 'high',
            description: 'Unusual CPU spike during maintenance window',
          },
        ],
        lastAnalyzed: new Date(),
      },
      {
        id: 'pattern-memory-server-1',
        resourceId: 'server-1',
        resourceType: 'memory',
        providerId: 'hoster-by',
        region: 'BY',
        timeSeries: this.generateTimeSeriesData('memory'),
        patterns: {
          daily: [
            45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 85, 80, 75, 70, 65, 60, 55,
            50, 45, 40, 35, 30, 25, 20,
          ],
          weekly: [60, 65, 70, 75, 80, 85, 90],
          monthly: [65, 68, 72, 75, 78, 82, 85, 88, 92, 95, 98, 100],
          seasonal: [70, 75, 80, 85, 90, 95, 100, 95, 90, 85, 80, 75],
        },
        anomalies: [],
        lastAnalyzed: new Date(),
      },
    ];

    patterns.forEach(pattern => {
      this.resourceUsagePatterns.set(pattern.id, pattern);
    });
  }

  private generateTimeSeriesData(resourceType: string): Array<{
    timestamp: Date;
    usage: number;
    cost: number;
    currency: 'BYN' | 'RUB' | 'USD';
  }> {
    const data = [];
    const now = new Date();

    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      const baseUsage = resourceType === 'cpu' ? 60 : 70;
      const variation = (Math.random() - 0.5) * 20;
      const usage = Math.max(0, Math.min(100, baseUsage + variation));

      data.push({
        timestamp,
        usage: Math.round(usage * 100) / 100,
        cost: Math.round((usage / 100) * 50 * 100) / 100, // базовая стоимость 50 BYN
        currency: 'BYN' as const,
      });
    }

    return data;
  }

  async analyzeResourceUsage(resourceId: string): Promise<{
    patterns: ResourceUsagePattern;
    recommendations: OptimizationRecommendation[];
    predictions: CostPrediction[];
  }> {
    const pattern = this.resourceUsagePatterns.get(resourceId);
    if (!pattern) {
      throw new Error('Resource usage pattern not found');
    }

    // Анализируем паттерны использования
    const analysis = await this.performAIAnalysis(pattern);

    // Генерируем рекомендации
    const recommendations = await this.generateOptimizationRecommendations(
      pattern,
      analysis
    );

    // Создаем прогнозы стоимости
    const predictions = await this.generateCostPredictions(pattern, analysis);

    return { patterns: pattern, recommendations, predictions };
  }

  private async performAIAnalysis(pattern: ResourceUsagePattern): Promise<{
    utilizationTrend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    averageUtilization: number;
    peakUtilization: number;
    lowUtilizationPeriods: number;
    costEfficiency: number;
    optimizationPotential: number;
  }> {
    // Имитация ИИ анализа
    await new Promise(resolve =>
      setTimeout(resolve, 1000 + Math.random() * 2000)
    );

    const dailyPattern = pattern.patterns.daily;
    const averageUtilization =
      dailyPattern.reduce((sum, val) => sum + val, 0) / dailyPattern.length;
    const peakUtilization = Math.max(...dailyPattern);
    const lowUtilizationPeriods = dailyPattern.filter(val => val < 30).length;

    let utilizationTrend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    if (averageUtilization > 80) {
      utilizationTrend = 'increasing';
    } else if (averageUtilization < 40) {
      utilizationTrend = 'decreasing';
    } else if (lowUtilizationPeriods > 8) {
      utilizationTrend = 'volatile';
    } else {
      utilizationTrend = 'stable';
    }

    const costEfficiency =
      averageUtilization > 70 ? 0.8 : averageUtilization > 50 ? 0.6 : 0.4;
    const optimizationPotential = Math.max(0, 1 - costEfficiency);

    return {
      utilizationTrend,
      averageUtilization: Math.round(averageUtilization * 100) / 100,
      peakUtilization,
      lowUtilizationPeriods,
      costEfficiency: Math.round(costEfficiency * 100) / 100,
      optimizationPotential: Math.round(optimizationPotential * 100) / 100,
    };
  }

  private async generateOptimizationRecommendations(
    pattern: ResourceUsagePattern,
    analysis: Awaited<ReturnType<typeof this.performAIAnalysis>>
  ): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Рекомендация по масштабированию ресурсов
    if (
      analysis.utilizationTrend === 'decreasing' &&
      analysis.averageUtilization < 40
    ) {
      const lastTimeSeriesEntry =
        pattern.timeSeries[pattern.timeSeries.length - 1];
      if (lastTimeSeriesEntry?.cost !== undefined) {
        const currentCost = lastTimeSeriesEntry.cost;
        const estimatedSavings = currentCost * 0.3; // 30% экономии

        recommendations.push({
          id: `rec-${Date.now()}`,
          type: 'resource-downsize',
          priority: analysis.averageUtilization < 20 ? 'high' : 'medium',
          category: 'short-term',
          title: 'Reduce Resource Allocation',
          description: `Resource ${pattern.resourceType} on ${pattern.resourceId} is underutilized. Consider reducing allocation to save costs.`,
          currentState: {
            cost: currentCost,
            currency: pattern.timeSeries[0]?.currency ?? 'BYN',
            resources: [pattern.resourceId],
            utilization: {
              [pattern.resourceType]: analysis.averageUtilization,
            },
          },
          proposedState: {
            cost: currentCost - estimatedSavings,
            currency: pattern.timeSeries[0]?.currency ?? 'BYN',
            resources: [pattern.resourceId],
            estimatedSavings,
            savingsPercentage: 30,
          },
          implementation: {
            effort: 'low',
            estimatedTime: 2,
            risk: 'low',
            steps: [
              'Analyze current resource allocation',
              'Identify unused resources',
              'Reduce allocation gradually',
              'Monitor performance impact',
            ],
            rollbackPlan:
              'Immediately restore previous allocation if performance degrades',
          },
          aiConfidence: 0.85,
          factors: [
            'Low average utilization',
            'Consistent underutilization pattern',
            'Historical cost analysis',
          ],
          createdAt: new Date(),
          status: 'pending',
        });
      }
    }

    // Рекомендация по миграции провайдера
    if (analysis.costEfficiency < 0.6 && pattern.region === 'BY') {
      const lastTimeSeriesEntry =
        pattern.timeSeries[pattern.timeSeries.length - 1];
      if (lastTimeSeriesEntry?.cost !== undefined) {
        const currentCost = lastTimeSeriesEntry.cost;
        const estimatedSavings = currentCost * 0.25; // 25% экономии

        recommendations.push({
          id: `rec-${Date.now() + 1}`,
          type: 'provider-migration',
          priority: 'medium',
          category: 'long-term',
          title: 'Consider Provider Migration',
          description: `Current provider may not be cost-effective for this workload. Evaluate alternatives for better pricing.`,
          currentState: {
            cost: currentCost,
            currency: pattern.timeSeries[0]?.currency ?? 'BYN',
            resources: [pattern.resourceId],
            utilization: {
              [pattern.resourceType]: analysis.averageUtilization,
            },
          },
          proposedState: {
            cost: currentCost - estimatedSavings,
            currency: pattern.timeSeries[0]?.currency ?? 'BYN',
            resources: [pattern.resourceId],
            estimatedSavings,
            savingsPercentage: 25,
          },
          implementation: {
            effort: 'high',
            estimatedTime: 24,
            risk: 'medium',
            steps: [
              'Research alternative providers',
              'Compare pricing and features',
              'Plan migration strategy',
              'Execute migration during low-traffic period',
            ],
            rollbackPlan:
              'Maintain backup of current configuration for quick rollback',
          },
          aiConfidence: 0.72,
          factors: [
            'Low cost efficiency',
            'Regional provider options',
            'Workload characteristics',
          ],
          createdAt: new Date(),
          status: 'pending',
        });
      }
    }

    // Рекомендация по оптимизации расписания
    if (analysis.lowUtilizationPeriods > 8) {
      const lastTimeSeriesEntry =
        pattern.timeSeries[pattern.timeSeries.length - 1];
      if (lastTimeSeriesEntry?.cost !== undefined) {
        const currentCost = lastTimeSeriesEntry.cost;
        const estimatedSavings = currentCost * 0.15; // 15% экономии

        recommendations.push({
          id: `rec-${Date.now() + 2}`,
          type: 'scheduling-optimization',
          priority: 'low',
          category: 'short-term',
          title: 'Optimize Resource Scheduling',
          description:
            'High variability in resource usage suggests scheduling optimization opportunities.',
          currentState: {
            cost: currentCost,
            currency: pattern.timeSeries[0]?.currency ?? 'BYN',
            resources: [pattern.resourceId],
            utilization: {
              [pattern.resourceType]: analysis.averageUtilization,
            },
          },
          proposedState: {
            cost: currentCost - estimatedSavings,
            currency: pattern.timeSeries[0]?.currency ?? 'BYN',
            resources: [pattern.resourceId],
            estimatedSavings,
            savingsPercentage: 15,
          },
          implementation: {
            effort: 'medium',
            estimatedTime: 8,
            risk: 'low',
            steps: [
              'Analyze usage patterns',
              'Identify peak and off-peak periods',
              'Implement dynamic scaling',
              'Optimize workload distribution',
            ],
            rollbackPlan:
              'Revert to static allocation if dynamic scaling causes issues',
          },
          aiConfidence: 0.78,
          factors: [
            'High usage variability',
            'Predictable patterns',
            'Automation opportunities',
          ],
          createdAt: new Date(),
          status: 'pending',
        });
      }
    }

    // Сохраняем рекомендации
    recommendations.forEach(rec => {
      this.optimizationRecommendations.set(rec.id, rec);
    });

    return recommendations;
  }

  private async generateCostPredictions(
    pattern: ResourceUsagePattern,
    analysis: Awaited<ReturnType<typeof this.performAIAnalysis>>
  ): Promise<CostPrediction[]> {
    const predictions: CostPrediction[] = [];
    const lastTimeSeriesEntry =
      pattern.timeSeries[pattern.timeSeries.length - 1];
    if (lastTimeSeriesEntry?.cost === undefined) {
      throw new Error('Cost data not available for predictions');
    }
    const currentCost = lastTimeSeriesEntry.cost;

    // Прогноз на 1 месяц
    const monthlyPrediction = await this.predictCost(
      pattern,
      '1m',
      analysis.utilizationTrend,
      currentCost
    );
    predictions.push(monthlyPrediction);

    // Прогноз на 3 месяца
    const quarterlyPrediction = await this.predictCost(
      pattern,
      '3m',
      analysis.utilizationTrend,
      currentCost
    );
    predictions.push(quarterlyPrediction);

    // Прогноз на 6 месяцев
    const semiAnnualPrediction = await this.predictCost(
      pattern,
      '6m',
      analysis.utilizationTrend,
      currentCost
    );
    predictions.push(semiAnnualPrediction);

    // Сохраняем прогнозы
    predictions.forEach(pred => {
      this.costPredictions.set(pred.id, pred);
    });

    return predictions;
  }

  private async predictCost(
    pattern: ResourceUsagePattern,
    period: CostPrediction['predictionPeriod'],
    trend: 'increasing' | 'decreasing' | 'stable' | 'volatile',
    currentCost: number
  ): Promise<CostPrediction> {
    // Имитация ИИ прогнозирования
    await new Promise(resolve =>
      setTimeout(resolve, 500 + Math.random() * 1000)
    );

    let growthFactor = 1.0;
    let confidence = 0.8;

    switch (trend) {
      case 'increasing':
        growthFactor = 1.1 + Math.random() * 0.2; // 10-30% рост
        confidence = 0.75;
        break;
      case 'decreasing':
        growthFactor = 0.9 - Math.random() * 0.2; // 10-30% снижение
        confidence = 0.85;
        break;
      case 'stable':
        growthFactor = 0.95 + Math.random() * 0.1; // -5% до +5%
        confidence = 0.9;
        break;
      case 'volatile':
        growthFactor = 0.8 + Math.random() * 0.4; // -20% до +20%
        confidence = 0.6;
        break;
    }

    // Корректируем на основе периода
    const periodMultipliers: Record<string, number> = {
      '1d': 1,
      '1w': 7,
      '1m': 1,
      '3m': 3,
      '6m': 6,
      '1y': 12,
    };
    const periodMultiplier = periodMultipliers[period] ?? 1;

    const predictedCost = currentCost * growthFactor * periodMultiplier;
    const upperBound = predictedCost * (1 + 0.2);
    const lowerBound = predictedCost * (1 - 0.2);

    let trendDirection: CostPrediction['trend'];
    if (growthFactor > 1.05) trendDirection = 'increasing';
    else if (growthFactor < 0.95) trendDirection = 'decreasing';
    else if (Math.abs(growthFactor - 1) < 0.05) trendDirection = 'stable';
    else trendDirection = 'volatile';

    const recommendations: string[] = [];
    if (trendDirection === 'increasing') {
      recommendations.push(
        'Consider resource optimization to control cost growth'
      );
      recommendations.push('Implement cost monitoring and alerting');
    } else if (trendDirection === 'decreasing') {
      recommendations.push('Monitor for potential underutilization');
      recommendations.push('Consider cost-effective resource allocation');
    }

    return {
      id: `prediction-${Date.now()}`,
      resourceId: pattern.resourceId,
      predictionPeriod: period,
      predictionDate: new Date(),
      predictedCost: Math.round(predictedCost * 100) / 100,
      currency: pattern.timeSeries[0]?.currency ?? 'BYN',
      confidence: Math.round(confidence * 100) / 100,
      factors: [
        `Historical ${trend} trend`,
        `Seasonal patterns`,
        `Resource utilization patterns`,
        `Provider pricing changes`,
      ],
      upperBound: Math.round(upperBound * 100) / 100,
      lowerBound: Math.round(lowerBound * 100) / 100,
      trend: trendDirection,
      recommendations,
    };
  }

  async approveRecommendation(
    recommendationId: string,
    executor: string
  ): Promise<string> {
    const recommendation =
      this.optimizationRecommendations.get(recommendationId);
    if (!recommendation) {
      throw new Error('Optimization recommendation not found');
    }

    recommendation.status = 'approved';
    recommendation.approvedAt = new Date();

    // Создаем задачу на выполнение
    const execution: OptimizationExecution = {
      id: `execution-${Date.now()}`,
      recommendationId,
      status: 'scheduled',
      scheduledAt: new Date(),
      executor,
      progress: 0,
      logs: [`Recommendation approved by ${executor}`],
      errors: [],
    };

    this.optimizationExecutions.set(execution.id, execution);

    this.redactedLogger.log(
      `Optimization recommendation approved`,
      'CostOptimizationAIService',
      {
        recommendationId,
        executor,
        executionId: execution.id,
      }
    );

    return execution.id;
  }

  async executeOptimization(executionId: string): Promise<boolean> {
    const execution = this.optimizationExecutions.get(executionId);
    if (!execution) {
      return false;
    }

    const recommendation = this.optimizationRecommendations.get(
      execution.recommendationId
    );
    if (!recommendation) {
      return false;
    }

    execution.status = 'running';
    execution.startedAt = new Date();

    try {
      // Имитация выполнения оптимизации
      for (let i = 0; i <= 100; i += 20) {
        execution.progress = i;
        execution.logs.push(
          `Step ${i / 20 + 1}/5: ${this.getStepDescription(i / 20 + 1)}`
        );

        await new Promise(resolve =>
          setTimeout(resolve, 1000 + Math.random() * 2000)
        );
      }

      execution.status = 'completed';
      execution.completedAt = new Date();
      execution.progress = 100;
      execution.logs.push('Optimization completed successfully');

      // Обновляем статус рекомендации
      recommendation.status = 'implemented';
      recommendation.implementedAt = new Date();
      recommendation.actualSavings =
        recommendation.proposedState.estimatedSavings * 0.9; // 90% от ожидаемой экономии

      this.redactedLogger.log(
        `Optimization executed successfully`,
        'CostOptimizationAIService',
        {
          executionId,
          recommendationId: recommendation.id,
          actualSavings: recommendation.actualSavings,
        }
      );

      return true;
    } catch (error) {
      execution.status = 'failed';
      execution.errors.push(
        error instanceof Error ? error.message : 'Unknown error'
      );
      execution.logs.push('Optimization failed');

      this.redactedLogger.errorWithData(
        `Optimization execution failed`,
        {
          executionId,
          error: execution.errors[0],
        },
        'CostOptimizationAIService'
      );

      return false;
    }
  }

  private getStepDescription(step: number): string {
    const descriptions = [
      'Analyzing current state',
      'Preparing optimization plan',
      'Implementing changes',
      'Verifying results',
      'Finalizing optimization',
    ];
    return descriptions[step - 1] ?? 'Unknown step';
  }

  async getOptimizationMetrics(): Promise<CostOptimizationMetrics> {
    const recommendations = Array.from(
      this.optimizationRecommendations.values()
    );
    const implemented = recommendations.filter(r => r.status === 'implemented');

    const totalSavings = implemented.reduce(
      (sum, r) => sum + (r.actualSavings ?? 0),
      0
    );
    const averageSavings =
      implemented.length > 0 ? totalSavings / implemented.length : 0;
    const successRate =
      recommendations.length > 0
        ? (implemented.length / recommendations.length) * 100
        : 0;

    // Анализируем топ оптимизации по типам
    const typeBreakdown = new Map<string, { savings: number; count: number }>();
    implemented.forEach(rec => {
      const current = typeBreakdown.get(rec.type) ?? { savings: 0, count: 0 };
      current.savings += rec.actualSavings ?? 0;
      current.count += 1;
      typeBreakdown.set(rec.type, current);
    });

    const topOptimizations = Array.from(typeBreakdown.entries())
      .map(([type, data]) => ({
        type,
        savings: data.savings,
        count: data.count,
      }))
      .sort((a, b) => b.savings - a.savings)
      .slice(0, 5);

    // Региональный анализ
    const regionalBreakdown = [
      {
        region: 'RU' as const,
        savings: totalSavings * 0.4,
        recommendations: implemented.length * 0.4,
      },
      {
        region: 'BY' as const,
        savings: totalSavings * 0.6,
        recommendations: implemented.length * 0.6,
      },
    ];

    // Анализ по провайдерам
    const providerBreakdown = [
      {
        provider: 'hoster-by',
        savings: totalSavings * 0.3,
        recommendations: implemented.length * 0.3,
      },
      {
        provider: 'becloud',
        savings: totalSavings * 0.25,
        recommendations: implemented.length * 0.25,
      },
      {
        provider: 'vk-cloud',
        savings: totalSavings * 0.25,
        recommendations: implemented.length * 0.25,
      },
      {
        provider: 'other',
        savings: totalSavings * 0.2,
        recommendations: implemented.length * 0.2,
      },
    ];

    return {
      totalRecommendations: recommendations.length,
      implementedRecommendations: implemented.length,
      totalSavings: Math.round(totalSavings * 100) / 100,
      averageSavings: Math.round(averageSavings * 100) / 100,
      successRate: Math.round(successRate * 100) / 100,
      topOptimizations,
      regionalBreakdown,
      providerBreakdown,
    };
  }

  async getOptimizationRecommendations(): Promise<
    OptimizationRecommendation[]
  > {
    return Array.from(this.optimizationRecommendations.values());
  }

  async getResourceUsagePatterns(): Promise<ResourceUsagePattern[]> {
    return Array.from(this.resourceUsagePatterns.values());
  }

  async getCostPredictions(): Promise<CostPrediction[]> {
    return Array.from(this.costPredictions.values());
  }

  async getAIModels(): Promise<AIOptimizationModel[]> {
    return Array.from(this.aiModels.values());
  }

  async getOptimizationExecutions(): Promise<OptimizationExecution[]> {
    return Array.from(this.optimizationExecutions.values());
  }

  async addOptimizationRecommendation(
    recommendation: Omit<OptimizationRecommendation, 'id' | 'createdAt'>
  ): Promise<string> {
    const recommendationId = `rec-${Date.now()}`;
    const newRecommendation: OptimizationRecommendation = {
      ...recommendation,
      id: recommendationId,
      createdAt: new Date(),
    };

    this.optimizationRecommendations.set(recommendationId, newRecommendation);
    return recommendationId;
  }

  async updateRecommendationStatus(
    recommendationId: string,
    status: OptimizationRecommendation['status']
  ): Promise<boolean> {
    const recommendation =
      this.optimizationRecommendations.get(recommendationId);
    if (!recommendation) {
      return false;
    }

    recommendation.status = status;

    if (status === 'implemented') {
      recommendation.implementedAt = new Date();
    }

    return true;
  }

  /**
   * Оптимизация затрат
   */
  optimizeCosts(serviceId: string): {
    serviceId: string;
    recommendations: Array<{
      type: string;
      description: string;
      estimatedSavings: number;
      implementationEffort: string;
    }>;
    confidenceScore: number;
    totalEstimatedSavings: number;
  } {
    const recommendations = [
      {
        type: 'resource-downsize',
        description: 'Scale down underutilized resources',
        estimatedSavings: Math.random() * 200 + 100,
        implementationEffort: 'low',
      },
      {
        type: 'provider-migration',
        description: 'Migrate to more cost-effective provider',
        estimatedSavings: Math.random() * 500 + 300,
        implementationEffort: 'medium',
      },
      {
        type: 'reserved-instance',
        description: 'Purchase reserved instances for predictable workloads',
        estimatedSavings: Math.random() * 300 + 200,
        implementationEffort: 'low',
      },
    ];

    const totalEstimatedSavings = recommendations.reduce(
      (sum, rec) => sum + rec.estimatedSavings,
      0
    );
    const confidenceScore = Math.random() * 0.3 + 0.7; // 70-100% уверенность

    return {
      serviceId,
      recommendations: recommendations.map(rec => ({
        ...rec,
        estimatedSavings: Math.round(rec.estimatedSavings * 100) / 100,
      })),
      confidenceScore: Math.round(confidenceScore * 100) / 100,
      totalEstimatedSavings: Math.round(totalEstimatedSavings * 100) / 100,
    };
  }

  /**
   * Прогнозирование использования ресурсов
   */
  predictResourceUsage(
    serviceId: string,
    period: string
  ): {
    serviceId: string;
    period: string;
    predictions: Array<{
      resourceType: string;
      currentUsage: number;
      predictedUsage: number;
      confidence: number;
      trend: string;
    }>;
    overallTrend: string;
    recommendations: string[];
  } {
    const predictions = [
      {
        resourceType: 'CPU',
        currentUsage: Math.random() * 40 + 30,
        predictedUsage: Math.random() * 60 + 40,
        confidence: Math.random() * 0.3 + 0.7,
        trend: 'increasing',
      },
      {
        resourceType: 'Memory',
        currentUsage: Math.random() * 50 + 25,
        predictedUsage: Math.random() * 70 + 35,
        confidence: Math.random() * 0.25 + 0.75,
        trend: 'increasing',
      },
      {
        resourceType: 'Storage',
        currentUsage: Math.random() * 60 + 20,
        predictedUsage: Math.random() * 80 + 30,
        confidence: Math.random() * 0.2 + 0.8,
        trend: 'stable',
      },
    ];

    const overallTrend =
      predictions.filter(p => p.trend === 'increasing').length > 1
        ? 'increasing'
        : 'stable';
    const recommendations = predictions
      .filter(p => p.trend === 'increasing')
      .map(
        p =>
          `Plan for ${p.resourceType} scaling - expected growth: ${Math.round(((p.predictedUsage - p.currentUsage) / p.currentUsage) * 100)}%`
      );

    return {
      serviceId,
      period,
      predictions: predictions.map(p => ({
        ...p,
        currentUsage: Math.round(p.currentUsage * 100) / 100,
        predictedUsage: Math.round(p.predictedUsage * 100) / 100,
        confidence: Math.round(p.confidence * 100) / 100,
      })),
      overallTrend,
      recommendations,
    };
  }

  /**
   * Обнаружение аномалий
   */
  detectAnomalies(serviceId: string): {
    serviceId: string;
    anomalies: Array<{
      type: string;
      severity: string;
      description: string;
      detectedAt: Date;
      impact: string;
    }>;
    totalAnomalies: number;
    criticalAnomalies: number;
  } {
    const anomalies = [
      {
        type: 'cost-spike',
        severity: 'high',
        description: 'Unusual cost increase detected',
        detectedAt: new Date(),
        impact: 'Budget exceeded by 25%',
      },
      {
        type: 'resource-utilization',
        severity: 'medium',
        description: 'Low resource utilization pattern',
        detectedAt: new Date(),
        impact: 'Potential cost optimization opportunity',
      },
      {
        type: 'provider-performance',
        severity: 'low',
        description: 'Provider performance degradation',
        detectedAt: new Date(),
        impact: 'Consider alternative providers',
      },
    ];

    const criticalAnomalies = anomalies.filter(
      a => a.severity === 'critical'
    ).length;

    return {
      serviceId,
      anomalies,
      totalAnomalies: anomalies.length,
      criticalAnomalies,
    };
  }

  /**
   * Анализ паттернов использования
   */
  analyzeUsagePatterns(serviceId: string): {
    serviceId: string;
    patterns: Array<{
      type: string;
      description: string;
      frequency: string;
      impact: string;
      recommendation: string;
    }>;
    seasonalTrends: string[];
    optimizationOpportunities: number;
  } {
    const patterns = [
      {
        type: 'daily-usage',
        description: 'Peak usage during business hours',
        frequency: 'Daily',
        impact: 'High',
        recommendation: 'Implement auto-scaling',
      },
      {
        type: 'weekly-usage',
        description: 'Lower usage on weekends',
        frequency: 'Weekly',
        impact: 'Medium',
        recommendation: 'Schedule maintenance on weekends',
      },
      {
        type: 'monthly-usage',
        description: 'Consistent growth trend',
        frequency: 'Monthly',
        impact: 'High',
        recommendation: 'Plan capacity expansion',
      },
    ];

    const seasonalTrends = [
      'Higher usage during Q4 (holiday season)',
      'Lower usage during summer months',
      'Spikes during major events',
    ];

    const optimizationOpportunities = Math.floor(Math.random() * 5) + 3; // 3-7 возможностей

    return {
      serviceId,
      patterns,
      seasonalTrends,
      optimizationOpportunities,
    };
  }
}

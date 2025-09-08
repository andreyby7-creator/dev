import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface IBusinessMetric {
  id: string;
  name: string;
  category: 'revenue' | 'users' | 'performance' | 'engagement' | 'conversion';
  value: number;
  unit: string;
  timestamp: Date;
  dimensions: Record<string, string>;
  metadata: Record<string, unknown>;
}

export interface IUserAnalytics {
  id: string;
  userId: string;
  event: string;
  properties: Record<string, unknown>;
  timestamp: Date;
  sessionId: string;
  userAgent: string;
  ipAddress: string;
  referrer?: string;
}

export interface IPerformanceAnalytics {
  id: string;
  _service: string;
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  requestSize: number;
  responseSize: number;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

export interface IBusinessReport {
  id: string;
  name: string;
  type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  period: {
    from: Date;
    to: Date;
  };
  metrics: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    revenue: number;
    conversionRate: number;
    averageSessionDuration: number;
    bounceRate: number;
    topPages: Array<{ page: string; views: number; uniqueViews: number }>;
    topReferrers: Array<{ referrer: string; visits: number }>;
    deviceBreakdown: Array<{ device: string; percentage: number }>;
    geographicData: Array<{ country: string; users: number; revenue: number }>;
  };
  insights: string[];
  recommendations: string[];
  generatedAt: Date;
  generatedBy: string;
}

export interface IPredictiveAnalytics {
  id: string;
  model: string;
  target: string;
  prediction: number;
  confidence: number;
  timeframe: string;
  factors: Array<{
    name: string;
    impact: number;
    value: number;
  }>;
  timestamp: Date;
  accuracy?: number;
}

export interface IDataVisualization {
  id: string;
  name: string;
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap' | 'funnel';
  data: unknown[];
  config: {
    title: string;
    xAxis?: string;
    yAxis?: string;
    colors?: string[];
    filters?: Record<string, unknown>;
  };
  refreshInterval: number;
  lastUpdated: Date;
  isPublic: boolean;
}

@Injectable()
export class BusinessIntelligenceService {
  private readonly logger = new Logger(BusinessIntelligenceService.name);
  private businessMetrics = new Map<string, IBusinessMetric[]>();
  private userAnalytics = new Map<string, IUserAnalytics[]>();
  private performanceAnalytics = new Map<string, IPerformanceAnalytics[]>();
  private businessReports = new Map<string, IBusinessReport>();
  private predictiveAnalytics = new Map<string, IPredictiveAnalytics[]>();
  private dataVisualizations = new Map<string, IDataVisualization>();

  constructor(
    private _configService: ConfigService,
    private eventEmitter: EventEmitter2
  ) {
    this._configService.get('BUSINESS_INTELLIGENCE_ENABLED');
    this.eventEmitter.emit('analytics.initialized');
    this.initializeDataVisualizations();
    this.startAnalyticsCollection();
  }

  private initializeDataVisualizations(): void {
    const visualizations: IDataVisualization[] = [
      {
        id: 'user-growth-chart',
        name: 'User Growth',
        type: 'line',
        data: [],
        config: {
          title: 'User Growth Over Time',
          xAxis: 'Date',
          yAxis: 'Users',
          colors: ['#3B82F6', '#10B981', '#F59E0B'],
        },
        refreshInterval: 3600000, // 1 hour
        lastUpdated: new Date(),
        isPublic: true,
      },
      {
        id: 'revenue-breakdown',
        name: 'Revenue Breakdown',
        type: 'pie',
        data: [],
        config: {
          title: 'Revenue by Source',
          colors: ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6'],
        },
        refreshInterval: 86400000, // 24 hours
        lastUpdated: new Date(),
        isPublic: false,
      },
      {
        id: 'performance-metrics',
        name: 'Performance Metrics',
        type: 'bar',
        data: [],
        config: {
          title: 'API Performance Metrics',
          xAxis: 'Service',
          yAxis: 'Response Time (ms)',
          colors: ['#8B5CF6', '#06B6D4', '#84CC16'],
        },
        refreshInterval: 300000, // 5 minutes
        lastUpdated: new Date(),
        isPublic: true,
      },
      {
        id: 'conversion-funnel',
        name: 'Conversion Funnel',
        type: 'funnel',
        data: [],
        config: {
          title: 'User Conversion Funnel',
          colors: ['#F59E0B', '#EF4444', '#10B981', '#3B82F6'],
        },
        refreshInterval: 3600000, // 1 hour
        lastUpdated: new Date(),
        isPublic: false,
      },
    ];

    visualizations.forEach(viz => {
      this.dataVisualizations.set(viz.id, viz);
    });

    this.logger.log(`Initialized ${visualizations.length} data visualizations`);
  }

  private startAnalyticsCollection(): void {
    // Собираем бизнес-метрики каждые 5 минут
    setInterval(() => {
      void this.collectBusinessMetrics();
    }, 300000);

    // Собираем пользовательскую аналитику каждую минуту
    setInterval(() => {
      void this.collectUserAnalytics();
    }, 60000);

    // Собираем аналитику производительности каждые 30 секунд
    setInterval(() => {
      void this.collectPerformanceAnalytics();
    }, 30000);

    // Обновляем визуализации каждые 10 минут
    setInterval(() => {
      void this.updateDataVisualizations();
    }, 600000);
  }

  private async collectBusinessMetrics(): Promise<void> {
    try {
      const metrics: IBusinessMetric[] = [
        {
          id: `metric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: 'total_users',
          category: 'users',
          value: Math.floor(Math.random() * 10000) + 50000, // 50k-60k users
          unit: 'count',
          timestamp: new Date(),
          dimensions: { source: 'registration' },
          metadata: { platform: 'web' },
        },
        {
          id: `metric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: 'active_users',
          category: 'users',
          value: Math.floor(Math.random() * 5000) + 10000, // 10k-15k active users
          unit: 'count',
          timestamp: new Date(),
          dimensions: { period: 'daily' },
          metadata: { platform: 'all' },
        },
        {
          id: `metric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: 'revenue',
          category: 'revenue',
          value: Math.floor(Math.random() * 10000) + 50000, // $50k-60k
          unit: 'USD',
          timestamp: new Date(),
          dimensions: { source: 'subscriptions' },
          metadata: { currency: 'USD' },
        },
        {
          id: `metric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: 'conversion_rate',
          category: 'conversion',
          value: Math.random() * 10 + 2, // 2-12%
          unit: '%',
          timestamp: new Date(),
          dimensions: { funnel: 'signup_to_paid' },
          metadata: { period: 'monthly' },
        },
        {
          id: `metric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: 'session_duration',
          category: 'engagement',
          value: Math.random() * 600 + 300, // 5-15 minutes
          unit: 'seconds',
          timestamp: new Date(),
          dimensions: { platform: 'web' },
          metadata: { average: true },
        },
      ];

      for (const metric of metrics) {
        const key = `${metric.category}.${metric.name}`;
        const existingMetrics = this.businessMetrics.get(key) ?? [];
        existingMetrics.push(metric);

        // Ограничиваем количество метрик (храним последние 1000)
        if (existingMetrics.length > 1000) {
          existingMetrics.splice(0, existingMetrics.length - 1000);
        }

        this.businessMetrics.set(key, existingMetrics);
      }

      this.logger.debug('Business metrics collected');
    } catch (error) {
      this.logger.error('Error collecting business metrics:', error);
    }
  }

  private async collectUserAnalytics(): Promise<void> {
    try {
      const events = [
        'page_view',
        'button_click',
        'form_submit',
        'purchase',
        'signup',
        'login',
      ];
      const analytics: IUserAnalytics[] = [];

      // Генерируем случайные события пользователей
      for (let i = 0; i < Math.floor(Math.random() * 50) + 10; i++) {
        const event = events[Math.floor(Math.random() * events.length)];
        const userId = `user-${Math.floor(Math.random() * 1000)}`;
        const sessionId = `session-${Math.floor(Math.random() * 10000)}`;

        analytics.push({
          id: `analytics-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId,
          event: event as string,
          properties: {
            page: `/page-${Math.floor(Math.random() * 10)}`,
            element: event === 'button_click' ? 'cta-button' : undefined,
            value: event === 'purchase' ? Math.random() * 100 + 10 : undefined,
          },
          timestamp: new Date(),
          sessionId,
          userAgent: 'Mozilla/5.0 (compatible; AnalyticsBot/1.0)',
          ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          referrer: Math.random() > 0.5 ? 'https://google.com' : '',
        });
      }

      for (const analytic of analytics) {
        const key = `${analytic.userId}.${analytic.event}`;
        const existingAnalytics = this.userAnalytics.get(key) ?? [];
        existingAnalytics.push(analytic);

        // Ограничиваем количество аналитики (храним последние 500)
        if (existingAnalytics.length > 500) {
          existingAnalytics.splice(0, existingAnalytics.length - 500);
        }

        this.userAnalytics.set(key, existingAnalytics);
      }

      this.logger.debug(`User analytics collected: ${analytics.length} events`);
    } catch (error) {
      this.logger.error('Error collecting user analytics:', error);
    }
  }

  private async collectPerformanceAnalytics(): Promise<void> {
    try {
      const services = [
        'auth-service',
        'cards-service',
        'monitoring-service',
        'security-service',
      ];
      const endpoints = [
        '/api/auth/login',
        '/api/cards',
        '/api/monitoring/health',
        '/api/security/audit',
      ];
      const methods = ['GET', 'POST', 'PUT', 'DELETE'];

      const analytics: IPerformanceAnalytics[] = [];

      for (let i = 0; i < Math.floor(Math.random() * 20) + 5; i++) {
        const service = services[Math.floor(Math.random() * services.length)];
        const endpoint =
          endpoints[Math.floor(Math.random() * endpoints.length)];
        const method = methods[Math.floor(Math.random() * methods.length)];

        analytics.push({
          id: `perf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          _service: service ?? '',
          endpoint: endpoint as string,
          method: method as string,
          responseTime: Math.random() * 1000 + 50, // 50-1050ms
          statusCode:
            Math.random() > 0.1 ? 200 : Math.random() > 0.5 ? 400 : 500,
          requestSize: Math.floor(Math.random() * 10000) + 100, // 100-10100 bytes
          responseSize: Math.floor(Math.random() * 50000) + 500, // 500-50500 bytes
          timestamp: new Date(),
          userId:
            Math.random() > 0.3
              ? `user-${Math.floor(Math.random() * 1000)}`
              : '',
          sessionId:
            Math.random() > 0.3
              ? `session-${Math.floor(Math.random() * 10000)}`
              : '',
        });
      }

      for (const analytic of analytics) {
        const key = `${analytic._service}.${analytic.endpoint}`;
        const existingAnalytics = this.performanceAnalytics.get(key) ?? [];
        existingAnalytics.push(analytic);

        // Ограничиваем количество аналитики (храним последние 1000)
        if (existingAnalytics.length > 1000) {
          existingAnalytics.splice(0, existingAnalytics.length - 1000);
        }

        this.performanceAnalytics.set(key, existingAnalytics);
      }

      this.logger.debug(
        `Performance analytics collected: ${analytics.length} requests`
      );
    } catch (error) {
      this.logger.error('Error collecting performance analytics:', error);
    }
  }

  private async updateDataVisualizations(): Promise<void> {
    try {
      // Обновляем данные для визуализаций
      for (const [, visualization] of this.dataVisualizations) {
        await this.updateVisualizationData(visualization);
      }

      this.logger.debug('Data visualizations updated');
    } catch (error) {
      this.logger.error('Error updating data visualizations:', error);
    }
  }

  private async updateVisualizationData(
    visualization: IDataVisualization
  ): Promise<void> {
    switch (visualization.id) {
      case 'user-growth-chart':
        visualization.data = this.generateUserGrowthData();
        break;
      case 'revenue-breakdown':
        visualization.data = this.generateRevenueBreakdownData();
        break;
      case 'performance-metrics':
        visualization.data = this.generatePerformanceMetricsData();
        break;
      case 'conversion-funnel':
        visualization.data = this.generateConversionFunnelData();
        break;
    }

    visualization.lastUpdated = new Date();
  }

  private generateUserGrowthData(): unknown[] {
    const data = [];
    const now = new Date();

    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      data.push({
        date: date.toISOString().split('T')[0],
        users: Math.floor(Math.random() * 1000) + 50000,
        newUsers: Math.floor(Math.random() * 100) + 500,
      });
    }

    return data;
  }

  private generateRevenueBreakdownData(): unknown[] {
    return [
      {
        source: 'Subscriptions',
        value: Math.floor(Math.random() * 20000) + 30000,
      },
      {
        source: 'One-time Purchases',
        value: Math.floor(Math.random() * 10000) + 15000,
      },
      {
        source: 'Enterprise',
        value: Math.floor(Math.random() * 15000) + 20000,
      },
      { source: 'API Usage', value: Math.floor(Math.random() * 5000) + 5000 },
      { source: 'Consulting', value: Math.floor(Math.random() * 3000) + 2000 },
    ];
  }

  private generatePerformanceMetricsData(): unknown[] {
    const services = [
      'Auth Service',
      'Cards Service',
      'Monitoring Service',
      'Security Service',
    ];

    return services.map(service => ({
      service,
      responseTime: Math.random() * 500 + 100,
      throughput: Math.random() * 1000 + 500,
      errorRate: Math.random() * 5,
    }));
  }

  private generateConversionFunnelData(): unknown[] {
    return [
      { stage: 'Visitors', value: Math.floor(Math.random() * 10000) + 50000 },
      { stage: 'Signups', value: Math.floor(Math.random() * 2000) + 5000 },
      { stage: 'Trials', value: Math.floor(Math.random() * 1000) + 2000 },
      { stage: 'Paid Users', value: Math.floor(Math.random() * 500) + 1000 },
    ];
  }

  async generateBusinessReport(
    type: IBusinessReport['type'],
    period: { from: Date; to: Date },
    generatedBy: string
  ): Promise<IBusinessReport> {
    const reportId = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Собираем метрики за период
    const metrics = await this.aggregateMetricsForPeriod(period);

    const report: IBusinessReport = {
      id: reportId,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Business Report`,
      type,
      period,
      metrics,
      insights: this.generateInsights(metrics),
      recommendations: this.generateRecommendations(metrics),
      generatedAt: new Date(),
      generatedBy,
    };

    this.businessReports.set(reportId, report);

    this.logger.log(`Generated business report: ${reportId} (${type})`);

    return report;
  }

  private async aggregateMetricsForPeriod(_period: {
    from: Date;
    to: Date;
  }): Promise<IBusinessReport['metrics']> {
    // Агрегируем метрики за период
    const totalUsers = Math.floor(Math.random() * 10000) + 50000;
    const activeUsers = Math.floor(Math.random() * 5000) + 10000;
    const newUsers = Math.floor(Math.random() * 2000) + 1000;
    const revenue = Math.floor(Math.random() * 50000) + 100000;
    const conversionRate = Math.random() * 10 + 5;
    const averageSessionDuration = Math.random() * 600 + 300;
    const bounceRate = Math.random() * 20 + 30;

    return {
      totalUsers,
      activeUsers,
      newUsers,
      revenue,
      conversionRate,
      averageSessionDuration,
      bounceRate,
      topPages: [
        {
          page: '/dashboard',
          views: Math.floor(Math.random() * 10000) + 5000,
          uniqueViews: Math.floor(Math.random() * 5000) + 2000,
        },
        {
          page: '/cards',
          views: Math.floor(Math.random() * 8000) + 3000,
          uniqueViews: Math.floor(Math.random() * 4000) + 1500,
        },
        {
          page: '/settings',
          views: Math.floor(Math.random() * 5000) + 2000,
          uniqueViews: Math.floor(Math.random() * 3000) + 1000,
        },
      ],
      topReferrers: [
        {
          referrer: 'google.com',
          visits: Math.floor(Math.random() * 5000) + 2000,
        },
        { referrer: 'direct', visits: Math.floor(Math.random() * 3000) + 1500 },
        {
          referrer: 'facebook.com',
          visits: Math.floor(Math.random() * 2000) + 1000,
        },
      ],
      deviceBreakdown: [
        { device: 'Desktop', percentage: Math.random() * 20 + 50 },
        { device: 'Mobile', percentage: Math.random() * 20 + 30 },
        { device: 'Tablet', percentage: Math.random() * 10 + 10 },
      ],
      geographicData: [
        {
          country: 'United States',
          users: Math.floor(Math.random() * 20000) + 30000,
          revenue: Math.floor(Math.random() * 50000) + 80000,
        },
        {
          country: 'United Kingdom',
          users: Math.floor(Math.random() * 5000) + 8000,
          revenue: Math.floor(Math.random() * 15000) + 20000,
        },
        {
          country: 'Germany',
          users: Math.floor(Math.random() * 4000) + 6000,
          revenue: Math.floor(Math.random() * 12000) + 15000,
        },
      ],
    };
  }

  private generateInsights(metrics: IBusinessReport['metrics']): string[] {
    const insights: string[] = [];

    if (metrics.conversionRate > 8) {
      insights.push(
        'Conversion rate is above industry average, indicating strong product-market fit'
      );
    }

    if (metrics.bounceRate < 40) {
      insights.push(
        'Low bounce rate suggests good user engagement and content relevance'
      );
    }

    if (metrics.averageSessionDuration > 600) {
      insights.push('High session duration indicates strong user engagement');
    }

    if (metrics.newUsers > metrics.activeUsers * 0.1) {
      insights.push('Healthy user acquisition rate with good retention');
    }

    insights.push('Mobile traffic represents significant portion of user base');
    insights.push('Direct traffic shows strong brand recognition');

    return insights;
  }

  private generateRecommendations(
    metrics: IBusinessReport['metrics']
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.conversionRate < 5) {
      recommendations.push(
        'Improve conversion rate by optimizing signup flow and reducing friction'
      );
    }

    if (metrics.bounceRate > 60) {
      recommendations.push(
        'Reduce bounce rate by improving page load times and content quality'
      );
    }

    if (metrics.averageSessionDuration < 300) {
      recommendations.push(
        'Increase session duration by adding engaging features and content'
      );
    }

    recommendations.push('Implement A/B testing for key conversion points');
    recommendations.push(
      'Optimize mobile experience to capture more mobile users'
    );
    recommendations.push('Develop referral program to increase organic growth');

    return recommendations;
  }

  async generatePredictiveAnalytics(
    model: string,
    target: string,
    timeframe: string
  ): Promise<IPredictiveAnalytics> {
    const id = `prediction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const prediction: IPredictiveAnalytics = {
      id,
      model,
      target,
      prediction: Math.random() * 1000 + 100, // Примерное значение
      confidence: Math.random() * 30 + 70, // 70-100% уверенности
      timeframe,
      factors: [
        { name: 'Historical Growth', impact: 0.4, value: Math.random() * 100 },
        { name: 'Seasonal Trends', impact: 0.3, value: Math.random() * 50 },
        { name: 'Market Conditions', impact: 0.2, value: Math.random() * 30 },
        { name: 'User Engagement', impact: 0.1, value: Math.random() * 20 },
      ],
      timestamp: new Date(),
      accuracy: Math.random() * 20 + 80, // 80-100% точность
    };

    const key = `${model}.${target}`;
    const existingPredictions = this.predictiveAnalytics.get(key) ?? [];
    existingPredictions.push(prediction);

    // Ограничиваем количество предсказаний (храним последние 100)
    if (existingPredictions.length > 100) {
      existingPredictions.splice(0, existingPredictions.length - 100);
    }

    this.predictiveAnalytics.set(key, existingPredictions);

    this.logger.log(`Generated predictive analytics: ${id} for ${target}`);

    return prediction;
  }

  async getBusinessMetrics(
    category?: string,
    timeRange?: { from: Date; to: Date }
  ): Promise<IBusinessMetric[]> {
    let allMetrics: IBusinessMetric[] = [];

    if (category != null) {
      for (const [key, metrics] of this.businessMetrics) {
        if (key.startsWith(`${category}.`)) {
          allMetrics.push(...metrics);
        }
      }
    } else {
      for (const metrics of this.businessMetrics.values()) {
        allMetrics.push(...metrics);
      }
    }

    // Фильтруем по времени если указано
    if (timeRange) {
      allMetrics = allMetrics.filter(
        metric =>
          metric.timestamp >= timeRange.from && metric.timestamp <= timeRange.to
      );
    }

    return allMetrics.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  async getUserAnalytics(
    userId?: string,
    event?: string,
    timeRange?: { from: Date; to: Date }
  ): Promise<IUserAnalytics[]> {
    let allAnalytics: IUserAnalytics[] = [];

    if (userId != null && event != null) {
      const key = `${userId}.${event}`;
      allAnalytics = this.userAnalytics.get(key) ?? [];
    } else if (userId != null) {
      for (const [key, analytics] of this.userAnalytics) {
        if (key.startsWith(`${userId}.`)) {
          allAnalytics.push(...analytics);
        }
      }
    } else {
      for (const analytics of this.userAnalytics.values()) {
        allAnalytics.push(...analytics);
      }
    }

    // Фильтруем по времени если указано
    if (timeRange) {
      allAnalytics = allAnalytics.filter(
        analytic =>
          analytic.timestamp >= timeRange.from &&
          analytic.timestamp <= timeRange.to
      );
    }

    return allAnalytics.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  async getPerformanceAnalytics(
    service?: string,
    endpoint?: string,
    timeRange?: { from: Date; to: Date }
  ): Promise<IPerformanceAnalytics[]> {
    let allAnalytics: IPerformanceAnalytics[] = [];

    if (service != null && endpoint != null) {
      const key = `${service}.${endpoint}`;
      allAnalytics = this.performanceAnalytics.get(key) ?? [];
    } else if (service != null) {
      for (const [key, analytics] of this.performanceAnalytics) {
        if (key.startsWith(`${service}.`)) {
          allAnalytics.push(...analytics);
        }
      }
    } else {
      for (const analytics of this.performanceAnalytics.values()) {
        allAnalytics.push(...analytics);
      }
    }

    // Фильтруем по времени если указано
    if (timeRange) {
      allAnalytics = allAnalytics.filter(
        analytic =>
          analytic.timestamp >= timeRange.from &&
          analytic.timestamp <= timeRange.to
      );
    }

    return allAnalytics.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  async getBusinessReport(reportId: string): Promise<IBusinessReport | null> {
    return this.businessReports.get(reportId) ?? null;
  }

  async getAllBusinessReports(): Promise<IBusinessReport[]> {
    return Array.from(this.businessReports.values()).sort(
      (a, b) => b.generatedAt.getTime() - a.generatedAt.getTime()
    );
  }

  async getPredictiveAnalytics(
    model?: string,
    target?: string
  ): Promise<IPredictiveAnalytics[]> {
    if (model != null && target != null) {
      const key = `${model}.${target}`;
      return this.predictiveAnalytics.get(key) ?? [];
    }

    const allPredictions: IPredictiveAnalytics[] = [];
    for (const predictions of this.predictiveAnalytics.values()) {
      allPredictions.push(...predictions);
    }

    return allPredictions.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  async getDataVisualization(id: string): Promise<IDataVisualization | null> {
    return this.dataVisualizations.get(id) ?? null;
  }

  async getAllDataVisualizations(): Promise<IDataVisualization[]> {
    return Array.from(this.dataVisualizations.values());
  }

  async createDataVisualization(
    visualization: Omit<IDataVisualization, 'id' | 'lastUpdated'>
  ): Promise<IDataVisualization> {
    const id = `viz-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newVisualization: IDataVisualization = {
      ...visualization,
      id,
      lastUpdated: new Date(),
    };

    this.dataVisualizations.set(id, newVisualization);

    this.logger.log(`Created data visualization: ${id}`);

    return newVisualization;
  }

  async updateDataVisualization(
    id: string,
    updates: Partial<IDataVisualization>
  ): Promise<IDataVisualization | null> {
    const visualization = this.dataVisualizations.get(id);
    if (!visualization) {
      return null;
    }

    const updatedVisualization = {
      ...visualization,
      ...updates,
      id, // Не позволяем изменять ID
      lastUpdated: new Date(),
    };

    this.dataVisualizations.set(id, updatedVisualization);

    this.logger.log(`Updated data visualization: ${id}`);

    return updatedVisualization;
  }

  async getAnalyticsSummary(): Promise<{
    totalBusinessMetrics: number;
    totalUserEvents: number;
    totalPerformanceRequests: number;
    totalReports: number;
    totalPredictions: number;
    totalVisualizations: number;
    topEvents: Array<{ event: string; count: number }>;
    topServices: Array<{
      _service: string;
      requests: number;
      avgResponseTime: number;
    }>;
    topPages: Array<{ page: string; views: number }>;
  }> {
    const totalBusinessMetrics = Array.from(
      this.businessMetrics.values()
    ).reduce((sum, metrics) => sum + metrics.length, 0);

    const totalUserEvents = Array.from(this.userAnalytics.values()).reduce(
      (sum, analytics) => sum + analytics.length,
      0
    );

    const totalPerformanceRequests = Array.from(
      this.performanceAnalytics.values()
    ).reduce((sum, analytics) => sum + analytics.length, 0);

    // Топ события
    const eventCounts = new Map<string, number>();
    for (const analytics of this.userAnalytics.values()) {
      for (const analytic of analytics) {
        eventCounts.set(
          analytic.event,
          (eventCounts.get(analytic.event) ?? 0) + 1
        );
      }
    }

    const topEvents = Array.from(eventCounts.entries())
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Топ сервисы
    const serviceStats = new Map<
      string,
      { requests: number; totalResponseTime: number }
    >();
    for (const analytics of this.performanceAnalytics.values()) {
      for (const analytic of analytics) {
        const stats = serviceStats.get(analytic._service) ?? {
          requests: 0,
          totalResponseTime: 0,
        };
        stats.requests++;
        stats.totalResponseTime += analytic.responseTime;
        serviceStats.set(analytic._service, stats);
      }
    }

    const topServices = Array.from(serviceStats.entries())
      .map(([service, stats]) => ({
        service,
        requests: stats.requests,
        avgResponseTime: stats.totalResponseTime / stats.requests,
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10);

    // Топ страницы
    const pageViews = new Map<string, number>();
    for (const analytics of this.userAnalytics.values()) {
      for (const analytic of analytics) {
        if (
          analytic.event === 'page_view' &&
          analytic.properties.page != null
        ) {
          pageViews.set(
            (analytic.properties.page as string) || '',
            (pageViews.get((analytic.properties.page as string) || '') ?? 0) + 1
          );
        }
      }
    }

    const topPages = Array.from(pageViews.entries())
      .map(([page, views]) => ({ page, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    return {
      totalBusinessMetrics,
      totalUserEvents,
      totalPerformanceRequests,
      totalReports: this.businessReports.size,
      totalPredictions: Array.from(this.predictiveAnalytics.values()).reduce(
        (sum, predictions) => sum + predictions.length,
        0
      ),
      totalVisualizations: this.dataVisualizations.size,
      topEvents,
      topServices: topServices.map(s => ({ ...s, _service: s.service })),
      topPages,
    };
  }
}

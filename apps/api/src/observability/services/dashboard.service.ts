import type { OnModuleInit } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { HealthService } from './health.service';
import type { IUserActivityMetrics } from './metrics.service';
import { MetricsService } from './metrics.service';

export interface IDashboardWidget {
  id: string;
  title: string;
  type: 'metric' | 'chart' | 'table' | 'status';
  data: Record<string, unknown>;
  position: { x: number; y: number; width: number; height: number };
  refreshInterval?: number; // в секундах
}

export interface IDashboard {
  id: string;
  title: string;
  description: string;
  widgets: IDashboardWidget[];
  layout: 'grid' | 'flexible';
  refreshInterval: number; // в секундах
}

export interface ISystemDashboard {
  systemMetrics: {
    cpu: number;
    memory: number;
    uptime: number;
    activeConnections: number;
    requestCount: number;
    errorRate: number;
  };
  healthStatus: {
    status: string;
    checks: Array<{
      name: string;
      status: string;
      message: string;
    }>;
  };
  performanceMetrics: {
    averageResponseTime: number;
    requestsPerSecond: number;
    errorCount: number;
    successRate: number;
  };
}

export interface IBusinessDashboard {
  userActivity: IUserActivityMetrics;
  trends: {
    dauGrowth: number;
    mauGrowth: number;
    revenueGrowth: number;
  };
  revenueMetrics: {
    totalRevenue: number;
    revenuePerUser: number;
    averageTransactionValue: number;
    conversionRate: number;
  };
  engagementMetrics: {
    averageSessionDuration: number;
    bounceRate: number;
    retentionRate: number;
    activeUsers: number;
  };
}

@Injectable()
export class DashboardService implements OnModuleInit {
  private readonly dashboards: Map<string, IDashboard> = new Map();

  constructor(
    private readonly metricsService: MetricsService,

    private readonly healthService: HealthService
  ) {}

  async onModuleInit(): Promise<void> {
    await this.initializeDashboards();
  }

  private async initializeDashboards(): Promise<void> {
    // Системный дашборд
    const systemDashboard: IDashboard = {
      id: 'system-dashboard',
      title: 'Системный мониторинг',
      description: 'Мониторинг производительности и состояния системы',
      layout: 'grid',
      refreshInterval: 30,
      widgets: [
        {
          id: 'cpu-usage',
          title: 'Использование CPU',
          type: 'metric',
          data: {},
          position: { x: 0, y: 0, width: 3, height: 2 },
          refreshInterval: 10,
        },
        {
          id: 'memory-usage',
          title: 'Использование памяти',
          type: 'metric',
          data: {},
          position: { x: 3, y: 0, width: 3, height: 2 },
          refreshInterval: 10,
        },
        {
          id: 'request-rate',
          title: 'Запросы в секунду',
          type: 'chart',
          data: {},
          position: { x: 0, y: 2, width: 6, height: 3 },
          refreshInterval: 5,
        },
        {
          id: 'error-rate',
          title: 'Процент ошибок',
          type: 'metric',
          data: {},
          position: { x: 6, y: 0, width: 3, height: 2 },
          refreshInterval: 10,
        },
        {
          id: 'health-status',
          title: 'Статус здоровья',
          type: 'status',
          data: {},
          position: { x: 6, y: 2, width: 3, height: 3 },
          refreshInterval: 15,
        },
      ],
    };

    // Бизнес дашборд
    const businessDashboard: IDashboard = {
      id: 'business-dashboard',
      title: 'Бизнес-аналитика',
      description: 'Метрики пользовательской активности и бизнес-показатели',
      layout: 'grid',
      refreshInterval: 60,
      widgets: [
        {
          id: 'dau-mau',
          title: 'DAU / MAU',
          type: 'metric',
          data: {},
          position: { x: 0, y: 0, width: 3, height: 2 },
          refreshInterval: 60,
        },
        {
          id: 'revenue-metrics',
          title: 'Доход',
          type: 'metric',
          data: {},
          position: { x: 3, y: 0, width: 3, height: 2 },
          refreshInterval: 60,
        },
        {
          id: 'conversion-rate',
          title: 'Конверсия',
          type: 'metric',
          data: {},
          position: { x: 6, y: 0, width: 3, height: 2 },
          refreshInterval: 60,
        },
        {
          id: 'user-activity-chart',
          title: 'Активность пользователей',
          type: 'chart',
          data: {},
          position: { x: 0, y: 2, width: 6, height: 3 },
          refreshInterval: 30,
        },
        {
          id: 'revenue-trends',
          title: 'Тренды дохода',
          type: 'chart',
          data: {},
          position: { x: 6, y: 2, width: 3, height: 3 },
          refreshInterval: 60,
        },
      ],
    };

    this.dashboards.set(systemDashboard.id, systemDashboard);
    this.dashboards.set(businessDashboard.id, businessDashboard);
  }

  async getSystemDashboard(): Promise<ISystemDashboard> {
    const systemMetrics = await this.metricsService.getSystemMetrics();
    const healthStatus = await this.healthService.getStatus();

    // Вычисляем метрики производительности
    const performanceMetrics = await this.calculatePerformanceMetrics();

    // Преобразуем healthStatus для соответствия интерфейсу
    const dashboardHealthStatus = {
      status: healthStatus.status,
      checks: healthStatus.checks.map(check => ({
        name: check.name,
        status: check.status,
        message: check.message ?? 'No message available',
      })),
    };

    return {
      systemMetrics,
      healthStatus: dashboardHealthStatus,
      performanceMetrics,
    };
  }

  async getBusinessDashboard(): Promise<IBusinessDashboard> {
    const businessMetrics =
      await this.metricsService.getBusinessMetricsExtended();
    const userActivity = businessMetrics.userActivity;
    const trends = businessMetrics.trends;

    // Вычисляем метрики дохода
    const revenueMetrics = await this.calculateRevenueMetrics();

    // Вычисляем метрики вовлеченности
    const engagementMetrics = {
      averageSessionDuration: userActivity.averageSessionDuration,
      bounceRate: userActivity.bounceRate,
      retentionRate: userActivity.retentionRate,
      activeUsers: userActivity.activeUsers,
    };

    return {
      userActivity,
      trends,
      revenueMetrics,
      engagementMetrics,
    };
  }

  async getDashboard(dashboardId: string): Promise<IDashboard | null> {
    return this.dashboards.get(dashboardId) ?? null;
  }

  async getAllDashboards(): Promise<IDashboard[]> {
    return Array.from(this.dashboards.values());
  }

  async createDashboard(dashboard: IDashboard): Promise<void> {
    this.dashboards.set(dashboard.id, dashboard);
  }

  async updateDashboard(
    dashboardId: string,
    updates: Partial<IDashboard>
  ): Promise<void> {
    const dashboard = this.dashboards.get(dashboardId);
    if (dashboard) {
      this.dashboards.set(dashboardId, { ...dashboard, ...updates });
    }
  }

  async deleteDashboard(dashboardId: string): Promise<void> {
    this.dashboards.delete(dashboardId);
  }

  async getWidgetData(
    dashboardId: string,
    widgetId: string
  ): Promise<Record<string, unknown>> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      return {};
    }

    const widget = dashboard.widgets.find(w => w.id === widgetId);
    if (!widget) {
      return {};
    }

    // Обновляем данные виджета в зависимости от его типа
    switch (widget.type) {
      case 'metric':
        return await this.getMetricWidgetData(widget);
      case 'chart':
        return await this.getChartWidgetData(widget);
      case 'table':
        return await this.getTableWidgetData(widget);
      case 'status':
        return await this.getStatusWidgetData(widget);
      default:
        return {};
    }
  }

  private async getMetricWidgetData(
    widget: IDashboardWidget
  ): Promise<Record<string, unknown>> {
    switch (widget.id) {
      case 'cpu-usage': {
        const systemMetrics = await this.metricsService.getSystemMetrics();
        return { value: systemMetrics.cpu, unit: 'seconds', trend: 'stable' };
      }

      case 'memory-usage': {
        const metrics = await this.metricsService.getSystemMetrics();
        return { value: metrics.memory, unit: 'MB', trend: 'stable' };
      }

      case 'error-rate': {
        const sysMetrics = await this.metricsService.getSystemMetrics();
        return { value: sysMetrics.errorRate, unit: '%', trend: 'stable' };
      }

      case 'dau-mau': {
        const businessMetrics =
          await this.metricsService.getBusinessMetricsExtended();
        return {
          dau: businessMetrics.dau,
          mau: businessMetrics.mau,
          ratio:
            businessMetrics.mau > 0
              ? (businessMetrics.dau / businessMetrics.mau) * 100
              : 0,
        };
      }

      case 'revenue-metrics': {
        const revenueMetrics = await this.calculateRevenueMetrics();
        return {
          totalRevenue: revenueMetrics.totalRevenue,
          revenuePerUser: revenueMetrics.revenuePerUser,
          averageTransactionValue: revenueMetrics.averageTransactionValue,
        };
      }

      case 'conversion-rate': {
        const userActivity =
          await this.metricsService.getBusinessMetricsExtended();
        return {
          value: userActivity.userActivity.conversionRate,
          unit: '%',
          trend: 'up',
        };
      }

      default:
        return {};
    }
  }

  private async getChartWidgetData(
    widget: IDashboardWidget
  ): Promise<Record<string, unknown>> {
    switch (widget.id) {
      case 'request-rate': {
        return {
          type: 'line',
          data: await this.generateRequestRateData(),
          options: {
            title: 'Запросы в секунду',
            xAxis: { title: 'Время' },
            yAxis: { title: 'Запросы/сек' },
          },
        };
      }

      case 'user-activity-chart': {
        return {
          type: 'bar',
          data: await this.generateUserActivityData(),
          options: {
            title: 'Активность пользователей',
            xAxis: { title: 'Период' },
            yAxis: { title: 'Пользователи' },
          },
        };
      }

      case 'revenue-trends': {
        return {
          type: 'line',
          data: await this.generateRevenueTrendsData(),
          options: {
            title: 'Тренды дохода',
            xAxis: { title: 'Время' },
            yAxis: { title: 'Доход' },
          },
        };
      }

      default:
        return {};
    }
  }

  private async getTableWidgetData(
    _widget: IDashboardWidget
  ): Promise<Record<string, unknown>> {
    // Реализация для табличных виджетов
    return {
      columns: ['Метрика', 'Значение', 'Изменение'],
      data: [],
    };
  }

  private async getStatusWidgetData(
    widget: IDashboardWidget
  ): Promise<Record<string, unknown>> {
    switch (widget.id) {
      case 'health-status': {
        const healthStatus = await this.healthService.getStatus();
        return {
          overallStatus: healthStatus.status,
          checks: healthStatus.checks.map(check => ({
            name: check.name,
            status: check.status,
            message: check.message,
          })),
        };
      }

      default:
        return {};
    }
  }

  private async calculatePerformanceMetrics(): Promise<{
    averageResponseTime: number;
    requestsPerSecond: number;
    errorCount: number;
    successRate: number;
  }> {
    const systemMetrics = await this.metricsService.getSystemMetrics();
    const uptime = systemMetrics.uptime;

    return {
      averageResponseTime: 150, // Mock значение
      requestsPerSecond: uptime > 0 ? systemMetrics.requestCount / uptime : 0,
      errorCount: systemMetrics.requestCount * (systemMetrics.errorRate / 100),
      successRate: 100 - systemMetrics.errorRate,
    };
  }

  private async calculateRevenueMetrics(): Promise<{
    totalRevenue: number;
    revenuePerUser: number;
    averageTransactionValue: number;
    conversionRate: number;
  }> {
    const businessMetrics =
      await this.metricsService.getBusinessMetricsExtended();
    const userActivity = businessMetrics.userActivity;

    return {
      totalRevenue: userActivity.revenuePerUser * userActivity.activeUsers,
      revenuePerUser: userActivity.revenuePerUser,
      averageTransactionValue:
        userActivity.totalTransactions > 0
          ? (userActivity.revenuePerUser * userActivity.activeUsers) /
            userActivity.totalTransactions
          : 0,
      conversionRate: userActivity.conversionRate,
    };
  }

  private async generateRequestRateData(): Promise<
    Array<{ x: string; y: number }>
  > {
    // Генерируем mock данные для графика запросов
    const data = [];
    const now = new Date();

    for (let i = 10; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60000); // каждую минуту
      data.push({
        x: time.toLocaleTimeString(),
        y: Math.floor(Math.random() * 100) + 50, // 50-150 запросов
      });
    }

    return data;
  }

  private async generateUserActivityData(): Promise<
    Array<{ x: string; y: number }>
  > {
    // Генерируем mock данные для активности пользователей
    return [
      { x: 'Пн', y: 1200 },
      { x: 'Вт', y: 1350 },
      { x: 'Ср', y: 1100 },
      { x: 'Чт', y: 1400 },
      { x: 'Пт', y: 1600 },
      { x: 'Сб', y: 1800 },
      { x: 'Вс', y: 1700 },
    ];
  }

  private async generateRevenueTrendsData(): Promise<
    Array<{ x: string; y: number }>
  > {
    // Генерируем mock данные для трендов дохода
    const data = [];
    const now = new Date();

    for (let i = 7; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 24 * 60 * 60 * 1000); // каждый день
      data.push({
        x: time.toLocaleDateString(),
        y: Math.floor(Math.random() * 10000) + 5000, // 5000-15000
      });
    }

    return data;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigCachingService } from './services/config-caching.service';
import { SelfHealingService } from './services/self-healing.service';
import { UnifiedMetricsService } from './services/unified-metrics.service';

export interface IMetricData {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  labels: Record<string, string>;
  _service: string;
}

export interface IDashboardPanel {
  id: string;
  title: string;
  type: 'graph' | 'stat' | 'table' | 'gauge';
  metrics: string[];
  query: string;
  refreshInterval: number;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface IDashboard {
  id: string;
  name: string;
  description: string;
  panels: IDashboardPanel[];
  refreshInterval: number;
  timeRange: {
    from: string;
    to: string;
  };
  tags: string[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<
    string,
    {
      status: 'healthy' | 'degraded' | 'unhealthy';
      metrics: Record<string, number>;
      lastCheck: Date;
    }
  >;
  timestamp: Date;
}

@Injectable()
export class UnifiedMetricsDashboardService {
  private readonly logger = new Logger(UnifiedMetricsDashboardService.name);
  private dashboards = new Map<string, IDashboard>();
  private metrics = new Map<string, IMetricData[]>();
  private healthStatus!: ISystemHealth;

  constructor(
    private _configService: ConfigService,
    private unifiedMetricsService: UnifiedMetricsService,
    private selfHealingService: SelfHealingService,
    private configCachingService: ConfigCachingService
  ) {
    this.initializeDefaultDashboards();
    this.startMetricsCollection();
    this.startHealthMonitoring();
    // Используем сервисы
    this._configService.get('DASHBOARD_ENABLED');
    this.selfHealingService.getHealthChecks();
    this.configCachingService.get('dashboard.config');
  }

  private initializeDefaultDashboards(): void {
    const defaultDashboards: IDashboard[] = [
      {
        id: 'system-overview',
        name: 'System Overview',
        description: 'Overall system health and performance metrics',
        panels: [
          {
            id: 'cpu-usage',
            title: 'CPU Usage',
            type: 'gauge',
            metrics: ['system.cpu.usage'],
            query: 'avg(system_cpu_usage)',
            refreshInterval: 5000,
            position: { x: 0, y: 0, width: 6, height: 4 },
          },
          {
            id: 'memory-usage',
            title: 'Memory Usage',
            type: 'gauge',
            metrics: ['system.memory.usage'],
            query: 'avg(system_memory_usage)',
            refreshInterval: 5000,
            position: { x: 6, y: 0, width: 6, height: 4 },
          },
          {
            id: 'request-rate',
            title: 'Request Rate',
            type: 'graph',
            metrics: ['http.requests.rate'],
            query: 'rate(http_requests_total[5m])',
            refreshInterval: 10000,
            position: { x: 0, y: 4, width: 12, height: 4 },
          },
        ],
        refreshInterval: 10000,
        timeRange: { from: 'now-1h', to: 'now' },
        tags: ['system', 'overview'],
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'api-performance',
        name: 'API Performance',
        description: 'API endpoints performance and response times',
        panels: [
          {
            id: 'response-times',
            title: 'Response Times',
            type: 'graph',
            metrics: ['http.response.time'],
            query:
              'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))',
            refreshInterval: 10000,
            position: { x: 0, y: 0, width: 12, height: 4 },
          },
          {
            id: 'error-rate',
            title: 'Error Rate',
            type: 'stat',
            metrics: ['http.errors.rate'],
            query: 'rate(http_requests_total{status=~"5.."}[5m])',
            refreshInterval: 10000,
            position: { x: 0, y: 4, width: 6, height: 4 },
          },
          {
            id: 'throughput',
            title: 'Throughput',
            type: 'stat',
            metrics: ['http.requests.rate'],
            query: 'rate(http_requests_total[5m])',
            refreshInterval: 10000,
            position: { x: 6, y: 4, width: 6, height: 4 },
          },
        ],
        refreshInterval: 10000,
        timeRange: { from: 'now-1h', to: 'now' },
        tags: ['api', 'performance'],
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'security-events',
        name: 'Security Events',
        description: 'Security monitoring and threat detection',
        panels: [
          {
            id: 'failed-logins',
            title: 'Failed Logins',
            type: 'graph',
            metrics: ['auth.failed.logins'],
            query: 'rate(auth_failed_logins_total[5m])',
            refreshInterval: 30000,
            position: { x: 0, y: 0, width: 6, height: 4 },
          },
          {
            id: 'rate-limit-violations',
            title: 'Rate Limit Violations',
            type: 'graph',
            metrics: ['security.rate.limit.violations'],
            query: 'rate(rate_limit_violations_total[5m])',
            refreshInterval: 30000,
            position: { x: 6, y: 0, width: 6, height: 4 },
          },
          {
            id: 'security-alerts',
            title: 'Security Alerts',
            type: 'table',
            metrics: ['security.alerts'],
            query: 'security_alerts',
            refreshInterval: 60000,
            position: { x: 0, y: 4, width: 12, height: 4 },
          },
        ],
        refreshInterval: 30000,
        timeRange: { from: 'now-6h', to: 'now' },
        tags: ['security', 'monitoring'],
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'incident-response',
        name: 'Incident Response',
        description: 'Incident monitoring and response metrics',
        panels: [
          {
            id: 'incident-status',
            title: 'Active Incidents',
            type: 'stat',
            metrics: ['incidents.active'],
            query: 'incidents_active',
            refreshInterval: 10000,
            position: { x: 0, y: 0, width: 4, height: 4 },
          },
          {
            id: 'mttr',
            title: 'Mean Time To Resolution',
            type: 'stat',
            metrics: ['incidents.mttr'],
            query: 'avg(incident_resolution_time)',
            refreshInterval: 300000,
            position: { x: 4, y: 0, width: 4, height: 4 },
          },
          {
            id: 'incident-timeline',
            title: 'Incident Timeline',
            type: 'graph',
            metrics: ['incidents.timeline'],
            query: 'incidents_timeline',
            refreshInterval: 60000,
            position: { x: 8, y: 0, width: 4, height: 4 },
          },
        ],
        refreshInterval: 30000,
        timeRange: { from: 'now-24h', to: 'now' },
        tags: ['incidents', 'response'],
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    defaultDashboards.forEach(dashboard => {
      this.dashboards.set(dashboard.id, dashboard);
    });

    this.logger.log(
      `Initialized ${defaultDashboards.length} default dashboards`
    );
  }

  private startMetricsCollection(): void {
    // Собираем метрики каждые 10 секунд
    setInterval(() => {
      void this.collectMetrics();
    }, 10000);
  }

  private startHealthMonitoring(): void {
    // Проверяем здоровье системы каждые 30 секунд
    setInterval(() => {
      void this.updateSystemHealth();
    }, 30000);
  }

  private async collectMetrics(): Promise<void> {
    try {
      // Собираем метрики от всех сервисов
      const systemMetrics = this.unifiedMetricsService.getMetrics('system');
      const performanceMetrics =
        this.unifiedMetricsService.getMetrics('performance');
      const securityMetrics = this.unifiedMetricsService.getMetrics('security');

      // Объединяем все метрики
      const allMetrics = [
        ...systemMetrics,
        ...performanceMetrics,
        ...securityMetrics,
      ];

      // Сохраняем метрики
      for (const metric of allMetrics) {
        const metricData = metric as IMetricData;
        const key = `${metricData._service}.${metricData.name}`;
        const existingMetrics = this.metrics.get(key) ?? [];

        existingMetrics.push(metricData);

        // Ограничиваем количество метрик (храним последние 1000)
        if (existingMetrics.length > 1000) {
          existingMetrics.splice(0, existingMetrics.length - 1000);
        }

        this.metrics.set(key, existingMetrics);
      }

      this.logger.debug(`Collected ${allMetrics.length} metrics`);
    } catch (error) {
      this.logger.error('Error collecting metrics:', error);
    }
  }

  private async updateSystemHealth(): Promise<void> {
    try {
      const services: Record<
        string,
        { status: string; [key: string]: unknown }
      > = {};

      // Проверяем здоровье каждого сервиса
      const serviceNames = [
        'auth-service',
        'cards-service',
        'monitoring-service',
        'security-service',
      ];

      for (const serviceName of serviceNames) {
        const metrics = this.metrics.get(`${serviceName}.health`) ?? [];
        const latestMetric = metrics[metrics.length - 1];

        let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
        const serviceMetrics: Record<string, number> = {};

        if (latestMetric) {
          serviceMetrics.health = latestMetric.value;

          if (latestMetric.value < 0.8) {
            status = 'unhealthy';
          } else if (latestMetric.value < 0.95) {
            status = 'degraded';
          }
        } else {
          status = 'unhealthy';
        }

        services[serviceName] = {
          status,
          metrics: serviceMetrics,
          lastCheck: new Date(),
        };
      }

      // Определяем общий статус
      const statuses = Object.values(services).map(
        (s: unknown) => (s as { status: string }).status
      );
      let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      if (statuses.includes('unhealthy')) {
        overall = 'unhealthy';
      } else if (statuses.includes('degraded')) {
        overall = 'degraded';
      }

      this.healthStatus = {
        overall,
        services: services as never,
        timestamp: new Date(),
      };

      this.logger.debug(`System health updated: ${overall}`);
    } catch (error) {
      this.logger.error('Error updating system health:', error);
    }
  }

  async getDashboard(id: string): Promise<IDashboard | null> {
    return this.dashboards.get(id) ?? null;
  }

  async getAllDashboards(): Promise<IDashboard[]> {
    return Array.from(this.dashboards.values());
  }

  async createDashboard(
    dashboard: Omit<IDashboard, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<IDashboard> {
    const id = `dashboard-${Date.now()}`;
    const newDashboard: IDashboard = {
      ...dashboard,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.dashboards.set(id, newDashboard);
    this.logger.log(`Created dashboard: ${id}`);

    return newDashboard;
  }

  async updateDashboard(
    id: string,
    updates: Partial<IDashboard>
  ): Promise<IDashboard | null> {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) {
      return null;
    }

    const updatedDashboard = {
      ...dashboard,
      ...updates,
      id, // Не позволяем изменять ID
      updatedAt: new Date(),
    };

    this.dashboards.set(id, updatedDashboard);
    this.logger.log(`Updated dashboard: ${id}`);

    return updatedDashboard;
  }

  async deleteDashboard(id: string): Promise<boolean> {
    const deleted = this.dashboards.delete(id);
    if (deleted) {
      this.logger.log(`Deleted dashboard: ${id}`);
    }
    return deleted;
  }

  async getMetrics(
    service?: string,
    metricName?: string,
    timeRange?: { from: Date; to: Date }
  ): Promise<IMetricData[]> {
    let allMetrics: IMetricData[] = [];

    if (service != null && metricName != null) {
      const key = `${service}.${metricName}`;
      allMetrics = this.metrics.get(key) ?? [];
    } else if (service != null) {
      for (const [key, metrics] of this.metrics) {
        if (key.startsWith(`${service}.`)) {
          allMetrics.push(...metrics);
        }
      }
    } else {
      for (const metrics of this.metrics.values()) {
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

  async getSystemHealth(): Promise<ISystemHealth> {
    return this.healthStatus;
  }

  async executeQuery(
    query: string,
    timeRange?: { from: Date; to: Date }
  ): Promise<number | { [key: string]: unknown }> {
    // Простая реализация запросов (в реальном приложении использовался бы PromQL)
    const metrics = await this.getMetrics(undefined, undefined, timeRange);

    // Простые агрегации
    if (query.includes('avg(')) {
      const metricName = query.match(/avg\(([^)]+)\)/)?.[1];
      if (metricName != null) {
        const relevantMetrics = metrics.filter(m => m.name === metricName);
        const sum = relevantMetrics.reduce((acc, m) => acc + m.value, 0);
        return relevantMetrics.length > 0 ? sum / relevantMetrics.length : 0;
      }
    }

    if (query.includes('sum(')) {
      const metricName = query.match(/sum\(([^)]+)\)/)?.[1];
      if (metricName != null) {
        const relevantMetrics = metrics.filter(m => m.name === metricName);
        return relevantMetrics.reduce((acc, m) => acc + m.value, 0);
      }
    }

    if (query.includes('max(')) {
      const metricName = query.match(/max\(([^)]+)\)/)?.[1];
      if (metricName != null) {
        const relevantMetrics = metrics.filter(m => m.name === metricName);
        return relevantMetrics.length > 0
          ? Math.max(...relevantMetrics.map(m => m.value))
          : 0;
      }
    }

    if (query.includes('min(')) {
      const metricName = query.match(/min\(([^)]+)\)/)?.[1];
      if (metricName != null) {
        const relevantMetrics = metrics.filter(m => m.name === metricName);
        return relevantMetrics.length > 0
          ? Math.min(...relevantMetrics.map(m => m.value))
          : 0;
      }
    }

    return 0;
  }

  async getDashboardData(
    dashboardId: string
  ): Promise<Record<string, unknown>> {
    const dashboard = await this.getDashboard(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard ${dashboardId} not found`);
    }

    const data: Record<string, unknown> = {};

    for (const panel of dashboard.panels) {
      try {
        const result = await this.executeQuery(panel.query, {
          from: new Date(Date.now() - 3600000), // Последний час
          to: new Date(),
        });

        data[panel.id] = {
          title: panel.title,
          type: panel.type,
          data: result,
          timestamp: new Date(),
        };
      } catch (error) {
        this.logger.error(
          `Error executing query for panel ${panel.id}:`,
          error
        );
        data[panel.id] = {
          title: panel.title,
          type: panel.type,
          data: null,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        };
      }
    }

    return data;
  }
}

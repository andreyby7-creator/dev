import { Injectable, Logger } from '@nestjs/common';

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'alert' | 'log';
  title: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  config: Record<string, unknown>;
  dataSource: string;
  refreshInterval: number; // seconds
}

export interface Dashboard {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  layout: 'grid' | 'freeform';
  theme: 'light' | 'dark' | 'auto';
  refreshInterval: number; // seconds
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

export interface DashboardConfig {
  name: string;
  description: string;
  widgets: Array<{
    type: string;
    title: string;
    config: Record<string, unknown>;
    dataSource: string;
  }>;
  layout?: 'grid' | 'freeform';
  theme?: 'light' | 'dark' | 'auto';
  isPublic?: boolean;
}

@Injectable()
export class InteractiveDashboardsService {
  private readonly logger = new Logger(InteractiveDashboardsService.name);
  private dashboards: Map<string, Dashboard> = new Map();
  private widgetTemplates: Map<string, Record<string, unknown>> = new Map();

  constructor() {
    this.initializeWidgetTemplates();
  }

  async createDashboard(config: DashboardConfig): Promise<{
    success: boolean;
    dashboardId: string;
    dashboard: Dashboard;
  }> {
    try {
      this.logger.log(`Creating dashboard: ${config.name}`);

      const dashboardId = `dashboard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date();

      const widgets: DashboardWidget[] = config.widgets.map(
        (widget, index) => ({
          id: `widget-${dashboardId}-${index}`,
          type: widget.type as 'chart' | 'metric' | 'table' | 'alert' | 'log',
          title: widget.title,
          position: {
            x: (index % 3) * 4,
            y: Math.floor(index / 3) * 3,
            width: 4,
            height: 3,
          },
          config: widget.config,
          dataSource: widget.dataSource,
          refreshInterval: 30,
        })
      );

      const dashboard: Dashboard = {
        id: dashboardId,
        name: config.name,
        description: config.description,
        widgets,
        layout: config.layout ?? 'grid',
        theme: config.theme ?? 'auto',
        refreshInterval: 30,
        isPublic: config.isPublic ?? false,
        createdBy: 'system', // In real implementation, get from auth context
        createdAt: now,
        updatedAt: now,
        metadata: {
          version: '1.0',
          tags: ['monitoring'],
        },
      };

      this.dashboards.set(dashboardId, dashboard);

      this.logger.log(
        `Created dashboard ${dashboardId} with ${widgets.length} widgets`
      );

      return {
        success: true,
        dashboardId,
        dashboard,
      };
    } catch (error) {
      this.logger.error('Failed to create dashboard', error);
      throw error;
    }
  }

  async getDashboard(id: string): Promise<{
    dashboard: Dashboard | null;
    widgets: DashboardWidget[];
    data: Record<string, unknown>;
  }> {
    try {
      this.logger.log(`Getting dashboard: ${id}`);

      const dashboard = this.dashboards.get(id);
      if (!dashboard) {
        return {
          dashboard: null,
          widgets: [],
          data: {},
        };
      }

      // Simulate widget data
      const data: Record<string, unknown> = {};
      for (const widget of dashboard.widgets) {
        data[widget.id] = this.generateWidgetData(widget);
      }

      return {
        dashboard,
        widgets: dashboard.widgets,
        data,
      };
    } catch (error) {
      this.logger.error('Failed to get dashboard', error);
      throw error;
    }
  }

  async updateDashboard(
    id: string,
    updates: Partial<DashboardConfig>
  ): Promise<{
    success: boolean;
    dashboard: Dashboard | null;
  }> {
    try {
      this.logger.log(`Updating dashboard: ${id}`);

      const dashboard = this.dashboards.get(id);
      if (!dashboard) {
        return {
          success: false,
          dashboard: null,
        };
      }

      // Update dashboard properties
      if (updates.name != null) dashboard.name = updates.name;
      if (updates.description != null)
        dashboard.description = updates.description;
      if (updates.layout != null) dashboard.layout = updates.layout;
      if (updates.theme != null) dashboard.theme = updates.theme;
      if (updates.isPublic != null) dashboard.isPublic = updates.isPublic;

      // Update widgets if provided
      if (updates.widgets != null) {
        const widgets: DashboardWidget[] = updates.widgets.map(
          (widget, index) => ({
            id: `widget-${id}-${index}`,
            type: widget.type as 'chart' | 'metric' | 'table' | 'alert' | 'log',
            title: widget.title,
            position: {
              x: (index % 3) * 4,
              y: Math.floor(index / 3) * 3,
              width: 4,
              height: 3,
            },
            config: widget.config,
            dataSource: widget.dataSource,
            refreshInterval: 30,
          })
        );
        dashboard.widgets = widgets;
      }

      dashboard.updatedAt = new Date();

      this.logger.log(`Updated dashboard ${id}`);

      return {
        success: true,
        dashboard,
      };
    } catch (error) {
      this.logger.error('Failed to update dashboard', error);
      throw error;
    }
  }

  async deleteDashboard(id: string): Promise<{
    success: boolean;
    deleted: boolean;
  }> {
    try {
      this.logger.log(`Deleting dashboard: ${id}`);

      const deleted = this.dashboards.delete(id);

      this.logger.log(`Dashboard ${id} ${deleted ? 'deleted' : 'not found'}`);

      return {
        success: true,
        deleted,
      };
    } catch (error) {
      this.logger.error('Failed to delete dashboard', error);
      throw error;
    }
  }

  async getDashboards(): Promise<{
    dashboards: Dashboard[];
    total: number;
    public: number;
    private: number;
  }> {
    try {
      this.logger.log('Getting all dashboards');

      const dashboards = Array.from(this.dashboards.values());
      const publicDashboards = dashboards.filter(d => d.isPublic);
      const privateDashboards = dashboards.filter(d => !d.isPublic);

      return {
        dashboards,
        total: dashboards.length,
        public: publicDashboards.length,
        private: privateDashboards.length,
      };
    } catch (error) {
      this.logger.error('Failed to get dashboards', error);
      throw error;
    }
  }

  async addWidget(
    dashboardId: string,
    widget: Omit<DashboardWidget, 'id'>
  ): Promise<{
    success: boolean;
    widgetId: string;
  }> {
    try {
      this.logger.log(`Adding widget to dashboard: ${dashboardId}`);

      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error(`Dashboard ${dashboardId} not found`);
      }

      const widgetId = `widget-${dashboardId}-${Date.now()}`;
      const newWidget: DashboardWidget = {
        ...widget,
        id: widgetId,
      };

      dashboard.widgets.push(newWidget);
      dashboard.updatedAt = new Date();

      this.logger.log(`Added widget ${widgetId} to dashboard ${dashboardId}`);

      return {
        success: true,
        widgetId,
      };
    } catch (error) {
      this.logger.error('Failed to add widget', error);
      throw error;
    }
  }

  async updateWidget(
    dashboardId: string,
    widgetId: string,
    updates: Partial<DashboardWidget>
  ): Promise<{
    success: boolean;
    widget: DashboardWidget | null;
  }> {
    try {
      this.logger.log(
        `Updating widget ${widgetId} in dashboard ${dashboardId}`
      );

      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error(`Dashboard ${dashboardId} not found`);
      }

      const widget = dashboard.widgets.find(w => w.id === widgetId);
      if (!widget) {
        return {
          success: false,
          widget: null,
        };
      }

      // Update widget properties
      Object.assign(widget, updates);
      dashboard.updatedAt = new Date();

      this.logger.log(`Updated widget ${widgetId}`);

      return {
        success: true,
        widget,
      };
    } catch (error) {
      this.logger.error('Failed to update widget', error);
      throw error;
    }
  }

  async getWidgetData(
    dashboardId: string,
    widgetId: string
  ): Promise<{
    widget: DashboardWidget | null;
    data: unknown;
    lastUpdated: Date;
  }> {
    try {
      this.logger.log(
        `Getting data for widget ${widgetId} in dashboard ${dashboardId}`
      );

      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        return {
          widget: null,
          data: null,
          lastUpdated: new Date(),
        };
      }

      const widget = dashboard.widgets.find(w => w.id === widgetId);
      if (!widget) {
        return {
          widget: null,
          data: null,
          lastUpdated: new Date(),
        };
      }

      const data = this.generateWidgetData(widget);

      return {
        widget,
        data,
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to get widget data', error);
      throw error;
    }
  }

  private initializeWidgetTemplates(): void {
    this.widgetTemplates.set('cpu-usage', {
      type: 'line-chart',
      title: 'CPU Usage',
      dataSource: 'metrics',
      config: {
        metric: 'cpu.usage',
        timeRange: '1h',
        aggregation: 'avg',
      },
    });

    this.widgetTemplates.set('memory-usage', {
      type: 'gauge',
      title: 'Memory Usage',
      dataSource: 'metrics',
      config: {
        metric: 'memory.usage',
        max: 100,
        thresholds: [70, 90],
      },
    });

    this.widgetTemplates.set('error-rate', {
      type: 'metric',
      title: 'Error Rate',
      dataSource: 'logs',
      config: {
        query: 'level:error',
        timeRange: '1h',
        aggregation: 'count',
      },
    });

    this.widgetTemplates.set('response-time', {
      type: 'histogram',
      title: 'Response Time',
      dataSource: 'traces',
      config: {
        metric: 'response_time',
        buckets: [100, 500, 1000, 2000, 5000],
      },
    });
  }

  private generateWidgetData(widget: DashboardWidget): unknown {
    switch (widget.type) {
      case 'chart':
        return {
          type: 'line',
          data: Array.from({ length: 20 }, (_, i) => ({
            x: new Date(Date.now() - (19 - i) * 60000).toISOString(),
            y: Math.random() * 100,
          })),
          options: {
            responsive: true,
            scales: {
              y: { beginAtZero: true, max: 100 },
            },
          },
        };

      case 'metric':
        return {
          value: Math.random() * 1000,
          unit: 'ms',
          trend: Math.random() > 0.5 ? 'up' : 'down',
          change: Math.random() * 20,
        };

      case 'table':
        return {
          columns: ['Service', 'Status', 'Response Time', 'Errors'],
          rows: Array.from({ length: 5 }, (_, i) => [
            `Service ${i + 1}`,
            Math.random() > 0.1 ? 'Healthy' : 'Unhealthy',
            `${Math.random() * 1000}ms`,
            Math.floor(Math.random() * 10),
          ]),
        };

      case 'alert':
        return {
          alerts: Array.from({ length: 3 }, (_, i) => ({
            id: `alert-${i}`,
            severity: ['low', 'medium', 'high'][i],
            message: `Alert ${i + 1}: Service performance degraded`,
            timestamp: new Date(Date.now() - i * 300000).toISOString(),
          })),
        };

      case 'log':
        return {
          logs: Array.from({ length: 10 }, (_, i) => ({
            timestamp: new Date(Date.now() - i * 60000).toISOString(),
            level: ['info', 'warn', 'error'][Math.floor(Math.random() * 3)],
            message: `Log entry ${i + 1}: System operation completed`,
            service: `service-${Math.floor(Math.random() * 3) + 1}`,
          })),
        };

      default:
        return { message: 'No data available' };
    }
  }
}

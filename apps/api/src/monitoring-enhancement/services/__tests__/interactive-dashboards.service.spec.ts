import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { InteractiveDashboardsService } from '../interactive-dashboards.service';

describe('InteractiveDashboardsService', () => {
  let service: InteractiveDashboardsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InteractiveDashboardsService],
    }).compile();

    service = module.get<InteractiveDashboardsService>(
      InteractiveDashboardsService
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createDashboard', () => {
    it('should create dashboard successfully', async () => {
      const config = {
        name: 'Test Dashboard',
        description: 'A test dashboard for monitoring',
        widgets: [
          {
            type: 'chart',
            title: 'CPU Usage',
            config: { metric: 'cpu.usage' },
            dataSource: 'metrics',
          },
          {
            type: 'metric',
            title: 'Memory Usage',
            config: { metric: 'memory.usage' },
            dataSource: 'metrics',
          },
        ],
        layout: 'grid' as const,
        theme: 'light' as const,
        isPublic: false,
      };

      const result = await service.createDashboard(config);

      expect(result.success).toBe(true);
      expect(result.dashboardId).toBeDefined();
      expect(result.dashboard).toBeDefined();
      expect(result.dashboard.name).toBe(config.name);
      expect(result.dashboard.description).toBe(config.description);
      expect(result.dashboard.widgets).toHaveLength(2);
      expect(result.dashboard.layout).toBe(config.layout);
      expect(result.dashboard.theme).toBe(config.theme);
      expect(result.dashboard.isPublic).toBe(config.isPublic);
    });

    it('should create dashboard with minimal config', async () => {
      const config = {
        name: 'Minimal Dashboard',
        description: 'Minimal dashboard',
        widgets: [],
      };

      const result = await service.createDashboard(config);

      expect(result.success).toBe(true);
      expect(result.dashboardId).toBeDefined();
      expect(result.dashboard.name).toBe(config.name);
      expect(result.dashboard.widgets).toHaveLength(0);
      expect(result.dashboard.layout).toBe('grid'); // default
      expect(result.dashboard.theme).toBe('auto'); // default
      expect(result.dashboard.isPublic).toBe(false); // default
    });

    it('should create dashboard with different widget types', async () => {
      const config = {
        name: 'Multi-Widget Dashboard',
        description: 'Dashboard with various widget types',
        widgets: [
          {
            type: 'chart',
            title: 'Line Chart',
            config: { type: 'line' },
            dataSource: 'metrics',
          },
          {
            type: 'metric',
            title: 'Gauge',
            config: { type: 'gauge' },
            dataSource: 'metrics',
          },
          {
            type: 'table',
            title: 'Data Table',
            config: { columns: ['Name', 'Value'] },
            dataSource: 'logs',
          },
          {
            type: 'alert',
            title: 'Alerts',
            config: { severity: 'high' },
            dataSource: 'alerts',
          },
          {
            type: 'log',
            title: 'Logs',
            config: { level: 'error' },
            dataSource: 'logs',
          },
        ],
      };

      const result = await service.createDashboard(config);

      expect(result.success).toBe(true);
      expect(result.dashboard.widgets).toHaveLength(5);

      const widgetTypes = result.dashboard.widgets.map(w => w.type);
      expect(widgetTypes).toContain('chart');
      expect(widgetTypes).toContain('metric');
      expect(widgetTypes).toContain('table');
      expect(widgetTypes).toContain('alert');
      expect(widgetTypes).toContain('log');
    });

    it('should generate unique dashboard IDs', async () => {
      const config1 = {
        name: 'Dashboard 1',
        description: 'First dashboard',
        widgets: [],
      };

      const config2 = {
        name: 'Dashboard 2',
        description: 'Second dashboard',
        widgets: [],
      };

      const result1 = await service.createDashboard(config1);
      const result2 = await service.createDashboard(config2);

      expect(result1.dashboardId).not.toBe(result2.dashboardId);
    });
  });

  describe('getDashboard', () => {
    let dashboardId: string;

    beforeEach(async () => {
      const result = await service.createDashboard({
        name: 'Test Dashboard',
        description: 'Test dashboard',
        widgets: [
          {
            type: 'chart',
            title: 'Test Chart',
            config: { metric: 'test.metric' },
            dataSource: 'metrics',
          },
        ],
      });
      dashboardId = result.dashboardId;
    });

    it('should return dashboard with data', async () => {
      const result = await service.getDashboard(dashboardId);

      expect(result.dashboard).toBeDefined();
      expect(result.dashboard?.id).toBe(dashboardId);
      expect(result.widgets).toBeDefined();
      expect(result.widgets).toHaveLength(1);
      expect(result.data).toBeDefined();
      expect(result.data?.[result.widgets?.[0]?.id ?? '']).toBeDefined();
    });

    it('should return null for non-existent dashboard', async () => {
      const result = await service.getDashboard('non-existent-id');

      expect(result.dashboard).toBeNull();
      expect(result.widgets).toHaveLength(0);
      expect(result.data).toEqual({});
    });

    it('should generate data for different widget types', async () => {
      const result = await service.createDashboard({
        name: 'Multi-Type Dashboard',
        description: 'Dashboard with multiple widget types',
        widgets: [
          { type: 'chart', title: 'Chart', config: {}, dataSource: 'metrics' },
          {
            type: 'metric',
            title: 'Metric',
            config: {},
            dataSource: 'metrics',
          },
          { type: 'table', title: 'Table', config: {}, dataSource: 'logs' },
          { type: 'alert', title: 'Alert', config: {}, dataSource: 'alerts' },
          { type: 'log', title: 'Log', config: {}, dataSource: 'logs' },
        ],
      });

      const dashboard = await service.getDashboard(result.dashboardId);

      expect(dashboard.data).toBeDefined();
      expect(Object.keys(dashboard.data)).toHaveLength(5);

      // Check that each widget has appropriate data structure
      for (const widget of dashboard.widgets) {
        const widgetData = dashboard.data[widget.id];
        expect(widgetData).toBeDefined();
        expect(widgetData).not.toBeNull();
      }
    });
  });

  describe('updateDashboard', () => {
    let dashboardId: string;

    beforeEach(async () => {
      const result = await service.createDashboard({
        name: 'Original Dashboard',
        description: 'Original description',
        widgets: [
          {
            type: 'chart',
            title: 'Original Chart',
            config: { metric: 'original.metric' },
            dataSource: 'metrics',
          },
        ],
        layout: 'grid',
        theme: 'light',
        isPublic: false,
      });
      dashboardId = result.dashboardId;
    });

    it('should update dashboard properties', async () => {
      const updates = {
        name: 'Updated Dashboard',
        description: 'Updated description',
        layout: 'freeform' as const,
        theme: 'dark' as const,
        isPublic: true,
      };

      const result = await service.updateDashboard(dashboardId, updates);

      expect(result.success).toBe(true);
      expect(result.dashboard).toBeDefined();
      expect(result.dashboard?.name).toBe(updates.name);
      expect(result.dashboard?.description).toBe(updates.description);
      expect(result.dashboard?.layout).toBe(updates.layout);
      expect(result.dashboard?.theme).toBe(updates.theme);
      expect(result.dashboard?.isPublic).toBe(updates.isPublic);
    });

    it('should update dashboard widgets', async () => {
      const updates = {
        widgets: [
          {
            type: 'metric',
            title: 'New Metric',
            config: { metric: 'new.metric' },
            dataSource: 'metrics',
          },
          {
            type: 'table',
            title: 'New Table',
            config: { columns: ['A', 'B'] },
            dataSource: 'logs',
          },
        ],
      };

      const result = await service.updateDashboard(dashboardId, updates);

      expect(result.success).toBe(true);
      expect(result.dashboard?.widgets).toHaveLength(2);
      expect(result.dashboard?.widgets?.[0]?.title).toBe('New Metric');
      expect(result.dashboard?.widgets?.[1]?.title).toBe('New Table');
    });

    it('should return false for non-existent dashboard', async () => {
      const updates = { name: 'Updated Name' };
      const result = await service.updateDashboard('non-existent-id', updates);

      expect(result.success).toBe(false);
      expect(result.dashboard).toBeNull();
    });

    it('should update timestamp when dashboard is modified', async () => {
      const originalDashboard = await service.getDashboard(dashboardId);
      const originalUpdatedAt = originalDashboard.dashboard?.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const updates = { name: 'Updated Name' };
      const result = await service.updateDashboard(dashboardId, updates);

      expect(result.success).toBe(true);
      expect(result.dashboard?.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt?.getTime() ?? 0
      );
    });
  });

  describe('deleteDashboard', () => {
    let dashboardId: string;

    beforeEach(async () => {
      const result = await service.createDashboard({
        name: 'Dashboard to Delete',
        description: 'This dashboard will be deleted',
        widgets: [],
      });
      dashboardId = result.dashboardId;
    });

    it('should delete dashboard successfully', async () => {
      const result = await service.deleteDashboard(dashboardId);

      expect(result.success).toBe(true);
      expect(result.deleted).toBe(true);

      // Verify dashboard is deleted
      const getResult = await service.getDashboard(dashboardId);
      expect(getResult.dashboard).toBeNull();
    });

    it('should return false for non-existent dashboard', async () => {
      const result = await service.deleteDashboard('non-existent-id');

      expect(result.success).toBe(true);
      expect(result.deleted).toBe(false);
    });
  });

  describe('getDashboards', () => {
    beforeEach(async () => {
      // Create multiple dashboards with different visibility
      await service.createDashboard({
        name: 'Public Dashboard',
        description: 'Public dashboard',
        widgets: [],
        isPublic: true,
      });

      await service.createDashboard({
        name: 'Private Dashboard 1',
        description: 'Private dashboard 1',
        widgets: [],
        isPublic: false,
      });

      await service.createDashboard({
        name: 'Private Dashboard 2',
        description: 'Private dashboard 2',
        widgets: [],
        isPublic: false,
      });
    });

    it('should return all dashboards', async () => {
      const result = await service.getDashboards();

      expect(result.dashboards).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(3);
      expect(result.public).toBeGreaterThanOrEqual(1);
      expect(result.private).toBeGreaterThanOrEqual(2);
    });

    it('should have correct totals', async () => {
      const result = await service.getDashboards();

      expect(result.total).toBe(result.public + result.private);
    });

    it('should return dashboards with valid structure', async () => {
      const result = await service.getDashboards();

      for (const dashboard of result.dashboards) {
        expect(dashboard).toHaveProperty('id');
        expect(dashboard).toHaveProperty('name');
        expect(dashboard).toHaveProperty('description');
        expect(dashboard).toHaveProperty('widgets');
        expect(dashboard).toHaveProperty('layout');
        expect(dashboard).toHaveProperty('theme');
        expect(dashboard).toHaveProperty('isPublic');
        expect(dashboard).toHaveProperty('createdBy');
        expect(dashboard).toHaveProperty('createdAt');
        expect(dashboard).toHaveProperty('updatedAt');
        expect(dashboard).toHaveProperty('metadata');

        expect(Array.isArray(dashboard.widgets)).toBe(true);
        expect(dashboard.createdAt).toBeInstanceOf(Date);
        expect(dashboard.updatedAt).toBeInstanceOf(Date);
      }
    });
  });

  describe('addWidget', () => {
    let dashboardId: string;

    beforeEach(async () => {
      const result = await service.createDashboard({
        name: 'Dashboard for Widget Test',
        description: 'Dashboard for testing widget addition',
        widgets: [],
      });
      dashboardId = result.dashboardId;
    });

    it('should add widget to dashboard', async () => {
      const widget = {
        type: 'chart' as const,
        title: 'New Widget',
        position: { x: 0, y: 0, width: 4, height: 3 },
        config: { metric: 'new.metric' },
        dataSource: 'metrics',
        refreshInterval: 30,
      };

      const result = await service.addWidget(dashboardId, widget);

      expect(result.success).toBe(true);
      expect(result.widgetId).toBeDefined();

      // Verify widget was added
      const dashboard = await service.getDashboard(dashboardId);
      expect(dashboard.widgets).toHaveLength(1);
      expect(dashboard.widgets?.[0]?.title).toBe(widget.title);
    });

    it('should throw error for non-existent dashboard', async () => {
      const widget = {
        type: 'chart' as const,
        title: 'Widget',
        position: { x: 0, y: 0, width: 4, height: 3 },
        config: {},
        dataSource: 'metrics',
        refreshInterval: 30,
      };

      await expect(
        service.addWidget('non-existent-id', widget)
      ).rejects.toThrow('Dashboard non-existent-id not found');
    });
  });

  describe('updateWidget', () => {
    let dashboardId: string;
    let widgetId: string;

    beforeEach(async () => {
      const result = await service.createDashboard({
        name: 'Dashboard for Widget Update',
        description: 'Dashboard for testing widget updates',
        widgets: [
          {
            type: 'chart',
            title: 'Original Widget',
            config: { metric: 'original.metric' },
            dataSource: 'metrics',
          },
        ],
      });
      dashboardId = result.dashboardId;
      widgetId = result.dashboard?.widgets?.[0]?.id ?? '';
    });

    it('should update widget properties', async () => {
      const updates = {
        title: 'Updated Widget',
        config: { metric: 'updated.metric' },
        refreshInterval: 60,
      };

      const result = await service.updateWidget(dashboardId, widgetId, updates);

      expect(result.success).toBe(true);
      expect(result.widget).toBeDefined();
      expect(result.widget?.title).toBe(updates.title);
      expect(result.widget?.config).toEqual(updates.config);
      expect(result.widget?.refreshInterval).toBe(updates.refreshInterval);
    });

    it('should return false for non-existent widget', async () => {
      const updates = { title: 'Updated Title' };
      const result = await service.updateWidget(
        dashboardId,
        'non-existent-widget',
        updates
      );

      expect(result.success).toBe(false);
      expect(result.widget).toBeNull();
    });

    it('should throw error for non-existent dashboard', async () => {
      const updates = { title: 'Updated Title' };

      await expect(
        service.updateWidget('non-existent-dashboard', widgetId, updates)
      ).rejects.toThrow('Dashboard non-existent-dashboard not found');
    });
  });

  describe('getWidgetData', () => {
    let dashboardId: string;
    let widgetId: string;

    beforeEach(async () => {
      const result = await service.createDashboard({
        name: 'Dashboard for Widget Data',
        description: 'Dashboard for testing widget data',
        widgets: [
          {
            type: 'chart',
            title: 'Data Widget',
            config: { metric: 'data.metric' },
            dataSource: 'metrics',
          },
        ],
      });
      dashboardId = result.dashboardId;
      widgetId = result.dashboard?.widgets?.[0]?.id ?? '';
    });

    it('should return widget data', async () => {
      const result = await service.getWidgetData(dashboardId, widgetId);

      expect(result.widget).toBeDefined();
      expect(result.widget?.id).toBe(widgetId);
      expect(result.data).toBeDefined();
      expect(result.data).not.toBeNull();
      expect(result.lastUpdated).toBeInstanceOf(Date);
    });

    it('should return null for non-existent widget', async () => {
      const result = await service.getWidgetData(
        dashboardId,
        'non-existent-widget'
      );

      expect(result.widget).toBeNull();
      expect(result.data).toBeNull();
    });

    it('should return null for non-existent dashboard', async () => {
      const result = await service.getWidgetData(
        'non-existent-dashboard',
        widgetId
      );

      expect(result.widget).toBeNull();
      expect(result.data).toBeNull();
    });
  });
});

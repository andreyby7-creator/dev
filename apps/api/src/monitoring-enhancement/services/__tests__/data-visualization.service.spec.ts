import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { DataVisualizationService } from '../data-visualization.service';

describe('DataVisualizationService', () => {
  let service: DataVisualizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataVisualizationService],
    }).compile();

    service = module.get<DataVisualizationService>(DataVisualizationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createVisualization', () => {
    it('should create visualization successfully', async () => {
      const config = {
        name: 'Test Visualization',
        description: 'A test visualization for monitoring',
        charts: [
          {
            name: 'CPU Usage Chart',
            type: 'line',
            dataSource: 'metrics',
            timeRange: '1h',
            aggregation: 'avg',
            dimensions: ['timestamp'],
            metrics: ['cpu.usage'],
          },
          {
            name: 'Memory Usage Gauge',
            type: 'gauge',
            dataSource: 'metrics',
            timeRange: '1h',
            aggregation: 'avg',
            dimensions: [],
            metrics: ['memory.usage'],
          },
        ],
        layout: {
          type: 'grid' as const,
          columns: 2,
          rows: 1,
        },
        theme: 'light' as const,
        isPublic: false,
      };

      const result = await service.createVisualization(config);

      expect(result.success).toBe(true);
      expect(result.visualizationId).toBeDefined();
      expect(result.visualization).toBeDefined();
      expect(result.visualization.name).toBe(config.name);
      expect(result.visualization.description).toBe(config.description);
      expect(result.visualization.charts).toHaveLength(2);
      expect(result.visualization.layout).toEqual(config.layout);
      expect(result.visualization.theme).toBe(config.theme);
      expect(result.visualization.isPublic).toBe(config.isPublic);
    });

    it('should create visualization with minimal config', async () => {
      const config = {
        name: 'Minimal Visualization',
        description: 'Minimal visualization',
        charts: [],
      };

      const result = await service.createVisualization(config);

      expect(result.success).toBe(true);
      expect(result.visualizationId).toBeDefined();
      expect(result.visualization.name).toBe(config.name);
      expect(result.visualization.charts).toHaveLength(0);
      expect(result.visualization.layout.type).toBe('grid'); // default
      expect(result.visualization.theme).toBe('auto'); // default
      expect(result.visualization.isPublic).toBe(false); // default
    });

    it('should create visualization with different chart types', async () => {
      const config = {
        name: 'Multi-Chart Visualization',
        description: 'Visualization with various chart types',
        charts: [
          {
            name: 'Line Chart',
            type: 'line',
            dataSource: 'metrics',
            timeRange: '1h',
            aggregation: 'avg',
            dimensions: ['timestamp'],
            metrics: ['cpu.usage'],
          },
          {
            name: 'Bar Chart',
            type: 'bar',
            dataSource: 'metrics',
            timeRange: '1h',
            aggregation: 'sum',
            dimensions: ['service'],
            metrics: ['requests'],
          },
          {
            name: 'Pie Chart',
            type: 'pie',
            dataSource: 'logs',
            timeRange: '1h',
            aggregation: 'count',
            dimensions: ['level'],
            metrics: ['count'],
          },
          {
            name: 'Scatter Plot',
            type: 'scatter',
            dataSource: 'traces',
            timeRange: '1h',
            aggregation: 'avg',
            dimensions: ['response_time', 'throughput'],
            metrics: ['count'],
          },
          {
            name: 'Area Chart',
            type: 'area',
            dataSource: 'metrics',
            timeRange: '1h',
            aggregation: 'avg',
            dimensions: ['timestamp'],
            metrics: ['memory.usage'],
          },
          {
            name: 'Histogram',
            type: 'histogram',
            dataSource: 'traces',
            timeRange: '1h',
            aggregation: 'count',
            dimensions: ['response_time'],
            metrics: ['count'],
          },
          {
            name: 'Gauge',
            type: 'gauge',
            dataSource: 'metrics',
            timeRange: '1h',
            aggregation: 'avg',
            dimensions: [],
            metrics: ['cpu.usage'],
          },
          {
            name: 'Heatmap',
            type: 'heatmap',
            dataSource: 'metrics',
            timeRange: '1h',
            aggregation: 'avg',
            dimensions: ['hour', 'day'],
            metrics: ['requests'],
          },
        ],
      };

      const result = await service.createVisualization(config);

      expect(result.success).toBe(true);
      expect(result.visualization.charts).toHaveLength(8);

      const chartTypes = result.visualization.charts.map(c => c.type);
      expect(chartTypes).toContain('line');
      expect(chartTypes).toContain('bar');
      expect(chartTypes).toContain('pie');
      expect(chartTypes).toContain('scatter');
      expect(chartTypes).toContain('area');
      expect(chartTypes).toContain('histogram');
      expect(chartTypes).toContain('gauge');
      expect(chartTypes).toContain('heatmap');
    });

    it('should generate unique visualization IDs', async () => {
      const config1 = {
        name: 'Visualization 1',
        description: 'First visualization',
        charts: [],
      };

      const config2 = {
        name: 'Visualization 2',
        description: 'Second visualization',
        charts: [],
      };

      const result1 = await service.createVisualization(config1);
      const result2 = await service.createVisualization(config2);

      expect(result1.visualizationId).not.toBe(result2.visualizationId);
    });
  });

  describe('getCharts', () => {
    it('should return all charts', async () => {
      const result = await service.getCharts();

      expect(result.charts).toBeDefined();
      expect(Array.isArray(result.charts)).toBe(true);
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.byType).toBeDefined();
    });

    it('should return charts of specific type', async () => {
      const result = await service.getCharts('line');

      expect(result.charts).toBeDefined();
      expect(Array.isArray(result.charts)).toBe(true);

      // All returned charts should be of the specified type
      for (const chart of result.charts) {
        expect(chart.type).toBe('line');
      }
    });

    it('should return charts of different types', async () => {
      const chartTypes = ['line', 'bar', 'pie', 'gauge', 'histogram'];

      for (const type of chartTypes) {
        const result = await service.getCharts(type);

        expect(result.charts).toBeDefined();
        expect(Array.isArray(result.charts)).toBe(true);

        for (const chart of result.charts) {
          expect(chart.type).toBe(type);
        }
      }
    });

    it('should aggregate charts by type correctly', async () => {
      const result = await service.getCharts();

      expect(result.byType).toBeDefined();
      expect(typeof result.byType).toBe('object');

      // Verify that the counts match the actual charts
      let totalFromByType = 0;
      for (const count of Object.values(result.byType)) {
        totalFromByType += count;
      }
      expect(totalFromByType).toBe(result.total);
    });
  });

  describe('getVisualization', () => {
    let visualizationId: string;

    beforeEach(async () => {
      const result = await service.createVisualization({
        name: 'Test Visualization',
        description: 'Test visualization',
        charts: [
          {
            name: 'Test Chart',
            type: 'line',
            dataSource: 'metrics',
            timeRange: '1h',
            aggregation: 'avg',
            dimensions: ['timestamp'],
            metrics: ['cpu.usage'],
          },
        ],
      });
      visualizationId = result.visualizationId;
    });

    it('should return visualization with data', async () => {
      const result = await service.getVisualization(visualizationId);

      expect(result.visualization).toBeDefined();
      expect(result.visualization?.id).toBe(visualizationId);
      expect(result.charts).toBeDefined();
      expect(result.charts).toHaveLength(1);
      expect(result.data).toBeDefined();
      expect(result.data?.[result.charts?.[0]?.id ?? '']).toBeDefined();
    });

    it('should return null for non-existent visualization', async () => {
      const result = await service.getVisualization('non-existent-id');

      expect(result.visualization).toBeNull();
      expect(result.charts).toHaveLength(0);
      expect(result.data).toEqual({});
    });

    it('should generate data for different chart types', async () => {
      const result = await service.createVisualization({
        name: 'Multi-Type Visualization',
        description: 'Visualization with multiple chart types',
        charts: [
          {
            name: 'Line',
            type: 'line',
            dataSource: 'metrics',
            timeRange: '1h',
            aggregation: 'avg',
            dimensions: [],
            metrics: [],
          },
          {
            name: 'Bar',
            type: 'bar',
            dataSource: 'metrics',
            timeRange: '1h',
            aggregation: 'sum',
            dimensions: [],
            metrics: [],
          },
          {
            name: 'Pie',
            type: 'pie',
            dataSource: 'logs',
            timeRange: '1h',
            aggregation: 'count',
            dimensions: [],
            metrics: [],
          },
          {
            name: 'Gauge',
            type: 'gauge',
            dataSource: 'metrics',
            timeRange: '1h',
            aggregation: 'avg',
            dimensions: [],
            metrics: [],
          },
        ],
      });

      const visualization = await service.getVisualization(
        result.visualizationId
      );

      expect(visualization.data).toBeDefined();
      expect(Object.keys(visualization.data)).toHaveLength(4);

      // Check that each chart has appropriate data structure
      for (const chart of visualization.charts) {
        const chartData = visualization.data[chart.id];
        expect(chartData).toBeDefined();
        expect(chartData).not.toBeNull();
      }
    });
  });

  describe('updateVisualization', () => {
    let visualizationId: string;

    beforeEach(async () => {
      const result = await service.createVisualization({
        name: 'Original Visualization',
        description: 'Original description',
        charts: [
          {
            name: 'Original Chart',
            type: 'line',
            dataSource: 'metrics',
            timeRange: '1h',
            aggregation: 'avg',
            dimensions: ['timestamp'],
            metrics: ['original.metric'],
          },
        ],
        layout: { type: 'grid', columns: 1, rows: 1 },
        theme: 'light',
        isPublic: false,
      });
      visualizationId = result.visualizationId;
    });

    it('should update visualization properties', async () => {
      const updates = {
        name: 'Updated Visualization',
        description: 'Updated description',
        layout: { type: 'freeform' as const, columns: 2, rows: 2 },
        theme: 'dark' as const,
        isPublic: true,
      };

      const result = await service.updateVisualization(
        visualizationId,
        updates
      );

      expect(result.success).toBe(true);
      expect(result.visualization).toBeDefined();
      expect(result.visualization?.name).toBe(updates.name);
      expect(result.visualization?.description).toBe(updates.description);
      expect(result.visualization?.layout).toEqual(updates.layout);
      expect(result.visualization?.theme).toBe(updates.theme);
      expect(result.visualization?.isPublic).toBe(updates.isPublic);
    });

    it('should update visualization charts', async () => {
      const updates = {
        charts: [
          {
            name: 'New Line Chart',
            type: 'line',
            dataSource: 'metrics',
            timeRange: '24h',
            aggregation: 'sum',
            dimensions: ['timestamp'],
            metrics: ['new.metric'],
          },
          {
            name: 'New Bar Chart',
            type: 'bar',
            dataSource: 'logs',
            timeRange: '24h',
            aggregation: 'count',
            dimensions: ['service'],
            metrics: ['requests'],
          },
        ],
      };

      const result = await service.updateVisualization(
        visualizationId,
        updates
      );

      expect(result.success).toBe(true);
      expect(result.visualization?.charts).toHaveLength(2);
      expect(result.visualization?.charts?.[0]?.name).toBe('New Line Chart');
      expect(result.visualization?.charts?.[1]?.name).toBe('New Bar Chart');
    });

    it('should return false for non-existent visualization', async () => {
      const updates = { name: 'Updated Name' };
      const result = await service.updateVisualization(
        'non-existent-id',
        updates
      );

      expect(result.success).toBe(false);
      expect(result.visualization).toBeNull();
    });

    it('should update timestamp when visualization is modified', async () => {
      const originalVisualization =
        await service.getVisualization(visualizationId);
      const originalUpdatedAt = originalVisualization.visualization?.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const updates = { name: 'Updated Name' };
      const result = await service.updateVisualization(
        visualizationId,
        updates
      );

      expect(result.success).toBe(true);
      expect(result.visualization?.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt?.getTime() ?? 0
      );
    });
  });

  describe('getVisualizations', () => {
    beforeEach(async () => {
      // Create multiple visualizations with different visibility
      await service.createVisualization({
        name: 'Public Visualization',
        description: 'Public visualization',
        charts: [],
        isPublic: true,
      });

      await service.createVisualization({
        name: 'Private Visualization 1',
        description: 'Private visualization 1',
        charts: [],
        isPublic: false,
      });

      await service.createVisualization({
        name: 'Private Visualization 2',
        description: 'Private visualization 2',
        charts: [],
        isPublic: false,
      });
    });

    it('should return all visualizations', async () => {
      const result = await service.getVisualizations();

      expect(result.visualizations).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(3);
      expect(result.public).toBeGreaterThanOrEqual(1);
      expect(result.private).toBeGreaterThanOrEqual(2);
    });

    it('should have correct totals', async () => {
      const result = await service.getVisualizations();

      expect(result.total).toBe(result.public + result.private);
    });

    it('should return visualizations with valid structure', async () => {
      const result = await service.getVisualizations();

      for (const visualization of result.visualizations) {
        expect(visualization).toHaveProperty('id');
        expect(visualization).toHaveProperty('name');
        expect(visualization).toHaveProperty('description');
        expect(visualization).toHaveProperty('charts');
        expect(visualization).toHaveProperty('layout');
        expect(visualization).toHaveProperty('theme');
        expect(visualization).toHaveProperty('isPublic');
        expect(visualization).toHaveProperty('createdBy');
        expect(visualization).toHaveProperty('createdAt');
        expect(visualization).toHaveProperty('updatedAt');
        expect(visualization).toHaveProperty('metadata');

        expect(Array.isArray(visualization.charts)).toBe(true);
        expect(visualization.createdAt).toBeInstanceOf(Date);
        expect(visualization.updatedAt).toBeInstanceOf(Date);
      }
    });
  });

  describe('generateChartData', () => {
    it('should generate chart data for existing chart', async () => {
      const result = await service.generateChartData('cpu-usage-line', '1h');

      expect(result.chart).toBeDefined();
      expect(result.chart?.id).toBe('cpu-usage-line');
      expect(result.data).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.generatedAt).toBeInstanceOf(Date);
      expect(result.metadata.timeRange).toBe('1h');
      expect(result.metadata.dataPoints).toBeGreaterThanOrEqual(0);
    });

    it('should return null for non-existent chart', async () => {
      const result = await service.generateChartData(
        'non-existent-chart',
        '1h'
      );

      expect(result.chart).toBeNull();
      expect(result.data).toBeNull();
      expect(result.metadata.dataPoints).toBe(0);
    });

    it('should generate data for different time ranges', async () => {
      const timeRanges = ['1h', '24h', '7d'];

      for (const timeRange of timeRanges) {
        const result = await service.generateChartData(
          'cpu-usage-line',
          timeRange
        );

        expect(result.chart).toBeDefined();
        expect(result.metadata.timeRange).toBe(timeRange);
        expect(result.data).toBeDefined();
      }
    });
  });

  describe('createChartTemplate', () => {
    it('should create chart template successfully', async () => {
      const template = {
        name: 'Test Chart Template',
        type: 'line' as const,
        dataSource: 'metrics',
        timeRange: '1h',
        aggregation: 'avg' as const,
        dimensions: ['timestamp'],
        metrics: ['cpu.usage'],
        filters: {},
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: true,
          legend: {
            display: true,
            position: 'top' as const,
          },
        },
        metadata: { category: 'system' },
      };

      const result = await service.createChartTemplate(template);

      expect(result.success).toBe(true);
      expect(result.chartId).toBeDefined();
      expect(result.chart).toBeDefined();
      expect(result.chart.name).toBe(template.name);
      expect(result.chart.type).toBe(template.type);
      expect(result.chart.dataSource).toBe(template.dataSource);
    });

    it('should create template with minimal config', async () => {
      const template = {
        name: 'Minimal Template',
        type: 'bar' as const,
        dataSource: 'logs',
        timeRange: '24h',
        aggregation: 'count' as const,
        dimensions: [],
        metrics: [],
        filters: {},
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: true,
        },
        metadata: {},
      };

      const result = await service.createChartTemplate(template);

      expect(result.success).toBe(true);
      expect(result.chartId).toBeDefined();
      expect(result.chart.name).toBe(template.name);
    });

    it('should generate unique chart IDs', async () => {
      const template1 = {
        name: 'Template 1',
        type: 'line' as const,
        dataSource: 'metrics',
        timeRange: '1h',
        aggregation: 'avg' as const,
        dimensions: [],
        metrics: [],
        filters: {},
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: true,
        },
        metadata: {},
      };

      const template2 = {
        name: 'Template 2',
        type: 'bar' as const,
        dataSource: 'logs',
        timeRange: '24h',
        aggregation: 'count' as const,
        dimensions: [],
        metrics: [],
        filters: {},
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: true,
        },
        metadata: {},
      };

      const result1 = await service.createChartTemplate(template1);
      const result2 = await service.createChartTemplate(template2);

      expect(result1.chartId).not.toBe(result2.chartId);
    });
  });
});

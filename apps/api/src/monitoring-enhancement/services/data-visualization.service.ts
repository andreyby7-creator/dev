import { Injectable, Logger } from '@nestjs/common';

export interface ChartConfig {
  id: string;
  name: string;
  type:
    | 'line'
    | 'bar'
    | 'pie'
    | 'scatter'
    | 'area'
    | 'histogram'
    | 'gauge'
    | 'heatmap';
  dataSource: string;
  query?: string;
  timeRange: string;
  aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'percentile';
  dimensions: string[];
  metrics: string[];
  filters: Record<string, unknown>;
  options: {
    responsive: boolean;
    maintainAspectRatio: boolean;
    animation: boolean;
    colors?: string[];
    legend?: {
      display: boolean;
      position: 'top' | 'bottom' | 'left' | 'right';
    };
    scales?: Record<string, unknown>;
  };
  metadata: Record<string, unknown>;
}

export interface Visualization {
  id: string;
  name: string;
  description: string;
  charts: ChartConfig[];
  layout: {
    type: 'grid' | 'freeform';
    columns: number;
    rows: number;
  };
  theme: 'light' | 'dark' | 'auto';
  refreshInterval: number; // seconds
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

export interface VisualizationConfig {
  name: string;
  description: string;
  charts: Array<{
    name: string;
    type: string;
    dataSource: string;
    query?: string;
    timeRange: string;
    aggregation: string;
    dimensions: string[];
    metrics: string[];
  }>;
  layout?: {
    type: 'grid' | 'freeform';
    columns?: number;
    rows?: number;
  };
  theme?: 'light' | 'dark' | 'auto';
  isPublic?: boolean;
}

@Injectable()
export class DataVisualizationService {
  private readonly logger = new Logger(DataVisualizationService.name);
  private visualizations: Map<string, Visualization> = new Map();
  private chartTemplates: Map<string, ChartConfig> = new Map();

  constructor() {
    this.initializeChartTemplates();
  }

  async createVisualization(config: VisualizationConfig): Promise<{
    success: boolean;
    visualizationId: string;
    visualization: Visualization;
  }> {
    try {
      this.logger.log(`Creating visualization: ${config.name}`);

      const visualizationId = `viz-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date();

      const charts: ChartConfig[] = config.charts.map((chart, index) => ({
        id: `chart-${visualizationId}-${index}`,
        name: chart.name,
        type: chart.type as
          | 'line'
          | 'bar'
          | 'pie'
          | 'scatter'
          | 'area'
          | 'histogram'
          | 'gauge'
          | 'heatmap',
        dataSource: chart.dataSource,
        query: chart.query ?? '',
        timeRange: chart.timeRange,
        aggregation: chart.aggregation as
          | 'sum'
          | 'avg'
          | 'min'
          | 'max'
          | 'count'
          | 'percentile',
        dimensions: chart.dimensions,
        metrics: chart.metrics,
        filters: {},
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: true,
          legend: {
            display: true,
            position: 'top',
          },
        },
        metadata: {
          index,
        },
      }));

      const visualization: Visualization = {
        id: visualizationId,
        name: config.name,
        description: config.description,
        charts,
        layout: {
          type: config.layout?.type ?? 'grid',
          columns: config.layout?.columns ?? 2,
          rows:
            config.layout?.rows ??
            Math.ceil(charts.length / (config.layout?.columns ?? 2)),
        },
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

      this.visualizations.set(visualizationId, visualization);

      this.logger.log(
        `Created visualization ${visualizationId} with ${charts.length} charts`
      );

      return {
        success: true,
        visualizationId,
        visualization,
      };
    } catch (error) {
      this.logger.error('Failed to create visualization', error);
      throw error;
    }
  }

  async getCharts(type?: string): Promise<{
    charts: ChartConfig[];
    total: number;
    byType: Record<string, number>;
  }> {
    try {
      this.logger.log(
        `Getting charts${type != null ? ` of type: ${type}` : ''}`
      );

      let charts = Array.from(this.chartTemplates.values());

      if (type != null) {
        charts = charts.filter(chart => chart.type === type);
      }

      const byType: Record<string, number> = {};
      for (const chart of charts) {
        byType[chart.type] = (byType[chart.type] ?? 0) + 1;
      }

      return {
        charts,
        total: charts.length,
        byType,
      };
    } catch (error) {
      this.logger.error('Failed to get charts', error);
      throw error;
    }
  }

  async getVisualization(id: string): Promise<{
    visualization: Visualization | null;
    charts: ChartConfig[];
    data: Record<string, unknown>;
  }> {
    try {
      this.logger.log(`Getting visualization: ${id}`);

      const visualization = this.visualizations.get(id);
      if (!visualization) {
        return {
          visualization: null,
          charts: [],
          data: {},
        };
      }

      // Generate chart data
      const data: Record<string, unknown> = {};
      for (const chart of visualization.charts) {
        data[chart.id] = this.generateMockChartData(chart);
      }

      return {
        visualization,
        charts: visualization.charts,
        data,
      };
    } catch (error) {
      this.logger.error('Failed to get visualization', error);
      throw error;
    }
  }

  async updateVisualization(
    id: string,
    updates: Partial<VisualizationConfig>
  ): Promise<{
    success: boolean;
    visualization: Visualization | null;
  }> {
    try {
      this.logger.log(`Updating visualization: ${id}`);

      const visualization = this.visualizations.get(id);
      if (!visualization) {
        return {
          success: false,
          visualization: null,
        };
      }

      // Update visualization properties
      if (updates.name != null) visualization.name = updates.name;
      if (updates.description != null)
        visualization.description = updates.description;
      if (updates.layout != null) {
        visualization.layout = {
          type:
            (updates.layout.type as 'grid' | 'freeform' | undefined) ??
            visualization.layout.type,
          columns: updates.layout.columns ?? visualization.layout.columns,
          rows: updates.layout.rows ?? visualization.layout.rows,
        };
      }
      if (updates.theme != null) visualization.theme = updates.theme;
      if (updates.isPublic != null) visualization.isPublic = updates.isPublic;

      // Update charts if provided
      if (updates.charts != null) {
        const charts: ChartConfig[] = updates.charts.map((chart, index) => ({
          id: `chart-${id}-${index}`,
          name: chart.name,
          type: chart.type as
            | 'line'
            | 'bar'
            | 'pie'
            | 'scatter'
            | 'area'
            | 'histogram'
            | 'gauge'
            | 'heatmap',
          dataSource: chart.dataSource,
          query: chart.query ?? '',
          timeRange: chart.timeRange,
          aggregation: chart.aggregation as
            | 'sum'
            | 'avg'
            | 'min'
            | 'max'
            | 'count'
            | 'percentile',
          dimensions: chart.dimensions,
          metrics: chart.metrics,
          filters: {},
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: true,
            legend: {
              display: true,
              position: 'top',
            },
          },
          metadata: {
            index,
          },
        }));
        visualization.charts = charts;
      }

      visualization.updatedAt = new Date();

      this.logger.log(`Updated visualization ${id}`);

      return {
        success: true,
        visualization,
      };
    } catch (error) {
      this.logger.error('Failed to update visualization', error);
      throw error;
    }
  }

  async getVisualizations(): Promise<{
    visualizations: Visualization[];
    total: number;
    public: number;
    private: number;
  }> {
    try {
      this.logger.log('Getting all visualizations');

      const visualizations = Array.from(this.visualizations.values());
      const publicVisualizations = visualizations.filter(v => v.isPublic);
      const privateVisualizations = visualizations.filter(v => !v.isPublic);

      return {
        visualizations,
        total: visualizations.length,
        public: publicVisualizations.length,
        private: privateVisualizations.length,
      };
    } catch (error) {
      this.logger.error('Failed to get visualizations', error);
      throw error;
    }
  }

  async generateChartData(
    chartId: string,
    timeRange?: string
  ): Promise<{
    chart: ChartConfig | null;
    data: unknown;
    metadata: {
      generatedAt: Date;
      timeRange: string;
      dataPoints: number;
    };
  }> {
    try {
      this.logger.log(`Generating chart data for: ${chartId}`);

      const chart = this.chartTemplates.get(chartId);
      if (!chart) {
        return {
          chart: null,
          data: null,
          metadata: {
            generatedAt: new Date(),
            timeRange: timeRange ?? '1h',
            dataPoints: 0,
          },
        };
      }

      const data = this.generateMockChartData(chart);
      const dataPoints = Array.isArray(data) ? data.length : 1;

      return {
        chart,
        data,
        metadata: {
          generatedAt: new Date(),
          timeRange: timeRange ?? chart.timeRange,
          dataPoints,
        },
      };
    } catch (error) {
      this.logger.error('Failed to generate chart data', error);
      throw error;
    }
  }

  async createChartTemplate(template: Omit<ChartConfig, 'id'>): Promise<{
    success: boolean;
    chartId: string;
    chart: ChartConfig;
  }> {
    try {
      this.logger.log(`Creating chart template: ${template.name}`);

      const chartId = `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const newChart: ChartConfig = {
        ...template,
        id: chartId,
      };

      this.chartTemplates.set(chartId, newChart);

      this.logger.log(`Created chart template ${chartId}`);

      return {
        success: true,
        chartId,
        chart: newChart,
      };
    } catch (error) {
      this.logger.error('Failed to create chart template', error);
      throw error;
    }
  }

  private initializeChartTemplates(): void {
    const defaultTemplates: ChartConfig[] = [
      {
        id: 'cpu-usage-line',
        name: 'CPU Usage Over Time',
        type: 'line',
        dataSource: 'metrics',
        timeRange: '1h',
        aggregation: 'avg',
        dimensions: ['timestamp'],
        metrics: ['cpu.usage'],
        filters: {},
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: true,
          legend: {
            display: true,
            position: 'top',
          },
          scales: {
            y: { beginAtZero: true, max: 100 },
          },
        },
        metadata: { category: 'system' },
      },
      {
        id: 'memory-usage-gauge',
        name: 'Memory Usage Gauge',
        type: 'gauge',
        dataSource: 'metrics',
        timeRange: '1h',
        aggregation: 'avg',
        dimensions: [],
        metrics: ['memory.usage'],
        filters: {},
        options: {
          responsive: true,
          maintainAspectRatio: true,
          animation: true,
        },
        metadata: { category: 'system' },
      },
      {
        id: 'error-rate-bar',
        name: 'Error Rate by Service',
        type: 'bar',
        dataSource: 'logs',
        query: 'level:error',
        timeRange: '24h',
        aggregation: 'count',
        dimensions: ['service'],
        metrics: ['count'],
        filters: {},
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: true,
          legend: {
            display: true,
            position: 'top',
          },
        },
        metadata: { category: 'errors' },
      },
      {
        id: 'response-time-histogram',
        name: 'Response Time Distribution',
        type: 'histogram',
        dataSource: 'traces',
        timeRange: '1h',
        aggregation: 'percentile',
        dimensions: ['response_time'],
        metrics: ['count'],
        filters: {},
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: true,
          legend: {
            display: true,
            position: 'top',
          },
        },
        metadata: { category: 'performance' },
      },
    ];

    for (const template of defaultTemplates) {
      this.chartTemplates.set(template.id, template);
    }
  }

  private generateMockChartData(chart: ChartConfig): unknown {
    switch (chart.type) {
      case 'line':
        return Array.from({ length: 20 }, (_, i) => ({
          x: new Date(Date.now() - (19 - i) * 60000).toISOString(),
          y: Math.random() * 100,
        }));

      case 'bar':
        return Array.from({ length: 5 }, (_, i) => ({
          x: `Service ${i + 1}`,
          y: Math.random() * 100,
        }));

      case 'pie':
        return [
          { label: 'Healthy', value: Math.random() * 80 + 10 },
          { label: 'Warning', value: Math.random() * 15 + 5 },
          { label: 'Error', value: Math.random() * 10 },
        ];

      case 'scatter':
        return Array.from({ length: 50 }, () => ({
          x: Math.random() * 100,
          y: Math.random() * 100,
        }));

      case 'area':
        return Array.from({ length: 20 }, (_, i) => ({
          x: new Date(Date.now() - (19 - i) * 60000).toISOString(),
          y: Math.random() * 100,
        }));

      case 'histogram':
        return Array.from({ length: 10 }, (_, i) => ({
          x: `${i * 100}-${(i + 1) * 100}ms`,
          y: Math.random() * 100,
        }));

      case 'gauge':
        return {
          value: Math.random() * 100,
          max: 100,
          thresholds: [70, 90],
        };

      case 'heatmap':
        return Array.from({ length: 7 }, (_, day) =>
          Array.from({ length: 24 }, (_, hour) => ({
            x: hour,
            y: day,
            v: Math.random() * 100,
          }))
        );

      default:
        return { message: 'No data available' };
    }
  }
}

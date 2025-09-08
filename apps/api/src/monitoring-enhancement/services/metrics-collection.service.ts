import { Injectable, Logger } from '@nestjs/common';

export interface MetricData {
  name: string;
  value: number;
  timestamp: Date;
  tags: Record<string, string>;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
}

export interface PerformanceMetrics {
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    total: number;
    free: number;
    usage: number;
  };
  disk: {
    used: number;
    total: number;
    free: number;
    usage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
  application: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    activeConnections: number;
  };
}

export interface MetricsCollectionConfig {
  interval: number;
  metrics: string[];
  retention: number;
  aggregation: 'sum' | 'avg' | 'min' | 'max';
}

@Injectable()
export class MetricsCollectionService {
  private readonly logger = new Logger(MetricsCollectionService.name);
  private metrics: MetricData[] = [];
  private performanceData: PerformanceMetrics | null = null;

  async collectMetrics(config: MetricsCollectionConfig): Promise<{
    success: boolean;
    collected: number;
    timestamp: Date;
  }> {
    try {
      this.logger.log(
        `Starting metrics collection with config: ${JSON.stringify(config)}`
      );

      // Simulate metrics collection
      const collectedMetrics: MetricData[] = [];

      for (const metricName of config.metrics) {
        const metric: MetricData = {
          name: metricName,
          value: Math.random() * 100,
          timestamp: new Date(),
          tags: { service: 'api', environment: 'production' },
          type: 'gauge',
        };
        collectedMetrics.push(metric);
      }

      this.metrics.push(...collectedMetrics);

      // Keep only recent metrics based on retention
      const cutoffTime = new Date(Date.now() - config.retention * 1000);
      this.metrics = this.metrics.filter(m => m.timestamp > cutoffTime);

      this.logger.log(`Collected ${collectedMetrics.length} metrics`);

      return {
        success: true,
        collected: collectedMetrics.length,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to collect metrics', error);
      throw error;
    }
  }

  async getPerformanceMetrics(timeRange?: string): Promise<{
    metrics: PerformanceMetrics;
    timeRange: string;
    timestamp: Date;
  }> {
    try {
      this.logger.log(
        `Getting performance metrics for time range: ${timeRange ?? 'default'}`
      );

      // Simulate performance data collection
      this.performanceData = {
        cpu: {
          usage: Math.random() * 100,
          cores: 8,
          loadAverage: [
            Math.random() * 2,
            Math.random() * 2,
            Math.random() * 2,
          ],
        },
        memory: {
          used: Math.random() * 8 * 1024 * 1024 * 1024, // Random up to 8GB
          total: 8 * 1024 * 1024 * 1024, // 8GB
          free: Math.random() * 4 * 1024 * 1024 * 1024, // Random up to 4GB
          usage: Math.random() * 100,
        },
        disk: {
          used: Math.random() * 500 * 1024 * 1024 * 1024, // Random up to 500GB
          total: 1000 * 1024 * 1024 * 1024, // 1TB
          free: Math.random() * 500 * 1024 * 1024 * 1024, // Random up to 500GB
          usage: Math.random() * 100,
        },
        network: {
          bytesIn: Math.random() * 1000000,
          bytesOut: Math.random() * 1000000,
          packetsIn: Math.random() * 10000,
          packetsOut: Math.random() * 10000,
        },
        application: {
          responseTime: Math.random() * 1000, // Random up to 1 second
          throughput: Math.random() * 1000, // Random up to 1000 req/s
          errorRate: Math.random() * 5, // Random up to 5%
          activeConnections: Math.floor(Math.random() * 1000),
        },
      };

      return {
        metrics: this.performanceData,
        timeRange: timeRange ?? '1h',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to get performance metrics', error);
      throw error;
    }
  }

  async getMetricsHistory(
    metricName: string,
    timeRange: string
  ): Promise<{
    metric: string;
    data: MetricData[];
    timeRange: string;
  }> {
    try {
      this.logger.log(
        `Getting metrics history for ${metricName} in range ${timeRange}`
      );

      const filteredMetrics = this.metrics.filter(m => m.name === metricName);

      return {
        metric: metricName,
        data: filteredMetrics,
        timeRange,
      };
    } catch (error) {
      this.logger.error('Failed to get metrics history', error);
      throw error;
    }
  }

  async aggregateMetrics(
    metricName: string,
    aggregation: string
  ): Promise<{
    metric: string;
    aggregation: string;
    value: number;
    timestamp: Date;
  }> {
    try {
      this.logger.log(
        `Aggregating metrics for ${metricName} using ${aggregation}`
      );

      const filteredMetrics = this.metrics.filter(m => m.name === metricName);

      let value = 0;
      switch (aggregation) {
        case 'sum':
          value = filteredMetrics.reduce((sum, m) => sum + m.value, 0);
          break;
        case 'avg':
          value =
            filteredMetrics.reduce((sum, m) => sum + m.value, 0) /
            filteredMetrics.length;
          break;
        case 'min':
          value = Math.min(...filteredMetrics.map(m => m.value));
          break;
        case 'max':
          value = Math.max(...filteredMetrics.map(m => m.value));
          break;
        default:
          value = 0;
      }

      return {
        metric: metricName,
        aggregation,
        value,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to aggregate metrics', error);
      throw error;
    }
  }
}

import { Injectable } from '@nestjs/common';
import { redactedLogger } from '../../utils/redacted-logger';

export interface Metric {
  name: string;
  value: number;
  timestamp: Date;
  labels?: Record<string, string>;
}

export interface MetricSummary {
  totalMetrics: number;
  metricNames: string[];
  totalValue: number;
  averageValue: number;
  minValue: number;
  maxValue: number;
  lastUpdateTime: Date;
}

@Injectable()
export class UnifiedMetricsService {
  private metrics: Map<string, Metric[]> = new Map();
  private counters: Map<string, number> = new Map();
  private globalLabels: Record<string, string> = {};
  private enabled: boolean;

  constructor() {
    // Проверяем переменную окружения, если её нет, то по умолчанию true
    // Но если переменная явно удалена, то считаем что метрики отключены
    this.enabled =
      process.env.METRICS_ENABLED !== 'false' &&
      process.env.METRICS_ENABLED !== undefined;
    redactedLogger.log(
      'UnifiedMetricsService initialized',
      'UnifiedMetricsService'
    );
  }

  recordMetric(
    name: string,
    value: number,
    labels?: Record<string, string>
  ): void {
    if (!this.enabled) return;

    const metric: Metric = {
      name,
      value,
      timestamp: new Date(),
      labels: { ...this.globalLabels, ...labels },
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    const metrics = this.metrics.get(name);
    if (metrics) {
      metrics.push(metric);
    }

    redactedLogger.debug(
      `Metric recorded: ${name} = ${value}`,
      'UnifiedMetricsService',
      { labels }
    );
  }

  incrementCounter(
    name: string,
    increment: number = 1,
    labels?: Record<string, string>
  ): void {
    if (!this.enabled) return;

    // Получаем последнее значение метрики, если она существует
    const existingMetrics = this.metrics.get(name);
    const lastValue =
      existingMetrics && existingMetrics.length > 0
        ? (existingMetrics[existingMetrics.length - 1]?.value ?? 0)
        : 0;

    const newValue = lastValue + increment;

    // Обновляем внутренний счетчик
    this.counters.set(name, newValue);

    // Записываем новое значение как метрику
    this.recordMetric(name, newValue, labels);
    redactedLogger.debug(
      `Counter incremented: ${name} = ${newValue}`,
      'UnifiedMetricsService'
    );
  }

  measureExecutionTime<T>(
    name: string,
    fn: () => T | Promise<T>,
    labels?: Record<string, string>
  ): T | Promise<T> {
    if (!this.enabled) {
      return fn();
    }

    const startTime = Date.now();

    try {
      const result = fn();
      if (result instanceof Promise) {
        return result.finally(() => {
          const executionTime = Date.now() - startTime;
          // Убеждаемся, что время выполнения больше 0
          this.recordMetric(name, Math.max(executionTime, 1), labels);
        });
      } else {
        const executionTime = Date.now() - startTime;
        // Убеждаемся, что время выполнения больше 0
        this.recordMetric(name, Math.max(executionTime, 1), labels);
        return result;
      }
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.recordMetric(name, Math.max(executionTime, 1), labels);
      throw error;
    }
  }

  getMetrics(name: string): Metric[] {
    if (!this.enabled) return [];

    const metrics = this.metrics.get(name);
    if (!metrics) return [];

    // Возвращаем только последнюю метрику
    const lastMetric = metrics[metrics.length - 1];
    return lastMetric ? [lastMetric] : [];
  }

  getAllMetrics(): Metric[] {
    if (!this.enabled) return [];

    const allMetrics: Metric[] = [];
    for (const metrics of this.metrics.values()) {
      allMetrics.push(...metrics);
    }
    return allMetrics;
  }

  clearMetrics(): void {
    if (!this.enabled) return;

    this.metrics.clear();
    this.counters.clear();
    redactedLogger.log('All metrics cleared', 'UnifiedMetricsService');
  }

  exportMetrics(
    format: 'prometheus' | 'opentelemetry' | 'custom'
  ): string | Record<string, unknown> {
    if (!this.enabled) return {};

    switch (format) {
      case 'prometheus':
        return this.exportPrometheusFormat();
      case 'opentelemetry':
        return this.exportOpenTelemetryFormat();
      case 'custom':
        return this.exportCustomFormat();
      default:
        return {};
    }
  }

  private exportPrometheusFormat(): string {
    let output = '# HELP metrics Prometheus metrics\n';
    output += '# TYPE metrics counter\n';

    for (const [name, metrics] of this.metrics.entries()) {
      const latestMetric = metrics[metrics.length - 1];
      if (latestMetric) {
        const labels = latestMetric.labels
          ? `{${Object.entries(latestMetric.labels)
              .map(([k, v]) => `${k}="${v}"`)
              .join(',')}}`
          : '';
        output += `${name}${labels} ${latestMetric.value}\n`;
      }
    }

    return output;
  }

  private exportOpenTelemetryFormat(): string {
    const otelMetrics = [];

    for (const [name, metrics] of this.metrics.entries()) {
      const latestMetric = metrics[metrics.length - 1];
      if (latestMetric) {
        otelMetrics.push({
          name,
          value: latestMetric.value,
          timestamp: latestMetric.timestamp.toISOString(),
          labels: latestMetric.labels ?? {},
        });
      }
    }

    return JSON.stringify({
      resourceMetrics: [
        {
          resource: { attributes: { service: 'monitoring' } },
          scopeMetrics: [
            {
              scope: { name: 'unified-metrics' },
              metrics: otelMetrics,
            },
          ],
        },
      ],
    });
  }

  private exportCustomFormat(): string {
    const customMetrics: Record<string, unknown> = {};

    for (const [name, metrics] of this.metrics.entries()) {
      const latestMetric = metrics[metrics.length - 1];
      if (latestMetric) {
        customMetrics[name] = {
          value: latestMetric.value,
          timestamp: latestMetric.timestamp.toISOString(),
          labels: latestMetric.labels ?? {},
        };
      }
    }

    return JSON.stringify(customMetrics);
  }

  getMetricsSummary(): MetricSummary {
    const allMetrics = this.getAllMetrics();

    if (allMetrics.length === 0) {
      return {
        totalMetrics: 0,
        metricNames: [],
        totalValue: 0,
        averageValue: 0,
        minValue: 0,
        maxValue: 0,
        lastUpdateTime: new Date(),
      };
    }

    const values = allMetrics.map(m => m.value);
    const totalValue = values.reduce((sum, val) => sum + val, 0);
    const averageValue = totalValue / allMetrics.length;
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const metricNames = Array.from(this.metrics.keys());
    const lastUpdateTime =
      allMetrics.length > 0
        ? (allMetrics[allMetrics.length - 1]?.timestamp ?? new Date())
        : new Date();

    return {
      totalMetrics: allMetrics.length,
      metricNames,
      totalValue,
      averageValue,
      minValue,
      maxValue,
      lastUpdateTime,
    };
  }

  setMetricLabels(labels: Record<string, string>): void {
    this.globalLabels = { ...labels };
    redactedLogger.debug('Global metric labels set', 'UnifiedMetricsService', {
      labels,
    });
  }

  getMetricHistory(name: string): Metric[] {
    return this.metrics.get(name) ?? [];
  }

  deleteMetric(name: string): boolean {
    const deleted = this.metrics.delete(name);
    if (deleted) {
      redactedLogger.debug(`Metric deleted: ${name}`, 'UnifiedMetricsService');
    }
    return deleted;
  }

  getMetricsByLabel(labelKey: string, labelValue: string): Metric[] {
    const matchingMetrics: Metric[] = [];

    for (const metrics of this.metrics.values()) {
      for (const metric of metrics) {
        if (metric.labels && metric.labels[labelKey] === labelValue) {
          matchingMetrics.push(metric);
        }
      }
    }

    return matchingMetrics;
  }
}

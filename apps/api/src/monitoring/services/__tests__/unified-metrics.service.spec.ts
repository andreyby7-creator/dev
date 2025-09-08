import { UnifiedMetricsService } from '../unified-metrics.service';

describe('UnifiedMetricsService', () => {
  let service: UnifiedMetricsService;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Сохраняем оригинальные переменные окружения
    originalEnv = { ...process.env };

    // Устанавливаем тестовые переменные окружения
    process.env.METRICS_ENABLED = 'true';
    process.env.METRICS_PROVIDER = 'prometheus';
    process.env.METRICS_ENDPOINT = 'http://localhost:9090';
    process.env.METRICS_INTERVAL = '60';
    process.env.NODE_ENV = 'test';
    process.env.APP_VERSION = '1.0.0';

    service = new UnifiedMetricsService();
  });

  afterEach(() => {
    // Восстанавливаем оригинальные переменные окружения
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should initialize with default configuration when environment variables are not set', () => {
      // Сбрасываем переменные окружения
      delete process.env.METRICS_ENABLED;
      delete process.env.METRICS_PROVIDER;
      delete process.env.METRICS_ENDPOINT;
      delete process.env.METRICS_INTERVAL;
      delete process.env.NODE_ENV;
      delete process.env.APP_VERSION;

      const newService = new UnifiedMetricsService();

      // Проверяем, что сервис создался с дефолтными значениями
      expect(newService).toBeDefined();
    });

    it('should initialize with custom configuration from environment variables', () => {
      expect(service).toBeDefined();

      // Проверяем, что сервис создался с нашими переменными окружения
      // (приватные поля недоступны, но сервис должен работать)
    });
  });

  describe('recordMetric', () => {
    it('should record metric when metrics are enabled', () => {
      const metricName = 'test_metric';
      const metricValue = 42;
      const labels = { service: 'test-service' };

      service.recordMetric(metricName, metricValue, labels);

      // Проверяем, что метрика записана (через публичные методы)
      const allMetrics = service.getAllMetrics();
      const foundMetric = allMetrics.find(m => m.name === metricName);

      expect(foundMetric).toBeDefined();
      expect(foundMetric?.value).toBe(metricValue);
      expect(foundMetric?.labels).toEqual(expect.objectContaining(labels));
    });

    it('should not record metric when metrics are disabled', () => {
      // Отключаем метрики
      delete process.env.METRICS_ENABLED;
      const disabledService = new UnifiedMetricsService();

      const metricName = 'test_metric';
      const metricValue = 42;

      disabledService.recordMetric(metricName, metricValue);

      const allMetrics = disabledService.getAllMetrics();
      expect(allMetrics).toHaveLength(0);
    });
  });

  describe('incrementCounter', () => {
    it('should increment existing counter', () => {
      const counterName = 'test_counter';

      // Сначала записываем счетчик
      service.recordMetric(counterName, 5);

      // Затем инкрементируем
      service.incrementCounter(counterName);

      // Проверяем, что метрика инкрементирована
      const metrics = service.getMetrics(counterName);
      expect(metrics).toHaveLength(1);
      expect(metrics[0]?.value).toBe(6); // 5 + 1 = 6

      // Проверяем через getAllMetrics - ищем последнюю метрику
      const allMetrics = service.getAllMetrics();
      const foundMetrics = allMetrics.filter(m => m.name === counterName);
      const lastMetric = foundMetrics[foundMetrics.length - 1]; // Берем последнюю метрику
      expect(lastMetric?.value).toBe(6);
    });

    it('should create new counter if it does not exist', () => {
      const counterName = 'new_counter';

      service.incrementCounter(counterName);

      const allMetrics = service.getAllMetrics();
      const foundMetric = allMetrics.find(m => m.name === counterName);

      expect(foundMetric).toBeDefined();
      expect(foundMetric?.value).toBe(1);
    });
  });

  describe('measureExecutionTime', () => {
    it('should measure execution time of async function', async () => {
      const metricName = 'execution_time';

      const result = await service.measureExecutionTime(
        metricName,
        async () => {
          // Имитируем асинхронную операцию
          await new Promise(resolve => setTimeout(resolve, 10));
          return 'test-result';
        }
      );

      expect(result).toBe('test-result');

      const allMetrics = service.getAllMetrics();
      const foundMetric = allMetrics.find(m => m.name === metricName);

      expect(foundMetric).toBeDefined();
      expect(foundMetric?.value).toBeGreaterThan(0);
    });

    it('should measure execution time of sync function', () => {
      const metricName = 'sync_execution_time';

      const result = service.measureExecutionTime(metricName, () => {
        // Имитируем синхронную операцию
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return sum;
      });

      expect(result).toBe(499500);

      const allMetrics = service.getAllMetrics();
      const foundMetric = allMetrics.find(m => m.name === metricName);

      expect(foundMetric).toBeDefined();
      expect(foundMetric?.value).toBeGreaterThan(0);
    });
  });

  describe('getMetrics', () => {
    it('should return metrics for specific name', () => {
      const metricName = 'test_metric';
      service.recordMetric(metricName, 10);
      service.recordMetric(metricName, 20); // Перезапишет предыдущую

      const metrics = service.getMetrics(metricName);

      expect(metrics).toHaveLength(1);
      expect(metrics[0]?.name).toBe(metricName);
      expect(metrics[0]?.value).toBe(20);
    });

    it('should return empty array for non-existent metric name', () => {
      const metrics = service.getMetrics('non_existent_metric');

      expect(metrics).toEqual([]);
    });
  });

  describe('getAllMetrics', () => {
    it('should return all recorded metrics', () => {
      service.recordMetric('metric1', 10);
      service.recordMetric('metric2', 20);
      service.recordMetric('metric3', 30);

      const allMetrics = service.getAllMetrics();

      expect(allMetrics).toHaveLength(3);
      expect(allMetrics.map(m => m.name)).toEqual([
        'metric1',
        'metric2',
        'metric3',
      ]);
      expect(allMetrics.map(m => m.value)).toEqual([10, 20, 30]);
    });

    it('should return empty array when no metrics recorded', () => {
      const allMetrics = service.getAllMetrics();

      expect(allMetrics).toEqual([]);
    });
  });

  describe('clearMetrics', () => {
    it('should clear all metrics', () => {
      service.recordMetric('metric1', 10);
      service.recordMetric('metric2', 20);

      expect(service.getAllMetrics()).toHaveLength(2);

      service.clearMetrics();

      expect(service.getAllMetrics()).toHaveLength(0);
    });
  });

  describe('exportMetrics', () => {
    it('should export metrics in Prometheus format', () => {
      service.recordMetric('test_counter', 42, { service: 'test' });
      service.recordMetric('test_gauge', 3.14, { service: 'test' });

      const prometheusFormat = service.exportMetrics('prometheus');

      expect(prometheusFormat).toContain('test_counter');
      expect(prometheusFormat).toContain('test_gauge');
      expect(prometheusFormat).toContain('42');
      expect(prometheusFormat).toContain('3.14');
      expect(prometheusFormat).toContain('service="test"');
    });

    it('should export metrics in OpenTelemetry format', () => {
      service.recordMetric('test_metric', 100, { service: 'test' });

      const otelFormat = service.exportMetrics('opentelemetry');

      expect(otelFormat).toContain('test_metric');
      expect(otelFormat).toContain('100');
      expect(otelFormat).toContain('service');
    });

    it('should export metrics in custom format', () => {
      service.recordMetric('test_metric', 50, { service: 'test' });

      const customFormat = service.exportMetrics('custom');

      expect(customFormat).toContain('test_metric');
      expect(customFormat).toContain('50');
    });
  });

  describe('getMetricsSummary', () => {
    it('should return summary of all metrics', () => {
      service.recordMetric('counter1', 10);
      service.recordMetric('counter2', 20);
      service.recordMetric('gauge1', 5.5);

      const summary = service.getMetricsSummary();

      expect(summary.totalMetrics).toBe(3);
      expect(summary.metricNames).toContain('counter1');
      expect(summary.metricNames).toContain('counter2');
      expect(summary.metricNames).toContain('gauge1');
      expect(summary.lastUpdateTime).toBeInstanceOf(Date);
    });
  });

  describe('setMetricLabels', () => {
    it('should set global labels for all metrics', () => {
      const globalLabels = { environment: 'production', region: 'eu-west' };

      service.setMetricLabels(globalLabels);

      service.recordMetric('test_metric', 100);

      const allMetrics = service.getAllMetrics();
      const foundMetric = allMetrics.find(m => m.name === 'test_metric');

      expect(foundMetric?.labels).toEqual(
        expect.objectContaining(globalLabels)
      );
    });
  });

  describe('getMetricHistory', () => {
    it('should return metric history for specific name', () => {
      const metricName = 'historical_metric';

      service.recordMetric(metricName, 10);
      service.recordMetric(metricName, 20);
      service.recordMetric(metricName, 30);

      const history = service.getMetricHistory(metricName);

      expect(history).toHaveLength(3);
      expect(history.map(m => m.value)).toEqual([10, 20, 30]);
    });

    it('should return empty array for non-existent metric', () => {
      const history = service.getMetricHistory('non_existent');

      expect(history).toEqual([]);
    });
  });

  describe('deleteMetric', () => {
    it('should delete specific metric', () => {
      service.recordMetric('metric_to_delete', 100);
      service.recordMetric('metric_to_keep', 200);

      expect(service.getAllMetrics()).toHaveLength(2);

      service.deleteMetric('metric_to_delete');

      const allMetrics = service.getAllMetrics();
      expect(allMetrics).toHaveLength(1);
      expect(allMetrics[0]?.name).toBe('metric_to_keep');
    });

    it('should return false when deleting non-existent metric', () => {
      const deleted = service.deleteMetric('non_existent');

      expect(deleted).toBe(false);
    });
  });

  describe('getMetricsByLabel', () => {
    it('should return metrics matching specific label', () => {
      service.recordMetric('metric1', 10, { service: 'api' });
      service.recordMetric('metric2', 20, { service: 'web' });
      service.recordMetric('metric3', 30, { service: 'api' });

      const apiMetrics = service.getMetricsByLabel('service', 'api');

      expect(apiMetrics).toHaveLength(2);
      expect(apiMetrics.map(m => m.name)).toEqual(['metric1', 'metric3']);
    });

    it('should return empty array when no metrics match label', () => {
      service.recordMetric('metric1', 10, { service: 'api' });

      const webMetrics = service.getMetricsByLabel('service', 'web');

      expect(webMetrics).toEqual([]);
    });
  });
});

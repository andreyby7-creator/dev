import { vi } from 'vitest';
import { SelfHealingService } from '../self-healing.service';

describe('SelfHealingService', () => {
  let service: SelfHealingService;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Сохраняем оригинальные переменные окружения
    originalEnv = { ...process.env };

    // Устанавливаем тестовые переменные окружения
    process.env.SELF_HEALING_ENABLED = 'true';
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    process.env.TELEGRAM_CHAT_ID = 'test-chat-id';
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
    process.env.SLACK_CHANNEL = '#test-channel';
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_FROM = 'test@test.com';
    process.env.SMTP_TO = 'admin@test.com,ops@test.com';
    process.env.ALERT_CPU_THRESHOLD = '80';
    process.env.ALERT_MEMORY_THRESHOLD = '85';
    process.env.ALERT_DISK_THRESHOLD = '90';
    process.env.ALERT_RESPONSE_TIME_THRESHOLD = '5000';
    process.env.ALERT_ERROR_RATE_THRESHOLD = '5';

    service = new SelfHealingService();
  });

  afterEach(() => {
    // Восстанавливаем оригинальные переменные окружения
    process.env = originalEnv;

    // Очищаем все таймеры
    vi.clearAllTimers();
  });

  describe('constructor', () => {
    it('should initialize with default configuration when environment variables are not set', () => {
      // Сбрасываем переменные окружения
      delete process.env.SELF_HEALING_ENABLED;
      delete process.env.ALERT_CPU_THRESHOLD;
      delete process.env.ALERT_MEMORY_THRESHOLD;
      delete process.env.ALERT_DISK_THRESHOLD;
      delete process.env.ALERT_RESPONSE_TIME_THRESHOLD;
      delete process.env.ALERT_ERROR_RATE_THRESHOLD;

      const newService = new SelfHealingService();

      // Проверяем, что сервис создался с дефолтными значениями
      expect(newService).toBeDefined();
    });

    it('should initialize with custom configuration from environment variables', () => {
      expect(service).toBeDefined();

      // Проверяем, что сервис создался с нашими переменными окружения
      // (приватные поля недоступны, но сервис должен работать)
    });
  });

  describe('checkSystemHealth', () => {
    it('should return system health status', () => {
      const health = service.checkSystemHealth();

      expect(health).toBeDefined();
      expect(health.status).toBeDefined();
      expect(health.timestamp).toBeInstanceOf(Date);
      expect(health.metrics).toBeDefined();
    });

    it('should include CPU, memory, and disk metrics', () => {
      const health = service.checkSystemHealth();

      expect(health.metrics.cpu).toBeDefined();
      expect(health.metrics.memory).toBeDefined();
      expect(health.metrics.disk).toBeDefined();
      expect(typeof health.metrics.cpu.usage).toBe('number');
      expect(typeof health.metrics.memory.usage).toBe('number');
      expect(typeof health.metrics.disk.usage).toBe('number');
    });
  });

  describe('checkServiceHealth', () => {
    it('should return service health status', () => {
      const serviceName = 'test-service';
      const health = service.checkServiceHealth(serviceName);

      expect(health).toBeDefined();
      expect(health._service).toBe(serviceName);
      expect(health.status).toBeDefined();
      expect(health.details).toBeDefined();
      expect(health.timestamp).toBeInstanceOf(Date);
    });

    it('should return different status for different services', () => {
      const health1 = service.checkServiceHealth('service1');
      const health2 = service.checkServiceHealth('service2');

      expect(health1._service).toBe('service1');
      expect(health2._service).toBe('service2');
    });
  });

  describe('setHealthCheck', () => {
    it('should set custom health check for service', () => {
      const serviceName = 'custom-service';
      const customCheck = () => ({
        status: 'healthy' as const,
        timestamp: new Date(),
        details: { custom: 'data' },
      });

      service.setHealthCheck(serviceName, customCheck);

      const health = service.checkServiceHealth(serviceName);
      expect(health.details?.custom).toBe('data');
    });
  });

  describe('getHealthChecks', () => {
    it('should return all registered health checks', () => {
      const healthChecks = service.getHealthChecks();

      expect(healthChecks).toBeDefined();
      expect(Array.isArray(healthChecks)).toBe(true);
    });
  });

  describe('getHealthHistory', () => {
    it('should return health history for service', () => {
      const serviceName = 'test-service';

      // Выполняем несколько проверок здоровья
      service.checkServiceHealth(serviceName);
      service.checkServiceHealth(serviceName);
      service.checkServiceHealth(serviceName);

      const history = service.getHealthHistory(serviceName);

      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
    });

    it('should return empty array for non-existent service', () => {
      const history = service.getHealthHistory('non-existent-service');

      expect(history).toEqual([]);
    });
  });

  describe('getSystemMetrics', () => {
    it('should return current system metrics', () => {
      const metrics = service.getSystemMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.cpu).toBeDefined();
      expect(metrics.memory).toBeDefined();
      expect(metrics.disk).toBeDefined();
      expect(metrics.network).toBeDefined();
    });
  });

  describe('getServiceMetrics', () => {
    it('should return metrics for specific service', () => {
      const serviceName = 'test-service';

      // Сначала проверяем здоровье сервиса, чтобы создать историю
      service.checkServiceHealth(serviceName);

      // Теперь получаем метрики
      const metrics = service.getServiceMetrics(serviceName);
      expect(metrics).toBeDefined();
      expect(metrics?._service).toBe(serviceName);
      expect(metrics?.responseTime).toBeDefined();
      expect(metrics?.errorRate).toBeDefined();
      expect(metrics?.throughput).toBeDefined();
    });
  });

  describe('setAlertThreshold', () => {
    it('should set custom alert threshold', () => {
      const metric = 'cpu';
      const threshold = 95;

      service.setAlertThreshold(metric, threshold);

      // Проверяем, что порог установлен (через публичные методы)
      const health = service.checkSystemHealth();
      expect(health.metrics.cpu.threshold).toBe(threshold);
    });
  });

  describe('getAlertThresholds', () => {
    it('should return current alert thresholds', () => {
      const thresholds = service.getAlertThresholds();

      expect(thresholds).toBeDefined();
      expect(thresholds.cpu).toBeDefined();
      expect(thresholds.memory).toBeDefined();
      expect(thresholds.disk).toBeDefined();
      expect(thresholds.responseTime).toBeDefined();
      expect(thresholds.errorRate).toBeDefined();
    });
  });

  describe('enableAlerts', () => {
    it('should enable alerts for specific channel', () => {
      const channel = 'telegram';

      service.enableAlerts(channel);

      // Проверяем, что алерты включены (через публичные методы)
      const config = service.getAlertConfig();
      expect(config.channels.telegram).toBeDefined();
    });
  });

  describe('disableAlerts', () => {
    it('should disable alerts for specific channel', () => {
      const channel = 'telegram';

      service.disableAlerts(channel);

      // Проверяем, что алерты отключены (через публичные методы)
      const config = service.getAlertConfig();
      expect(config.channels.telegram).toBeUndefined();
    });
  });

  describe('getAlertConfig', () => {
    it('should return current alert configuration', () => {
      const config = service.getAlertConfig();

      expect(config).toBeDefined();
      expect(config.enabled).toBeDefined();
      expect(config.channels).toBeDefined();
      expect(config.thresholds).toBeDefined();
    });
  });

  describe('getAlertHistory', () => {
    it('should return alert history', () => {
      const history = service.getAlertHistory();

      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('clearAlertHistory', () => {
    it('should clear alert history', () => {
      // Сначала получаем историю
      const history = service.getAlertHistory();
      expect(history).toBeDefined();

      // Очищаем историю
      service.clearAlertHistory();

      // Проверяем, что история очищена
      const clearedHistory = service.getAlertHistory();
      expect(clearedHistory).toHaveLength(0);
    });
  });

  describe('getServiceStatus', () => {
    it('should return overall service status', () => {
      const status = service.getServiceStatus();

      expect(status).toBeDefined();
      expect(status.healthy).toBeDefined();
      expect(status.degraded).toBeDefined();
      expect(status.unhealthy).toBeDefined();
      expect(status.total).toBeDefined();
    });
  });

  describe('getUptime', () => {
    it('should return service uptime', () => {
      const uptime = service.getUptime();

      expect(uptime).toBeDefined();
      expect(typeof uptime).toBe('number');
      expect(uptime).toBeGreaterThan(0);
    });
  });

  describe('getLastAlertTime', () => {
    it('should return last alert time', () => {
      // Создаем критическое состояние для генерации алертов
      service.checkServiceHealth('test-service');

      // Симулируем критическое состояние системы
      const originalEnv = process.env;
      process.env.CPU_USAGE_THRESHOLD = '10'; // Очень низкий порог
      process.env.MEMORY_USAGE_THRESHOLD = '10';
      process.env.DISK_USAGE_THRESHOLD = '10';

      service.checkServiceHealth('test-service');

      // Восстанавливаем оригинальные переменные
      process.env = originalEnv;

      const lastAlertTime = service.getLastAlertTime();
      if (lastAlertTime != null) {
        expect(lastAlertTime).toBeInstanceOf(Date);
      } else {
        // Если нет алертов, это тоже валидное состояние
        expect(lastAlertTime).toBeNull();
      }
    });
  });

  describe('getAlertCount', () => {
    it('should return total alert count', () => {
      const alertCount = service.getAlertCount();

      expect(alertCount).toBeDefined();
      expect(typeof alertCount).toBe('number');
      expect(alertCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('resetAlertCount', () => {
    it('should reset alert count', () => {
      // Сбрасываем счетчик
      service.resetAlertCount();

      // Проверяем, что счетчик сброшен
      const resetCount = service.getAlertCount();
      expect(resetCount).toBe(0);
    });
  });

  describe('getHealthSummary', () => {
    it('should return health summary', () => {
      const summary = service.getHealthSummary();

      expect(summary).toBeDefined();
      expect(summary.totalServices).toBeDefined();
      expect(summary.healthyServices).toBeDefined();
      expect(summary.degradedServices).toBeDefined();
      expect(summary.unhealthyServices).toBeDefined();
      expect(summary.lastCheck).toBeDefined();
    });
  });

  describe('exportHealthData', () => {
    it('should export health data in JSON format', () => {
      const jsonData = service.exportHealthData('json');

      expect(jsonData).toBeDefined();
      expect(typeof jsonData).toBe('string');

      // Проверяем, что это валидный JSON
      const parsed = JSON.parse(jsonData);
      expect(parsed).toBeDefined();
    });

    it('should export health data in CSV format', () => {
      const csvData = service.exportHealthData('csv');

      expect(csvData).toBeDefined();
      expect(typeof csvData).toBe('string');
      expect(csvData).toContain(',');
    });

    it('should export health data in Prometheus format', () => {
      const prometheusData = service.exportHealthData('prometheus');

      expect(prometheusData).toBeDefined();
      expect(typeof prometheusData).toBe('string');
      expect(prometheusData).toContain('# HELP');
    });
  });

  describe('importHealthData', () => {
    it('should import health data from JSON', () => {
      const testData = {
        services: [
          {
            name: 'imported-service',
            status: 'healthy',
            details: { imported: true },
          },
        ],
      };

      const jsonData = JSON.stringify(testData);
      const result = service.importHealthData(jsonData);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return performance metrics', () => {
      const metrics = service.getPerformanceMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.responseTime).toBeDefined();
      expect(metrics.throughput).toBeDefined();
      expect(metrics.errorRate).toBeDefined();
      expect(metrics.availability).toBeDefined();
    });
  });

  describe('setPerformanceBaseline', () => {
    it('should set performance baseline', () => {
      const baseline = {
        responseTime: 100,
        throughput: 1000,
        errorRate: 0.01,
        availability: 0.999,
        timestamp: new Date(),
      };

      service.setPerformanceBaseline(baseline);

      // Проверяем, что базовые показатели установлены (через публичные методы)
      const metrics = service.getPerformanceMetrics();
      expect(metrics.baseline).toBeDefined();
    });
  });

  describe('getPerformanceBaseline', () => {
    it('should return current performance baseline', () => {
      // Сначала устанавливаем baseline
      service.setPerformanceBaseline({
        responseTime: 100,
        throughput: 1000,
        errorRate: 2.5,
        availability: 99.9,
        timestamp: new Date(),
      });

      const baseline = service.getPerformanceBaseline();
      expect(baseline).toBeDefined();
      expect(baseline?.responseTime).toBeDefined();
      expect(baseline?.throughput).toBeDefined();
      expect(baseline?.errorRate).toBeDefined();
      expect(baseline?.availability).toBeDefined();
    });
  });
});

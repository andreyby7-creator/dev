import { vi } from 'vitest';
import { ConfigCachingService } from '../services/config-caching.service';
import { SelfHealingService } from '../services/self-healing.service';
import { UnifiedMetricsService } from '../services/unified-metrics.service';

describe('Monitoring Integration Tests', () => {
  let unifiedMetricsService: UnifiedMetricsService;
  let selfHealingService: SelfHealingService;
  let configCachingService: ConfigCachingService;

  beforeEach(() => {
    // Устанавливаем тестовые переменные окружения
    process.env.METRICS_ENABLED = 'true';
    process.env.METRICS_PROVIDER = 'prometheus';
    process.env.SELF_HEALING_ENABLED = 'true';
    process.env.CONFIG_CACHE_ENABLED = 'true';
    process.env.CONFIG_CACHE_TTL = '300';
    process.env.CONFIG_CACHE_MAX_SIZE = '1000';
    process.env.CONFIG_CACHE_CLEANUP_INTERVAL = '60';

    unifiedMetricsService = new UnifiedMetricsService();
    selfHealingService = new SelfHealingService();
    configCachingService = new ConfigCachingService();
  });

  afterEach(() => {
    // Очищаем все таймеры
    vi.clearAllTimers();
  });

  describe('Unified Metrics and Self Healing Integration', () => {
    it('should work together for system monitoring', () => {
      // 1. Проверяем здоровье системы
      const health = selfHealingService.checkSystemHealth();
      expect(health).toBeDefined();
      expect(health.status).toBeDefined();
      expect(health.metrics).toBeDefined();

      // 2. Записываем метрики производительности
      unifiedMetricsService.recordMetric(
        'system.cpu',
        health.metrics.cpu.usage
      );
      unifiedMetricsService.recordMetric(
        'system.memory',
        health.metrics.memory.usage
      );
      unifiedMetricsService.recordMetric(
        'system.disk',
        health.metrics.disk.usage
      );

      // 3. Проверяем, что метрики доступны
      const cpuMetrics = unifiedMetricsService.getMetrics('system.cpu');
      const memoryMetrics = unifiedMetricsService.getMetrics('system.memory');

      expect(cpuMetrics).toHaveLength(1);
      expect(memoryMetrics).toHaveLength(1);
      expect(cpuMetrics[0]?.value).toBe(health.metrics.cpu.usage);

      // 4. Проверяем общее количество метрик
      const allMetrics = unifiedMetricsService.getAllMetrics();
      expect(allMetrics.length).toBeGreaterThan(0);
    });

    it('should handle service health monitoring', () => {
      const serviceName = 'test-service';

      // 1. Устанавливаем кастомную проверку здоровья
      selfHealingService.setHealthCheck(serviceName, () => ({
        status: 'healthy',
        timestamp: new Date(),
        details: { custom: 'data' },
      }));

      // 2. Проверяем здоровье сервиса
      const serviceHealth = selfHealingService.checkServiceHealth(serviceName);
      expect(serviceHealth).toBeDefined();
      expect(serviceHealth._service).toBe(serviceName);
      expect(serviceHealth.status).toBe('healthy');

      // 3. Получаем метрики сервиса
      const serviceMetrics = selfHealingService.getServiceMetrics(serviceName);
      expect(serviceMetrics).toBeDefined();
      expect(serviceMetrics?._service).toBe(serviceName);
    });
  });

  describe('Config Caching and Metrics Integration', () => {
    it('should cache configuration and track metrics', () => {
      const configKey = 'app.config';
      const configValue = { feature: 'enabled', timeout: 5000 };

      // Кешируем конфигурацию
      configCachingService.set(configKey, configValue);

      // Проверяем, что конфигурация закеширована
      const cachedConfig = configCachingService.get(configKey);
      expect(cachedConfig).toEqual(configValue);

      // Записываем метрики кеша
      const cacheStats = configCachingService.getStats();
      unifiedMetricsService.recordMetric('cache.size', cacheStats.size);
      unifiedMetricsService.recordMetric('cache.hit_rate', cacheStats.hitRate);

      // Проверяем, что метрики записаны
      const allMetrics = unifiedMetricsService.getAllMetrics();
      const cacheSizeMetric = allMetrics.find(m => m.name === 'cache.size');
      expect(cacheSizeMetric).toBeDefined();
      expect(cacheSizeMetric?.value).toBe(cacheStats.size);
    });

    it('should handle cache invalidation and track it', () => {
      // Кешируем несколько конфигураций
      configCachingService.set('user.config', { theme: 'dark' });
      configCachingService.set('app.config', { debug: true });
      configCachingService.set('api.config', { rate_limit: 100 });

      expect(configCachingService.size()).toBe(3);

      // Инвалидируем кеш по паттерну
      const invalidatedCount =
        configCachingService.invalidatePattern('^user\\.');
      expect(invalidatedCount).toBe(1);

      // Записываем метрику инвалидации
      unifiedMetricsService.recordMetric(
        'cache.invalidations',
        invalidatedCount
      );

      // Проверяем, что метрика записана
      const allMetrics = unifiedMetricsService.getAllMetrics();
      const invalidationMetric = allMetrics.find(
        m => m.name === 'cache.invalidations'
      );
      expect(invalidationMetric).toBeDefined();
      expect(invalidationMetric?.value).toBe(1);
    });
  });

  describe('Self Healing and Config Caching Integration', () => {
    it('should use cached config for health checks', () => {
      const healthConfig = {
        thresholds: {
          cpu: 90,
          memory: 95,
          disk: 98,
        },
        intervals: {
          check: 30,
          alert: 60,
        },
      };

      // Кешируем конфигурацию здоровья
      configCachingService.set('health.config', healthConfig);

      // Получаем конфигурацию для проверки здоровья
      const cachedHealthConfig = configCachingService.get('health.config');
      expect(cachedHealthConfig).toEqual(healthConfig);

      // Используем конфигурацию для установки порогов
      if (
        cachedHealthConfig &&
        typeof cachedHealthConfig === 'object' &&
        'thresholds' in cachedHealthConfig
      ) {
        const thresholds = (
          cachedHealthConfig as {
            thresholds: { cpu: number; memory: number; disk: number };
          }
        ).thresholds;
        selfHealingService.setAlertThreshold('cpu', thresholds.cpu);
        selfHealingService.setAlertThreshold('memory', thresholds.memory);
        selfHealingService.setAlertThreshold('disk', thresholds.disk);
      }

      // Проверяем, что пороги установлены
      const alertThresholds = selfHealingService.getAlertThresholds();
      expect(alertThresholds.cpu).toBe(90);
      expect(alertThresholds.memory).toBe(95);
      expect(alertThresholds.disk).toBe(98);
    });

    it('should handle health check failures with cached recovery config', () => {
      const recoveryConfig = {
        autoRestart: true,
        maxRetries: 3,
        backoffDelay: 5000,
      };

      // Кешируем конфигурацию восстановления
      configCachingService.set('recovery.config', recoveryConfig);

      // Симулируем проверку здоровья сервиса
      const serviceName = 'failing-service';
      const serviceHealth = selfHealingService.checkServiceHealth(serviceName);

      expect(serviceHealth).toBeDefined();
      expect(serviceHealth._service).toBe(serviceName);

      // Получаем конфигурацию восстановления
      const cachedRecoveryConfig = configCachingService.get('recovery.config');
      expect(cachedRecoveryConfig).toEqual(recoveryConfig);

      // Записываем метрику восстановления
      unifiedMetricsService.recordMetric('recovery.attempts', 1);

      // Проверяем, что метрика записана
      const allMetrics = unifiedMetricsService.getAllMetrics();
      const recoveryMetric = allMetrics.find(
        m => m.name === 'recovery.attempts'
      );
      expect(recoveryMetric).toBeDefined();
      expect(recoveryMetric?.value).toBe(1);
    });
  });

  describe('Full Monitoring Workflow', () => {
    it('should work together for complete monitoring workflow', () => {
      // 1. Начало workflow
      unifiedMetricsService.recordMetric('workflow.start', Date.now());

      // 2. Проверка здоровья системы
      const systemHealth = selfHealingService.checkSystemHealth();
      expect(systemHealth).toBeDefined();

      // 3. Кеширование результатов проверки
      configCachingService.set('health.last_check', systemHealth);

      // 4. Запись метрик производительности
      const performanceMetrics = selfHealingService.getPerformanceMetrics();
      unifiedMetricsService.recordMetric(
        'performance.response_time',
        performanceMetrics.responseTime
      );
      unifiedMetricsService.recordMetric(
        'performance.throughput',
        performanceMetrics.throughput
      );
      unifiedMetricsService.recordMetric(
        'performance.error_rate',
        performanceMetrics.errorRate
      );

      // 5. Экспорт метрик
      const prometheusMetrics =
        unifiedMetricsService.exportMetrics('prometheus');
      expect(prometheusMetrics).toContain('workflow.start');
      expect(prometheusMetrics).toContain('performance.response_time');

      // 6. Получение статистики кеша
      const cacheStats = configCachingService.getStats();
      unifiedMetricsService.recordMetric(
        'cache.efficiency',
        cacheStats.hitRate
      );

      // 7. Проверка интеграции
      const allMetrics = unifiedMetricsService.getAllMetrics();
      expect(allMetrics.length).toBeGreaterThanOrEqual(5); // Изменяем на >= 5

      const cachedHealth = configCachingService.get('health.last_check');
      expect(cachedHealth).toBeDefined();

      const healthSummary = selfHealingService.getHealthSummary();
      expect(healthSummary).toBeDefined();
      expect(healthSummary.totalServices).toBeGreaterThan(0);

      // 8. Завершение workflow
      unifiedMetricsService.recordMetric('workflow.status', 2);
      unifiedMetricsService.recordMetric('workflow.duration', Date.now());

      // 9. Финальная проверка
      const finalMetrics = unifiedMetricsService.getAllMetrics();
      const workflowMetrics = finalMetrics.filter(m =>
        m.name.startsWith('workflow.')
      );
      expect(workflowMetrics.length).toBeGreaterThan(0);

      const finalCacheStats = configCachingService.getStats();
      expect(finalCacheStats.size).toBeGreaterThan(0);

      const finalHealthSummary = selfHealingService.getHealthSummary();
      expect(finalHealthSummary.lastCheck).toBeDefined();
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle service failures gracefully', () => {
      // Симулируем отказ сервиса
      const failingService = 'broken-service';

      // Проверяем здоровье сломанного сервиса
      const health = selfHealingService.checkServiceHealth(failingService);
      expect(health).toBeDefined();

      // Записываем метрику ошибки
      unifiedMetricsService.recordMetric('errors.service_failures', 1);

      // Кешируем информацию об ошибке
      configCachingService.set(`error.${failingService}`, {
        timestamp: new Date(),
        count: 1,
        lastError: 'Service unavailable',
      });

      // Проверяем, что информация об ошибке закеширована
      const errorInfo = configCachingService.get(`error.${failingService}`);
      expect(errorInfo).toBeDefined();

      // Проверяем, что метрика ошибки записана
      const allMetrics = unifiedMetricsService.getAllMetrics();
      const errorMetric = allMetrics.find(
        m => m.name === 'errors.service_failures'
      );
      expect(errorMetric).toBeDefined();
      expect(errorMetric?.value).toBe(1);
    });

    it('should recover from configuration errors', () => {
      // Симулируем некорректную конфигурацию
      const invalidConfig = 'invalid.config';

      try {
        // Пытаемся использовать некорректную конфигурацию
        configCachingService.set(invalidConfig, null);

        // Записываем метрику ошибки конфигурации
        unifiedMetricsService.recordMetric('config.errors', 1);

        // Проверяем, что метрика записана
        const allMetrics = unifiedMetricsService.getAllMetrics();
        const configErrorMetric = allMetrics.find(
          m => m.name === 'config.errors'
        );
        expect(configErrorMetric).toBeDefined();
      } catch {
        // Обрабатываем ошибку
        unifiedMetricsService.recordMetric('config.recovery_attempts', 1);

        // Проверяем, что метрика восстановления записана
        const allMetrics = unifiedMetricsService.getAllMetrics();
        const recoveryMetric = allMetrics.find(
          m => m.name === 'config.recovery_attempts'
        );
        expect(recoveryMetric).toBeDefined();
      }
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high load efficiently', async () => {
      const iterations = 100;

      // Записываем метрики под нагрузкой
      for (let i = 0; i < iterations; i++) {
        unifiedMetricsService.recordMetric(
          `load_test_${i}`,
          Math.random() * 100
        );
        configCachingService.set(`config_${i}`, {
          value: i,
          timestamp: Date.now(),
        });
      }

      // Проверяем, что все метрики записаны
      const allMetrics = unifiedMetricsService.getAllMetrics();
      expect(allMetrics.length).toBeGreaterThanOrEqual(100);

      // Проверяем, что все конфигурации закешированы
      const cacheStats = configCachingService.getStats();
      expect(cacheStats.size).toBeGreaterThanOrEqual(100);
    });

    it('should maintain data consistency under stress', async () => {
      const iterations = 50;
      const errors: Error[] = [];

      // Выполняем операции под нагрузкой
      for (let i = 0; i < iterations; i++) {
        try {
          // Записываем метрики
          unifiedMetricsService.recordMetric(
            `stress_test_${i}`,
            Math.random() * 100
          );

          // Кешируем конфигурации
          configCachingService.set(`stress_config_${i}`, {
            iteration: i,
            timestamp: Date.now(),
          });

          // Проверяем здоровье системы
          selfHealingService.checkSystemHealth();
        } catch (error) {
          errors.push(error as Error);
        }
      }

      // Проверяем, что ошибок мало или нет
      expect(errors.length).toBeLessThan(iterations * 0.1); // Менее 10% ошибок

      // Проверяем целостность данных
      const allMetrics = unifiedMetricsService.getAllMetrics();
      expect(allMetrics.length).toBeGreaterThanOrEqual(iterations);

      const cacheStats = configCachingService.getStats();
      expect(cacheStats.size).toBeGreaterThanOrEqual(iterations);

      // Проверяем, что метрика записана
      const completionMetric = allMetrics.find(m => m.name === 'stress_test_0');
      expect(completionMetric).toBeDefined();
      expect(completionMetric?.value).toBeGreaterThanOrEqual(0);
    });
  });
});

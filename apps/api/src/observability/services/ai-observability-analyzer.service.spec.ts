import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { AIObservabilityAnalyzerService } from './ai-observability-analyzer.service';
import { LoggingService } from './logging.service';
import { MetricsService } from './metrics.service';

describe('AIObservabilityAnalyzerService', () => {
  let service: AIObservabilityAnalyzerService;
  let metricsService: {
    getSystemMetrics: ReturnType<typeof vi.fn>;
    getBusinessMetrics: ReturnType<typeof vi.fn>;
    recordMetric: ReturnType<typeof vi.fn>;
  };
  let loggingService: {
    getLogs: ReturnType<typeof vi.fn>;
    recordLog: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    const mockMetricsService = {
      getSystemMetrics: vi.fn().mockResolvedValue({
        cpu: 50,
        memory: 60,
        disk: 40,
      }),
      getBusinessMetrics: vi.fn().mockResolvedValue({
        requests: 100,
        errors: 5,
        responseTime: 200,
      }),
    };

    const mockLoggingService = {
      getLogs: vi
        .fn()
        .mockResolvedValue([
          { message: 'Test log', level: 'info', timestamp: new Date() },
        ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIObservabilityAnalyzerService,
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
        {
          provide: LoggingService,
          useValue: mockLoggingService,
        },
      ],
    }).compile();

    service = module.get<AIObservabilityAnalyzerService>(
      AIObservabilityAnalyzerService
    );
    metricsService = module.get(MetricsService);
    loggingService = module.get(LoggingService);

    // Убеждаемся что сервисы правильно инжектированы
    (
      service as unknown as { metricsService: unknown; loggingService: unknown }
    ).metricsService = metricsService;
    (
      service as unknown as { metricsService: unknown; loggingService: unknown }
    ).loggingService = loggingService;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeLogs', () => {
    it('should analyze logs and return severity analysis', async () => {
      const mockLogs = [
        {
          timestamp: '2024-01-01T10:00:00Z',
          level: 'error',
          message: 'timeout error',
          context: { service: 'SystemMonitor' },
        },
        {
          timestamp: '2024-01-01T11:00:00Z',
          level: 'warn',
          message: 'high usage warning',
          context: { service: 'SystemMonitor' },
        },
        {
          timestamp: '2024-01-01T12:00:00Z',
          level: 'info',
          message: 'info message',
          context: { service: 'SystemMonitor' },
        },
      ];

      loggingService.getLogs.mockResolvedValue(mockLogs);

      const timeRange = {
        start: new Date('2024-01-01T00:00:00Z'),
        end: new Date('2024-01-01T23:59:59Z'),
      };

      const result = await service.analyzeLogs(timeRange);

      expect(result).toHaveLength(3);
      expect(result[0]?.severity).toBe('HIGH'); // timeout error
      expect(result[1]?.severity).toBe('MEDIUM'); // high usage warning
      expect(result[2]?.severity).toBe('LOW'); // info message
      expect(result[0]?.patterns).toContain('TIMEOUT_ERROR');
      expect(result[1]?.patterns).toContain('RESOURCE_USAGE');
    });

    it('should identify critical patterns correctly', async () => {
      const mockLogs = [
        {
          timestamp: '2024-01-01T10:00:00Z',
          level: 'error',
          message: 'Out of memory error',
          context: { service: 'SystemMonitor' },
        },
      ];

      loggingService.getLogs.mockResolvedValue(mockLogs);

      const result = await service.analyzeLogs({
        start: new Date(),
        end: new Date(),
      });

      expect(result[0]?.severity).toBe('CRITICAL');
      expect(result[0]?.patterns).toContain('MEMORY_ISSUE');
    });
  });

  describe('analyzeMetrics', () => {
    it('should analyze metrics and return status analysis', async () => {
      const mockSystemMetrics = {
        cpu: 85,
        memory: 70,
        uptime: 3600,
        activeConnections: 10,
        requestCount: 1000,
        errorRate: 2,
      };

      metricsService.getSystemMetrics.mockResolvedValue(mockSystemMetrics);

      const result = await service.analyzeMetrics();

      expect(result).toHaveLength(4);
      expect(result[0]?.status).toBe('WARNING'); // cpu_usage 85 >= 80 (threshold) = WARNING
      expect(result[1]?.status).toBe('NORMAL'); // memory_usage 70 < 85 (threshold)
      expect(result[2]?.status).toBe('NORMAL'); // error_rate 2 < 5 (threshold)
      expect(result[0]?.impact).toBe('MEDIUM'); // cpu_usage has MEDIUM impact
    });

    it('should calculate trends correctly', async () => {
      const mockSystemMetrics = {
        cpu: 75,
        memory: 80,
        uptime: 3600,
        activeConnections: 10,
        requestCount: 1000,
        errorRate: 2,
      };

      metricsService.getSystemMetrics.mockResolvedValue(mockSystemMetrics);

      const result = await service.analyzeMetrics();

      expect(result[0]?.trend).toBe('STABLE');
      expect(result[1]?.trend).toBe('STABLE');
      expect(result[2]?.trend).toBe('STABLE');
    });
  });

  describe('generateInsights', () => {
    it('should generate performance insights', async () => {
      const mockSystemMetrics = {
        cpu: 85,
        memory: 70,
        uptime: 3600,
        activeConnections: 10,
        requestCount: 1000,
        errorRate: 2,
      };

      const mockLogs = [
        {
          timestamp: '2024-01-01T10:00:00Z',
          level: 'error',
          message: 'Authentication failed',
          context: { service: 'AuthService' },
        },
      ];

      metricsService.getSystemMetrics.mockResolvedValue(mockSystemMetrics);
      loggingService.getLogs.mockResolvedValue(mockLogs);

      const result = await service.generateInsights();

      expect(result.length).toBeGreaterThan(0);
      const performanceInsights = result.filter(
        insight => insight.type === 'PERFORMANCE'
      );
      expect(performanceInsights.length).toBeGreaterThan(0);
      expect(performanceInsights[0]?.severity).toBe('HIGH');
    });

    it('should generate security insights for auth errors', async () => {
      const mockLogs = Array(15)
        .fill(null)
        .map((_, i) => ({
          timestamp: `2024-01-01T10:${i.toString().padStart(2, '0')}:00Z`,
          level: 'error',
          message: 'Authentication failed',
          context: { service: 'AuthService' },
        }));

      metricsService.getSystemMetrics.mockResolvedValue({
        cpu: 0,
        memory: 0,
        uptime: 0,
        activeConnections: 0,
        requestCount: 0,
        errorRate: 0,
      });
      loggingService.getLogs.mockResolvedValue(mockLogs);

      const result = await service.generateInsights();

      const securityInsights = result.filter(
        insight => insight.type === 'SECURITY'
      );
      expect(securityInsights.length).toBeGreaterThan(0);
      expect(securityInsights[0]?.severity).toBe('HIGH');
      expect(securityInsights[0]?.title).toContain('Подозрительная активность');
    });
  });

  describe('getObservabilityReport', () => {
    it('should generate comprehensive observability report', async () => {
      const mockSystemMetrics = {
        cpu: 85,
        memory: 70,
        uptime: 3600,
        activeConnections: 10,
        requestCount: 1000,
        errorRate: 3,
      };

      const mockLogs = [
        {
          timestamp: '2024-01-01T10:00:00Z',
          level: 'error',
          message: 'Database connection timeout',
          context: { service: 'DatabaseService' },
        },
      ];

      metricsService.getSystemMetrics.mockResolvedValue(mockSystemMetrics);
      loggingService.getLogs.mockResolvedValue(mockLogs);

      const result = await service.getObservabilityReport();

      expect(result).toHaveProperty('overallHealth');
      expect(result).toHaveProperty('insights');
      expect(result).toHaveProperty('logAnalysis');
      expect(result).toHaveProperty('metricAnalysis');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('alerts');
      expect(result).toHaveProperty('timestamp');

      expect(typeof result.overallHealth).toBe('number');
      expect(result.overallHealth).toBeGreaterThanOrEqual(0);
      expect(result.overallHealth).toBeLessThanOrEqual(100);
    });

    it('should calculate overall health score correctly', async () => {
      const mockSystemMetrics = {
        cpu: 90,
        memory: 70,
        uptime: 3600,
        activeConnections: 10,
        requestCount: 1000,
        errorRate: 8,
      };

      const mockLogs = [
        {
          timestamp: '2024-01-01T10:00:00Z',
          level: 'error',
          message: 'Out of memory error',
          context: { service: 'SystemMonitor' },
        },
      ];

      metricsService.getSystemMetrics.mockResolvedValue(mockSystemMetrics);
      loggingService.getLogs.mockResolvedValue(mockLogs);

      const result = await service.getObservabilityReport();

      // With critical issues, health score should be low
      expect(result.overallHealth).toBeLessThan(70);
    });
  });

  describe('edge cases', () => {
    it('should handle empty logs gracefully', async () => {
      loggingService.getLogs.mockResolvedValue([]);
      metricsService.getSystemMetrics.mockResolvedValue({
        cpu: 0,
        memory: 0,
        uptime: 0,
        activeConnections: 0,
        requestCount: 0,
        errorRate: 0,
      });

      const result = await service.getObservabilityReport();

      expect(result.logAnalysis).toHaveLength(0);
      expect(result.metricAnalysis).toHaveLength(4); // 4 метрики: cpu, memory, error_rate, response_time
      expect(result.overallHealth).toBe(100); // Perfect health with no issues
    });

    it('should handle service errors gracefully', async () => {
      loggingService.getLogs.mockRejectedValue(
        new Error('Service unavailable')
      );
      metricsService.getSystemMetrics.mockResolvedValue({
        cpu: 0,
        memory: 0,
        uptime: 0,
        activeConnections: 0,
        requestCount: 0,
        errorRate: 0,
      });

      await expect(service.getObservabilityReport()).rejects.toThrow(
        'Service unavailable'
      );
    });

    it('should handle invalid time ranges', async () => {
      const timeRange = {
        start: new Date('invalid-date'),
        end: new Date(),
      };

      loggingService.getLogs.mockResolvedValue([]);

      const result = await service.analyzeLogs(timeRange);

      expect(result).toHaveLength(0);
    });
  });
});

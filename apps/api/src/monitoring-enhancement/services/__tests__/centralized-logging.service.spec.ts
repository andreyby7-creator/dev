import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { CentralizedLoggingService } from '../centralized-logging.service';

describe('CentralizedLoggingService', () => {
  let service: CentralizedLoggingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CentralizedLoggingService],
    }).compile();

    service = module.get<CentralizedLoggingService>(CentralizedLoggingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('centralizeLogs', () => {
    it('should centralize logs successfully', async () => {
      const logData = {
        logs: [
          {
            id: 'log-1',
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Test log message',
            service: 'test-service',
            source: 'test-source',
            metadata: { userId: 'user-123' },
          },
          {
            id: 'log-2',
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'Error log message',
            service: 'test-service',
            source: 'test-source',
            metadata: { error: 'Test error' },
          },
        ],
      };

      const result = await service.centralizeLogs(logData);

      expect(result.success).toBe(true);
      expect(result.logsProcessed).toBe(2);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should handle single log entry', async () => {
      const logData = {
        id: 'log-1',
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Single log message',
        service: 'test-service',
        source: 'test-source',
        metadata: {},
      };

      const result = await service.centralizeLogs(logData);

      expect(result.success).toBe(true);
      expect(result.logsProcessed).toBe(1);
    });

    it('should handle logs with missing optional fields', async () => {
      const logData = {
        message: 'Minimal log message',
        service: 'test-service',
      };

      const result = await service.centralizeLogs(logData);

      expect(result.success).toBe(true);
      expect(result.logsProcessed).toBe(1);
    });

    it('should handle large number of logs', async () => {
      const logs = Array.from({ length: 1000 }, (_, i) => ({
        id: `log-${i}`,
        timestamp: new Date().toISOString(),
        level: i % 2 === 0 ? 'info' : 'error',
        message: `Log message ${i}`,
        service: `service-${i % 5}`,
        source: `source-${i % 3}`,
        metadata: { index: i },
      }));

      const logData = { logs };

      const result = await service.centralizeLogs(logData);

      expect(result.success).toBe(true);
      expect(result.logsProcessed).toBe(1000);
    });
  });

  describe('searchLogs', () => {
    beforeEach(async () => {
      // Add some test logs
      await service.centralizeLogs({
        logs: [
          {
            id: 'log-1',
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'User login successful',
            service: 'auth-service',
            source: 'auth-controller',
            metadata: { userId: 'user-123' },
          },
          {
            id: 'log-2',
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'Database connection failed',
            service: 'database-service',
            source: 'db-connection',
            metadata: { error: 'Connection timeout' },
          },
          {
            id: 'log-3',
            timestamp: new Date().toISOString(),
            level: 'warn',
            message: 'High memory usage detected',
            service: 'monitoring-service',
            source: 'memory-monitor',
            metadata: { usage: 85 },
          },
        ],
      });
    });

    it('should search logs by message content', async () => {
      const result = await service.searchLogs('login');

      expect(result.query).toBe('login');
      expect(result.results).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.timeRange).toBe('7d');
    });

    it('should search logs by service name', async () => {
      const result = await service.searchLogs('auth-service');

      expect(result.query).toBe('auth-service');
      expect(result.results).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should search logs by error level', async () => {
      const result = await service.searchLogs('error');

      expect(result.query).toBe('error');
      expect(result.results).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should return all logs when no query provided', async () => {
      const result = await service.searchLogs();

      expect(result.query).toBe('all');
      expect(result.results).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should return empty results for non-matching query', async () => {
      const result = await service.searchLogs('non-existent-search-term');

      expect(result.query).toBe('non-existent-search-term');
      expect(result.results).toBeDefined();
      expect(result.total).toBe(0);
    });

    it('should be case insensitive', async () => {
      const result1 = await service.searchLogs('LOGIN');
      const result2 = await service.searchLogs('login');

      expect(result1.total).toBe(result2.total);
    });
  });

  describe('getLogStatistics', () => {
    beforeEach(async () => {
      // Add logs with different levels and services
      await service.centralizeLogs({
        logs: [
          { level: 'info', message: 'Info log', service: 'service-1' },
          { level: 'info', message: 'Info log 2', service: 'service-1' },
          { level: 'error', message: 'Error log', service: 'service-2' },
          { level: 'warn', message: 'Warning log', service: 'service-1' },
          { level: 'debug', message: 'Debug log', service: 'service-3' },
        ],
      });
    });

    it('should return log statistics', async () => {
      const result = await service.getLogStatistics('24h');

      expect(result.totalLogs).toBeGreaterThanOrEqual(0);
      expect(result.byLevel).toBeDefined();
      expect(result.byService).toBeDefined();
      expect(result.timeRange).toBe('24h');
    });

    it('should return log statistics for different time ranges', async () => {
      const timeRanges = ['1h', '24h', '7d', '30d'];

      for (const timeRange of timeRanges) {
        const result = await service.getLogStatistics(timeRange);

        expect(result.totalLogs).toBeGreaterThanOrEqual(0);
        expect(result.byLevel).toBeDefined();
        expect(result.byService).toBeDefined();
        expect(result.timeRange).toBe(timeRange);
      }
    });

    it('should aggregate logs by level correctly', async () => {
      const result = await service.getLogStatistics('24h');

      expect(result.byLevel).toBeDefined();
      expect(Array.isArray(result.byLevel)).toBe(true);

      for (const levelStat of result.byLevel) {
        expect(levelStat).toHaveProperty('level');
        expect(levelStat).toHaveProperty('count');
        expect(levelStat).toHaveProperty('percentage');
        expect(levelStat.count).toBeGreaterThanOrEqual(0);
        expect(levelStat.percentage).toBeGreaterThanOrEqual(0);
        expect(levelStat.percentage).toBeLessThanOrEqual(100);
      }
    });

    it('should aggregate logs by service correctly', async () => {
      const result = await service.getLogStatistics('24h');

      expect(result.byService).toBeDefined();
      expect(Array.isArray(result.byService)).toBe(true);

      for (const serviceStat of result.byService) {
        expect(serviceStat).toHaveProperty('_service');
        expect(serviceStat).toHaveProperty('count');
        expect(serviceStat).toHaveProperty('percentage');
        expect(serviceStat.count).toBeGreaterThanOrEqual(0);
        expect(serviceStat.percentage).toBeGreaterThanOrEqual(0);
        expect(serviceStat.percentage).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('getLogsByService', () => {
    beforeEach(async () => {
      await service.centralizeLogs({
        logs: [
          { level: 'info', message: 'Service 1 log', service: 'service-1' },
          { level: 'error', message: 'Service 1 error', service: 'service-1' },
          { level: 'info', message: 'Service 2 log', service: 'service-2' },
        ],
      });
    });

    it('should return logs for specific service', async () => {
      const result = await service.getLogsByService('service-1', '24h');

      expect(result._service).toBe('service-1');
      expect(result.logs).toBeDefined();
      expect(result.count).toBeGreaterThanOrEqual(0);
      expect(result.timeRange).toBe('24h');
    });

    it('should return empty logs for non-existent service', async () => {
      const result = await service.getLogsByService(
        'non-existent-service',
        '24h'
      );

      expect(result._service).toBe('non-existent-service');
      expect(result.logs).toBeDefined();
      expect(result.count).toBe(0);
    });

    it('should return logs for different time ranges', async () => {
      const timeRanges = ['1h', '24h', '7d'];

      for (const timeRange of timeRanges) {
        const result = await service.getLogsByService('service-1', timeRange);

        expect(result._service).toBe('service-1');
        expect(result.timeRange).toBe(timeRange);
        expect(result.logs).toBeDefined();
        expect(result.count).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('getErrorLogs', () => {
    beforeEach(async () => {
      await service.centralizeLogs({
        logs: [
          { level: 'info', message: 'Info log', service: 'service-1' },
          { level: 'error', message: 'Error log 1', service: 'service-1' },
          { level: 'fatal', message: 'Fatal log', service: 'service-2' },
          { level: 'warn', message: 'Warning log', service: 'service-1' },
        ],
      });
    });

    it('should return only error and fatal logs', async () => {
      const result = await service.getErrorLogs('24h');

      expect(result.errors).toBeDefined();
      expect(result.count).toBeGreaterThanOrEqual(0);
      expect(result.timeRange).toBe('24h');

      // All returned logs should be error or fatal level
      for (const log of result.errors) {
        expect(['error', 'fatal']).toContain(log.level);
      }
    });

    it('should return error logs for different time ranges', async () => {
      const timeRanges = ['1h', '24h', '7d'];

      for (const timeRange of timeRanges) {
        const result = await service.getErrorLogs(timeRange);

        expect(result.errors).toBeDefined();
        expect(result.timeRange).toBe(timeRange);
        expect(result.count).toBeGreaterThanOrEqual(0);
      }
    });

    it('should return empty array when no error logs exist', async () => {
      // Clear existing logs first
      service.clearLogs();

      await service.centralizeLogs({
        logs: [
          { level: 'info', message: 'Info log', service: 'service-1' },
          { level: 'warn', message: 'Warning log', service: 'service-1' },
        ],
      });

      const result = await service.getErrorLogs('24h');

      expect(result.errors).toHaveLength(0);
      expect(result.count).toBe(0);
    });
  });
});

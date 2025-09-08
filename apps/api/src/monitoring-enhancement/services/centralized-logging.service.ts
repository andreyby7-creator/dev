import { Injectable, Logger } from '@nestjs/common';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  _service: string;
  source: string;
  metadata: Record<string, unknown>;
  traceId?: string;
  spanId?: string;
  userId?: string;
  requestId?: string;
}

export interface LogSearchQuery {
  query: string;
  level?: string;
  service?: string;
  timeRange?: string;
  limit?: number;
  offset?: number;
}

export interface LogAggregation {
  level: string;
  count: number;
  percentage: number;
}

export interface LogStatistics {
  totalLogs: number;
  byLevel: LogAggregation[];
  byService: Array<{
    _service: string;
    count: number;
    percentage: number;
  }>;
  timeRange: string;
}

@Injectable()
export class CentralizedLoggingService {
  private readonly logger = new Logger(CentralizedLoggingService.name);
  private logs: LogEntry[] = [];
  private logIndex: Map<string, LogEntry[]> = new Map();

  async centralizeLogs(logData: Record<string, unknown>): Promise<{
    success: boolean;
    logsProcessed: number;
    timestamp: Date;
  }> {
    try {
      this.logger.log('Centralizing logs');

      const logEntries: LogEntry[] = Array.isArray(logData.logs)
        ? (logData.logs as LogEntry[])
        : [logData as unknown as LogEntry];

      let processed = 0;
      for (const logEntry of logEntries) {
        const entry: LogEntry = {
          id:
            (logEntry.id as string | undefined) ??
            `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp:
            (logEntry.timestamp as unknown as string | undefined) != null
              ? new Date(logEntry.timestamp as unknown as string)
              : new Date(),
          level:
            (logEntry.level as
              | 'error'
              | 'warn'
              | 'info'
              | 'debug'
              | 'fatal'
              | undefined) ?? 'info',
          message: (logEntry.message as string | undefined) ?? '',
          _service: (logEntry._service as string | undefined) ?? 'unknown',
          source: (logEntry.source as string | undefined) ?? 'unknown',
          metadata:
            (logEntry.metadata as Record<string, unknown> | undefined) ?? {},
          traceId: logEntry.traceId ?? '',
          spanId: logEntry.spanId ?? '',
          userId: logEntry.userId ?? '',
          requestId: logEntry.requestId ?? '',
        };

        this.logs.push(entry);
        this.indexLogEntry(entry);
        processed++;
      }

      // Keep only recent logs (last 7 days)
      const cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      this.logs = this.logs.filter(log => log.timestamp > cutoffTime);

      this.logger.log(`Centralized ${processed} log entries`);

      return {
        success: true,
        logsProcessed: processed,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to centralize logs', error);
      throw error;
    }
  }

  async searchLogs(query?: string): Promise<{
    query: string;
    results: LogEntry[];
    total: number;
    timeRange: string;
  }> {
    try {
      this.logger.log(`Searching logs with query: ${query ?? 'all'}`);

      let results = this.logs;

      if (query != null && query.trim() !== '') {
        const searchTerm = query.toLowerCase();
        results = this.logs.filter(
          log =>
            log.message.toLowerCase().includes(searchTerm) ||
            log._service.toLowerCase().includes(searchTerm) ||
            log.source.toLowerCase().includes(searchTerm) ||
            JSON.stringify(log.metadata).toLowerCase().includes(searchTerm)
        );
      }

      // Sort by timestamp descending (newest first)
      results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Limit to last 1000 results
      results = results.slice(0, 1000);

      this.logger.log(`Found ${results.length} log entries`);

      return {
        query: query ?? 'all',
        results,
        total: results.length,
        timeRange: '7d',
      };
    } catch (error) {
      this.logger.error('Failed to search logs', error);
      throw error;
    }
  }

  async getLogStatistics(timeRange?: string): Promise<LogStatistics> {
    try {
      this.logger.log(
        `Getting log statistics for time range: ${timeRange ?? 'default'}`
      );

      const cutoffTime = this.getCutoffTime(timeRange ?? '24h');
      const filteredLogs = this.logs.filter(log => log.timestamp >= cutoffTime);

      const totalLogs = filteredLogs.length;

      // Aggregate by level
      const levelCounts = new Map<string, number>();
      const serviceCounts = new Map<string, number>();

      for (const log of filteredLogs) {
        levelCounts.set(log.level, (levelCounts.get(log.level) ?? 0) + 1);
        serviceCounts.set(
          log._service,
          (serviceCounts.get(log._service) ?? 0) + 1
        );
      }

      const byLevel: LogAggregation[] = Array.from(levelCounts.entries()).map(
        ([level, count]) => ({
          level,
          count,
          percentage: totalLogs > 0 ? (count / totalLogs) * 100 : 0,
        })
      );

      const byService = Array.from(serviceCounts.entries()).map(
        ([_service, count]) => ({
          _service,
          count,
          percentage: totalLogs > 0 ? (count / totalLogs) * 100 : 0,
        })
      );

      return {
        totalLogs,
        byLevel,
        byService,
        timeRange: timeRange ?? '24h',
      };
    } catch (error) {
      this.logger.error('Failed to get log statistics', error);
      throw error;
    }
  }

  async getLogsByService(
    _service: string,
    timeRange?: string
  ): Promise<{
    _service: string;
    logs: LogEntry[];
    count: number;
    timeRange: string;
  }> {
    try {
      this.logger.log(`Getting logs for service: ${_service}`);

      const cutoffTime = this.getCutoffTime(timeRange ?? '24h');
      const serviceLogs = this.logs.filter(
        log => log._service === _service && log.timestamp >= cutoffTime
      );

      // Sort by timestamp descending
      serviceLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return {
        _service,
        logs: serviceLogs,
        count: serviceLogs.length,
        timeRange: timeRange ?? '24h',
      };
    } catch (error) {
      this.logger.error('Failed to get logs by service', error);
      throw error;
    }
  }

  async getErrorLogs(timeRange?: string): Promise<{
    errors: LogEntry[];
    count: number;
    timeRange: string;
  }> {
    try {
      this.logger.log(
        `Getting error logs for time range: ${timeRange ?? 'default'}`
      );

      const cutoffTime = this.getCutoffTime(timeRange ?? '24h');
      const errorLogs = this.logs.filter(
        log =>
          (log.level === 'error' || log.level === 'fatal') &&
          log.timestamp >= cutoffTime
      );

      // Sort by timestamp descending
      errorLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return {
        errors: errorLogs,
        count: errorLogs.length,
        timeRange: timeRange ?? '24h',
      };
    } catch (error) {
      this.logger.error('Failed to get error logs', error);
      throw error;
    }
  }

  private indexLogEntry(entry: LogEntry): void {
    // Index by service
    if (!this.logIndex.has(entry._service)) {
      this.logIndex.set(entry._service, []);
    }
    this.logIndex.get(entry._service)?.push(entry);

    // Index by level
    const levelKey = `level:${entry.level}`;
    if (!this.logIndex.has(levelKey)) {
      this.logIndex.set(levelKey, []);
    }
    this.logIndex.get(levelKey)?.push(entry);
  }

  private getCutoffTime(timeRange: string): Date {
    const now = new Date();
    const range = timeRange.toLowerCase();

    if (range.includes('1h') || range.includes('hour')) {
      return new Date(now.getTime() - 60 * 60 * 1000);
    } else if (range.includes('24h') || range.includes('day')) {
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (range.includes('7d') || range.includes('week')) {
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range.includes('30d') || range.includes('month')) {
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Default to 24 hours
    return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  // Helper method for testing - clear all logs
  clearLogs(): void {
    this.logs = [];
  }
}

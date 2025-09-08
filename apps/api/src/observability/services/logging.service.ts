import type { OnModuleInit } from '@nestjs/common';
import { Injectable } from '@nestjs/common';

export interface ILogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: Record<string, unknown>;
  traceId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class LoggingService implements OnModuleInit {
  private logs: ILogEntry[] = [];
  private maxLogs = 10000; // Keep last 10k logs in memory

  async onModuleInit() {
    await this.initialize();
  }

  async initialize() {
    this.logs = [];

    console.log('[LoggingService] Initialized');
  }

  async log(
    level: string,
    message: string,
    context?: Record<string, unknown>
  ): Promise<void> {
    const logEntry: ILogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: context ?? {},
    };

    this.logs.push(logEntry);

    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output for development
    const logMessage = `[${logEntry.timestamp}] [${level.toUpperCase()}] ${message}`;
    if (context) {
      console.log(logMessage, context);
    } else {
      console.log(logMessage);
    }
  }

  async info(
    message: string,
    context?: Record<string, unknown>
  ): Promise<void> {
    return this.log('info', message, context);
  }

  async warn(
    message: string,
    context?: Record<string, unknown>
  ): Promise<void> {
    return this.log('warn', message, context);
  }

  async error(
    message: string,
    context?: Record<string, unknown>
  ): Promise<void> {
    return this.log('error', message, context);
  }

  async debug(
    message: string,
    context?: Record<string, unknown>
  ): Promise<void> {
    return this.log('debug', message, context);
  }

  async getLogs(level?: string, limit = 100): Promise<ILogEntry[]> {
    let filteredLogs = this.logs;

    if (level != null && level !== '' && level.length > 0) {
      filteredLogs = this.logs.filter(log => log.level === level);
    }

    return filteredLogs.slice(-limit);
  }

  async getLogStats(): Promise<Record<string, number>> {
    const stats: Record<string, number> = {
      total: this.logs.length,
      info: 0,
      warn: 0,
      error: 0,
      debug: 0,
    };

    this.logs.forEach(log => {
      stats[log.level] = (stats[log.level] ?? 0) + 1;
    });

    return stats;
  }

  async clearLogs(): Promise<void> {
    this.logs = [];
  }

  async exportLogs(format: 'json' | 'text' = 'json'): Promise<string> {
    if (format === 'text') {
      return this.logs
        .map(
          log =>
            `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`
        )
        .join('\n');
    }

    return JSON.stringify(this.logs, null, 2);
  }
}

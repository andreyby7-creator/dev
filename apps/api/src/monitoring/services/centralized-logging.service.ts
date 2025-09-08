import { Injectable } from '@nestjs/common';
import { redactedLogger } from '../../utils/redacted-logger';

interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: string;
  trace?: string;
  metadata?: Record<string, unknown>;
  requestId?: string;
  userId?: string;
  sessionId?: string;
}

interface LogConfig {
  elk: {
    enabled: boolean;
    host: string;
    port: number;
    index: string;
  };
  loki: {
    enabled: boolean;
    host: string;
    port: number;
    labels: Record<string, string>;
  };
  console: {
    enabled: boolean;
    format: 'json' | 'text';
  };
}

@Injectable()
export class CentralizedLoggingService {
  private readonly config: LogConfig;
  private readonly logBuffer: LogEntry[] = [];
  private readonly maxBufferSize = 100;
  private readonly flushInterval = 5000; // 5 секунд

  constructor() {
    this.config = {
      elk: {
        enabled: process.env.ELK_ENABLED === 'true',
        host: process.env.ELK_HOST ?? 'localhost',
        port: parseInt(process.env.ELK_PORT ?? '9200'),
        index: process.env.ELK_INDEX ?? 'app-logs',
      },
      loki: {
        enabled: process.env.LOKI_ENABLED === 'true',
        host: process.env.LOKI_HOST ?? 'localhost',
        port: parseInt(process.env.LOKI_PORT ?? '3100'),
        labels: {
          app: process.env.npm_package_name ?? 'api',
          environment: process.env.NODE_ENV ?? 'development',
          version: process.env.npm_package_version ?? '1.0.0',
        },
      },
      console: {
        enabled: process.env.CONSOLE_LOGGING !== 'false',
        format: process.env.LOG_FORMAT === 'text' ? 'text' : 'json',
      },
    };

    // Запускаем периодическую отправку логов
    if (this.config.elk.enabled || this.config.loki.enabled) {
      setInterval(() => {
        void this.flushLogs();
      }, this.flushInterval);
    }

    redactedLogger.log(
      'Centralized logging service initialized',
      'CentralizedLoggingService'
    );
  }

  log(
    level: LogEntry['level'],
    message: string,
    context?: string,
    metadata?: Record<string, unknown>
  ): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: context ?? '',
      metadata: this.sanitizeMetadata(metadata) ?? {},
      requestId: this.getRequestId() ?? '',
      userId: this.getUserId() ?? '',
      sessionId: this.getSessionId() ?? '',
    };

    // Добавляем в буфер
    this.logBuffer.push(logEntry);

    // Если буфер переполнен, отправляем логи
    if (this.logBuffer.length >= this.maxBufferSize) {
      void this.flushLogs();
    }

    // Выводим в консоль если включено
    if (this.config.console.enabled) {
      this.logToConsole(logEntry);
    }
  }

  debug(
    message: string,
    context?: string,
    metadata?: Record<string, unknown>
  ): void {
    this.log('debug', message, context, metadata);
  }

  info(
    message: string,
    context?: string,
    metadata?: Record<string, unknown>
  ): void {
    this.log('info', message, context, metadata);
  }

  warn(
    message: string,
    context?: string,
    metadata?: Record<string, unknown>
  ): void {
    this.log('warn', message, context, metadata);
  }

  error(
    message: string,
    trace?: string,
    context?: string,
    metadata?: Record<string, unknown>
  ): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      context: context ?? '',
      trace: trace ?? '',
      metadata: this.sanitizeMetadata(metadata) ?? {},
      requestId: this.getRequestId() ?? '',
      userId: this.getUserId() ?? '',
      sessionId: this.getSessionId() ?? '',
    };

    this.logBuffer.push(logEntry);

    if (this.logBuffer.length >= this.maxBufferSize) {
      void this.flushLogs();
    }

    if (this.config.console.enabled) {
      this.logToConsole(logEntry);
    }
  }

  private async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    const logsToSend = [...this.logBuffer];
    this.logBuffer.length = 0;

    try {
      await Promise.allSettled([
        this.sendToElk(logsToSend),
        this.sendToLoki(logsToSend),
      ]);
    } catch (error) {
      redactedLogger.error('Failed to flush logs', error as string);
    }
  }

  private async sendToElk(logs: LogEntry[]): Promise<void> {
    if (!this.config.elk.enabled) return;

    try {
      // Здесь будет интеграция с Elasticsearch
      // Пока просто логируем
      redactedLogger.debug(
        `Sending ${logs.length} logs to ELK`,
        'CentralizedLoggingService'
      );

      // Пример интеграции с Elasticsearch
      // const client = new Client({ node: `http://${this.config.elk.host}:${this.config.elk.port}` });
      // await client.bulk({
      //   body: logs.flatMap(log => [
      //     { index: { _index: this.config.elk.index } },
      //     log
      //   ])
      // });
    } catch (error) {
      redactedLogger.error('Failed to send logs to ELK', error as string);
    }
  }

  private async sendToLoki(logs: LogEntry[]): Promise<void> {
    if (!this.config.loki.enabled) return;

    try {
      // Здесь будет интеграция с Loki
      // Пока просто логируем
      redactedLogger.debug(
        `Sending ${logs.length} logs to Loki`,
        'CentralizedLoggingService'
      );

      // Пример интеграции с Loki
      // const lokiUrl = `http://${this.config.loki.host}:${this.config.loki.port}/loki/api/v1/push`;
      // await fetch(lokiUrl, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     streams: [{
      //       stream: this.config.loki.labels,
      //       values: logs.map(log => [
      //         (new Date(log.timestamp).getTime() * 1000000).toString(),
      //         JSON.stringify(log)
      //       ])
      //     }]
      //   })
      // });
    } catch (error) {
      redactedLogger.error('Failed to send logs to Loki', error as string);
    }
  }

  private logToConsole(logEntry: LogEntry): void {
    if (this.config.console.format === 'json') {
      console.log(JSON.stringify(logEntry));
    } else {
      const timestamp = new Date(logEntry.timestamp).toISOString();
      const level = logEntry.level.toUpperCase().padEnd(5);
      const context =
        logEntry.context != null && logEntry.context !== ''
          ? `[${logEntry.context}]`
          : '';
      const requestId =
        logEntry.requestId != null && logEntry.requestId !== ''
          ? `[${logEntry.requestId}]`
          : '';

      console.log(
        `${timestamp} ${level} ${context} ${requestId} ${logEntry.message}`
      );

      if (
        logEntry.metadata != null &&
        Object.keys(logEntry.metadata).length > 0
      ) {
        console.log('  Metadata:', logEntry.metadata);
      }

      if (logEntry.trace != null) {
        console.log('  Trace:', logEntry.trace);
      }
    }
  }

  private sanitizeMetadata(
    metadata?: Record<string, unknown>
  ): Record<string, unknown> | undefined {
    if (!metadata) return undefined;

    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
    ];

    for (const [key, value] of Object.entries(metadata)) {
      if (
        sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))
      ) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private getRequestId(): string | undefined {
    // В реальном приложении здесь будет получение ID запроса из контекста
    return undefined;
  }

  private getUserId(): string | undefined {
    // В реальном приложении здесь будет получение ID пользователя из контекста
    return undefined;
  }

  private getSessionId(): string | undefined {
    // В реальном приложении здесь будет получение ID сессии из контекста
    return undefined;
  }

  // Методы для получения статистики
  getLogStats() {
    return {
      bufferSize: this.logBuffer.length,
      config: {
        elk: this.config.elk.enabled,
        loki: this.config.loki.enabled,
        console: this.config.console.enabled,
      },
    };
  }

  // Метод для принудительной отправки логов
  async forceFlush(): Promise<void> {
    await this.flushLogs();
  }
}

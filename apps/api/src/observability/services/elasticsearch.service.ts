import type { OnModuleInit } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import * as winston from 'winston';
import { getEnv } from '../../utils/getEnv';

export interface IElasticsearchConfig {
  node: string;
  auth: {
    username: string;
    password: string;
  };
  index: string;
  maxRetries: number;
  requestTimeout: number;
}

export interface ILogDocument {
  '@timestamp': string;
  level: string;
  message: string;
  _service: string;
  traceId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  responseTime?: number;
  error?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ElasticsearchService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchService.name);
  private winstonLogger!: winston.Logger;
  private config!: IElasticsearchConfig;
  private isConnected = false;

  async onModuleInit(): Promise<void> {
    await this.initialize();
  }

  private async initialize(): Promise<void> {
    this.config = {
      node: getEnv('ELASTICSEARCH_NODE', 'string', {
        default: 'http://localhost:9200',
      }),
      auth: {
        username: getEnv('ELASTICSEARCH_USERNAME', 'string', {
          default: 'elastic',
        }),
        password: getEnv('ELASTICSEARCH_PASSWORD', 'string', {
          default: 'changeme',
        }),
      },
      index: getEnv('ELASTICSEARCH_INDEX', 'string', {
        default: 'salespot-logs',
      }),
      maxRetries: 3,
      requestTimeout: 30000,
    };

    try {
      // Создаем Winston логгер с консольным транспортом (пока без Elasticsearch)
      this.winstonLogger = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        ),
        transports: [
          new winston.transports.Console({
            format: winston.format.simple(),
          }),
        ],
      });

      this.logger.log(
        'Winston logger initialized (Elasticsearch transport disabled for now)'
      );
      this.isConnected = true;
    } catch (error) {
      this.logger.error('Failed to initialize Elasticsearch service', error);
      this.isConnected = false;
    }
  }

  async log(
    level: string,
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      const logData: ILogDocument = {
        '@timestamp': new Date().toISOString(),
        level,
        message,
        _service: 'salespot-api',
        ...metadata,
      };

      this.winstonLogger.log(level, message, logData);
    } catch (error) {
      this.logger.error('Failed to send log', error);
      // Fallback to console

      console.log(`[${level.toUpperCase()}] ${message}`, metadata);
    }
  }

  async info(
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    return this.log('info', message, metadata);
  }

  async warn(
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    return this.log('warn', message, metadata);
  }

  async error(
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    return this.log('error', message, metadata);
  }

  async debug(
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    return this.log('debug', message, metadata);
  }

  async searchLogs(
    query: Record<string, unknown>,
    _size = 100
  ): Promise<unknown> {
    // Mock implementation for now - will be enhanced later
    this.logger.log('Search logs called with query:', query);
    return {
      hits: {
        hits: [],
        total: 0,
      },
    };
  }

  async getLogStats(timeRange = '1d'): Promise<Record<string, unknown>> {
    // Mock implementation for now - will be enhanced later
    this.logger.log('Get log stats called with timeRange:', timeRange);
    return {
      totalLogs: 0,
      logLevels: [],
      logCount: [],
      errorCount: 0,
    };
  }

  async healthCheck(): Promise<Record<string, unknown>> {
    return {
      status: this.isConnected ? 'green' : 'red',
      numberOfNodes: 1,
      activeShards: 0,
      relocatingShards: 0,
      initializingShards: 0,
      unassignedShards: 0,
    };
  }

  async createIndex(
    indexName: string,
    mapping?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    this.logger.log(
      `Mock: Index ${indexName} would be created with mapping:`,
      mapping
    );
    return { acknowledged: true };
  }

  async deleteOldLogs(daysToKeep = 30): Promise<number> {
    this.logger.log(
      `Mock: Old logs would be deleted (keeping ${daysToKeep} days)`
    );
    return 0;
  }

  async getConnectionStatus(): Promise<Record<string, unknown>> {
    return {
      isConnected: this.isConnected,
      config: {
        node: this.config.node,
        index: this.config.index,
      },
    };
  }
}

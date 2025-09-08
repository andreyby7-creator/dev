import type { OnModuleInit } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { z } from 'zod';

export interface IConfigSchema {
  [key: string]: z.ZodTypeAny;
}

export interface IConfigValue {
  key: string;
  value: unknown;
  type: string;
  environment: string;
  _service: string;
  lastUpdated: Date;
  version: number;
}

export interface IConfigChange {
  key: string;
  oldValue: unknown;
  newValue: unknown;
  environment: string;
  _service: string;
  timestamp: Date;
  changedBy: string;
}

export interface IConfigBackup {
  id: string;
  environment: string;
  _service: string;
  config: Record<string, unknown>;
  timestamp: Date;
  version: number;
}

@Injectable()
export class CentralizedConfigService implements OnModuleInit {
  private readonly logger = new Logger(CentralizedConfigService.name);
  private configs = new Map<string, IConfigValue>();
  private schemas = new Map<string, IConfigSchema>();
  private backups = new Map<string, IConfigBackup>();
  private changeHistory: IConfigChange[] = [];

  constructor(
    private _configService: ConfigService,
    private eventEmitter: EventEmitter2
  ) {
    this._configService.get('CENTRALIZED_CONFIG_ENABLED');
  }

  async onModuleInit(): Promise<void> {
    await this.initializeDefaultConfigs();
    await this.loadConfigsFromEnvironment();
    this.startConfigWatcher();
  }

  private async initializeDefaultConfigs(): Promise<void> {
    // Базовые конфигурации для всех сервисов
    const defaultConfigs = [
      // Auth Service
      {
        key: 'auth.jwt.secret',
        value: this._configService.get('JWT_SECRET', 'default-secret'),
        type: 'string',
        environment: 'all',
        service: 'auth-service',
      },
      {
        key: 'auth.jwt.expiresIn',
        value: this._configService.get('JWT_EXPIRES_IN', '1h'),
        type: 'string',
        environment: 'all',
        service: 'auth-service',
      },
      // Database
      {
        key: 'database.url',
        value: this._configService.get(
          'DATABASE_URL',
          'postgresql://localhost:5432/salespot'
        ),
        type: 'string',
        environment: 'all',
        service: 'database',
      },
      {
        key: 'database.pool.min',
        value: parseInt(this._configService.get('DB_POOL_MIN', '2')),
        type: 'number',
        environment: 'all',
        service: 'database',
      },
      {
        key: 'database.pool.max',
        value: parseInt(this._configService.get('DB_POOL_MAX', '10')),
        type: 'number',
        environment: 'all',
        service: 'database',
      },
      // Redis
      {
        key: 'redis.url',
        value: this._configService.get('REDIS_URL', 'redis://localhost:6379'),
        type: 'string',
        environment: 'all',
        service: 'redis',
      },
      {
        key: 'redis.ttl',
        value: parseInt(this._configService.get('REDIS_TTL', '3600')),
        type: 'number',
        environment: 'all',
        service: 'redis',
      },
      // Monitoring
      {
        key: 'monitoring.enabled',
        value: this._configService.get('MONITORING_ENABLED', 'true') === 'true',
        type: 'boolean',
        environment: 'all',
        service: 'monitoring',
      },
      {
        key: 'monitoring.interval',
        value: parseInt(
          this._configService.get('MONITORING_INTERVAL', '30000')
        ),
        type: 'number',
        environment: 'all',
        service: 'monitoring',
      },
      // Security
      {
        key: 'security.rateLimit.enabled',
        value: this._configService.get('RATE_LIMIT_ENABLED', 'true') === 'true',
        type: 'boolean',
        environment: 'all',
        service: 'security',
      },
      {
        key: 'security.rateLimit.max',
        value: parseInt(this._configService.get('RATE_LIMIT_MAX', '100')),
        type: 'number',
        environment: 'all',
        service: 'security',
      },
      // Feature Flags
      {
        key: 'features.newDashboard',
        value:
          this._configService.get('FEATURE_NEW_DASHBOARD', 'false') === 'true',
        type: 'boolean',
        environment: 'all',
        service: 'feature-flags',
      },
      {
        key: 'features.aiAssistant',
        value:
          this._configService.get('FEATURE_AI_ASSISTANT', 'true') === 'true',
        type: 'boolean',
        environment: 'all',
        service: 'feature-flags',
      },
    ];

    for (const config of defaultConfigs) {
      await this.setConfig(
        config.key,
        config.value,
        config.environment,
        config.service,
        'system'
      );
    }

    this.logger.log(
      `Initialized ${defaultConfigs.length} default configurations`
    );
  }

  private async loadConfigsFromEnvironment(): Promise<void> {
    // Загружаем конфигурации из переменных окружения
    const envConfigs = this._configService.get('CONFIG_OVERRIDES', '{}');

    try {
      const overrides = JSON.parse(envConfigs);
      for (const [key, value] of Object.entries(overrides)) {
        await this.setConfig(key, value, 'all', 'system', 'environment');
      }
    } catch (error) {
      this.logger.warn('Failed to parse CONFIG_OVERRIDES:', error);
    }
  }

  private startConfigWatcher(): void {
    // Мониторим изменения в переменных окружения
    setInterval(() => {
      void this.checkForEnvironmentChanges();
    }, 30000); // Проверяем каждые 30 секунд
  }

  private async checkForEnvironmentChanges(): Promise<void> {
    // Проверяем изменения в переменных окружения
    const currentEnv = process.env;
    const changedKeys: string[] = [];

    for (const [key, value] of Object.entries(currentEnv)) {
      if (key.startsWith('CONFIG_')) {
        const configKey = key
          .replace('CONFIG_', '')
          .toLowerCase()
          .replace(/_/g, '.');
        const currentConfig = this.configs.get(configKey);

        if (!currentConfig || currentConfig.value !== value) {
          changedKeys.push(configKey);
        }
      }
    }

    if (changedKeys.length > 0) {
      this.logger.log(
        `Detected ${changedKeys.length} environment configuration changes`
      );
      this.eventEmitter.emit('config.changed', { keys: changedKeys });
    }
  }

  async setConfig(
    key: string,
    value: unknown,
    environment: string,
    _service: string,
    changedBy: string
  ): Promise<void> {
    const oldConfig = this.configs.get(key);
    const newConfig: IConfigValue = {
      key,
      value,
      type: typeof value,
      environment,
      _service: _service,
      lastUpdated: new Date(),
      version: oldConfig ? oldConfig.version + 1 : 1,
    };

    // Валидируем конфигурацию
    const schema = this.schemas.get(_service);
    if (schema?.[key]) {
      try {
        schema[key].parse(value);
      } catch (error) {
        throw new Error(`Configuration validation failed for ${key}: ${error}`);
      }
    }

    // Сохраняем старую конфигурацию в бэкап
    if (oldConfig != null) {
      await this.createBackup(key, oldConfig.value, environment, _service);
    }

    // Обновляем конфигурацию
    this.configs.set(key, newConfig);

    // Записываем изменение в историю
    if (oldConfig != null) {
      this.changeHistory.push({
        key,
        oldValue: oldConfig.value,
        newValue: value,
        environment,
        _service,
        timestamp: new Date(),
        changedBy,
      });
    }

    // Эмитим событие об изменении
    this.eventEmitter.emit('config.updated', {
      key,
      oldValue: oldConfig?.value,
      newValue: value,
      environment,
      _service,
    });

    this.logger.log(`Configuration updated: ${key} = ${value} (${_service})`);
  }

  async getConfig(key: string, environment?: string): Promise<unknown> {
    const config = this.configs.get(key);

    if (config == null) {
      return undefined;
    }

    if (
      environment != null &&
      config.environment !== 'all' &&
      config.environment !== environment
    ) {
      return undefined;
    }

    return config.value;
  }

  async getAllConfigs(
    service?: string,
    environment?: string
  ): Promise<IConfigValue[]> {
    const configs = Array.from(this.configs.values());

    let filtered = configs;

    if (service != null) {
      filtered = filtered.filter(config => config._service === service);
    }

    if (environment != null) {
      filtered = filtered.filter(
        config =>
          config.environment === 'all' || config.environment === environment
      );
    }

    return filtered;
  }

  async registerSchema(_service: string, schema: IConfigSchema): Promise<void> {
    this.schemas.set(_service, schema);
    this.logger.log(`Registered configuration schema for service: ${_service}`);
  }

  async validateConfig(
    _service: string,
    config: Record<string, unknown>
  ): Promise<boolean> {
    const schema = this.schemas.get(_service);
    if (!schema) {
      return true; // Нет схемы - считаем валидным
    }

    try {
      for (const [key, value] of Object.entries(config)) {
        if (schema[key]) {
          schema[key].parse(value);
        }
      }
      return true;
    } catch (error) {
      this.logger.error(
        `Configuration validation failed for ${_service}:`,
        error
      );
      return false;
    }
  }

  private async createBackup(
    key: string,
    value: unknown,
    environment: string,
    _service: string
  ): Promise<void> {
    const backupId = `${_service}-${environment}-${Date.now()}`;
    const backup: IConfigBackup = {
      id: backupId,
      environment,
      _service,
      config: { [key]: value },
      timestamp: new Date(),
      version: 1,
    };

    this.backups.set(backupId, backup);

    // Ограничиваем количество бэкапов (храним последние 100)
    if (this.backups.size > 100) {
      const oldestBackup = Array.from(this.backups.values()).sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      )[0];
      if (oldestBackup != null) {
        this.backups.delete(oldestBackup.id);
      }
    }
  }

  async getBackups(
    service?: string,
    environment?: string
  ): Promise<IConfigBackup[]> {
    const backups = Array.from(this.backups.values());

    let filtered = backups;

    if (service != null) {
      filtered = filtered.filter(backup => backup._service === service);
    }

    if (environment != null) {
      filtered = filtered.filter(
        backup =>
          backup.environment === 'all' || backup.environment === environment
      );
    }

    return filtered.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  async getChangeHistory(
    service?: string,
    key?: string
  ): Promise<IConfigChange[]> {
    let history = this.changeHistory;

    if (service != null) {
      history = history.filter(change => change._service === service);
    }

    if (key != null) {
      history = history.filter(change => change.key === key);
    }

    return history.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  async exportConfig(
    _service: string,
    environment: string,
    format: 'json' | 'env' | 'yaml'
  ): Promise<string> {
    const configs = await this.getAllConfigs(_service, environment);

    switch (format) {
      case 'json':
        return JSON.stringify(
          configs.reduce(
            (acc, config) => {
              acc[config.key] = config.value;
              return acc;
            },
            {} as Record<string, unknown>
          ),
          null,
          2
        );

      case 'env':
        return configs
          .map(
            config =>
              `${config.key.toUpperCase().replace(/\./g, '_')}=${config.value}`
          )
          .join('\n');

      case 'yaml':
        return configs
          .map(config => `${config.key}: ${config.value}`)
          .join('\n');

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }
}

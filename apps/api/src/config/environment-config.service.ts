import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CentralizedConfigService } from './centralized-config.service';

export interface IEnvironmentConfig {
  name: string;
  displayName: string;
  description: string;
  configs: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEnvironmentOverride {
  key: string;
  value: unknown;
  environment: string;
  reason: string;
  appliedAt: Date;
  appliedBy: string;
}

@Injectable()
export class EnvironmentConfigService {
  private readonly logger = new Logger(EnvironmentConfigService.name);
  private environments = new Map<string, IEnvironmentConfig>();
  private overrides = new Map<string, IEnvironmentOverride[]>();

  constructor(
    private _configService: ConfigService,
    private centralizedConfigService: CentralizedConfigService
  ) {
    this._configService.get('ENVIRONMENT_CONFIG_ENABLED');
    this.initializeEnvironments();
  }

  private initializeEnvironments(): void {
    const environments: IEnvironmentConfig[] = [
      {
        name: 'development',
        displayName: 'Development',
        description: 'Local development environment',
        configs: {
          'database.pool.min': 1,
          'database.pool.max': 5,
          'monitoring.enabled': false,
          'security.rateLimit.max': 1000,
          'features.newDashboard': true,
          'features.aiAssistant': true,
        },
        isActive: process.env.NODE_ENV === 'development',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'staging',
        displayName: 'Staging',
        description: 'Staging environment for testing',
        configs: {
          'database.pool.min': 2,
          'database.pool.max': 8,
          'monitoring.enabled': true,
          'security.rateLimit.max': 500,
          'features.newDashboard': true,
          'features.aiAssistant': false,
        },
        isActive: process.env.NODE_ENV === 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'production',
        displayName: 'Production',
        description: 'Production environment',
        configs: {
          'database.pool.min': 5,
          'database.pool.max': 20,
          'monitoring.enabled': true,
          'security.rateLimit.max': 100,
          'features.newDashboard': false,
          'features.aiAssistant': true,
        },
        isActive: process.env.NODE_ENV === 'production',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'testing',
        displayName: 'Testing',
        description: 'Testing environment',
        configs: {
          'database.pool.min': 1,
          'database.pool.max': 3,
          'monitoring.enabled': false,
          'security.rateLimit.max': 2000,
          'features.newDashboard': true,
          'features.aiAssistant': true,
        },
        isActive: process.env.NODE_ENV === 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    environments.forEach(env => {
      this.environments.set(env.name, env);
    });

    this.logger.log(`Initialized ${environments.length} environments`);
  }

  async getEnvironment(name: string): Promise<IEnvironmentConfig | null> {
    return this.environments.get(name) ?? null;
  }

  async getAllEnvironments(): Promise<IEnvironmentConfig[]> {
    return Array.from(this.environments.values());
  }

  async getActiveEnvironment(): Promise<IEnvironmentConfig | null> {
    const activeEnv = Array.from(this.environments.values()).find(
      env => env.isActive
    );
    return activeEnv ?? null;
  }

  async setEnvironmentConfig(
    environment: string,
    key: string,
    value: unknown,
    reason: string,
    appliedBy: string
  ): Promise<void> {
    const env = this.environments.get(environment);
    if (!env) {
      throw new Error(`Environment ${environment} not found`);
    }

    // Обновляем конфигурацию окружения
    env.configs[key] = value;
    env.updatedAt = new Date();

    // Добавляем override
    const override: IEnvironmentOverride = {
      key,
      value,
      environment,
      reason,
      appliedAt: new Date(),
      appliedBy,
    };

    const overrides = this.overrides.get(environment) ?? [];
    overrides.push(override);
    this.overrides.set(environment, overrides);

    // Применяем конфигурацию к централизованному сервису
    await this.centralizedConfigService.setConfig(
      key,
      value,
      environment,
      'environment-config',
      appliedBy
    );

    this.logger.log(
      `Environment config updated: ${environment}.${key} = ${value}`
    );
  }

  async getEnvironmentOverrides(
    environment: string
  ): Promise<IEnvironmentOverride[]> {
    return this.overrides.get(environment) ?? [];
  }

  async applyEnvironmentConfig(environment: string): Promise<void> {
    const env = this.environments.get(environment);
    if (!env) {
      throw new Error(`Environment ${environment} not found`);
    }

    // Применяем все конфигурации окружения
    for (const [key, value] of Object.entries(env.configs)) {
      await this.centralizedConfigService.setConfig(
        key,
        value,
        environment,
        'environment-config',
        'system'
      );
    }

    this.logger.log(
      `Applied ${Object.keys(env.configs).length} configurations for environment: ${environment}`
    );
  }

  async switchEnvironment(environment: string): Promise<void> {
    const env = this.environments.get(environment);
    if (!env) {
      throw new Error(`Environment ${environment} not found`);
    }

    // Деактивируем все окружения
    for (const [, envConfig] of this.environments) {
      envConfig.isActive = false;
    }

    // Активируем выбранное окружение
    env.isActive = true;
    env.updatedAt = new Date();

    // Применяем конфигурации
    await this.applyEnvironmentConfig(environment);

    this.logger.log(`Switched to environment: ${environment}`);
  }

  async createEnvironment(
    name: string,
    displayName: string,
    description: string,
    baseEnvironment?: string
  ): Promise<IEnvironmentConfig> {
    if (this.environments.has(name)) {
      throw new Error(`Environment ${name} already exists`);
    }

    let configs: Record<string, unknown> = {};

    if (baseEnvironment != null && baseEnvironment !== '') {
      const baseEnv = this.environments.get(baseEnvironment);
      if (baseEnv) {
        configs = { ...baseEnv.configs };
      }
    }

    const newEnvironment: IEnvironmentConfig = {
      name,
      displayName,
      description,
      configs,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.environments.set(name, newEnvironment);
    this.logger.log(`Created new environment: ${name}`);

    return newEnvironment;
  }

  async deleteEnvironment(name: string): Promise<void> {
    if (name === 'production') {
      throw new Error('Cannot delete production environment');
    }

    const env = this.environments.get(name);
    if (!env) {
      throw new Error(`Environment ${name} not found`);
    }

    if (env.isActive) {
      throw new Error('Cannot delete active environment');
    }

    this.environments.delete(name);
    this.overrides.delete(name);

    this.logger.log(`Deleted environment: ${name}`);
  }

  async getEnvironmentDiff(
    env1: string,
    env2: string
  ): Promise<{
    onlyInEnv1: string[];
    onlyInEnv2: string[];
    different: Array<{
      key: string;
      value1: unknown;
      value2: unknown;
    }>;
  }> {
    const environment1 = this.environments.get(env1);
    const environment2 = this.environments.get(env2);

    if (!environment1 || !environment2) {
      throw new Error('One or both environments not found');
    }

    const keys1 = Object.keys(environment1.configs);
    const keys2 = Object.keys(environment2.configs);

    const onlyInEnv1 = keys1.filter(key => !keys2.includes(key));
    const onlyInEnv2 = keys2.filter(key => !keys1.includes(key));
    const commonKeys = keys1.filter(key => keys2.includes(key));

    const different = commonKeys
      .filter(key => environment1.configs[key] !== environment2.configs[key])
      .map(key => ({
        key,
        value1: environment1.configs[key],
        value2: environment2.configs[key],
      }));

    return {
      onlyInEnv1,
      onlyInEnv2,
      different,
    };
  }

  async exportEnvironmentConfig(
    environment: string,
    format: 'json' | 'env' | 'yaml'
  ): Promise<string> {
    const env = this.environments.get(environment);
    if (!env) {
      throw new Error(`Environment ${environment} not found`);
    }

    switch (format) {
      case 'json':
        return JSON.stringify(env.configs, null, 2);

      case 'env':
        return Object.entries(env.configs)
          .map(
            ([key, value]) =>
              `${key.toUpperCase().replace(/\./g, '_')}=${value}`
          )
          .join('\n');

      case 'yaml':
        return Object.entries(env.configs)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n');

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }
}

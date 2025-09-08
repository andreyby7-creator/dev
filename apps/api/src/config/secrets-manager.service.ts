import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CentralizedConfigService } from './centralized-config.service';

export interface ISecret {
  key: string;
  value: string;
  encrypted: boolean;
  _service: string;
  environment: string;
  lastRotated: Date;
  expiresAt?: Date;
  tags: Record<string, string>;
}

export interface ISecretRotation {
  key: string;
  oldValue: string;
  newValue: string;
  _service: string;
  environment: string;
  rotatedAt: Date;
  rotatedBy: string;
  reason: string;
}

export interface IKMSConfig {
  provider: 'aws' | 'azure' | 'gcp' | 'local';
  region: string;
  keyId: string;
  endpoint?: string;
}

@Injectable()
export class SecretsManagerService {
  private readonly logger = new Logger(SecretsManagerService.name);
  private secrets = new Map<string, ISecret>();
  private rotationHistory: ISecretRotation[] = [];
  private kmsConfig!: IKMSConfig;

  constructor(
    private _configService: ConfigService,
    private centralizedConfigService: CentralizedConfigService
  ) {
    this._configService.get('SECRETS_MANAGER_ENABLED');
    this.initializeKMSConfig();
    this.loadSecretsFromEnvironment();
  }

  private initializeKMSConfig(): void {
    this.kmsConfig = {
      provider: this._configService.get('KMS_PROVIDER', 'local'),
      region: this._configService.get('KMS_REGION', 'us-east-1'),
      keyId: this._configService.get('KMS_KEY_ID', 'default-key'),
      endpoint: this._configService.get('KMS_ENDPOINT') ?? '',
    };

    this.logger.log(
      `Initialized KMS config: ${this.kmsConfig.provider} in ${this.kmsConfig.region}`
    );
  }

  private loadSecretsFromEnvironment(): void {
    // Загружаем секреты из переменных окружения
    const secretKeys = [
      'JWT_SECRET',
      'DATABASE_URL',
      'REDIS_URL',
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SENTRY_DSN',
      'BETTERSTACK_TOKEN',
    ];

    for (const key of secretKeys) {
      const value = this._configService.get(key);
      if (value != null && value !== '') {
        void this.setSecret(
          key.toLowerCase().replace(/_/g, '.'),
          value,
          'system',
          'all',
          { source: 'environment' }
        );
      }
    }

    this.logger.log(`Loaded ${secretKeys.length} secrets from environment`);
  }

  async setSecret(
    key: string,
    value: string,
    _service: string,
    environment: string,
    tags: Record<string, string> = {},
    expiresAt?: Date
  ): Promise<void> {
    const encrypted = this.kmsConfig.provider !== 'local';
    const secretValue = encrypted ? await this.encryptSecret(value) : value;

    const secret: ISecret = {
      key,
      value: secretValue,
      encrypted,
      _service: _service,
      environment,
      lastRotated: new Date(),
      expiresAt: expiresAt ?? new Date(),
      tags,
    };

    this.secrets.set(key, secret);

    // Обновляем в централизованной конфигурации
    await this.centralizedConfigService.setConfig(
      key,
      secretValue,
      environment,
      _service,
      'secrets-manager'
    );

    this.logger.log(`Secret set: ${key} (${_service})`);
  }

  async getSecret(key: string, environment?: string): Promise<string | null> {
    const secret = this.secrets.get(key);

    if (!secret) {
      return null;
    }

    if (
      environment != null &&
      environment !== '' &&
      secret.environment !== 'all' &&
      secret.environment !== environment
    ) {
      return null;
    }

    // Проверяем срок действия
    if (secret.expiresAt != null && secret.expiresAt < new Date()) {
      this.logger.warn(`Secret ${key} has expired`);
      return null;
    }

    // Расшифровываем если необходимо
    if (secret.encrypted) {
      return await this.decryptSecret(secret.value);
    }

    return secret.value;
  }

  async getAllSecrets(
    service?: string,
    environment?: string
  ): Promise<ISecret[]> {
    const secrets = Array.from(this.secrets.values());

    let filtered = secrets;

    if (service != null && service !== '') {
      filtered = filtered.filter(secret => secret._service === service);
    }

    if (environment != null && environment !== '') {
      filtered = filtered.filter(
        secret =>
          secret.environment === 'all' || secret.environment === environment
      );
    }

    return filtered;
  }

  async rotateSecret(
    key: string,
    newValue: string,
    _service: string,
    environment: string,
    reason: string,
    rotatedBy: string
  ): Promise<void> {
    const oldSecret = this.secrets.get(key);
    if (!oldSecret) {
      throw new Error(`Secret ${key} not found`);
    }

    const oldValue = oldSecret.encrypted
      ? await this.decryptSecret(oldSecret.value)
      : oldSecret.value;

    // Устанавливаем новый секрет
    await this.setSecret(
      key,
      newValue,
      _service,
      environment,
      oldSecret.tags,
      oldSecret.expiresAt
    );

    // Записываем в историю ротации
    const rotation: ISecretRotation = {
      key,
      oldValue,
      newValue,
      _service: _service,
      environment,
      rotatedAt: new Date(),
      rotatedBy,
      reason,
    };

    this.rotationHistory.push(rotation);

    this.logger.log(`Secret rotated: ${key} (${_service})`);
  }

  async getRotationHistory(
    key?: string,
    service?: string
  ): Promise<ISecretRotation[]> {
    let history = this.rotationHistory;

    if (key != null && key !== '') {
      history = history.filter(rotation => rotation.key === key);
    }

    if (service != null && service !== '') {
      history = history.filter(rotation => rotation._service === service);
    }

    return history.sort(
      (a, b) => b.rotatedAt.getTime() - a.rotatedAt.getTime()
    );
  }

  async deleteSecret(key: string): Promise<void> {
    const secret = this.secrets.get(key);
    if (!secret) {
      throw new Error(`Secret ${key} not found`);
    }

    this.secrets.delete(key);
    this.logger.log(`Secret deleted: ${key}`);
  }

  async getExpiringSecrets(days: number = 30): Promise<ISecret[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + days);

    return Array.from(this.secrets.values()).filter(
      secret => secret.expiresAt != null && secret.expiresAt <= cutoffDate
    );
  }

  async validateSecret(key: string, value: string): Promise<boolean> {
    // Базовая валидация секретов
    if (!value || value.length < 8) {
      return false;
    }

    // Специфичная валидация для разных типов секретов
    if (key.includes('jwt') || key.includes('secret')) {
      return value.length >= 32;
    }

    if (key.includes('url')) {
      try {
        new globalThis.URL(value);
        return true;
      } catch {
        return false;
      }
    }

    if (key.includes('key') || key.includes('token')) {
      return value.length >= 16;
    }

    return true;
  }

  private async encryptSecret(value: string): Promise<string> {
    // В реальном приложении здесь была бы интеграция с KMS
    // Для демонстрации используем простое base64 кодирование
    return globalThis.Buffer.from(value).toString('base64');
  }

  private async decryptSecret(encryptedValue: string): Promise<string> {
    // В реальном приложении здесь была бы интеграция с KMS
    // Для демонстрации используем простое base64 декодирование
    return globalThis.Buffer.from(encryptedValue, 'base64').toString('utf-8');
  }

  async exportSecrets(
    service?: string,
    environment?: string,
    format: 'json' | 'env' = 'json'
  ): Promise<string> {
    const secrets = await this.getAllSecrets(service, environment);

    const decryptedSecrets: Record<string, string> = {};

    for (const secret of secrets) {
      const value = secret.encrypted
        ? await this.decryptSecret(secret.value)
        : secret.value;
      decryptedSecrets[secret.key] = value;
    }

    switch (format) {
      case 'json':
        return JSON.stringify(decryptedSecrets, null, 2);

      case 'env':
        return Object.entries(decryptedSecrets)
          .map(
            ([key, value]) =>
              `${key.toUpperCase().replace(/\./g, '_')}=${value}`
          )
          .join('\n');

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  async getKMSConfig(): Promise<IKMSConfig> {
    return { ...this.kmsConfig };
  }

  async updateKMSConfig(config: Partial<IKMSConfig>): Promise<void> {
    this.kmsConfig = { ...this.kmsConfig, ...config };
    this.logger.log(`KMS config updated: ${JSON.stringify(this.kmsConfig)}`);
  }
}

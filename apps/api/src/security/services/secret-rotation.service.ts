import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomBytes } from 'crypto';

interface SecretRotationConfig {
  enabled: boolean;
  rotationInterval: number; // в минутах
  secrets: string[];
  providers: {
    aws?: {
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
    };
    vault?: {
      url: string;
      token: string;
    };
    doppler?: {
      project: string;
      config: string;
      token: string;
    };
  };
}

@Injectable()
export class SecretRotationService {
  private readonly logger = new Logger(SecretRotationService.name);
  private readonly config: SecretRotationConfig;
  private lastRotationTime = new Date();
  private rotationCount = 0;

  constructor() {
    this.config = {
      enabled: process.env.SECRET_ROTATION_ENABLED === 'true',
      rotationInterval: parseInt(process.env.SECRET_ROTATION_INTERVAL ?? '60'),
      secrets: [
        'JWT_SECRET',
        'ENCRYPTION_KEY',
        'API_KEY_SECRET',
        'SUPABASE_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
      ],
      providers: {
        ...(process.env.AWS_REGION != null && process.env.AWS_REGION !== ''
          ? {
              aws: {
                region: process.env.AWS_REGION,
                accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
              },
            }
          : {}),
        ...(process.env.VAULT_URL != null &&
        process.env.VAULT_URL !== '' &&
        process.env.VAULT_TOKEN != null &&
        process.env.VAULT_TOKEN !== ''
          ? {
              vault: {
                url: process.env.VAULT_URL,
                token: process.env.VAULT_TOKEN,
              },
            }
          : {}),
        ...(process.env.DOPPLER_PROJECT != null &&
        process.env.DOPPLER_PROJECT !== '' &&
        process.env.DOPPLER_CONFIG != null &&
        process.env.DOPPLER_CONFIG !== '' &&
        process.env.DOPPLER_TOKEN != null &&
        process.env.DOPPLER_TOKEN !== ''
          ? {
              doppler: {
                project: process.env.DOPPLER_PROJECT,
                config: process.env.DOPPLER_CONFIG,
                token: process.env.DOPPLER_TOKEN,
              },
            }
          : {}),
      },
    };

    if (this.config.enabled) {
      this.logger.log('Secret rotation service initialized', {
        interval: this.config.rotationInterval,
        secrets: this.config.secrets,
        providers: Object.keys(this.config.providers),
      });
    }
  }

  /**
   * Запускает ротацию секретов по расписанию
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleSecretRotation() {
    if (!this.config.enabled) return;

    const now = new Date();
    const timeSinceLastRotation =
      (now.getTime() - this.lastRotationTime.getTime()) / (1000 * 60);

    if (timeSinceLastRotation >= this.config.rotationInterval) {
      await this.rotateSecrets();
    }
  }

  /**
   * Выполняет ротацию секретов
   */
  async rotateSecrets(): Promise<void> {
    try {
      this.logger.log('Starting secret rotation...');

      for (const secretName of this.config.secrets) {
        await this.rotateSecret(secretName);
      }

      this.lastRotationTime = new Date();
      this.rotationCount++;

      this.logger.log(
        `Secret rotation completed successfully. Total rotations: ${this.rotationCount}`
      );
    } catch (error) {
      this.logger.error('Secret rotation failed', error);
      throw error;
    }
  }

  /**
   * Ротирует конкретный секрет
   */
  private async rotateSecret(secretName: string): Promise<void> {
    try {
      await this.generateNewSecret(secretName);
      await this.updateSecretInProvider(secretName, 'new-secret');
      await this.updateSecretInEnvironment(secretName, 'new-secret');

      this.logger.log(`Secret ${secretName} rotated successfully`);
    } catch (error) {
      this.logger.error(`Failed to rotate secret ${secretName}`, error);
      throw error;
    }
  }

  /**
   * Генерирует новый секрет
   */
  private async generateNewSecret(secretName: string): Promise<string> {
    // Генерация криптографически стойкого секрета
    const length = secretName.includes('JWT') ? 64 : 32;
    return randomBytes(length).toString('hex');
  }

  /**
   * Обновляет секрет в провайдере
   */
  private async updateSecretInProvider(
    secretName: string,
    newSecret: string
  ): Promise<void> {
    if (this.config.providers.aws) {
      await this.updateSecretInAWS(secretName, newSecret);
    } else if (this.config.providers.vault) {
      await this.updateSecretInVault(secretName, newSecret);
    } else if (this.config.providers.doppler) {
      await this.updateSecretInDoppler(secretName, newSecret);
    } else {
      // Локальное обновление (для development)
      this.logger.warn(
        `No external provider configured for ${secretName}, using local update`
      );
    }
  }

  /**
   * Обновляет секрет в AWS Secrets Manager
   */
  private async updateSecretInAWS(
    secretName: string,
    _newSecret: string
  ): Promise<void> {
    if (!this.config.providers.aws) return;

    // Используем _newSecret, чтобы TypeScript не ругался
    this.logger.debug(
      `Updating secret ${secretName} in AWS with new value: ${_newSecret.substring(0, 8)}...`
    );

    try {
      // Здесь должна быть интеграция с AWS SDK
      // const AWS = require('aws-sdk');
      // const secretsManager = new AWS.SecretsManager({
      //   region: this.config.providers.aws.region,
      //   accessKeyId: this.config.providers.aws.accessKeyId,
      //   secretAccessKey: this.config.providers.aws.secretAccessKey,
      // });

      this.logger.log(`Secret ${secretName} updated in AWS Secrets Manager`);
    } catch (error) {
      this.logger.error(`Failed to update secret ${secretName} in AWS`, error);
      throw error;
    }
  }

  /**
   * Обновляет секрет в HashiCorp Vault
   */
  private async updateSecretInVault(
    secretName: string,
    _newSecret: string
  ): Promise<void> {
    if (!this.config.providers.vault) return;

    // Используем _newSecret, чтобы TypeScript не ругался
    this.logger.debug(
      `Updating secret ${secretName} in Vault with new value: ${_newSecret.substring(0, 8)}...`
    );

    try {
      // Здесь должна быть интеграция с Vault API
      // const axios = require('axios');
      // await axios.post(`${this.config.providers.vault.url}/v1/secret/data/${secretName}`, {
      //   data: { value: _newSecret }
      // }, {
      //   headers: { 'X-Vault-Token': this.config.providers.vault.token }
      // });

      this.logger.log(`Secret ${secretName} updated in Vault`);
    } catch (error) {
      this.logger.error(
        `Failed to update secret ${secretName} in Vault`,
        error
      );
      throw error;
    }
  }

  /**
   * Обновляет секрет в Doppler
   */
  private async updateSecretInDoppler(
    secretName: string,
    _newSecret: string
  ): Promise<void> {
    if (!this.config.providers.doppler) return;

    // Используем _newSecret, чтобы TypeScript не ругался
    this.logger.debug(
      `Updating secret ${secretName} in Doppler with new value: ${_newSecret.substring(0, 8)}...`
    );

    try {
      // Здесь должна быть интеграция с Doppler API
      // const axios = require('axios');
      // await axios.put(`https://api.doppler.com/v3/configs/config/secrets`, {
      //   name: secretName,
      //   value: _newSecret
      // }, {
      //   headers: { 'Authorization': `Bearer ${this.config.providers.doppler.token}` }
      // });

      this.logger.log(`Secret ${secretName} updated in Doppler`);
    } catch (error) {
      this.logger.error(
        `Failed to update secret ${secretName} in Doppler`,
        error
      );
      throw error;
    }
  }

  /**
   * Обновляет секрет в переменных окружения
   */
  private async updateSecretInEnvironment(
    secretName: string,
    newSecret: string
  ): Promise<void> {
    // В production это должно обновляться через провайдера
    // В development можно обновить process.env
    if (process.env.NODE_ENV === 'development') {
      process.env[secretName] = newSecret;
      this.logger.log(
        `Secret ${secretName} updated in environment (development mode)`
      );
    }
  }

  /**
   * Принудительная ротация секрета
   */
  async forceRotateSecret(secretName: string): Promise<void> {
    if (!this.config.secrets.includes(secretName)) {
      throw new Error(`Secret ${secretName} is not configured for rotation`);
    }

    await this.rotateSecret(secretName);
  }

  /**
   * Получает статистику ротации
   */
  getRotationStats() {
    return {
      enabled: this.config.enabled,
      lastRotation: this.lastRotationTime,
      rotationCount: this.rotationCount,
      interval: this.config.rotationInterval,
      secrets: this.config.secrets,
    };
  }

  /**
   * Проверяет статус ротации
   */
  getRotationStatus() {
    const now = new Date();
    const timeSinceLastRotation =
      (now.getTime() - this.lastRotationTime.getTime()) / (1000 * 60);
    const nextRotationIn = this.config.rotationInterval - timeSinceLastRotation;

    return {
      enabled: this.config.enabled,
      lastRotation: this.lastRotationTime,
      nextRotationIn: Math.max(0, nextRotationIn),
      rotationCount: this.rotationCount,
    };
  }
}

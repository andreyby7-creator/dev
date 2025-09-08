import { Injectable, Logger } from '@nestjs/common';
import { getConfig } from '../config/env.config';

export interface IEnvSchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description?: string;
  defaultValue?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
  };
}

export interface IEnvSchema {
  fields: IEnvSchemaField[];
  metadata: {
    generatedAt: Date;
    version: string;
    environment: string;
  };
}

export interface IGeneratedEnvExample {
  content: string;
  fields: IEnvSchemaField[];
  metadata: IEnvSchema['metadata'];
}

@Injectable()
export class EnvSchemaGeneratorService {
  private readonly logger = new Logger(EnvSchemaGeneratorService.name);

  /**
   * Генерирует .env.example из Zod схемы
   */
  async generateEnvExample(): Promise<IGeneratedEnvExample> {
    const config = getConfig();
    const schema = this.extractSchemaFromConfig(config);

    const content = this.generateEnvContent(schema);

    const result: IGeneratedEnvExample = {
      content,
      fields: schema.fields,
      metadata: schema.metadata,
    };

    this.logger.log('Generated .env.example from Zod schema', {
      fieldCount: schema.fields.length,
      requiredFields: schema.fields.filter(f => f.required).length,
    });

    return result;
  }

  /**
   * Извлекает схему из конфигурации
   */
  private extractSchemaFromConfig(config: unknown): IEnvSchema {
    const fields: IEnvSchemaField[] = [];

    // Анализируем структуру конфигурации
    this.analyzeConfigStructure(config, fields);

    return {
      fields,
      metadata: {
        generatedAt: new Date(),
        version: process.env.npm_package_version ?? '1.0.0',
        environment: process.env.NODE_ENV ?? 'development',
      },
    };
  }

  /**
   * Анализирует структуру конфигурации
   */
  private analyzeConfigStructure(
    obj: unknown,
    fields: IEnvSchemaField[],
    prefix = ''
  ): void {
    if (typeof obj !== 'object' || obj == null) {
      return;
    }

    for (const [key, value] of Object.entries(obj)) {
      const fieldName = prefix ? `${prefix}_${key}` : key;

      if (typeof value === 'object' && value != null && !Array.isArray(value)) {
        // Рекурсивно анализируем вложенные объекты
        this.analyzeConfigStructure(value, fields, fieldName);
      } else {
        // Добавляем поле
        const field: IEnvSchemaField = {
          name: fieldName.toUpperCase(),
          type: this.determineType(value),
          required: this.isRequired(value),
          description: this.generateDescription(key),
          defaultValue: this.generateDefaultValue(value),
          validation: this.generateValidation(key) ?? {},
        };

        fields.push(field);
      }
    }
  }

  /**
   * Определяет тип значения
   */
  private determineType(value: unknown): IEnvSchemaField['type'] {
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object' && value != null) return 'object';
    return 'string';
  }

  /**
   * Определяет, является ли поле обязательным
   */
  private isRequired(value: unknown): boolean {
    // Поля с пустыми значениями считаются обязательными
    if (value === '' || value === null || value === undefined) return true;
    return false;
  }

  /**
   * Генерирует описание поля
   */
  private generateDescription(key: string): string {
    const descriptions: Record<string, string> = {
      NODE_ENV: 'Application environment (development, staging, production)',
      PORT: 'Port number for the application server',
      DATABASE_URL: 'Database connection string',
      REDIS_URL: 'Redis connection string',
      JWT_SECRET: 'Secret key for JWT token signing',
      API_KEY: 'API key for external services',
      LOG_LEVEL: 'Logging level (debug, info, warn, error)',
      CORS_ORIGIN: 'Allowed CORS origins',
      RATE_LIMIT_WINDOW: 'Rate limiting window in milliseconds',
      RATE_LIMIT_MAX: 'Maximum requests per window',
    };

    return descriptions[key.toUpperCase()] ?? `Configuration for ${key}`;
  }

  /**
   * Генерирует значение по умолчанию
   */
  private generateDefaultValue(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value.toString();
    if (Array.isArray(value)) return JSON.stringify(value);
    if (typeof value === 'object') return JSON.stringify(value);
    return '';
  }

  /**
   * Генерирует правила валидации
   */
  private generateValidation(key: string): IEnvSchemaField['validation'] {
    const validation: IEnvSchemaField['validation'] = {};

    // Добавляем специфичные правила валидации
    if (key.toLowerCase().includes('port')) {
      validation.min = 1;
      validation.max = 65535;
    }

    if (key.toLowerCase().includes('url')) {
      validation.pattern = '^https?://.+';
    }

    if (key.toLowerCase().includes('email')) {
      validation.pattern = '^[^@]+@[^@]+\\.[^@]+$';
    }

    if (key.toLowerCase().includes('env')) {
      validation.enum = ['development', 'staging', 'production', 'test'];
    }

    if (key.toLowerCase().includes('level')) {
      validation.enum = ['debug', 'info', 'warn', 'error'];
    }

    return Object.keys(validation).length > 0 ? validation : undefined;
  }

  /**
   * Генерирует содержимое .env.example файла
   */
  private generateEnvContent(schema: IEnvSchema): string {
    let content = `# Environment Configuration\n`;
    content += `# Generated automatically from Zod schema\n`;
    content += `# Generated at: ${schema.metadata.generatedAt.toISOString()}\n`;
    content += `# Version: ${schema.metadata.version}\n`;
    content += `# Environment: ${schema.metadata.environment}\n\n`;

    // Группируем поля по категориям
    const categories = this.groupFieldsByCategory(schema.fields);

    for (const [category, fields] of Object.entries(categories)) {
      content += `# ${category}\n`;

      for (const field of fields) {
        content += this.generateFieldLine(field);
      }

      content += '\n';
    }

    return content;
  }

  /**
   * Группирует поля по категориям
   */
  private groupFieldsByCategory(
    fields: IEnvSchemaField[]
  ): Record<string, IEnvSchemaField[]> {
    const categories: Record<string, IEnvSchemaField[]> = {
      Application: [],
      Database: [],
      Redis: [],
      Security: [],
      Logging: [],
      'External Services': [],
      'Rate Limiting': [],
      Other: [],
    };

    for (const field of fields) {
      const name = field.name.toLowerCase();

      if (name.includes('node_env') || name.includes('port')) {
        if (categories['Application']) {
          categories['Application'].push(field);
        }
      } else if (name.includes('database') || name.includes('db')) {
        if (categories['Database']) {
          categories['Database'].push(field);
        }
      } else if (name.includes('redis')) {
        if (categories['Redis']) {
          categories['Redis'].push(field);
        }
      } else if (
        name.includes('jwt') ||
        name.includes('secret') ||
        name.includes('key')
      ) {
        if (categories['Security']) {
          categories['Security'].push(field);
        }
      } else if (name.includes('log')) {
        if (categories['Logging']) {
          categories['Logging'].push(field);
        }
      } else if (name.includes('api') || name.includes('external')) {
        if (categories['External Services']) {
          categories['External Services'].push(field);
        }
      } else if (name.includes('rate') || name.includes('limit')) {
        if (categories['Rate Limiting']) {
          categories['Rate Limiting'].push(field);
        }
      } else {
        if (categories['Other']) {
          categories['Other'].push(field);
        }
      }
    }

    // Удаляем пустые категории
    for (const [category, fields] of Object.entries(categories)) {
      if (fields.length === 0) {
        delete categories[category];
      }
    }

    return categories;
  }

  /**
   * Генерирует строку для поля в .env файле
   */
  private generateFieldLine(field: IEnvSchemaField): string {
    let line = `${field.name}=`;

    if (field.defaultValue != null) {
      line += field.defaultValue;
    } else if (field.required) {
      line += '<REQUIRED>';
    } else {
      line += '<OPTIONAL>';
    }

    if (field.description != null && field.description !== '') {
      line += ` # ${field.description}`;
    }

    return line + '\n';
  }

  /**
   * Валидирует существующий .env файл
   */
  async validateEnvFile(envContent: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    missingFields: string[];
  }> {
    const schema = await this.generateEnvExample();
    const lines = envContent.split('\n');
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingFields: string[] = [];

    // Проверяем обязательные поля
    for (const field of schema.fields) {
      if (field.required) {
        const hasField = lines.some(
          line =>
            line.trim().startsWith(`${field.name}=`) &&
            !line.trim().startsWith('#')
        );

        if (!hasField) {
          missingFields.push(field.name);
          errors.push(`Missing required field: ${field.name}`);
        }
      }
    }

    // Проверяем валидацию значений
    for (const line of lines) {
      if (line.trim().startsWith('#') || line.trim() === '') continue;

      const [key, value] = line.split('=');
      if (key == null || value == null) continue;

      const field = schema.fields.find(f => f.name === key.trim());
      if (field == null) continue;

      // Проверяем валидацию
      if (field.validation != null) {
        const validationResult = this.validateFieldValue(field, value.trim());
        if (!validationResult.valid) {
          errors.push(`Invalid value for ${key}: ${validationResult.error}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      missingFields,
    };
  }

  /**
   * Валидирует значение поля
   */
  private validateFieldValue(
    field: IEnvSchemaField,
    value: string
  ): {
    valid: boolean;
    error?: string;
  } {
    if (field.validation == null) return { valid: true };

    // Проверяем минимальное значение
    if (field.validation.min != null) {
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < field.validation.min) {
        return {
          valid: false,
          error: `Value must be >= ${field.validation.min}`,
        };
      }
    }

    // Проверяем максимальное значение
    if (field.validation.max != null) {
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue > field.validation.max) {
        return {
          valid: false,
          error: `Value must be <= ${field.validation.max}`,
        };
      }
    }

    // Проверяем паттерн
    if (field.validation.pattern != null && field.validation.pattern !== '') {
      const regex = new RegExp(field.validation.pattern);
      if (!regex.test(value)) {
        return {
          valid: false,
          error: `Value must match pattern: ${field.validation.pattern}`,
        };
      }
    }

    // Проверяем enum
    if (
      field.validation.enum != null &&
      field.validation.enum.length > 0 &&
      !field.validation.enum.includes(value)
    ) {
      return {
        valid: false,
        error: `Value must be one of: ${field.validation.enum.join(', ')}`,
      };
    }

    return { valid: true };
  }
}

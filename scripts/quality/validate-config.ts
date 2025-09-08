#!/usr/bin/env node

/**
 * Строгие проверки CI для конфигурации
 * Проверяет:
 * - Все переменные описаны в env.config.ts
 * - Нет неиспользуемых переменных
 * - Схема валидна
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

class ConfigValidator {
  private envConfigPath = join(
    process.cwd(),
    'apps/api/src/config/env.config.ts'
  );
  private envExamplePath = join(process.cwd(), '.env.example');
  private envPath = join(process.cwd(), '.env');

  /**
   * Извлекает переменные из Zod схемы
   */
  private extractSchemaVariables(): string[] {
    if (!existsSync(this.envConfigPath)) {
      throw new Error(`Файл конфигурации не найден: ${this.envConfigPath}`);
    }

    const content = readFileSync(this.envConfigPath, 'utf-8');
    const lines = content.split('\n');
    const variables: string[] = [];

    for (const line of lines) {
      // Ищем строки вида: VARIABLE_NAME: z.string()
      const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*:/);
      if (match) {
        variables.push(match[1]);
      }
    }

    return variables;
  }

  /**
   * Извлекает переменные из .env.example
   */
  private extractEnvExampleVariables(): string[] {
    if (!existsSync(this.envExamplePath)) {
      return [];
    }

    const content = readFileSync(this.envExamplePath, 'utf-8');
    const lines = content.split('\n');
    const variables: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)/);
        if (match) {
          variables.push(match[1]);
        }
      }
    }

    return variables;
  }

  /**
   * Извлекает переменные из .env
   */
  private extractEnvVariables(): string[] {
    if (!existsSync(this.envPath)) {
      return [];
    }

    const content = readFileSync(this.envPath, 'utf-8');
    const lines = content.split('\n');
    const variables: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)/);
        if (match) {
          variables.push(match[1]);
        }
      }
    }

    return variables;
  }

  /**
   * Проверяет, что все переменные из .env описаны в схеме
   */
  private checkAllEnvVariablesInSchema(): string[] {
    const schemaVars = this.extractSchemaVariables();
    const envVars = this.extractEnvVariables();
    const errors: string[] = [];

    for (const envVar of envVars) {
      if (!schemaVars.includes(envVar)) {
        errors.push(
          `Переменная ${envVar} используется в .env, но не описана в схеме`
        );
      }
    }

    return errors;
  }

  /**
   * Проверяет, что все переменные из .env.example описаны в схеме
   */
  private checkAllExampleVariablesInSchema(): string[] {
    const schemaVars = this.extractSchemaVariables();
    const exampleVars = this.extractEnvExampleVariables();
    const errors: string[] = [];

    for (const exampleVar of exampleVars) {
      if (!schemaVars.includes(exampleVar)) {
        errors.push(
          `Переменная ${exampleVar} указана в .env.example, но не описана в схеме`
        );
      }
    }

    return errors;
  }

  /**
   * Проверяет неиспользуемые переменные в схеме
   */
  private checkUnusedSchemaVariables(): string[] {
    const schemaVars = this.extractSchemaVariables();
    const envVars = this.extractEnvVariables();
    const exampleVars = this.extractEnvExampleVariables();
    const allUsedVars = [...new Set([...envVars, ...exampleVars])];
    const warnings: string[] = [];

    for (const schemaVar of schemaVars) {
      if (!allUsedVars.includes(schemaVar)) {
        warnings.push(
          `Переменная ${schemaVar} описана в схеме, но не используется в .env или .env.example`
        );
      }
    }

    return warnings;
  }

  /**
   * Проверяет синтаксис TypeScript файла конфигурации
   */
  private checkTypeScriptSyntax(): string[] {
    const errors: string[] = [];

    try {
      // Простая проверка синтаксиса через require
      require(this.envConfigPath);
    } catch (error) {
      errors.push(`Ошибка синтаксиса в ${this.envConfigPath}: ${error}`);
    }

    return errors;
  }

  /**
   * Выполняет все проверки
   */
  validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Проверка синтаксиса
      errors.push(...this.checkTypeScriptSyntax());

      // Проверка переменных
      errors.push(...this.checkAllEnvVariablesInSchema());
      errors.push(...this.checkAllExampleVariablesInSchema());

      // Предупреждения о неиспользуемых переменных
      warnings.push(...this.checkUnusedSchemaVariables());
    } catch (error) {
      errors.push(`Критическая ошибка валидации: ${error}`);
    }

    return {
      success: errors.length === 0,
      errors,
      warnings,
    };
  }
}

// Основная логика
function main() {
  console.log('🔍 Проверка конфигурации...\n');

  const validator = new ConfigValidator();
  const result = validator.validate();

  if (result.errors.length > 0) {
    console.log('❌ Ошибки конфигурации:');
    result.errors.forEach(error => {
      console.log(`  - ${error}`);
    });
    console.log();
  }

  if (result.warnings.length > 0) {
    console.log('⚠️  Предупреждения:');
    result.warnings.forEach(warning => {
      console.log(`  - ${warning}`);
    });
    console.log();
  }

  if (result.success) {
    console.log('✅ Конфигурация валидна!');
    process.exit(0);
  } else {
    console.log('❌ Конфигурация содержит ошибки!');
    process.exit(1);
  }
}

// Запуск только если файл выполняется напрямую
if (require.main === module) {
  main();
}

export { ConfigValidator };

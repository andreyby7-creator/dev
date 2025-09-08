#!/usr/bin/env node

/**
 * Детектор неиспользуемых переменных конфигурации
 * Анализирует код и находит переменные, которые определены в схеме, но не используются
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

interface DeadConfigResult {
  unusedVariables: string[];
  usedVariables: string[];
  totalVariables: number;
}

class DeadConfigDetector {
  private envConfigPath = join(
    process.cwd(),
    'apps/api/src/config/env.config.ts'
  );
  private sourceDir = join(process.cwd(), 'apps/api/src');
  private excludedDirs = ['node_modules', '.git', 'dist', 'build', 'coverage'];

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
   * Рекурсивно находит все TypeScript файлы
   */
  private findTypeScriptFiles(dir: string): string[] {
    const files: string[] = [];

    if (!existsSync(dir)) return files;

    const items = readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = join(dir, item.name);

      if (item.isDirectory()) {
        if (!this.excludedDirs.includes(item.name)) {
          files.push(...this.findTypeScriptFiles(fullPath));
        }
      } else if (item.isFile() && item.name.endsWith('.ts')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Ищет использование переменных в файле
   */
  private findVariableUsageInFile(
    filePath: string,
    variables: string[]
  ): string[] {
    const content = readFileSync(filePath, 'utf-8');
    const usedVariables: string[] = [];

    for (const variable of variables) {
      // Ищем различные способы использования переменной
      const patterns = [
        new RegExp(`getEnv\\s*\\(\\s*['"]${variable}['"]`, 'g'),
        new RegExp(`process\\.env\\.${variable}`, 'g'),
        new RegExp(`config\\.${variable}`, 'g'),
        new RegExp(`getConfig\\(\\)\\.${variable}`, 'g'),
        new RegExp(`getDatabaseConfig\\(\\)\\.${variable}`, 'g'),
        new RegExp(`getRedisConfig\\(\\)\\.${variable}`, 'g'),
        new RegExp(`getFeatureFlagsConfig\\(\\)\\.${variable}`, 'g'),
        new RegExp(`getSecurityConfig\\(\\)\\.${variable}`, 'g'),
        new RegExp(`getMonitoringConfig\\(\\)\\.${variable}`, 'g'),
      ];

      for (const pattern of patterns) {
        if (pattern.test(content)) {
          usedVariables.push(variable);
          break;
        }
      }
    }

    return usedVariables;
  }

  /**
   * Анализирует использование переменных во всех файлах
   */
  private analyzeVariableUsage(variables: string[]): string[] {
    const files = this.findTypeScriptFiles(this.sourceDir);
    const usedVariables = new Set<string>();

    for (const file of files) {
      const fileUsage = this.findVariableUsageInFile(file, variables);
      fileUsage.forEach(variable => usedVariables.add(variable));
    }

    return Array.from(usedVariables);
  }

  /**
   * Выполняет анализ неиспользуемых переменных
   */
  detect(): DeadConfigResult {
    const schemaVariables = this.extractSchemaVariables();
    const usedVariables = this.analyzeVariableUsage(schemaVariables);
    const unusedVariables = schemaVariables.filter(
      variable => !usedVariables.includes(variable)
    );

    return {
      unusedVariables,
      usedVariables,
      totalVariables: schemaVariables.length,
    };
  }

  /**
   * Генерирует отчет
   */
  generateReport(result: DeadConfigResult): string {
    const { unusedVariables, usedVariables, totalVariables } = result;

    let report = '🔍 Отчет о неиспользуемых переменных конфигурации\n';
    report += '='.repeat(50) + '\n\n';

    report += `📊 Статистика:\n`;
    report += `  Всего переменных в схеме: ${totalVariables}\n`;
    report += `  Используется: ${usedVariables.length}\n`;
    report += `  Не используется: ${unusedVariables.length}\n`;
    report += `  Процент использования: ${((usedVariables.length / totalVariables) * 100).toFixed(1)}%\n\n`;

    if (unusedVariables.length > 0) {
      report += '❌ Неиспользуемые переменные:\n';
      unusedVariables.forEach(variable => {
        report += `  - ${variable}\n`;
      });
      report += '\n';
    }

    if (usedVariables.length > 0) {
      report += '✅ Используемые переменные:\n';
      usedVariables.forEach(variable => {
        report += `  - ${variable}\n`;
      });
      report += '\n';
    }

    if (unusedVariables.length > 0) {
      report += '💡 Рекомендации:\n';
      report += '  - Рассмотрите удаление неиспользуемых переменных из схемы\n';
      report += '  - Обновите .env.example, убрав неиспользуемые переменные\n';
      report +=
        '  - Проверьте, не используются ли переменные в других частях проекта\n';
    } else {
      report += '🎉 Отлично! Все переменные используются.\n';
    }

    return report;
  }
}

// Основная логика
function main() {
  console.log('🔍 Поиск неиспользуемых переменных конфигурации...\n');

  try {
    const detector = new DeadConfigDetector();
    const result = detector.detect();
    const report = detector.generateReport(result);

    console.log(report);

    if (result.unusedVariables.length > 0) {
      console.log('⚠️  Обнаружены неиспользуемые переменные!');
      process.exit(1);
    } else {
      console.log('✅ Все переменные используются!');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Ошибка анализа:', error);
    process.exit(1);
  }
}

// Запуск только если файл выполняется напрямую
if (require.main === module) {
  main();
}

export { DeadConfigDetector };

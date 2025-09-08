import { Injectable, Logger } from '@nestjs/common';
import * as ts from 'typescript';

// Типы
type TransformationType =
  | 'RENAME'
  | 'ADD_PROPERTY'
  | 'REMOVE_PROPERTY'
  | 'CHANGE_TYPE'
  | 'ADD_METHOD'
  | 'REMOVE_METHOD'
  | 'ADD_DECORATOR'
  | 'REMOVE_DECORATOR'
  | 'IMPORT_CHANGE'
  | 'EXPORT_CHANGE';
type TargetType =
  | 'CLASS'
  | 'INTERFACE'
  | 'FUNCTION'
  | 'VARIABLE'
  | 'IMPORT'
  | 'EXPORT'
  | 'DECORATOR';

// Интерфейсы
export interface ITransformationRule {
  id: string;
  name: string;
  type: TransformationType;
  targetType: TargetType;
  pattern: string;
  replacement: string;
  conditions?: Record<string, unknown>;
  description: string;
}

export interface ICodeTransformation {
  id: string;
  ruleId: string;
  filePath: string;
  originalCode: string;
  transformedCode: string;
  changes: ICodeChange[];
  success: boolean;
  errors: string[];
  timestamp: string;
}

export interface ICodeChange {
  type: 'ADD' | 'REMOVE' | 'MODIFY' | 'RENAME';
  line: number;
  column: number;
  originalText: string;
  newText: string;
  description: string;
}

export interface IBulkTransformationRequest {
  rules: ITransformationRule[];
  filePatterns: string[];
  dryRun?: boolean;
  backup?: boolean;
}

export interface IBulkTransformationResult {
  success: boolean;
  totalFiles: number;
  processedFiles: number;
  successfulFiles: number;
  failedFiles: number;
  transformations: ICodeTransformation[];
  summary: {
    addedLines: number;
    removedLines: number;
    modifiedLines: number;
    renamedItems: number;
  };
  errors: string[];
}

@Injectable()
export class AstCodeModService {
  private readonly logger = new Logger(AstCodeModService.name);
  private readonly transformationHistory: ICodeTransformation[] = [];
  private readonly predefinedRules: Map<string, ITransformationRule> =
    new Map();

  constructor() {
    this.initializePredefinedRules();
  }

  /**
   * Инициализация предопределенных правил трансформации
   */
  private initializePredefinedRules(): void {
    const rules: ITransformationRule[] = [
      {
        id: 'add-logger-to-service',
        name: 'Add Logger to Service',
        type: 'ADD_PROPERTY',
        targetType: 'CLASS',
        pattern: 'class\\s+(\\w+)Service\\s*{',
        replacement:
          'class $1Service {\n  private readonly logger = new Logger($1Service.name);',
        conditions: { hasLogger: false },
        description: 'Добавляет Logger в сервисы NestJS',
      },
      {
        id: 'add-swagger-decorators',
        name: 'Add Swagger Decorators',
        type: 'ADD_DECORATOR',
        targetType: 'CLASS',
        pattern: '@Controller\\(([^)]+)\\)',
        replacement: "@ApiTags('$1')\n@Controller($1)",
        conditions: { hasApiTags: false },
        description: 'Добавляет ApiTags декораторы к контроллерам',
      },
      {
        id: 'add-validation-decorators',
        name: 'Add Validation Decorators',
        type: 'ADD_DECORATOR',
        targetType: 'CLASS',
        pattern: '(\\w+):\\s*(string|number|boolean)',
        replacement: '@Is$2()\n  $1: $2',
        conditions: { hasValidation: false },
        description: 'Добавляет валидационные декораторы к DTO',
      },
      {
        id: 'rename-service-method',
        name: 'Rename Service Method',
        type: 'RENAME',
        targetType: 'FUNCTION',
        pattern: 'async\\s+(\\w+)\\([^)]*\\)\\s*:\\s*Promise<[^>]+>',
        replacement: 'async $1$2',
        conditions: { methodType: 'service' },
        description: 'Переименовывает методы в сервисах',
      },
      {
        id: 'add-error-handling',
        name: 'Add Error Handling',
        type: 'ADD_METHOD',
        targetType: 'CLASS',
        pattern: 'async\\s+(\\w+)\\([^)]*\\)\\s*{[^}]*}',
        replacement:
          'async $1($2) {\n    try {\n      $3\n    } catch (error) {\n      this.logger.error(`Error in $1: ${error.message}`);\n      throw error;\n    }\n  }',
        conditions: { hasErrorHandling: false },
        description: 'Добавляет обработку ошибок в методы',
      },
      {
        id: 'add-interface-properties',
        name: 'Add Interface Properties',
        type: 'ADD_PROPERTY',
        targetType: 'INTERFACE',
        pattern: 'interface\\s+(\\w+)\\s*{',
        replacement:
          'interface $1 {\n  id: string;\n  createdAt: string;\n  updatedAt: string;',
        conditions: { hasId: false },
        description: 'Добавляет базовые свойства к интерфейсам',
      },
      {
        id: 'add-import-statement',
        name: 'Add Import Statement',
        type: 'IMPORT_CHANGE',
        targetType: 'IMPORT',
        pattern: 'import\\s+{[^}]*}\\s+from\\s+[\'"]([^\'"]+)[\'"]',
        replacement: "import { $1 } from '$2';",
        conditions: { hasImport: false },
        description: 'Добавляет импорты',
      },
      {
        id: 'add-export-statement',
        name: 'Add Export Statement',
        type: 'EXPORT_CHANGE',
        targetType: 'EXPORT',
        pattern: 'class\\s+(\\w+)',
        replacement: 'export class $1',
        conditions: { hasExport: false },
        description: 'Добавляет экспорты к классам',
      },
      {
        id: 'add-type-annotations',
        name: 'Add Type Annotations',
        type: 'CHANGE_TYPE',
        targetType: 'VARIABLE',
        pattern: 'const\\s+(\\w+)\\s*=\\s*([^;]+);',
        replacement: 'const $1: $2 = $2;',
        conditions: { hasTypeAnnotation: false },
        description: 'Добавляет типизацию к переменным',
      },
      {
        id: 'add-async-await',
        name: 'Add Async/Await',
        type: 'CHANGE_TYPE',
        targetType: 'FUNCTION',
        pattern: 'function\\s+(\\w+)\\([^)]*\\)\\s*{[^}]*}',
        replacement: 'async function $1($2) {\n    $3\n  }',
        conditions: { hasAsync: false },
        description: 'Добавляет async/await к функциям',
      },
    ];

    rules.forEach(rule => {
      this.predefinedRules.set(rule.id, rule);
    });
  }

  /**
   * Выполнить массовую трансформацию кода
   */
  async performBulkTransformation(
    request: IBulkTransformationRequest
  ): Promise<IBulkTransformationResult> {
    this.logger.log(
      `Starting bulk transformation with ${request.rules.length} rules`
    );

    const result: IBulkTransformationResult = {
      success: false,
      totalFiles: 0,
      processedFiles: 0,
      successfulFiles: 0,
      failedFiles: 0,
      transformations: [],
      summary: {
        addedLines: 0,
        removedLines: 0,
        modifiedLines: 0,
        renamedItems: 0,
      },
      errors: [],
    };

    try {
      // Найти файлы по паттернам
      const files = await this.findFilesByPatterns();
      result.totalFiles = files.length;

      // Обработать каждый файл
      for (const filePath of files) {
        try {
          const transformation = await this.transformFile(
            filePath,
            request.rules,
            request.dryRun ?? false
          );

          if (transformation.success) {
            result.successfulFiles++;
            result.transformations.push(transformation);

            // Обновить статистику
            transformation.changes.forEach(change => {
              switch (change.type) {
                case 'ADD':
                  result.summary.addedLines +=
                    change.newText.split('\n').length;
                  break;
                case 'REMOVE':
                  result.summary.removedLines +=
                    change.originalText.split('\n').length;
                  break;
                case 'MODIFY':
                  result.summary.modifiedLines++;
                  break;
                case 'RENAME':
                  result.summary.renamedItems++;
                  break;
              }
            });
          } else {
            result.failedFiles++;
            result.errors.push(
              `Failed to transform ${filePath}: ${transformation.errors.join(', ')}`
            );
          }

          result.processedFiles++;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error occurred';
          result.failedFiles++;
          result.errors.push(`Error processing ${filePath}: ${errorMessage}`);
        }
      }

      result.success = result.failedFiles === 0;
      this.logger.log(
        `Bulk transformation completed: ${result.successfulFiles}/${result.totalFiles} files processed successfully`
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Bulk transformation failed: ${errorMessage}`);
      result.errors.push(errorMessage);
      return result;
    }
  }

  /**
   * Трансформировать отдельный файл
   */
  async transformFile(
    filePath: string,
    rules: ITransformationRule[],
    dryRun: boolean
  ): Promise<ICodeTransformation> {
    const transformation: ICodeTransformation = {
      id: this.generateTransformationId(),
      ruleId: rules.map(r => r.id).join(','),
      filePath,
      originalCode: '',
      transformedCode: '',
      changes: [],
      success: false,
      errors: [],
      timestamp: new Date().toISOString(),
    };

    try {
      // Читать исходный код
      const originalCode = await this.readFile();
      transformation.originalCode = originalCode;

      // Создать AST
      ts.createSourceFile(filePath, originalCode, ts.ScriptTarget.Latest, true);

      let transformedCode = originalCode;
      const changes: ICodeChange[] = [];

      // Применить каждое правило
      for (const rule of rules) {
        const ruleChanges = this.applyTransformationRule(rule, transformedCode);
        changes.push(...ruleChanges);

        // Обновить код после каждого правила
        transformedCode = this.applyChangesToCode(transformedCode, ruleChanges);
      }

      transformation.changes = changes;
      transformation.transformedCode = transformedCode;
      transformation.success = true;

      // Сохранить изменения если не dry run
      if (!dryRun) {
        await this.writeFile();
      }

      this.transformationHistory.push(transformation);
      this.logger.log(
        `File transformed successfully: ${filePath} (${changes.length} changes)`
      );

      return transformation;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      transformation.errors.push(errorMessage);
      this.logger.error(
        `File transformation failed: ${filePath} - ${errorMessage}`
      );
      return transformation;
    }
  }

  /**
   * Применить правило трансформации
   */
  private applyTransformationRule(
    rule: ITransformationRule,
    code: string
  ): ICodeChange[] {
    const changes: ICodeChange[] = [];

    try {
      switch (rule.type) {
        case 'RENAME':
          changes.push(...this.applyRenameTransformation(rule, code));
          break;
        case 'ADD_PROPERTY':
          changes.push(...this.applyAddPropertyTransformation(rule, code));
          break;
        case 'REMOVE_PROPERTY':
          changes.push(...this.applyRemovePropertyTransformation(rule, code));
          break;
        case 'CHANGE_TYPE':
          changes.push(...this.applyChangeTypeTransformation(rule, code));
          break;
        case 'ADD_METHOD':
          changes.push(...this.applyAddMethodTransformation(rule, code));
          break;
        case 'REMOVE_METHOD':
          changes.push(...this.applyRemoveMethodTransformation(rule, code));
          break;
        case 'ADD_DECORATOR':
          changes.push(...this.applyAddDecoratorTransformation(rule, code));
          break;
        case 'REMOVE_DECORATOR':
          changes.push(...this.applyRemoveDecoratorTransformation(rule, code));
          break;
        case 'IMPORT_CHANGE':
          changes.push(...this.applyImportChangeTransformation(rule, code));
          break;
        case 'EXPORT_CHANGE':
          changes.push(...this.applyExportChangeTransformation(rule, code));
          break;
        default:
          this.logger.warn(`Unknown transformation type: ${rule.type}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Error applying rule ${rule.id}: ${errorMessage}`);
    }

    return changes;
  }

  /**
   * Применить переименование
   */
  private applyRenameTransformation(
    rule: ITransformationRule,
    code: string
  ): ICodeChange[] {
    const changes: ICodeChange[] = [];
    const regex = new RegExp(rule.pattern, 'g');
    let match;

    while ((match = regex.exec(code)) !== null) {
      const newText = match[0].replace(
        new RegExp(rule.pattern),
        rule.replacement
      );

      changes.push({
        type: 'RENAME',
        line: this.getLineNumber(code, match.index),
        column: match.index,
        originalText: match[0],
        newText,
        description: `Renamed using rule: ${rule.name}`,
      });
    }

    return changes;
  }

  /**
   * Применить добавление свойства
   */
  private applyAddPropertyTransformation(
    rule: ITransformationRule,
    code: string
  ): ICodeChange[] {
    const changes: ICodeChange[] = [];
    const regex = new RegExp(rule.pattern, 'g');
    let match;

    while ((match = regex.exec(code)) !== null) {
      const newText = match[0].replace(
        new RegExp(rule.pattern),
        rule.replacement
      );

      changes.push({
        type: 'ADD',
        line: this.getLineNumber(code, match.index),
        column: match.index,
        originalText: match[0],
        newText,
        description: `Added property using rule: ${rule.name}`,
      });
    }

    return changes;
  }

  /**
   * Применить удаление свойства
   */
  private applyRemovePropertyTransformation(
    rule: ITransformationRule,
    code: string
  ): ICodeChange[] {
    const changes: ICodeChange[] = [];
    const regex = new RegExp(rule.pattern, 'g');
    let match;

    while ((match = regex.exec(code)) !== null) {
      changes.push({
        type: 'REMOVE',
        line: this.getLineNumber(code, match.index),
        column: match.index,
        originalText: match[0],
        newText: '',
        description: `Removed property using rule: ${rule.name}`,
      });
    }

    return changes;
  }

  /**
   * Применить изменение типа
   */
  private applyChangeTypeTransformation(
    rule: ITransformationRule,
    code: string
  ): ICodeChange[] {
    const changes: ICodeChange[] = [];
    const regex = new RegExp(rule.pattern, 'g');
    let match;

    while ((match = regex.exec(code)) !== null) {
      const newText = match[0].replace(
        new RegExp(rule.pattern),
        rule.replacement
      );

      changes.push({
        type: 'MODIFY',
        line: this.getLineNumber(code, match.index),
        column: match.index,
        originalText: match[0],
        newText,
        description: `Changed type using rule: ${rule.name}`,
      });
    }

    return changes;
  }

  /**
   * Применить добавление метода
   */
  private applyAddMethodTransformation(
    rule: ITransformationRule,
    code: string
  ): ICodeChange[] {
    const changes: ICodeChange[] = [];
    const regex = new RegExp(rule.pattern, 'g');
    let match;

    while ((match = regex.exec(code)) !== null) {
      const newText = match[0].replace(
        new RegExp(rule.pattern),
        rule.replacement
      );

      changes.push({
        type: 'ADD',
        line: this.getLineNumber(code, match.index),
        column: match.index,
        originalText: match[0],
        newText,
        description: `Added method using rule: ${rule.name}`,
      });
    }

    return changes;
  }

  /**
   * Применить удаление метода
   */
  private applyRemoveMethodTransformation(
    rule: ITransformationRule,
    code: string
  ): ICodeChange[] {
    const changes: ICodeChange[] = [];
    const regex = new RegExp(rule.pattern, 'g');
    let match;

    while ((match = regex.exec(code)) !== null) {
      changes.push({
        type: 'REMOVE',
        line: this.getLineNumber(code, match.index),
        column: match.index,
        originalText: match[0],
        newText: '',
        description: `Removed method using rule: ${rule.name}`,
      });
    }

    return changes;
  }

  /**
   * Применить добавление декоратора
   */
  private applyAddDecoratorTransformation(
    rule: ITransformationRule,
    code: string
  ): ICodeChange[] {
    const changes: ICodeChange[] = [];
    const regex = new RegExp(rule.pattern, 'g');
    let match;

    while ((match = regex.exec(code)) !== null) {
      const newText = match[0].replace(
        new RegExp(rule.pattern),
        rule.replacement
      );

      changes.push({
        type: 'ADD',
        line: this.getLineNumber(code, match.index),
        column: match.index,
        originalText: match[0],
        newText,
        description: `Added decorator using rule: ${rule.name}`,
      });
    }

    return changes;
  }

  /**
   * Применить удаление декоратора
   */
  private applyRemoveDecoratorTransformation(
    rule: ITransformationRule,
    code: string
  ): ICodeChange[] {
    const changes: ICodeChange[] = [];
    const regex = new RegExp(rule.pattern, 'g');
    let match;

    while ((match = regex.exec(code)) !== null) {
      changes.push({
        type: 'REMOVE',
        line: this.getLineNumber(code, match.index),
        column: match.index,
        originalText: match[0],
        newText: '',
        description: `Removed decorator using rule: ${rule.name}`,
      });
    }

    return changes;
  }

  /**
   * Применить изменение импорта
   */
  private applyImportChangeTransformation(
    rule: ITransformationRule,
    code: string
  ): ICodeChange[] {
    const changes: ICodeChange[] = [];
    const regex = new RegExp(rule.pattern, 'g');
    let match;

    while ((match = regex.exec(code)) !== null) {
      const newText = match[0].replace(
        new RegExp(rule.pattern),
        rule.replacement
      );

      changes.push({
        type: 'MODIFY',
        line: this.getLineNumber(code, match.index),
        column: match.index,
        originalText: match[0],
        newText,
        description: `Changed import using rule: ${rule.name}`,
      });
    }

    return changes;
  }

  /**
   * Применить изменение экспорта
   */
  private applyExportChangeTransformation(
    rule: ITransformationRule,
    code: string
  ): ICodeChange[] {
    const changes: ICodeChange[] = [];
    const regex = new RegExp(rule.pattern, 'g');
    let match;

    while ((match = regex.exec(code)) !== null) {
      const newText = match[0].replace(
        new RegExp(rule.pattern),
        rule.replacement
      );

      changes.push({
        type: 'MODIFY',
        line: this.getLineNumber(code, match.index),
        column: match.index,
        originalText: match[0],
        newText,
        description: `Changed export using rule: ${rule.name}`,
      });
    }

    return changes;
  }

  /**
   * Применить изменения к коду
   */
  private applyChangesToCode(code: string, changes: ICodeChange[]): string {
    let result = code;

    // Сортируем изменения в обратном порядке, чтобы индексы не сбились
    const sortedChanges = [...changes].sort((a, b) => {
      const aIndex = this.getIndexFromLineColumn(code, a.line, a.column);
      const bIndex = this.getIndexFromLineColumn(code, b.line, b.column);
      return bIndex - aIndex;
    });

    for (const change of sortedChanges) {
      const index = this.getIndexFromLineColumn(
        result,
        change.line,
        change.column
      );
      if (index !== -1) {
        result =
          result.slice(0, index) +
          change.newText +
          result.slice(index + change.originalText.length);
      }
    }

    return result;
  }

  /**
   * Получить номер строки по индексу
   */
  private getLineNumber(code: string, index: number): number {
    return code.substring(0, index).split('\n').length;
  }

  /**
   * Получить индекс по номеру строки и колонки
   */
  private getIndexFromLineColumn(
    code: string,
    line: number,
    column: number
  ): number {
    const lines = code.split('\n');
    let index = 0;

    for (let i = 0; i < line - 1; i++) {
      index += lines[i]?.length ?? 0 + 1; // +1 для \n
    }

    return index + column - 1;
  }

  /**
   * Найти файлы по паттернам
   */
  private async findFilesByPatterns(): Promise<string[]> {
    // В реальной реализации здесь была бы логика поиска файлов
    // Для демонстрации возвращаем пустой массив
    return [];
  }

  /**
   * Читать файл
   */
  private async readFile(): Promise<string> {
    // В реальной реализации здесь была бы логика чтения файла
    return '';
  }

  /**
   * Записать файл
   */
  private async writeFile(): Promise<void> {
    // В реальной реализации здесь была бы логика записи файла
  }

  /**
   * Генерировать ID трансформации
   */
  private generateTransformationId(): string {
    return `transformation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Получить предопределенные правила
   */
  getPredefinedRules(): ITransformationRule[] {
    return Array.from(this.predefinedRules.values());
  }

  /**
   * Добавить пользовательское правило
   */
  addCustomRule(rule: ITransformationRule): void {
    this.predefinedRules.set(rule.id, rule);
    this.logger.log(`Custom rule added: ${rule.name}`);
  }

  /**
   * Получить историю трансформаций
   */
  getTransformationHistory(): ICodeTransformation[] {
    return this.transformationHistory;
  }
}

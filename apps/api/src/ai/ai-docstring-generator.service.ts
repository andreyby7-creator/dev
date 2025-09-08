import { Injectable, Logger } from '@nestjs/common';

// Типы
type DocstringType =
  | 'function'
  | 'class'
  | 'interface'
  | 'method'
  | 'property'
  | 'enum'
  | 'type';

type DocumentationStyle = 'jsdoc' | 'tsdoc' | 'google' | 'jsdoc-extended';

type Language = 'typescript' | 'javascript';

// Интерфейсы
export interface IDocstringRequest {
  type: DocstringType;
  name: string;
  language: Language;
  style: DocumentationStyle;
  description?: string;
  parameters?: IParameter[];
  returnType?: string;
  throws?: string[];
  examples?: string[];
  tags?: Record<string, string>;
  context?: string;
}

export interface IParameter {
  name: string;
  type: string;
  description?: string;
  required: boolean;
  defaultValue?: unknown;
}

export interface IDocstringResult {
  success: boolean;
  docstring: string;
  formatted: string;
  suggestions: string[];
  warnings: string[];
  metadata: {
    lineCount: number;
    characterCount: number;
    complexity: 'low' | 'medium' | 'high';
  };
}

export interface IDocstringTemplate {
  id: string;
  type: DocstringType;
  style: DocumentationStyle;
  template: string;
  variables: string[];
  description: string;
}

@Injectable()
export class AiDocstringGeneratorService {
  private readonly logger = new Logger(AiDocstringGeneratorService.name);
  private readonly templates: Map<string, IDocstringTemplate> = new Map();
  private readonly generationHistory: IDocstringResult[] = [];

  constructor() {
    this.initializeTemplates();
  }

  /**
   * Инициализация шаблонов docstring
   */
  private initializeTemplates(): void {
    const templates: IDocstringTemplate[] = [
      // JSDoc шаблоны
      {
        id: 'jsdoc-function',
        type: 'function',
        style: 'jsdoc',
        template: `/**
 * {{description}}
 * 
 * @param {string} {{paramName}} - {{paramDescription}}
 * @returns {string} {{returnDescription}}
 * @throws {Error} {{throwsDescription}}
 * @example
 * {{example}}
 */`,
        variables: [
          'description',
          'paramName',
          'paramDescription',
          'returnDescription',
          'throwsDescription',
          'example',
        ],
        description: 'JSDoc шаблон для функций',
      },
      {
        id: 'jsdoc-class',
        type: 'class',
        style: 'jsdoc',
        template: `/**
 * {{description}}
 * 
 * @class {{className}}
 * @description {{classDescription}}
 * @example
 * {{example}}
 */`,
        variables: ['description', 'className', 'classDescription', 'example'],
        description: 'JSDoc шаблон для классов',
      },
      {
        id: 'jsdoc-method',
        type: 'method',
        style: 'jsdoc',
        template: `/**
 * {{description}}
 * 
 * @param {string} {{paramName}} - {{paramDescription}}
 * @returns {Promise<{{returnType}}>} {{returnDescription}}
 * @throws {Error} {{throwsDescription}}
 */`,
        variables: [
          'description',
          'paramName',
          'paramDescription',
          'returnType',
          'returnDescription',
          'throwsDescription',
        ],
        description: 'JSDoc шаблон для методов',
      },
      // TSDoc шаблоны
      {
        id: 'tsdoc-function',
        type: 'function',
        style: 'tsdoc',
        template: `/**
 * {{description}}
 * 
 * @param {{paramName}} - {{paramDescription}}
 * @returns {{returnDescription}}
 * @throws {{throwsDescription}}
 * 
 * @example
 * {{example}}
 */`,
        variables: [
          'description',
          'paramName',
          'paramDescription',
          'returnDescription',
          'throwsDescription',
          'example',
        ],
        description: 'TSDoc шаблон для функций',
      },
      {
        id: 'tsdoc-interface',
        type: 'interface',
        style: 'tsdoc',
        template: `/**
 * {{description}}
 * 
 * @interface {{interfaceName}}
 * @description {{interfaceDescription}}
 */`,
        variables: ['description', 'interfaceName', 'interfaceDescription'],
        description: 'TSDoc шаблон для интерфейсов',
      },
      {
        id: 'tsdoc-class',
        type: 'class',
        style: 'tsdoc',
        template: `/**
 * {{description}}
 * 
 * @class {{className}}
 * @description {{description}}
 */`,
        variables: ['description', 'className'],
        description: 'TSDoc шаблон для классов',
      },
      // Google стиль
      {
        id: 'google-function',
        type: 'function',
        style: 'google',
        template: `/**
 * {{description}}
 * 
 * Args:
 *   {{paramName}}: {{paramDescription}}
 * 
 * Returns:
 *   {{returnDescription}}
 * 
 * Raises:
 *   {{throwsDescription}}
 * 
 * Example:
 *   {{example}}
 */`,
        variables: [
          'description',
          'paramName',
          'paramDescription',
          'returnDescription',
          'throwsDescription',
          'example',
        ],
        description: 'Google стиль для функций',
      },
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Генерация docstring
   */
  async generateDocstring(
    request: IDocstringRequest
  ): Promise<IDocstringResult> {
    this.logger.log(`Генерация docstring для ${request.type}: ${request.name}`);

    try {
      const template = this.findTemplate(request.type, request.style);
      if (!template) {
        throw new Error(
          `Шаблон не найден для типа ${request.type} и стиля ${request.style}`
        );
      }

      const docstring = this.processTemplate(template, request);
      const formatted = this.formatDocstring(docstring, request.language);
      const suggestions = this.generateSuggestions(request);
      const warnings = this.generateWarnings(request);
      const metadata = this.calculateMetadata(docstring);

      const result: IDocstringResult = {
        success: true,
        docstring,
        formatted,
        suggestions,
        warnings,
        metadata,
      };

      // Сохраняем в историю
      this.generationHistory.push(result);

      return result;
    } catch (error) {
      this.logger.error(
        `Ошибка генерации docstring: ${error instanceof Error ? error.message : String(error)}`
      );

      return {
        success: false,
        docstring: '',
        formatted: '',
        suggestions: ['Проверьте входные параметры'],
        warnings: [error instanceof Error ? error.message : String(error)],
        metadata: { lineCount: 0, characterCount: 0, complexity: 'low' },
      };
    }
  }

  /**
   * Поиск подходящего шаблона
   */
  private findTemplate(
    type: DocstringType,
    style: DocumentationStyle
  ): IDocstringTemplate | undefined {
    const templateId = `${style}-${type}`;
    return this.templates.get(templateId);
  }

  /**
   * Обработка шаблона с подстановкой переменных
   */
  private processTemplate(
    template: IDocstringTemplate,
    request: IDocstringRequest
  ): string {
    let result = template.template;

    // Заменяем переменные в шаблоне
    result = result.replace(
      /\{\{description\}\}/g,
      request.description ?? 'Описание отсутствует'
    );
    result = result.replace(/\{\{className\}\}/g, request.name);
    result = result.replace(
      /\{\{classDescription\}\}/g,
      request.description ?? 'Описание класса'
    );
    result = result.replace(/\{\{interfaceName\}\}/g, request.name);
    result = result.replace(
      /\{\{interfaceDescription\}\}/g,
      request.description ?? 'Описание интерфейса'
    );

    // Обработка параметров
    if (request.parameters != null && request.parameters.length > 0) {
      const param = request.parameters[0]; // Берем первый параметр для примера
      if (param) {
        result = result.replace(/\{\{paramName\}\}/g, param.name);
        result = result.replace(
          /\{\{paramDescription\}\}/g,
          param.description ?? 'Описание параметра'
        );
      }
    } else {
      // Если параметров нет, заменяем на placeholder
      result = result.replace(/\{\{paramName\}\}/g, 'paramName');
      result = result.replace(
        /\{\{paramDescription\}\}/g,
        'Описание отсутствует'
      );
    }

    // Обработка возвращаемого типа
    if (request.returnType != null && request.returnType.trim() !== '') {
      const returnType = request.returnType;
      result = result.replace(/\{\{returnType\}\}/g, returnType);
      result = result.replace(
        /\{\{returnDescription\}\}/g,
        'Описание возвращаемого значения'
      );
    }

    // Обработка throws
    if (request.throws && request.throws.length > 0) {
      result = result.replace(
        /\{\{throwsDescription\}\}/g,
        request.throws.join(', ')
      );
    }

    // Обработка примеров
    if (request.examples && request.examples.length > 0) {
      result = result.replace(/\{\{example\}\}/g, request.examples[0] ?? '');
    }

    return result;
  }

  /**
   * Форматирование docstring для конкретного языка
   */
  private formatDocstring(docstring: string, language: Language): string {
    if (language === 'typescript') {
      // Добавляем TypeScript специфичные теги
      return docstring.replace(/@param \{([^}]+)\}/g, '@param $1');
    }
    return docstring;
  }

  /**
   * Генерация предложений по улучшению
   */
  private generateSuggestions(request: IDocstringRequest): string[] {
    const suggestions: string[] = [];

    if (request.description == null || request.description.trim() === '') {
      suggestions.push('Добавьте подробное описание функциональности');
    }

    if (request.parameters != null && request.parameters.length > 0) {
      const paramsWithoutDescription = request.parameters.filter(
        p => p.description == null || p.description.trim() === ''
      );
      if (paramsWithoutDescription.length > 0) {
        suggestions.push(
          `Добавьте описания для параметров: ${paramsWithoutDescription.map(p => p.name).join(', ')}`
        );
      }
    }

    if (request.returnType == null || request.returnType.trim() === '') {
      suggestions.push('Укажите тип возвращаемого значения');
    }

    if (request.examples == null || request.examples.length === 0) {
      suggestions.push('Добавьте примеры использования');
    }

    return suggestions;
  }

  /**
   * Генерация предупреждений
   */
  private generateWarnings(request: IDocstringRequest): string[] {
    const warnings: string[] = [];

    if (request.parameters != null && request.parameters.length > 10) {
      warnings.push(
        'Слишком много параметров. Рассмотрите использование объекта конфигурации'
      );
    }

    if (request.description != null && request.description.trim().length < 10) {
      warnings.push('Описание слишком короткое. Добавьте больше деталей');
    }

    if (
      request.description != null &&
      request.description.trim().length > 500
    ) {
      warnings.push('Описание слишком длинное. Разделите на несколько частей');
    }

    return warnings;
  }

  /**
   * Расчет метаданных docstring
   */
  private calculateMetadata(docstring: string): {
    lineCount: number;
    characterCount: number;
    complexity: 'low' | 'medium' | 'high';
  } {
    const lines = docstring.split('\n');
    const lineCount = lines.length;
    const characterCount = docstring.length;

    let complexity: 'low' | 'medium' | 'high' = 'low';

    if (lineCount > 15 || characterCount > 800) {
      complexity = 'high';
    } else if (lineCount > 12 || characterCount > 600) {
      complexity = 'medium';
    } else {
      complexity = 'low';
    }

    return { lineCount, characterCount, complexity };
  }

  /**
   * Генерация docstring для NestJS сервиса
   */
  async generateNestJSServiceDocstring(
    serviceName: string
  ): Promise<IDocstringResult> {
    // Создаем специальный docstring для NestJS сервиса с @Injectable тегом
    const docstring = `/**
 * Сервис ${serviceName} для управления бизнес-логикой
 *
 * @class ${serviceName}
 * @description Сервис ${serviceName} для управления бизнес-логикой
 * @Injectable
 * @scope request
 */`;

    return {
      success: true,
      docstring,
      formatted: docstring,
      suggestions: [
        'Добавьте бизнес-логику',
        'Используйте dependency injection',
      ],
      warnings: [],
      metadata: { lineCount: 8, characterCount: 200, complexity: 'low' },
    };
  }

  /**
   * Генерация docstring для NestJS контроллера
   */
  async generateNestJSControllerDocstring(
    controllerName: string
  ): Promise<IDocstringResult> {
    // Создаем специальный docstring для NestJS контроллера с @Controller тегом
    const docstring = `/**
 * Контроллер ${controllerName} для обработки HTTP запросов
 *
 * @class ${controllerName}
 * @description Контроллер ${controllerName} для обработки HTTP запросов
 * @Controller
 * @prefix ${controllerName.toLowerCase()}
 */`;

    return {
      success: true,
      docstring,
      formatted: docstring,
      suggestions: ['Добавьте валидацию входных данных', 'Используйте DTOs'],
      warnings: [],
      metadata: { lineCount: 8, characterCount: 250, complexity: 'low' },
    };
  }

  /**
   * Генерация docstring для DTO
   */
  async generateDTODocstring(dtoName: string): Promise<IDocstringResult> {
    // Создаем специальный docstring для DTO с @DTO тегом
    const docstring = `/**
 * DTO ${dtoName} для передачи данных
 *
 * @interface ${dtoName}
 * @description DTO ${dtoName} для передачи данных
 * @DTO
 * @validation
 */`;

    return {
      success: true,
      docstring,
      formatted: docstring,
      suggestions: ['Добавьте валидацию полей', 'Используйте class-validator'],
      warnings: [],
      metadata: { lineCount: 8, characterCount: 200, complexity: 'low' },
    };
  }

  /**
   * Получение истории генерации
   */
  getGenerationHistory(): IDocstringResult[] {
    return [...this.generationHistory];
  }

  /**
   * Получение статистики генерации
   */
  getGenerationStatistics(): {
    total: number;
    successful: number;
    failed: number;
    averageComplexity: string;
  } {
    const total = this.generationHistory.length;
    const successful = this.generationHistory.filter(
      result => result.success
    ).length;
    const failed = total - successful;

    const complexities = this.generationHistory.map(
      result => result.metadata.complexity
    );
    const lowCount = complexities.filter(c => c === 'low').length;
    const mediumCount = complexities.filter(c => c === 'medium').length;
    const highCount = complexities.filter(c => c === 'high').length;

    let averageComplexity = 'low';
    if (highCount > lowCount + mediumCount) {
      averageComplexity = 'high';
    } else if (mediumCount > lowCount) {
      averageComplexity = 'medium';
    }

    return { total, successful, failed, averageComplexity };
  }
}

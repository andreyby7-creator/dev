import { Injectable, Logger } from '@nestjs/common';

// Типы
type ValidationType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'array'
  | 'object'
  | 'enum'
  | 'uuid'
  | 'email'
  | 'url';
type SwaggerType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'array'
  | 'object';
type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// Интерфейсы
export interface ITypeDefinition {
  name: string;
  type: ValidationType;
  required: boolean;
  description?: string;
  defaultValue?: unknown;
  validationRules?: IValidationRule[];
  swaggerType?: SwaggerType;
  format?: string;
  example?: unknown;
}

export interface IValidationRule {
  type: 'min' | 'max' | 'length' | 'pattern' | 'enum' | 'custom';
  value: unknown;
  message?: string;
}

export interface IDtoGenerationRequest {
  name: string;
  properties: Record<string, ITypeDefinition>;
  description?: string;
  isCreate?: boolean;
  isUpdate?: boolean;
  isResponse?: boolean;
  extends?: string[];
  implements?: string[];
}

export interface IApiContract {
  path: string;
  method: ApiMethod;
  summary: string;
  description?: string;
  tags: string[];
  requestBody?: IDtoGenerationRequest;
  responseBody?: IDtoGenerationRequest;
  parameters?: IApiParameter[];
  security?: string[];
  deprecated?: boolean;
}

export interface IApiParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  type: ValidationType;
  description?: string;
  example?: unknown;
}

export interface IGeneratedDto {
  name: string;
  code: string;
  fileName: string;
  filePath: string;
  imports: string[];
  dependencies: string[];
  validationRules: IValidationRule[];
  swaggerDecorators: string[];
}

export interface IGeneratedApiContract {
  controllerName: string;
  methodName: string;
  code: string;
  swaggerDocumentation: string;
  requestDto?: IGeneratedDto;
  responseDto?: IGeneratedDto;
}

export interface ITypeInferenceResult {
  type: ValidationType;
  confidence: number;
  suggestions: string[];
  validationRules: IValidationRule[];
}

@Injectable()
export class DynamicTypeChecksService {
  private readonly logger = new Logger(DynamicTypeChecksService.name);
  private readonly typePatterns: Map<string, RegExp> = new Map();
  private readonly validationTemplates: Map<ValidationType, string> = new Map();
  private readonly swaggerTemplates: Map<ValidationType, string> = new Map();

  constructor() {
    this.initializeTypePatterns();
    this.initializeValidationTemplates();
    this.initializeSwaggerTemplates();
  }

  /**
   * Инициализация паттернов типов
   */
  private initializeTypePatterns(): void {
    this.typePatterns.set('email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    this.typePatterns.set('url', /^https?:\/\/.+/);
    this.typePatterns.set(
      'uuid',
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    this.typePatterns.set('date', /^\d{4}-\d{2}-\d{2}$/);
    this.typePatterns.set('datetime', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    this.typePatterns.set('phone', /^\+?[\d\s-()]+$/);
    this.typePatterns.set('postal_code', /^\d{5}(-\d{4})?$/);
    this.typePatterns.set(
      'credit_card',
      /^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/
    );
  }

  /**
   * Инициализация шаблонов валидации
   */
  private initializeValidationTemplates(): void {
    this.validationTemplates.set('string', '@IsString()');
    this.validationTemplates.set('number', '@IsNumber()');
    this.validationTemplates.set('boolean', '@IsBoolean()');
    this.validationTemplates.set('date', '@IsDate()');
    this.validationTemplates.set('array', '@IsArray()');
    this.validationTemplates.set('object', '@IsObject()');
    this.validationTemplates.set('enum', '@IsEnum()');
    this.validationTemplates.set('uuid', '@IsUUID()');
    this.validationTemplates.set('email', '@IsEmail()');
    this.validationTemplates.set('url', '@IsUrl()');
  }

  /**
   * Инициализация шаблонов Swagger
   */
  private initializeSwaggerTemplates(): void {
    this.swaggerTemplates.set('string', "@ApiProperty({ type: 'string' })");
    this.swaggerTemplates.set('number', "@ApiProperty({ type: 'number' })");
    this.swaggerTemplates.set('boolean', "@ApiProperty({ type: 'boolean' })");
    this.swaggerTemplates.set(
      'date',
      "@ApiProperty({ type: 'string', format: 'date-time' })"
    );
    this.swaggerTemplates.set('array', "@ApiProperty({ type: 'array' })");
    this.swaggerTemplates.set('object', "@ApiProperty({ type: 'object' })");
    this.swaggerTemplates.set('enum', '@ApiProperty({ enum: [] })');
    this.swaggerTemplates.set(
      'uuid',
      "@ApiProperty({ type: 'string', format: 'uuid' })"
    );
    this.swaggerTemplates.set(
      'email',
      "@ApiProperty({ type: 'string', format: 'email' })"
    );
    this.swaggerTemplates.set(
      'url',
      "@ApiProperty({ type: 'string', format: 'uri' })"
    );
  }

  /**
   * Автоматически определить тип на основе данных
   */
  inferTypeFromData(data: unknown, propertyName: string): ITypeInferenceResult {
    const result: ITypeInferenceResult = {
      type: 'string',
      confidence: 0,
      suggestions: [],
      validationRules: [],
    };

    if (data == null) {
      result.type = 'string';
      result.confidence = 0.5;
      result.suggestions.push('Consider making this field optional');
      return result;
    }

    const dataType = typeof data;
    const propertyNameLower = propertyName.toLowerCase();

    // Проверка по имени свойства
    if (this.checkPropertyNamePatterns(propertyNameLower, result)) {
      return result;
    }

    // Проверка по типу данных
    switch (dataType) {
      case 'string':
        this.analyzeStringType(data as string, propertyNameLower, result);
        break;
      case 'number':
        this.analyzeNumberType(data as number, propertyNameLower, result);
        break;
      case 'boolean':
        result.type = 'boolean';
        result.confidence = 0.9;
        break;
      case 'object':
        this.analyzeObjectType(data, propertyNameLower, result);
        break;
      default:
        result.type = 'string';
        result.confidence = 0.3;
        result.suggestions.push(
          'Unable to determine type, defaulting to string'
        );
    }

    return result;
  }

  /**
   * Проверить паттерны имени свойства
   */
  private checkPropertyNamePatterns(
    propertyName: string,
    result: ITypeInferenceResult
  ): boolean {
    // Email
    if (propertyName.includes('email') || propertyName.includes('mail')) {
      result.type = 'email';
      result.confidence = 0.95;
      result.validationRules.push({
        type: 'pattern',
        value: 'email',
        message: 'Invalid email format',
      });
      return true;
    }

    // URL
    if (
      propertyName.includes('url') ||
      propertyName.includes('link') ||
      propertyName.includes('href')
    ) {
      result.type = 'url';
      result.confidence = 0.9;
      result.validationRules.push({
        type: 'pattern',
        value: 'url',
        message: 'Invalid URL format',
      });
      return true;
    }

    // UUID
    if (
      propertyName.includes('id') &&
      (propertyName.includes('uuid') || propertyName.includes('guid'))
    ) {
      result.type = 'uuid';
      result.confidence = 0.9;
      result.validationRules.push({
        type: 'pattern',
        value: 'uuid',
        message: 'Invalid UUID format',
      });
      return true;
    }

    // Date
    if (
      propertyName.includes('date') ||
      propertyName.includes('time') ||
      propertyName.includes('created') ||
      propertyName.includes('updated')
    ) {
      result.type = 'date';
      result.confidence = 0.85;
      result.validationRules.push({
        type: 'pattern',
        value: 'date',
        message: 'Invalid date format',
      });
      return true;
    }

    // Boolean
    if (
      propertyName.startsWith('is') ||
      propertyName.startsWith('has') ||
      propertyName.startsWith('can') ||
      propertyName.startsWith('should')
    ) {
      result.type = 'boolean';
      result.confidence = 0.8;
      return true;
    }

    // Number
    if (
      propertyName.includes('count') ||
      propertyName.includes('amount') ||
      propertyName.includes('price') ||
      propertyName.includes('quantity')
    ) {
      result.type = 'number';
      result.confidence = 0.75;
      result.validationRules.push({
        type: 'min',
        value: 0,
        message: 'Value must be positive',
      });
      return true;
    }

    return false;
  }

  /**
   * Анализировать строковый тип
   */
  private analyzeStringType(
    data: string,
    _propertyName: string,
    result: ITypeInferenceResult
  ): void {
    // Проверить паттерны
    for (const [patternName, pattern] of this.typePatterns.entries()) {
      if (pattern.test(data)) {
        result.type = patternName as ValidationType;
        result.confidence = 0.9;
        result.validationRules.push({
          type: 'pattern',
          value: patternName,
          message: `Invalid ${patternName} format`,
        });
        return;
      }
    }

    // Проверить длину
    if (data.length > 100) {
      result.validationRules.push({
        type: 'max',
        value: 1000,
        message: 'String too long',
      });
    } else if (data.length < 3) {
      result.validationRules.push({
        type: 'min',
        value: 1,
        message: 'String too short',
      });
    }

    result.type = 'string';
    result.confidence = 0.7;
  }

  /**
   * Анализировать числовой тип
   */
  private analyzeNumberType(
    data: number,
    _propertyName: string,
    result: ITypeInferenceResult
  ): void {
    result.type = 'number';
    result.confidence = 0.9;

    // Проверить диапазон
    if (data < 0) {
      result.validationRules.push({
        type: 'min',
        value: 0,
        message: 'Value must be positive',
      });
    }

    if (data > 1000000) {
      result.validationRules.push({
        type: 'max',
        value: 1000000,
        message: 'Value too large',
      });
    }

    // Проверить целое число
    if (Number.isInteger(data)) {
      result.suggestions.push('Consider using integer type for whole numbers');
    }
  }

  /**
   * Анализировать объектный тип
   */
  private analyzeObjectType(
    data: unknown,
    _propertyName: string,
    result: ITypeInferenceResult
  ): void {
    if (Array.isArray(data)) {
      result.type = 'array';
      result.confidence = 0.8;
      result.validationRules.push({
        type: 'min',
        value: 0,
        message: 'Array cannot be empty',
      });
    } else if (data instanceof Date) {
      result.type = 'date';
      result.confidence = 0.9;
    } else {
      result.type = 'object';
      result.confidence = 0.6;
      result.suggestions.push(
        'Consider defining a specific interface for this object'
      );
    }
  }

  /**
   * Генерировать DTO
   */
  async generateDto(request: IDtoGenerationRequest): Promise<IGeneratedDto> {
    this.logger.log(`Generating DTO: ${request.name}`);

    const dtoName = this.generateDtoName(request);
    const properties = Object.entries(request.properties);
    const imports = this.generateImports(properties);
    const validationCode = this.generateValidationCode(properties);
    const swaggerCode = this.generateSwaggerCode(properties);

    const code = `import { ${imports.join(', ')} } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ${dtoName} {
${swaggerCode}
${validationCode}
}`;

    const fileName = `${dtoName.toLowerCase()}.dto.ts`;
    const filePath = `src/dto/${fileName}`;
    const dependencies = this.extractDependencies(imports);
    const validationRules = this.extractValidationRules(properties);
    const swaggerDecorators = this.extractSwaggerDecorators(properties);

    return {
      name: dtoName,
      code,
      fileName,
      filePath,
      imports,
      dependencies,
      validationRules,
      swaggerDecorators,
    };
  }

  /**
   * Генерировать имя DTO
   */
  private generateDtoName(request: IDtoGenerationRequest): string {
    let suffix = 'Dto';
    if (request.isCreate === true) suffix = 'CreateDto';
    if (request.isUpdate === true) suffix = 'UpdateDto';
    if (request.isResponse === true) suffix = 'ResponseDto';

    return `${request.name}${suffix}`;
  }

  /**
   * Генерировать импорты
   */
  private generateImports(properties: [string, ITypeDefinition][]): string[] {
    const imports = new Set<string>();

    for (const [, definition] of properties) {
      const template = this.validationTemplates.get(definition.type);
      if (template != null && template !== '') {
        const decorator = template.replace('@', '').replace('()', '');
        imports.add(decorator);
      }

      // Дополнительные валидаторы
      if (definition.validationRules) {
        for (const rule of definition.validationRules) {
          switch (rule.type) {
            case 'min':
            case 'max':
              imports.add('Min');
              imports.add('Max');
              break;
            case 'length':
              imports.add('Length');
              break;
            case 'pattern':
              imports.add('Matches');
              break;
            case 'enum':
              imports.add('IsEnum');
              break;
          }
        }
      }
    }

    return Array.from(imports);
  }

  /**
   * Генерировать код валидации
   */
  private generateValidationCode(
    properties: [string, ITypeDefinition][]
  ): string {
    return properties
      .map(([name, definition]) => {
        const decorators: string[] = [];

        // Основной валидатор
        const template = this.validationTemplates.get(definition.type);
        if (template != null && template !== '') {
          decorators.push(template);
        }

        // Дополнительные правила
        if (definition.validationRules) {
          for (const rule of definition.validationRules) {
            switch (rule.type) {
              case 'min':
                decorators.push(
                  `@Min(${String(rule.value)}, { message: '${rule.message ?? `Minimum value is ${rule.value}`}' })`
                );
                break;
              case 'max':
                decorators.push(
                  `@Max(${String(rule.value)}, { message: '${rule.message ?? `Maximum value is ${rule.value}`}' })`
                );
                break;
              case 'length': {
                const lengthValue = rule.value as { min: number; max: number };
                decorators.push(
                  `@Length(${lengthValue.min}, ${lengthValue.max}, { message: '${rule.message ?? `Length must be between ${lengthValue.min} and ${lengthValue.max}`}' })`
                );
                break;
              }
              case 'pattern':
                decorators.push(
                  `@Matches(/${String(rule.value)}/, { message: '${rule.message ?? `Invalid format`}' })`
                );
                break;
              case 'enum':
                decorators.push(
                  `@IsEnum(${String(rule.value)}, { message: '${rule.message ?? `Invalid enum value`}' })`
                );
                break;
            }
          }
        }

        // Опциональность
        if (!definition.required) {
          decorators.push('@IsOptional()');
        }

        const decoratorsCode = decorators.map(d => `  ${d}`).join('\n');
        const propertyCode = `  ${name}: ${this.mapTypeToTypeScript(definition.type)};`;

        return `${decoratorsCode}\n${propertyCode}`;
      })
      .join('\n\n');
  }

  /**
   * Генерировать код Swagger
   */
  private generateSwaggerCode(properties: [string, ITypeDefinition][]): string {
    return properties
      .map(([, definition]) => {
        const template = this.swaggerTemplates.get(definition.type);
        if (template == null || template === '') return '';

        let swaggerCode = template;

        // Добавить описание
        if (definition.description != null && definition.description !== '') {
          swaggerCode = swaggerCode.replace(
            ')',
            `, description: '${definition.description}' )`
          );
        }

        // Добавить пример
        if (definition.example != null) {
          swaggerCode = swaggerCode.replace(
            ')',
            `, example: ${JSON.stringify(definition.example)} )`
          );
        }

        // Добавить формат
        if (definition.format != null && definition.format !== '') {
          swaggerCode = swaggerCode.replace(
            ')',
            `, format: '${definition.format}' )`
          );
        }

        // Опциональность
        if (!definition.required) {
          swaggerCode = swaggerCode.replace(
            'ApiProperty',
            'ApiPropertyOptional'
          );
        }

        return `  ${swaggerCode}`;
      })
      .filter(code => code.length > 0)
      .join('\n');
  }

  /**
   * Маппинг типов в TypeScript
   */
  private mapTypeToTypeScript(type: ValidationType): string {
    const typeMap: Record<ValidationType, string> = {
      string: 'string',
      number: 'number',
      boolean: 'boolean',
      date: 'Date',
      array: 'unknown[]',
      object: 'Record<string, unknown>',
      enum: 'string',
      uuid: 'string',
      email: 'string',
      url: 'string',
    };

    return typeMap[type] || 'unknown';
  }

  /**
   * Извлечь зависимости
   */
  private extractDependencies(imports: string[]): string[] {
    const dependencies: string[] = [];

    if (imports.length > 0) {
      dependencies.push('class-validator');
      dependencies.push('class-transformer');
    }

    if (imports.some(imp => imp.includes('Api'))) {
      dependencies.push('@nestjs/swagger');
    }

    return dependencies;
  }

  /**
   * Извлечь правила валидации
   */
  private extractValidationRules(
    properties: [string, ITypeDefinition][]
  ): IValidationRule[] {
    const rules: IValidationRule[] = [];

    for (const [, definition] of properties) {
      if (definition.validationRules) {
        rules.push(...definition.validationRules);
      }
    }

    return rules;
  }

  /**
   * Извлечь декораторы Swagger
   */
  private extractSwaggerDecorators(
    properties: [string, ITypeDefinition][]
  ): string[] {
    const decorators: string[] = [];

    for (const [, definition] of properties) {
      const template = this.swaggerTemplates.get(definition.type);
      if (template != null && template !== '') {
        decorators.push(template);
      }
    }

    return decorators;
  }

  /**
   * Генерировать API контракт
   */
  async generateApiContract(
    contract: IApiContract
  ): Promise<IGeneratedApiContract> {
    this.logger.log(
      `Generating API contract: ${contract.method} ${contract.path}`
    );

    const controllerName = this.generateControllerName(contract.path);
    const methodName = this.generateMethodName(contract.method, contract.path);

    // Генерировать DTO если нужно
    let requestDto: IGeneratedDto | undefined;
    let responseDto: IGeneratedDto | undefined;

    if (contract.requestBody) {
      requestDto = await this.generateDto(contract.requestBody);
    }

    if (contract.responseBody) {
      responseDto = await this.generateDto(contract.responseBody);
    }

    // Генерировать код контроллера
    const code = this.generateControllerCode(
      contract,
      methodName,
      requestDto,
      responseDto
    );

    // Генерировать Swagger документацию
    const swaggerDocumentation = this.generateSwaggerDocumentation(
      contract,
      requestDto,
      responseDto
    );

    const result: IGeneratedApiContract = {
      controllerName,
      methodName,
      code,
      swaggerDocumentation,
    };

    if (requestDto != null) {
      result.requestDto = requestDto;
    }

    if (responseDto != null) {
      result.responseDto = responseDto;
    }

    return result;
  }

  /**
   * Генерировать имя контроллера
   */
  private generateControllerName(path: string): string {
    const segments = path.split('/').filter(Boolean);
    const resource = segments[segments.length - 1] ?? 'default';
    return `${resource.charAt(0).toUpperCase() + resource.slice(1)}Controller`;
  }

  /**
   * Генерировать имя метода
   */
  private generateMethodName(method: ApiMethod, path: string): string {
    const segments = path.split('/').filter(Boolean);

    switch (method) {
      case 'GET':
        return segments.length > 1 ? `findOne` : `findAll`;
      case 'POST':
        return `create`;
      case 'PUT':
      case 'PATCH':
        return `update`;
      case 'DELETE':
        return `remove`;
    }
  }

  /**
   * Генерировать код контроллера
   */
  private generateControllerCode(
    contract: IApiContract,
    methodName: string,
    requestDto?: IGeneratedDto,
    responseDto?: IGeneratedDto
  ): string {
    const decorators = this.generateMethodDecorators(contract);
    const parameters = this.generateMethodParameters(contract, requestDto);
    const returnType = responseDto ? responseDto.name : 'unknown';

    return `${decorators}
  async ${methodName}(${parameters}): Promise<${returnType}> {
    // TODO: Implement ${methodName}
    throw new Error('Not implemented');
  }`;
  }

  /**
   * Генерировать декораторы метода
   */
  private generateMethodDecorators(contract: IApiContract): string {
    const decorators: string[] = [];

    // HTTP метод
    decorators.push(`@${contract.method}('${contract.path}')`);

    // Swagger
    decorators.push(`@ApiOperation({ summary: '${contract.summary}' })`);

    if (contract.description != null && contract.description !== '') {
      decorators.push(
        `@ApiOperation({ summary: '${contract.summary}', description: '${contract.description}' })`
      );
    }

    // Теги
    if (contract.tags.length > 0) {
      const tagsString = contract.tags.map(tag => `'${tag}'`).join(', ');
      decorators.push(`@ApiTags(${tagsString})`);
    }

    // Безопасность
    if (contract.security != null && contract.security.length > 0) {
      decorators.push(`@ApiBearerAuth()`);
    }

    // Устаревший
    if (contract.deprecated === true) {
      decorators.push(`@ApiDeprecated()`);
    }

    return decorators.map(d => `  ${d}`).join('\n');
  }

  /**
   * Генерировать параметры метода
   */
  private generateMethodParameters(
    contract: IApiContract,
    requestDto?: IGeneratedDto
  ): string {
    const parameters: string[] = [];

    // Path параметры
    const pathParams = contract.parameters?.filter(p => p.in === 'path') ?? [];
    pathParams.forEach(param => {
      parameters.push(
        `@Param('${param.name}') ${param.name}: ${this.mapTypeToTypeScript(param.type)}`
      );
    });

    // Query параметры
    const queryParams =
      contract.parameters?.filter(p => p.in === 'query') ?? [];
    if (queryParams.length > 0) {
      parameters.push(`@Query() query: unknown`);
    }

    // Body
    if (requestDto) {
      parameters.push(`@Body() createDto: ${requestDto.name}`);
    }

    return parameters.join(', ');
  }

  /**
   * Генерировать Swagger документацию
   */
  private generateSwaggerDocumentation(
    contract: IApiContract,
    requestDto?: IGeneratedDto,
    responseDto?: IGeneratedDto
  ): string {
    const doc: Record<string, unknown> = {
      path: contract.path,
      method: contract.method.toLowerCase(),
      summary: contract.summary,
      tags: contract.tags,
    };

    if (contract.description != null && contract.description !== '') {
      doc.description = contract.description;
    }

    if (requestDto) {
      doc.requestBody = {
        content: {
          'application/json': {
            schema: {
              $ref: `#/components/schemas/${requestDto.name}`,
            },
          },
        },
      };
    }

    if (responseDto) {
      doc.responses = {
        '200': {
          description: 'Success',
          content: {
            'application/json': {
              schema: {
                $ref: `#/components/schemas/${responseDto.name}`,
              },
            },
          },
        },
      };
    }

    return JSON.stringify(doc, null, 2);
  }

  /**
   * Получить доступные типы валидации
   */
  getAvailableValidationTypes(): ValidationType[] {
    return Array.from(this.validationTemplates.keys());
  }

  /**
   * Получить шаблоны валидации
   */
  getValidationTemplates(): Map<ValidationType, string> {
    return new Map(this.validationTemplates);
  }

  /**
   * Получить шаблоны Swagger
   */
  getSwaggerTemplates(): Map<ValidationType, string> {
    return new Map(this.swaggerTemplates);
  }
}

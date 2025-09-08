import { Injectable, Logger } from '@nestjs/common';

// Типы
type CodeGenerationType =
  | 'BOILERPLATE'
  | 'INTERFACE'
  | 'TYPE'
  | 'DTO'
  | 'SERVICE'
  | 'CONTROLLER'
  | 'MODULE'
  | 'TEST';
type CodeLanguage = 'typescript' | 'javascript' | 'json' | 'yaml';
type Framework = 'nestjs' | 'express' | 'react' | 'nextjs' | 'vue';

// Интерфейсы
export interface ICodeGenerationRequest {
  type: CodeGenerationType;
  language: CodeLanguage;
  framework?: Framework;
  entityName: string;
  description: string;
  properties?: Record<string, string>; // propertyName: type
  methods?: string[];
  dependencies?: string[];
  customRules?: string[];
}

export interface ICodeGenerationResult {
  success: boolean;
  code: string;
  fileName: string;
  filePath: string;
  imports: string[];
  dependencies: string[];
  suggestions: string[];
  warnings: string[];
}

export interface ICodeTemplate {
  id: string;
  name: string;
  type: CodeGenerationType;
  framework: Framework;
  template: string;
  variables: string[];
  description: string;
}

export interface ICodeAnalysis {
  complexity: number;
  maintainability: number;
  testability: number;
  performance: number;
  security: number;
  suggestions: string[];
  improvements: string[];
  warnings: string[];
}

@Injectable()
export class AiCodeAssistantService {
  private readonly logger = new Logger(AiCodeAssistantService.name);
  private readonly templates: Map<string, ICodeTemplate> = new Map();
  private readonly generationHistory: ICodeGenerationResult[] = [];

  constructor() {
    this.initializeTemplates();
  }

  /**
   * Инициализация шаблонов кода
   */
  private initializeTemplates(): void {
    const templates: ICodeTemplate[] = [
      {
        id: 'nestjs-service',
        name: 'NestJS Service',
        type: 'SERVICE',
        framework: 'nestjs',
        template: `import { Injectable, Logger } from '@nestjs/common';

export interface I{{entityName}} {
  id: string;
  {{#each properties}}
  {{@key}}: {{this}};
  {{/each}}
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class {{entityName}}Service {
  private readonly logger = new Logger({{entityName}}Service.name);

  constructor() {}

  async create(data: Omit<I{{entityName}}, 'id' | 'createdAt' | 'updatedAt'>): Promise<I{{entityName}}> {
    this.logger.log('Creating {{entityName}}');
    // TODO: Implement creation logic
    throw new Error('Not implemented');
  }

  async findAll(): Promise<I{{entityName}}[]> {
    this.logger.log('Finding all {{entityName}}s');
    // TODO: Implement find all logic
    throw new Error('Not implemented');
  }

  async findOne(id: string): Promise<I{{entityName}} | null> {
    this.logger.log('Finding {{entityName}} by id: ' + id);
    // TODO: Implement find one logic
    throw new Error('Not implemented');
  }

  async update(id: string, data: Partial<I{{entityName}}>): Promise<I{{entityName}} | null> {
    this.logger.log('Updating {{entityName}} with id: ' + id);
    // TODO: Implement update logic
    throw new Error('Not implemented');
  }

  async delete(id: string): Promise<boolean> {
    this.logger.log('Deleting {{entityName}} with id: ' + id);
    // TODO: Implement delete logic
    throw new Error('Not implemented');
  }
}`,
        variables: ['entityName', 'properties'],
        description: 'Генерирует NestJS сервис с CRUD операциями',
      },
      {
        id: 'nestjs-controller',
        name: 'NestJS Controller',
        type: 'CONTROLLER',
        framework: 'nestjs',
        template: `import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { {{entityName}}Service } from './{{entityName}}.service';
import { Create{{entityName}}Dto, Update{{entityName}}Dto } from './dto/{{entityName}}.dto';
import { I{{entityName}} } from './{{entityName}}.service';

@ApiTags('{{entityName}}s')
@Controller('{{entityName}}s')
export class {{entityName}}Controller {
  constructor(private readonly {{entityName}}Service: {{entityName}}Service) {}

  @Post()
  @ApiOperation({ summary: 'Create {{entityName}}' })
  @ApiResponse({ status: 201, description: '{{entityName}} created successfully' })
  async create(@Body() createDto: Create{{entityName}}Dto): Promise<I{{entityName}}> {
    return this.{{entityName}}Service.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all {{entityName}}s' })
  @ApiResponse({ status: 200, description: 'Return all {{entityName}}s' })
  async findAll(@Query() query: unknown): Promise<I{{entityName}}[]> {
    return this.{{entityName}}Service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get {{entityName}} by id' })
  @ApiResponse({ status: 200, description: 'Return {{entityName}} by id' })
  async findOne(@Param('id') id: string): Promise<I{{entityName}} | null> {
    return this.{{entityName}}Service.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update {{entityName}}' })
  @ApiResponse({ status: 200, description: '{{entityName}} updated successfully' })
  async update(@Param('id') id: string, @Body() updateDto: Update{{entityName}}Dto): Promise<I{{entityName}} | null> {
    return this.{{entityName}}Service.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete {{entityName}}' })
  @ApiResponse({ status: 200, description: '{{entityName}} deleted successfully' })
  async delete(@Param('id') id: string): Promise<boolean> {
    return this.{{entityName}}Service.delete(id);
  }
}`,
        variables: ['entityName'],
        description: 'Генерирует NestJS контроллер с CRUD эндпоинтами',
      },
      {
        id: 'nestjs-dto',
        name: 'NestJS DTO',
        type: 'DTO',
        framework: 'nestjs',
        template: `import { IsString, IsOptional, IsNumber, IsBoolean, IsDate, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Create{{entityName}}Dto {
  {{#each properties}}
  @ApiProperty({ description: '{{@key}} field' })
  {{#if (eq this 'string')}}
  @IsString()
  {{else if (eq this 'number')}}
  @IsNumber()
  {{else if (eq this 'boolean')}}
  @IsBoolean()
  {{else if (eq this 'Date')}}
  @IsDate()
  @Type(() => Date)
  {{else if (eq this 'string[]')}}
  @IsArray()
  @IsString({ each: true })
  {{/if}}
  {{@key}}: {{this}};
  {{/each}}
}

export class Update{{entityName}}Dto {
  {{#each properties}}
  @ApiPropertyOptional({ description: '{{@key}} field' })
  @IsOptional()
  {{#if (eq this 'string')}}
  @IsString()
  {{else if (eq this 'number')}}
  @IsNumber()
  {{else if (eq this 'boolean')}}
  @IsBoolean()
  {{else if (eq this 'Date')}}
  @IsDate()
  @Type(() => Date)
  {{else if (eq this 'string[]')}}
  @IsArray()
  @IsString({ each: true })
  {{/if}}
  {{@key}}?: {{this}};
  {{/each}}
}`,
        variables: ['entityName', 'properties'],
        description: 'Генерирует NestJS DTO с валидацией',
      },
      {
        id: 'nestjs-module',
        name: 'NestJS Module',
        type: 'MODULE',
        framework: 'nestjs',
        template: `import { Module } from '@nestjs/common';
import { {{entityName}}Controller } from './{{entityName}}.controller';
import { {{entityName}}Service } from './{{entityName}}.service';

@Module({
  controllers: [{{entityName}}Controller],
  providers: [{{entityName}}Service],
  exports: [{{entityName}}Service],
})
export class {{entityName}}Module {}`,
        variables: ['entityName'],
        description: 'Генерирует NestJS модуль',
      },
      {
        id: 'nestjs-test',
        name: 'NestJS Test',
        type: 'TEST',
        framework: 'nestjs',
        template: `import { Test, TestingModule } from '@nestjs/testing';
import { {{entityName}}Service } from './{{entityName}}.service';
import { {{entityName}}Controller } from './{{entityName}}.controller';

describe('{{entityName}}Controller', () => {
  let controller: {{entityName}}Controller;
  let service: {{entityName}}Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [{{entityName}}Controller],
      providers: [{{entityName}}Service],
    }).compile();

    controller = module.get<{{entityName}}Controller>({{entityName}}Controller);
    service = module.get<{{entityName}}Service>({{entityName}}Service);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a {{entityName}}', async () => {
      const createDto = {
        {{#each properties}}
        {{@key}}: {{#if (eq this 'string')}}'test'{{else if (eq this 'number')}}123{{else if (eq this 'boolean')}}true{{else if (eq this 'Date')}}new Date(){{else if (eq this 'string[]')}}['test']{{/if}},
        {{/each}}
      };

      const expectedResult = {
        id: '1',
        ...createDto,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      jest.spyOn(service, 'create').mockResolvedValue(expectedResult);

      expect(await controller.create(createDto)).toBe(expectedResult);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of {{entityName}}s', async () => {
      const expectedResult = [
        {
          id: '1',
          {{#each properties}}
          {{@key}}: {{#if (eq this 'string')}}'test'{{else if (eq this 'number')}}123{{else if (eq this 'boolean')}}true{{else if (eq this 'Date')}}new Date(){{else if (eq this 'string[]')}}['test']{{/if}},
          {{/each}}
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      jest.spyOn(service, 'findAll').mockResolvedValue(expectedResult);

      expect(await controller.findAll({})).toBe(expectedResult);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a {{entityName}} by id', async () => {
      const expectedResult = {
        id: '1',
        {{#each properties}}
        {{@key}}: {{#if (eq this 'string')}}'test'{{else if (eq this 'number')}}123{{else if (eq this 'boolean')}}true{{else if (eq this 'Date')}}new Date(){{else if (eq this 'string[]')}}['test']{{/if}},
        {{/each}}
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(expectedResult);

      expect(await controller.findOne('1')).toBe(expectedResult);
      expect(service.findOne).toHaveBeenCalledWith('1');
    });
  });

  describe('update', () => {
    it('should update a {{entityName}}', async () => {
      const updateDto = {
        {{#each properties}}
        {{@key}}: {{#if (eq this 'string')}}'updated'{{else if (eq this 'number')}}456{{else if (eq this 'boolean')}}false{{else if (eq this 'Date')}}new Date(){{else if (eq this 'string[]')}}['updated']{{/if}},
        {{/each}}
      };

      const expectedResult = {
        id: '1',
        ...updateDto,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      jest.spyOn(service, 'update').mockResolvedValue(expectedResult);

      expect(await controller.update('1', updateDto)).toBe(expectedResult);
      expect(service.update).toHaveBeenCalledWith('1', updateDto);
    });
  });

  describe('delete', () => {
    it('should delete a {{entityName}}', async () => {
      jest.spyOn(service, 'delete').mockResolvedValue(true);

      expect(await controller.delete('1')).toBe(true);
      expect(service.delete).toHaveBeenCalledWith('1');
    });
  });
});`,
        variables: ['entityName', 'properties'],
        description: 'Генерирует NestJS тесты для контроллера',
      },
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Генерировать код на основе запроса
   */
  async generateCode(
    request: ICodeGenerationRequest
  ): Promise<ICodeGenerationResult> {
    this.logger.log(
      `Generating ${request.type} code for ${request.entityName}`
    );

    try {
      const template = this.findBestTemplate(request);
      if (!template) {
        throw new Error(`No template found for type: ${request.type}`);
      }

      const code = this.processTemplate(template, request);
      const fileName = this.generateFileName(request);
      const filePath = this.generateFilePath(request);
      const imports = this.extractImports(code);
      const dependencies = this.extractDependencies(code);
      const analysis = this.analyzeCode(code);

      const result: ICodeGenerationResult = {
        success: true,
        code,
        fileName,
        filePath,
        imports,
        dependencies,
        suggestions: analysis.suggestions,
        warnings: analysis.warnings,
      };

      this.generationHistory.push(result);
      this.logger.log(`Code generated successfully: ${fileName}`);

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Code generation failed: ${errorMessage}`);
      return {
        success: false,
        code: '',
        fileName: '',
        filePath: '',
        imports: [],
        dependencies: [],
        suggestions: [],
        warnings: [errorMessage],
      };
    }
  }

  /**
   * Найти лучший шаблон для запроса
   */
  private findBestTemplate(
    request: ICodeGenerationRequest
  ): ICodeTemplate | undefined {
    const templateKey = `${request.framework}-${request.type.toLowerCase()}`;
    return this.templates.get(templateKey);
  }

  /**
   * Обработать шаблон с данными
   */
  private processTemplate(
    template: ICodeTemplate,
    request: ICodeGenerationRequest
  ): string {
    let code = template.template;

    // Заменить переменные
    code = code.replace(/\{\{entityName\}\}/g, request.entityName);
    code = code.replace(/\{\{type\}\}/g, request.type);
    code = code.replace(/\{\{language\}\}/g, request.language);

    // Обработать свойства
    if (request.properties) {
      const propertiesCode = Object.entries(request.properties)
        .map(([key, type]) => `  ${key}: ${type};`)
        .join('\n');
      code = code.replace(
        /\{\{#each properties\}\}([\s\S]*?)\{\{\/each\}\}/g,
        propertiesCode
      );
    }

    // Обработать методы
    if (request.methods) {
      const methodsCode = request.methods
        .map(
          method =>
            `  ${method}() {\n    // TODO: Implement ${method}\n    throw new Error('Not implemented');\n  }`
        )
        .join('\n\n');
      code = code.replace(
        /\{\{#each methods\}\}([\s\S]*?)\{\{\/each\}\}/g,
        methodsCode
      );
    }

    return code;
  }

  /**
   * Сгенерировать имя файла
   */
  private generateFileName(request: ICodeGenerationRequest): string {
    const entityName =
      request.entityName.charAt(0).toLowerCase() + request.entityName.slice(1);

    switch (request.type) {
      case 'SERVICE':
        return `${entityName}.service.ts`;
      case 'CONTROLLER':
        return `${entityName}.controller.ts`;
      case 'DTO':
        return `${entityName}.dto.ts`;
      case 'MODULE':
        return `${entityName}.module.ts`;
      case 'TEST':
        return `${entityName}.controller.spec.ts`;
      case 'INTERFACE':
        return `${entityName}.interface.ts`;
      case 'TYPE':
        return `${entityName}.types.ts`;
      default:
        return `${entityName}.${request.type.toLowerCase()}.ts`;
    }
  }

  /**
   * Сгенерировать путь к файлу
   */
  private generateFilePath(request: ICodeGenerationRequest): string {
    const entityName =
      request.entityName.charAt(0).toLowerCase() + request.entityName.slice(1);

    switch (request.type) {
      case 'SERVICE':
      case 'CONTROLLER':
      case 'MODULE':
        return `src/${entityName}/${this.generateFileName(request)}`;
      case 'DTO':
        return `src/${entityName}/dto/${this.generateFileName(request)}`;
      case 'TEST':
        return `src/${entityName}/__tests__/${this.generateFileName(request)}`;
      case 'INTERFACE':
      case 'TYPE':
        return `src/types/${this.generateFileName(request)}`;
      default:
        return `src/${this.generateFileName(request)}`;
    }
  }

  /**
   * Извлечь импорты из кода
   */
  private extractImports(code: string): string[] {
    const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
    const imports: string[] = [];
    let match;

    while ((match = importRegex.exec(code)) !== null) {
      if (match[1] != null) {
        imports.push(match[1]);
      }
    }

    return [...new Set(imports)];
  }

  /**
   * Извлечь зависимости из кода
   */
  private extractDependencies(code: string): string[] {
    const dependencies: string[] = [];

    // NestJS зависимости
    if (code.includes('@nestjs/common')) dependencies.push('@nestjs/common');
    if (code.includes('@nestjs/swagger')) dependencies.push('@nestjs/swagger');
    if (code.includes('class-validator')) dependencies.push('class-validator');
    if (code.includes('class-transformer'))
      dependencies.push('class-transformer');

    return [...new Set(dependencies)];
  }

  /**
   * Анализировать код
   */
  private analyzeCode(code: string): ICodeAnalysis {
    const analysis: ICodeAnalysis = {
      complexity: this.calculateComplexity(code),
      maintainability: this.calculateMaintainability(code),
      testability: this.calculateTestability(code),
      performance: this.calculatePerformance(code),
      security: this.calculateSecurity(code),
      suggestions: [],
      improvements: [],
      warnings: [],
    };

    // Генерировать предложения
    if (analysis.complexity > 7) {
      analysis.suggestions.push(
        'Consider breaking down complex methods into smaller ones'
      );
    }

    if (analysis.maintainability < 60) {
      analysis.suggestions.push('Add more comments and improve code structure');
    }

    if (analysis.testability < 70) {
      analysis.suggestions.push(
        'Consider dependency injection for better testability'
      );
    }

    if (analysis.security < 80) {
      analysis.suggestions.push('Add input validation and sanitization');
    }

    return analysis;
  }

  /**
   * Рассчитать сложность кода
   */
  private calculateComplexity(code: string): number {
    const cyclomaticComplexity =
      (code.match(/if|else|for|while|switch|case|catch|&&|\|\|/g) ?? [])
        .length + 1;
    return Math.min(100, Math.max(1, 100 - cyclomaticComplexity * 5));
  }

  /**
   * Рассчитать поддерживаемость кода
   */
  private calculateMaintainability(code: string): number {
    const lines = code.split('\n').length;
    const comments = (code.match(/\/\/|\/\*|\*/g) ?? []).length;
    const commentRatio = comments / lines;

    return Math.min(100, Math.max(1, 50 + commentRatio * 100));
  }

  /**
   * Рассчитать тестируемость кода
   */
  private calculateTestability(code: string): number {
    const hasDependencyInjection =
      code.includes('constructor') && code.includes('private readonly');
    const hasInterfaces =
      code.includes('interface') || code.includes('export type');
    const hasErrorHandling = code.includes('try') || code.includes('catch');

    let score = 50;
    if (hasDependencyInjection) score += 20;
    if (hasInterfaces) score += 15;
    if (hasErrorHandling) score += 15;

    return Math.min(100, Math.max(1, score));
  }

  /**
   * Рассчитать производительность кода
   */
  private calculatePerformance(code: string): number {
    const hasAsyncAwait = code.includes('async') || code.includes('await');
    const hasEfficientLoops = !code.includes('forEach') && code.includes('for');
    const hasProperErrorHandling =
      code.includes('try') || code.includes('catch');

    let score = 70;
    if (hasAsyncAwait) score += 10;
    if (hasEfficientLoops) score += 10;
    if (hasProperErrorHandling) score += 10;

    return Math.min(100, Math.max(1, score));
  }

  /**
   * Рассчитать безопасность кода
   */
  private calculateSecurity(code: string): number {
    const hasValidation =
      code.includes('@IsString') ||
      code.includes('@IsNumber') ||
      code.includes('@IsOptional');
    const hasSanitization =
      code.includes('sanitize') || code.includes('escape');
    const hasAuthentication =
      code.includes('@UseGuards') || code.includes('@ApiBearerAuth');

    let score = 60;
    if (hasValidation) score += 20;
    if (hasSanitization) score += 10;
    if (hasAuthentication) score += 10;

    return Math.min(100, Math.max(1, score));
  }

  /**
   * Получить историю генерации
   */
  getGenerationHistory(): ICodeGenerationResult[] {
    return this.generationHistory;
  }

  /**
   * Получить доступные шаблоны
   */
  getAvailableTemplates(): ICodeTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Добавить пользовательский шаблон
   */
  addCustomTemplate(template: ICodeTemplate): void {
    this.templates.set(template.id, template);
    this.logger.log(`Custom template added: ${template.name}`);
  }
}

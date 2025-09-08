import { Injectable, Logger } from '@nestjs/common';

// Типы для AI генерации тестов
export type TestType =
  | 'unit'
  | 'integration'
  | 'e2e'
  | 'performance'
  | 'security';

export type TestFramework =
  | 'jest'
  | 'mocha'
  | 'vitest'
  | 'cypress'
  | 'playwright';

export interface ITestGenerationRequest {
  sourceCode: string;
  language: 'typescript' | 'javascript';
  testType: TestType;
  framework: TestFramework;
  context?: string;
  existingTests?: string;
  coverage?: {
    functions?: boolean;
    branches?: boolean;
    lines?: boolean;
    statements?: boolean;
  };
  mockStrategy?: 'jest' | 'sinon' | 'manual';
  assertions?: string[];
}

export interface ITestGenerationResult {
  success: boolean;
  generatedTests: IGeneratedTest[];
  suggestions: ITestSuggestion[];
  coverage: ITestCoverage;
  summary: string;
  warnings: string[];
}

export interface IGeneratedTest {
  id: string;
  name: string;
  description: string;
  type: TestType;
  framework: TestFramework;
  code: string;
  setup?: string;
  teardown?: string;
  mocks?: IMockDefinition[];
  assertions: IAssertion[];
  dependencies: string[];
  estimatedDuration: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface ITestSuggestion {
  id: string;
  type:
    | 'missing_test'
    | 'improve_coverage'
    | 'add_edge_case'
    | 'performance_test'
    | 'security_test';
  title: string;
  description: string;
  code: string;
  reason: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
}

export interface ITestCoverage {
  functions: number;
  branches: number;
  lines: number;
  statements: number;
  uncovered: string[];
  criticalPaths: string[];
}

export interface IMockDefinition {
  name: string;
  type: 'function' | 'class' | 'module' | 'service' | 'object';
  implementation: string;
  returnValue?: unknown;
  sideEffects?: string[];
}

export interface IAssertion {
  type: 'expect' | 'assert' | 'should';
  expression: string;
  expected: string;
  description: string;
}

@Injectable()
export class AiTestGeneratorService {
  private readonly logger = new Logger(AiTestGeneratorService.name);

  /**
   * Генерирует тесты для предоставленного кода
   */
  async generateTests(
    request: ITestGenerationRequest
  ): Promise<ITestGenerationResult> {
    this.logger.log('Starting AI test generation', {
      language: request.language,
      testType: request.testType,
      framework: request.framework,
    });

    try {
      const analysis = this.analyzeCode(request.sourceCode);
      const generatedTests = this.generateTestCases(request, analysis);
      const suggestions = this.generateSuggestions(request, analysis);
      const coverage = this.calculateCoverage(
        generatedTests,
        analysis,
        request.sourceCode
      );

      const result: ITestGenerationResult = {
        success: true,
        generatedTests,
        suggestions,
        coverage,
        summary: this.generateSummary(generatedTests, coverage),
        warnings: this.generateWarnings(request, analysis),
      };

      this.logger.log('AI test generation completed', {
        testsGenerated: generatedTests.length,
        suggestionsCount: suggestions.length,
        coverage: coverage.functions,
      });

      return result;
    } catch (error) {
      this.logger.error('AI test generation failed', error);
      return {
        success: false,
        generatedTests: [],
        suggestions: [],
        coverage: {
          functions: 0,
          branches: 0,
          lines: 0,
          statements: 0,
          uncovered: [],
          criticalPaths: [],
        },
        summary: 'Test generation failed',
        warnings: [
          `Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
      };
    }
  }

  /**
   * Генерирует тесты для NestJS сервиса
   */
  async generateNestJSTests(
    serviceCode: string,
    serviceName: string
  ): Promise<IGeneratedTest[]> {
    this.logger.log(`Generating NestJS tests for service: ${serviceName}`);

    const tests: IGeneratedTest[] = [];

    // Базовый тест для инициализации сервиса
    tests.push({
      id: `test_${serviceName}_initialization`,
      name: `${serviceName} should be defined`,
      description: `Test that ${serviceName} service is properly initialized`,
      type: 'unit',
      framework: 'jest',
      code: this.generateServiceInitializationTest(serviceName),
      assertions: [
        {
          type: 'expect',
          expression: 'service',
          expected: 'toBeDefined()',
          description: 'Service should be defined',
        },
      ],
      dependencies: [],
      estimatedDuration: 100,
      priority: 'high',
    });

    // Тесты для методов сервиса
    const methods = this.extractMethods(serviceCode);
    for (const method of methods) {
      tests.push(...this.generateMethodTests(serviceName, method));
    }

    return tests;
  }

  /**
   * Генерирует тесты для контроллера
   */
  async generateControllerTests(
    controllerCode: string,
    controllerName: string
  ): Promise<IGeneratedTest[]> {
    this.logger.log(`Generating controller tests for: ${controllerName}`);

    const tests: IGeneratedTest[] = [];
    const endpoints = this.extractEndpoints(controllerCode);

    for (const endpoint of endpoints) {
      tests.push({
        id: `test_${controllerName}_${endpoint.method}_${endpoint.path}`,
        name: `${endpoint.method.toUpperCase()} ${endpoint.path} should work`,
        description: `Test ${endpoint.method} endpoint ${endpoint.path}`,
        type: 'integration',
        framework: 'jest',
        code: this.generateEndpointTest(controllerName, endpoint),
        mocks: this.generateEndpointMocks(),
        assertions: this.generateEndpointAssertions(),
        dependencies: ['TestingModule', 'HttpModule'],
        estimatedDuration: 200,
        priority: 'high',
      });
    }

    return tests;
  }

  /**
   * Генерирует тесты для DTO
   */
  async generateDTOTests(
    dtoCode: string,
    dtoName: string
  ): Promise<IGeneratedTest[]> {
    this.logger.log(`Generating DTO tests for: ${dtoName}`);

    const tests: IGeneratedTest[] = [];
    const properties = this.extractDTOProperties(dtoCode);

    // Тест валидации
    tests.push({
      id: `test_${dtoName}_validation`,
      name: `${dtoName} should validate correctly`,
      description: `Test validation of ${dtoName} DTO`,
      type: 'unit',
      framework: 'jest',
      code: this.generateDTOValidationTest(dtoName),
      assertions: [
        {
          type: 'expect',
          expression: 'result.isValid',
          expected: 'toBe(true)',
          description: 'DTO should be valid',
        },
      ],
      dependencies: ['class-validator'],
      estimatedDuration: 150,
      priority: 'medium',
    });

    // Тесты для каждого свойства
    for (const property of properties) {
      tests.push(...this.generatePropertyTests(dtoName, property));
    }

    return tests;
  }

  /**
   * Анализирует код для генерации тестов
   */
  private analyzeCode(sourceCode: string): {
    functions: Array<{ name: string; line: number; isAsync: boolean }>;
    classes: Array<{ name: string; line: number }>;
    imports: string[];
    complexity: number;
    dependencies: string[];
  } {
    // Простой анализ кода для извлечения функций, классов, методов
    const functions = this.extractFunctions(sourceCode);
    const classes = this.extractClasses(sourceCode);
    const imports = this.extractImports(sourceCode);

    return {
      functions,
      classes,
      imports,
      complexity: this.calculateComplexity(sourceCode),
      dependencies: this.extractDependencies(sourceCode),
    };
  }

  /**
   * Генерирует тестовые случаи
   */
  private generateTestCases(
    request: ITestGenerationRequest,
    analysis: {
      functions: Array<{ name: string; line: number; isAsync: boolean }>;
      classes: Array<{ name: string; line: number }>;
      imports: string[];
      complexity: number;
      dependencies: string[];
    }
  ): IGeneratedTest[] {
    const tests: IGeneratedTest[] = [];

    // Генерируем тесты для функций
    for (const func of analysis.functions) {
      tests.push(this.generateFunctionTest(func, request));
    }

    // Генерируем тесты для классов
    for (const cls of analysis.classes) {
      tests.push(...this.generateClassTests(cls, request));
    }

    return tests;
  }

  /**
   * Генерирует предложения по улучшению тестов
   */
  private generateSuggestions(
    request: ITestGenerationRequest,
    analysis: {
      functions: Array<{ name: string; line: number; isAsync: boolean }>;
      classes: Array<{ name: string; line: number }>;
      imports: string[];
      complexity: number;
      dependencies: string[];
    }
  ): ITestSuggestion[] {
    const suggestions: ITestSuggestion[] = [];

    // Предложения по покрытию
    if (analysis.complexity > 10) {
      suggestions.push({
        id: 'suggestion_complexity',
        type: 'improve_coverage',
        title: 'Add edge case tests for complex functions',
        description:
          'This function has high complexity and needs additional edge case testing',
        code: this.generateEdgeCaseTest(),
        reason: 'High cyclomatic complexity detected',
        impact: 'high',
        effort: 'medium',
      });
    }

    // Предложения по безопасности
    if (this.hasSecurityConcerns(request.sourceCode)) {
      suggestions.push({
        id: 'suggestion_security',
        type: 'security_test',
        title: 'Add security tests',
        description:
          'Add tests for input validation and security vulnerabilities',
        code: this.generateSecurityTest(),
        reason: 'Potential security concerns detected',
        impact: 'high',
        effort: 'high',
      });
    }

    return suggestions;
  }

  /**
   * Вычисляет покрытие тестами
   */
  private calculateCoverage(
    tests: IGeneratedTest[],
    analysis: {
      functions: Array<{ name: string; line: number; isAsync: boolean }>;
      classes: Array<{ name: string; line: number }>;
      imports: string[];
      complexity: number;
      dependencies: string[];
    },
    sourceCode: string
  ): ITestCoverage {
    const totalFunctions = analysis.functions.length;
    const totalBranches = analysis.complexity;
    const totalLines = sourceCode.split('\n').length;

    const coveredFunctions = tests.filter(t => t.type === 'unit').length;
    const coveredBranches = tests.filter(t => t.type === 'integration').length;

    return {
      functions:
        totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 0,
      branches: totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 0,
      lines: totalLines > 0 ? (tests.length / totalLines) * 100 : 0,
      statements: totalLines > 0 ? (tests.length / totalLines) * 100 : 0,
      uncovered: this.findUncoveredCode(analysis, tests),
      criticalPaths: this.findCriticalPaths(analysis),
    };
  }

  // Вспомогательные методы для анализа кода
  private extractFunctions(
    code: string
  ): Array<{ name: string; line: number; isAsync: boolean }> {
    const functionRegex =
      /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?\(|(\w+)\s*:\s*(?:async\s+)?\()/g;
    const functions: Array<{ name: string; line: number; isAsync: boolean }> =
      [];
    let match;

    while ((match = functionRegex.exec(code)) !== null) {
      functions.push({
        name: match[1] ?? match[2] ?? match[3] ?? '',
        line: code.substring(0, match.index).split('\n').length,
        isAsync: code.includes('async'),
      });
    }

    return functions;
  }

  private extractClasses(code: string): Array<{ name: string; line: number }> {
    const classRegex = /class\s+(\w+)/g;
    const classes: Array<{ name: string; line: number }> = [];
    let match;

    while ((match = classRegex.exec(code)) !== null) {
      classes.push({
        name: match[1] ?? '',
        line: code.substring(0, match.index).split('\n').length,
      });
    }

    return classes;
  }

  private extractImports(code: string): string[] {
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    const imports: string[] = [];
    let match;

    while ((match = importRegex.exec(code)) !== null) {
      imports.push(match[1] ?? '');
    }

    return imports;
  }

  private calculateComplexity(code: string): number {
    // Простой расчет цикломатической сложности
    const complexityKeywords = [
      'if',
      'else',
      'for',
      'while',
      'switch',
      'case',
      'catch',
      '&&',
      '||',
      '?',
    ];
    let complexity = 1;

    for (const keyword of complexityKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = code.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  private extractDependencies(code: string): string[] {
    return this.extractImports(code);
  }

  private extractMethods(code: string): Array<{ name: string; line: number }> {
    const methodRegex = /(\w+)\s*\([^)]*\)\s*[:{]/g;
    const methods: Array<{ name: string; line: number }> = [];
    let match;

    while ((match = methodRegex.exec(code)) !== null) {
      methods.push({
        name: match[1] ?? '',
        line: code.substring(0, match.index).split('\n').length,
      });
    }

    return methods;
  }

  private extractEndpoints(
    code: string
  ): Array<{ method: string; path: string; line: number }> {
    const endpointRegex =
      /@(Get|Post|Put|Delete|Patch)\s*\(['"]([^'"]*)['"]\)/g;
    const endpoints: Array<{ method: string; path: string; line: number }> = [];
    let match;

    while ((match = endpointRegex.exec(code)) !== null) {
      endpoints.push({
        method: (match[1] ?? '').toLowerCase(),
        path: match[2] ?? '',
        line: code.substring(0, match.index).split('\n').length,
      });
    }

    return endpoints;
  }

  private extractDTOProperties(
    code: string
  ): Array<{ name: string; type: string; line: number }> {
    const propertyRegex =
      /@(IsString|IsNumber|IsBoolean|IsOptional|IsEmail|IsDate)\s*\(\)\s*(\w+)/g;
    const properties: Array<{ name: string; type: string; line: number }> = [];
    let match;

    while ((match = propertyRegex.exec(code)) !== null) {
      properties.push({
        name: match[2] ?? '',
        type: match[1] ?? '',
        line: code.substring(0, match.index).split('\n').length,
      });
    }

    return properties;
  }

  // Методы генерации тестов
  private generateFunctionTest(
    func: { name: string; line: number; isAsync: boolean },
    request: ITestGenerationRequest
  ): IGeneratedTest {
    return {
      id: `test_${func.name}`,
      name: `${func.name} should work correctly`,
      description: `Test function ${func.name}`,
      type: 'unit',
      framework: request.framework,
      code: this.generateFunctionTestCode(func),
      assertions: [
        {
          type: 'expect',
          expression: 'result',
          expected: 'toBeDefined()',
          description: 'Function should return a value',
        },
      ],
      dependencies: [],
      estimatedDuration: 100,
      priority: 'medium',
    };
  }

  private generateClassTests(
    cls: { name: string; line: number },
    request: ITestGenerationRequest
  ): IGeneratedTest[] {
    return [
      {
        id: `test_${cls.name}_instantiation`,
        name: `${cls.name} should be instantiable`,
        description: `Test ${cls.name} class instantiation`,
        type: 'unit',
        framework: request.framework,
        code: this.generateClassInstantiationTest(cls),
        assertions: [
          {
            type: 'expect',
            expression: 'instance',
            expected: 'toBeInstanceOf(' + cls.name + ')',
            description: 'Class should be instantiable',
          },
        ],
        dependencies: [],
        estimatedDuration: 100,
        priority: 'high',
      },
    ];
  }

  private generateServiceInitializationTest(serviceName: string): string {
    return `
describe('${serviceName}', () => {
  let service: ${serviceName};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [${serviceName}],
    }).compile();

    service = module.get<${serviceName}>(${serviceName});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
    `.trim();
  }

  private generateMethodTests(
    serviceName: string,
    method: { name: string; line: number }
  ): IGeneratedTest[] {
    return [
      {
        id: `test_${serviceName}_${method.name}`,
        name: `${method.name} should work correctly`,
        description: `Test ${serviceName}.${method.name} method`,
        type: 'unit',
        framework: 'jest',
        code: this.generateMethodTestCode(serviceName, method),
        assertions: [
          {
            type: 'expect',
            expression: 'result',
            expected: 'toBeDefined()',
            description: 'Method should return a value',
          },
        ],
        dependencies: [],
        estimatedDuration: 150,
        priority: 'medium',
      },
    ];
  }

  private generateEndpointTest(
    controllerName: string,
    endpoint: { method: string; path: string; line: number }
  ): string {
    return `
describe('${controllerName}', () => {
  let controller: ${controllerName};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [${controllerName}],
    }).compile();

    controller = module.get<${controllerName}>(${controllerName});
  });

  it('${endpoint.method.toUpperCase()} ${endpoint.path} should work', async () => {
    const result = await controller.${endpoint.method}();
    expect(result).toBeDefined();
  });
});
    `.trim();
  }

  private generateEndpointMocks(): IMockDefinition[] {
    return [
      {
        name: 'mockRequest',
        type: 'object' as const,
        implementation: 'vi.fn()',
        returnValue: {},
      },
    ];
  }

  private generateEndpointAssertions(): IAssertion[] {
    return [
      {
        type: 'expect',
        expression: 'result',
        expected: 'toBeDefined()',
        description: 'Endpoint should return a response',
      },
    ];
  }

  private generateDTOValidationTest(dtoName: string): string {
    return `
describe('${dtoName} Validation', () => {
  it('should validate correctly', () => {
    const dto = new ${dtoName}();
    // Add validation logic here
    expect(dto).toBeDefined();
  });
});
    `.trim();
  }

  private generatePropertyTests(
    dtoName: string,
    property: { name: string; type: string; line: number }
  ): IGeneratedTest[] {
    return [
      {
        id: `test_${dtoName}_${property.name}`,
        name: `${property.name} should be validated`,
        description: `Test ${dtoName}.${property.name} property validation`,
        type: 'unit',
        framework: 'jest',
        code: this.generatePropertyTestCode(dtoName, property),
        assertions: [
          {
            type: 'expect',
            expression: 'result',
            expected: 'toBe(true)',
            description: 'Property should be valid',
          },
        ],
        dependencies: ['class-validator'],
        estimatedDuration: 100,
        priority: 'low',
      },
    ];
  }

  private generateFunctionTestCode(func: {
    name: string;
    line: number;
    isAsync: boolean;
  }): string {
    return `
describe('${func.name}', () => {
  it('should work correctly', () => {
    // Test implementation
    const result = ${func.name}();
    expect(result).toBeDefined();
  });
});
    `.trim();
  }

  private generateClassInstantiationTest(cls: {
    name: string;
    line: number;
  }): string {
    return `
describe('${cls.name}', () => {
  it('should be instantiable', () => {
    const instance = new ${cls.name}();
    expect(instance).toBeInstanceOf(${cls.name});
  });
});
    `.trim();
  }

  private generateMethodTestCode(
    serviceName: string,
    method: { name: string; line: number }
  ): string {
    return `
describe('${serviceName}.${method.name}', () => {
  let service: ${serviceName};

  beforeEach(() => {
    service = new ${serviceName}();
  });

  it('should work correctly', () => {
    const result = service.${method.name}();
    expect(result).toBeDefined();
  });
});
    `.trim();
  }

  private generatePropertyTestCode(
    dtoName: string,
    property: { name: string; type: string; line: number }
  ): string {
    return `
describe('${dtoName}.${property.name}', () => {
  it('should be validated', () => {
    const dto = new ${dtoName}();
    dto.${property.name} = 'test';
    // Add validation logic here
    expect(dto.${property.name}).toBeDefined();
  });
});
    `.trim();
  }

  private generateEdgeCaseTest(): string {
    return `
// Edge case tests for complex functions
describe('Edge Cases', () => {
  it('should handle null input', () => {
    // Test null input handling
  });

  it('should handle empty input', () => {
    // Test empty input handling
  });

  it('should handle invalid input', () => {
    // Test invalid input handling
  });
});
    `.trim();
  }

  private hasSecurityConcerns(code: string): boolean {
    const securityKeywords = [
      'eval',
      'innerHTML',
      'document.write',
      'setTimeout',
      'setInterval',
    ];
    return securityKeywords.some(keyword => code.includes(keyword));
  }

  private generateSecurityTest(): string {
    return `
describe('Security Tests', () => {
  it('should validate input', () => {
    // Test input validation
  });

  it('should prevent injection', () => {
    // Test injection prevention
  });

  it('should handle malicious input', () => {
    // Test malicious input handling
  });
});
    `.trim();
  }

  private findUncoveredCode(
    analysis: {
      functions: Array<{ name: string; line: number; isAsync: boolean }>;
      classes: Array<{ name: string; line: number }>;
      imports: string[];
      complexity: number;
      dependencies: string[];
    },
    tests: IGeneratedTest[]
  ): string[] {
    // Простая логика поиска непокрытого кода
    return analysis.functions
      .filter(func => !tests.some(test => test.name.includes(func.name)))
      .map(func => func.name);
  }

  private findCriticalPaths(analysis: {
    functions: Array<{ name: string; line: number; isAsync: boolean }>;
    classes: Array<{ name: string; line: number }>;
    imports: string[];
    complexity: number;
    dependencies: string[];
  }): string[] {
    // Поиск критических путей в коде
    return analysis.functions
      .filter(func => func.isAsync || func.name.includes('critical'))
      .map(func => func.name);
  }

  private generateSummary(
    tests: IGeneratedTest[],
    coverage: ITestCoverage
  ): string {
    return `Generated ${tests.length} tests with ${coverage.functions.toFixed(1)}% function coverage`;
  }

  private generateWarnings(
    _request: ITestGenerationRequest,
    analysis: {
      functions: Array<{ name: string; line: number; isAsync: boolean }>;
      classes: Array<{ name: string; line: number }>;
      imports: string[];
      complexity: number;
      dependencies: string[];
    }
  ): string[] {
    const warnings: string[] = [];

    if (analysis.complexity > 15) {
      warnings.push('High complexity detected - consider refactoring');
    }

    if (analysis.dependencies.length > 10) {
      warnings.push(
        'Many dependencies detected - consider dependency injection'
      );
    }

    return warnings;
  }
}

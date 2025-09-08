import { Injectable, Logger } from '@nestjs/common';

// Типы для AI улучшения тестов
export type ImprovementType =
  | 'coverage'
  | 'performance'
  | 'readability'
  | 'maintainability'
  | 'edge_cases'
  | 'security'
  | 'integration';

export type TestQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

export interface ITestImprovementRequest {
  testCode: string;
  sourceCode: string;
  testType: 'unit' | 'integration' | 'e2e';
  framework: 'jest' | 'mocha' | 'vitest';
  context?: string;
  existingCoverage?: number;
  focusAreas?: ImprovementType[];
  maxSuggestions?: number;
}

export interface ITestImprovementResult {
  success: boolean;
  originalTest: string;
  improvedTest: string;
  suggestions: ITestImprovementSuggestion[];
  qualityMetrics: ITestQualityMetrics;
  summary: string;
  warnings: string[];
}

export interface ITestImprovementSuggestion {
  id: string;
  type: ImprovementType;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  currentCode: string;
  suggestedCode: string;
  explanation: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  tags: string[];
  examples?: string[];
}

export interface ITestQualityMetrics {
  coverage: number;
  performance: number;
  readability: number;
  maintainability: number;
  security: number;
  overall: TestQuality;
  issues: string[];
  recommendations: string[];
}

export interface ITestAnalysis {
  testCount: number;
  assertionCount: number;
  mockCount: number;
  complexity: number;
  coverage: number;
  performanceIssues: string[];
  securityIssues: string[];
  maintainabilityIssues: string[];
}

@Injectable()
export class AiTestImprovementService {
  private readonly logger = new Logger(AiTestImprovementService.name);

  /**
   * Анализирует и улучшает тесты
   */
  async improveTests(
    request: ITestImprovementRequest
  ): Promise<ITestImprovementResult> {
    this.logger.log('Starting AI test improvement', {
      testType: request.testType,
      framework: request.framework,
      focusAreas: request.focusAreas,
    });

    try {
      const analysis = this.analyzeTests(request.testCode, request.sourceCode);
      const suggestions = this.generateImprovementSuggestions(
        request,
        analysis
      );
      const improvedTest = this.applyImprovements(
        request.testCode,
        suggestions
      );
      const qualityMetrics = this.calculateQualityMetrics(
        analysis,
        suggestions
      );

      const result: ITestImprovementResult = {
        success: true,
        originalTest: request.testCode,
        improvedTest,
        suggestions,
        qualityMetrics,
        summary: this.generateSummary(analysis, suggestions),
        warnings: this.generateWarnings(analysis),
      };

      this.logger.log('AI test improvement completed', {
        suggestionsCount: suggestions.length,
        qualityImprovement: qualityMetrics.overall,
        coverageImprovement: qualityMetrics.coverage,
      });

      return result;
    } catch (error) {
      this.logger.error('AI test improvement failed', error);
      return {
        success: false,
        originalTest: request.testCode,
        improvedTest: request.testCode,
        suggestions: [],
        qualityMetrics: {
          coverage: 0,
          performance: 0,
          readability: 0,
          maintainability: 0,
          security: 0,
          overall: 'critical',
          issues: ['Improvement failed'],
          recommendations: ['Fix errors and try again'],
        },
        summary: 'Test improvement failed',
        warnings: [
          `Improvement failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
      };
    }
  }

  /**
   * Анализирует качество существующих тестов
   */
  async analyzeTestQuality(
    testCode: string,
    sourceCode: string
  ): Promise<ITestAnalysis> {
    this.logger.log('Analyzing test quality');

    const testCount = this.countTests(testCode);
    const assertionCount = this.countAssertions(testCode);
    const mockCount = this.countMocks(testCode);
    const complexity = this.calculateTestComplexity(testCode);
    const coverage = this.calculateTestCoverage(testCode, sourceCode);

    return {
      testCount,
      assertionCount,
      mockCount,
      complexity,
      coverage,
      performanceIssues: this.findPerformanceIssues(testCode),
      securityIssues: this.findSecurityIssues(testCode),
      maintainabilityIssues: this.findMaintainabilityIssues(testCode),
    };
  }

  /**
   * Предлагает улучшения для конкретного типа тестов
   */
  async suggestTestImprovements(
    testCode: string,
    improvementType: ImprovementType
  ): Promise<ITestImprovementSuggestion[]> {
    this.logger.log(`Suggesting improvements for type: ${improvementType}`);

    const suggestions: ITestImprovementSuggestion[] = [];

    switch (improvementType) {
      case 'coverage':
        suggestions.push(...this.suggestCoverageImprovements(testCode));
        break;
      case 'performance':
        suggestions.push(...this.suggestPerformanceImprovements(testCode));
        break;
      case 'readability':
        suggestions.push(...this.suggestReadabilityImprovements(testCode));
        break;
      case 'maintainability':
        suggestions.push(...this.suggestMaintainabilityImprovements(testCode));
        break;
      case 'edge_cases':
        suggestions.push(...this.suggestEdgeCaseImprovements(testCode));
        break;
      case 'security':
        suggestions.push(...this.suggestSecurityImprovements(testCode));
        break;
      case 'integration':
        suggestions.push(...this.suggestIntegrationImprovements(testCode));
        break;
    }

    return suggestions;
  }

  /**
   * Генерирует недостающие тесты
   */
  async generateMissingTests(
    sourceCode: string,
    existingTests: string
  ): Promise<string[]> {
    this.logger.log('Generating missing tests');

    const sourceFunctions = this.extractFunctions(sourceCode);
    const testedFunctions = this.extractTestedFunctions(existingTests);
    const missingFunctions = sourceFunctions.filter(
      func => !testedFunctions.includes(func)
    );

    const missingTests: string[] = [];

    for (const func of missingFunctions) {
      missingTests.push(this.generateMissingTest(func));
    }

    return missingTests;
  }

  /**
   * Оптимизирует производительность тестов
   */
  async optimizeTestPerformance(testCode: string): Promise<string> {
    this.logger.log('Optimizing test performance');

    let optimizedCode = testCode;

    // Оптимизация моков
    optimizedCode = this.optimizeMocks(optimizedCode);

    // Оптимизация асинхронных операций
    optimizedCode = this.optimizeAsyncOperations(optimizedCode);

    // Оптимизация setup/teardown
    optimizedCode = this.optimizeSetupTeardown(optimizedCode);

    return optimizedCode;
  }

  /**
   * Анализирует тесты
   */
  private analyzeTests(testCode: string, sourceCode: string): ITestAnalysis {
    return {
      testCount: this.countTests(testCode),
      assertionCount: this.countAssertions(testCode),
      mockCount: this.countMocks(testCode),
      complexity: this.calculateTestComplexity(testCode),
      coverage: this.calculateTestCoverage(testCode, sourceCode),
      performanceIssues: this.findPerformanceIssues(testCode),
      securityIssues: this.findSecurityIssues(testCode),
      maintainabilityIssues: this.findMaintainabilityIssues(testCode),
    };
  }

  /**
   * Генерирует предложения по улучшению
   */
  private generateImprovementSuggestions(
    request: ITestImprovementRequest,
    analysis: ITestAnalysis
  ): ITestImprovementSuggestion[] {
    const suggestions: ITestImprovementSuggestion[] = [];

    // Предложения по покрытию
    if (analysis.coverage < 80) {
      suggestions.push({
        id: 'improve_coverage',
        type: 'coverage',
        priority: 'high',
        title: 'Improve test coverage',
        description: 'Add more test cases to increase coverage',
        currentCode: request.testCode,
        suggestedCode: this.generateCoverageImprovement(request.testCode),
        explanation: 'Current coverage is below 80%, add more test cases',
        impact: 'high',
        effort: 'medium',
        tags: ['coverage', 'testing'],
      });
    }

    // Предложения по производительности
    if (analysis.performanceIssues.length > 0) {
      suggestions.push({
        id: 'improve_performance',
        type: 'performance',
        priority: 'medium',
        title: 'Optimize test performance',
        description: 'Improve test execution speed',
        currentCode: request.testCode,
        suggestedCode: this.generatePerformanceImprovement(request.testCode),
        explanation: 'Tests can be optimized for better performance',
        impact: 'medium',
        effort: 'low',
        tags: ['performance', 'optimization'],
      });
    }

    // Предложения по читаемости
    if (analysis.complexity > 10) {
      suggestions.push({
        id: 'improve_readability',
        type: 'readability',
        priority: 'medium',
        title: 'Improve test readability',
        description: 'Make tests more readable and maintainable',
        currentCode: request.testCode,
        suggestedCode: this.generateReadabilityImprovement(request.testCode),
        explanation: 'High complexity makes tests hard to read',
        impact: 'medium',
        effort: 'medium',
        tags: ['readability', 'maintainability'],
      });
    }

    return suggestions;
  }

  /**
   * Применяет улучшения к тестам
   */
  private applyImprovements(
    testCode: string,
    suggestions: ITestImprovementSuggestion[]
  ): string {
    let improvedCode = testCode;

    // Применяем улучшения по приоритету
    const sortedSuggestions = suggestions.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    for (const suggestion of sortedSuggestions) {
      if (
        suggestion.priority === 'critical' ||
        suggestion.priority === 'high'
      ) {
        improvedCode = this.applySuggestion(improvedCode, suggestion);
      }
    }

    return improvedCode;
  }

  /**
   * Вычисляет метрики качества
   */
  private calculateQualityMetrics(
    analysis: ITestAnalysis,
    suggestions: ITestImprovementSuggestion[]
  ): ITestQualityMetrics {
    const coverage = Math.min(analysis.coverage, 100);
    const performance = Math.max(
      0,
      100 - analysis.performanceIssues.length * 10
    );
    const readability = Math.max(0, 100 - analysis.complexity * 5);
    const maintainability = Math.max(
      0,
      100 - analysis.maintainabilityIssues.length * 15
    );
    const security = Math.max(0, 100 - analysis.securityIssues.length * 20);

    const overall = this.calculateOverallQuality(
      coverage,
      performance,
      readability,
      maintainability,
      security
    );

    return {
      coverage,
      performance,
      readability,
      maintainability,
      security,
      overall,
      issues: [
        ...analysis.performanceIssues,
        ...analysis.securityIssues,
        ...analysis.maintainabilityIssues,
      ],
      recommendations: this.generateRecommendations(analysis, suggestions),
    };
  }

  // Вспомогательные методы для анализа
  private countTests(testCode: string): number {
    const testRegex = /(?:it|test|describe)\s*\(/g;
    return (testCode.match(testRegex) ?? []).length;
  }

  private countAssertions(testCode: string): number {
    const assertionRegex = /(?:expect|assert|should)\s*\(/g;
    return (testCode.match(assertionRegex) ?? []).length;
  }

  private countMocks(testCode: string): number {
    const mockRegex = /(?:jest\.mock|sinon\.mock|mock)/g;
    return (testCode.match(mockRegex) ?? []).length;
  }

  private calculateTestComplexity(testCode: string): number {
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
      const matches = testCode.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  private calculateTestCoverage(testCode: string, sourceCode: string): number {
    const sourceFunctions = this.extractFunctions(sourceCode);
    const testedFunctions = this.extractTestedFunctions(testCode);

    if (sourceFunctions.length === 0) return 100;

    return (testedFunctions.length / sourceFunctions.length) * 100;
  }

  private findPerformanceIssues(testCode: string): string[] {
    const issues: string[] = [];

    if (testCode.includes('setTimeout') || testCode.includes('setInterval')) {
      issues.push('Using setTimeout/setInterval in tests can cause flakiness');
    }

    if (testCode.includes('sleep') || testCode.includes('wait')) {
      issues.push('Using sleep/wait in tests reduces performance');
    }

    if (testCode.includes('beforeEach') && testCode.includes('afterEach')) {
      issues.push('Consider using beforeAll/afterAll for better performance');
    }

    return issues;
  }

  private findSecurityIssues(testCode: string): string[] {
    const issues: string[] = [];

    if (testCode.includes('eval') || testCode.includes('Function')) {
      issues.push('Using eval or Function constructor in tests is unsafe');
    }

    if (testCode.includes('innerHTML') || testCode.includes('outerHTML')) {
      issues.push('Direct DOM manipulation in tests can be unsafe');
    }

    return issues;
  }

  private findMaintainabilityIssues(testCode: string): string[] {
    const issues: string[] = [];

    if (testCode.includes('any') || testCode.includes('unknown')) {
      issues.push('Using any/unknown types reduces type safety');
    }

    if (
      testCode.includes('console.log') ||
      testCode.includes('console.error')
    ) {
      issues.push('Console statements should be removed from tests');
    }

    if (testCode.length > 1000) {
      issues.push('Test file is too long, consider splitting');
    }

    return issues;
  }

  private extractFunctions(sourceCode: string): string[] {
    const functionRegex =
      /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?\(|(\w+)\s*:\s*(?:async\s+)?\()/g;
    const functions: string[] = [];
    let match;

    while ((match = functionRegex.exec(sourceCode)) !== null) {
      functions.push(match[1] ?? match[2] ?? match[3] ?? '');
    }

    return functions;
  }

  private extractTestedFunctions(testCode: string): string[] {
    const testRegex = /(?:it|test)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    const functions: string[] = [];
    let match;

    while ((match = testRegex.exec(testCode)) !== null) {
      const testName = match[1];
      // Извлекаем имя функции из названия теста
      const functionMatch = testName?.match(/(\w+)\s+should/);
      if (functionMatch) {
        functions.push(functionMatch[1] ?? '');
      }
    }

    return functions;
  }

  // Методы генерации улучшений
  private suggestCoverageImprovements(
    testCode: string
  ): ITestImprovementSuggestion[] {
    return [
      {
        id: 'add_edge_cases',
        type: 'edge_cases',
        priority: 'medium',
        title: 'Add edge case tests',
        description: 'Add tests for edge cases and error conditions',
        currentCode: testCode,
        suggestedCode: this.generateEdgeCaseTests(testCode),
        explanation: 'Edge cases improve test robustness',
        impact: 'high',
        effort: 'medium',
        tags: ['coverage', 'edge-cases'],
      },
    ];
  }

  private suggestPerformanceImprovements(
    testCode: string
  ): ITestImprovementSuggestion[] {
    return [
      {
        id: 'optimize_mocks',
        type: 'performance',
        priority: 'low',
        title: 'Optimize mocks',
        description: 'Use more efficient mocking strategies',
        currentCode: testCode,
        suggestedCode: this.optimizeMocks(testCode),
        explanation: 'Better mocks improve test performance',
        impact: 'medium',
        effort: 'low',
        tags: ['performance', 'mocks'],
      },
    ];
  }

  private suggestReadabilityImprovements(
    testCode: string
  ): ITestImprovementSuggestion[] {
    return [
      {
        id: 'improve_test_names',
        type: 'readability',
        priority: 'low',
        title: 'Improve test names',
        description: 'Make test names more descriptive',
        currentCode: testCode,
        suggestedCode: this.improveTestName(testCode),
        explanation: 'Better names improve test readability',
        impact: 'low',
        effort: 'low',
        tags: ['readability', 'naming'],
      },
    ];
  }

  private suggestMaintainabilityImprovements(
    testCode: string
  ): ITestImprovementSuggestion[] {
    return [
      {
        id: 'extract_helpers',
        type: 'maintainability',
        priority: 'medium',
        title: 'Extract test helpers',
        description: 'Extract common test logic into helper functions',
        currentCode: testCode,
        suggestedCode: this.extractTestHelpers(testCode),
        explanation: 'Helper functions reduce code duplication',
        impact: 'medium',
        effort: 'medium',
        tags: ['maintainability', 'helpers'],
      },
    ];
  }

  private suggestEdgeCaseImprovements(
    testCode: string
  ): ITestImprovementSuggestion[] {
    return [
      {
        id: 'add_error_tests',
        type: 'edge_cases',
        priority: 'high',
        title: 'Add error handling tests',
        description: 'Add tests for error conditions and exceptions',
        currentCode: testCode,
        suggestedCode: this.generateErrorTests(testCode),
        explanation: 'Error tests improve robustness',
        impact: 'high',
        effort: 'medium',
        tags: ['error-handling', 'robustness'],
      },
    ];
  }

  private suggestSecurityImprovements(
    testCode: string
  ): ITestImprovementSuggestion[] {
    return [
      {
        id: 'add_security_tests',
        type: 'security',
        priority: 'high',
        title: 'Add security tests',
        description: 'Add tests for security vulnerabilities',
        currentCode: testCode,
        suggestedCode: this.generateSecurityTests(testCode),
        explanation: 'Security tests prevent vulnerabilities',
        impact: 'high',
        effort: 'high',
        tags: ['security', 'vulnerabilities'],
      },
    ];
  }

  private suggestIntegrationImprovements(
    testCode: string
  ): ITestImprovementSuggestion[] {
    return [
      {
        id: 'add_integration_tests',
        type: 'integration',
        priority: 'medium',
        title: 'Add integration tests',
        description: 'Add tests for component integration',
        currentCode: testCode,
        suggestedCode: this.generateIntegrationTests(testCode),
        explanation: 'Integration tests verify component interaction',
        impact: 'medium',
        effort: 'high',
        tags: ['integration', 'components'],
      },
    ];
  }

  // Методы генерации кода
  private generateCoverageImprovement(testCode: string): string {
    return (
      testCode +
      `

// Additional coverage tests
describe('Additional Coverage', () => {
  it('should handle edge cases', () => {
    // Add edge case tests here
  });

  it('should handle error conditions', () => {
    // Add error condition tests here
  });
});
    `.trim()
    );
  }

  private generatePerformanceImprovement(testCode: string): string {
    return testCode
      .replace(/beforeEach/g, 'beforeAll')
      .replace(/afterEach/g, 'afterAll');
  }

  private generateReadabilityImprovement(testCode: string): string {
    return testCode.replace(/it\s*\(\s*['"`]([^'"`]+)['"`]/g, (match, name) => {
      return match.replace(name, this.improveTestName(name));
    });
  }

  private generateEdgeCaseTests(testCode: string): string {
    return (
      testCode +
      `

// Edge case tests
describe('Edge Cases', () => {
  it('should handle null input', () => {
    // Test null input
  });

  it('should handle empty input', () => {
    // Test empty input
  });

  it('should handle invalid input', () => {
    // Test invalid input
  });
});
    `.trim()
    );
  }

  private generateErrorTests(testCode: string): string {
    return (
      testCode +
      `

// Error handling tests
describe('Error Handling', () => {
  it('should throw error for invalid input', () => {
    expect(() => {
      // Test error throwing
    }).toThrow();
  });

  it('should handle async errors', async () => {
    await expect(asyncFunction()).rejects.toThrow();
  });
});
    `.trim()
    );
  }

  private generateSecurityTests(testCode: string): string {
    return (
      testCode +
      `

// Security tests
describe('Security', () => {
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
    `.trim()
    );
  }

  private generateIntegrationTests(testCode: string): string {
    return (
      testCode +
      `

// Integration tests
describe('Integration', () => {
  it('should work with other components', () => {
    // Test component integration
  });

  it('should handle data flow', () => {
    // Test data flow
  });
});
    `.trim()
    );
  }

  private generateMissingTest(funcName: string): string {
    return `
describe('${funcName}', () => {
  it('should work correctly', () => {
    // Test implementation for ${funcName}
    const result = ${funcName}();
    expect(result).toBeDefined();
  });
});
    `.trim();
  }

  private optimizeMocks(testCode: string): string {
    return testCode.replace(
      /jest\.fn\(\)/g,
      'vi.fn().mockReturnValue(undefined)'
    );
  }

  private optimizeAsyncOperations(testCode: string): string {
    return testCode.replace(/await\s+sleep\(/g, '// await sleep(');
  }

  private optimizeSetupTeardown(testCode: string): string {
    return testCode
      .replace(/beforeEach/g, 'beforeAll')
      .replace(/afterEach/g, 'afterAll');
  }

  private applySuggestion(
    testCode: string,
    suggestion: ITestImprovementSuggestion
  ): string {
    // Простая замена кода
    return testCode + '\n\n' + suggestion.suggestedCode;
  }

  private calculateOverallQuality(
    coverage: number,
    performance: number,
    readability: number,
    maintainability: number,
    security: number
  ): TestQuality {
    const average =
      (coverage + performance + readability + maintainability + security) / 5;

    if (average >= 90) return 'excellent';
    if (average >= 80) return 'good';
    if (average >= 70) return 'fair';
    if (average >= 60) return 'poor';
    return 'critical';
  }

  private generateRecommendations(
    analysis: ITestAnalysis,
    suggestions: ITestImprovementSuggestion[]
  ): string[] {
    const recommendations: string[] = [];

    if (analysis.coverage < 80) {
      recommendations.push('Increase test coverage to at least 80%');
    }

    if (analysis.performanceIssues.length > 0) {
      recommendations.push('Optimize test performance');
    }

    if (analysis.securityIssues.length > 0) {
      recommendations.push('Add security tests');
    }

    if (suggestions.length > 0) {
      recommendations.push(
        `Implement ${suggestions.length} improvement suggestions`
      );
    }

    return recommendations;
  }

  private improveTestName(name: string): string {
    return name
      .replace(/\bshould\b/g, 'should')
      .replace(/\bwork\b/g, 'function correctly')
      .replace(/\btest\b/g, 'validate');
  }

  private extractTestHelpers(testCode: string): string {
    return (
      testCode +
      `

// Test helpers
const createTestData = () => ({
  // Helper function for creating test data
});

const setupTestEnvironment = () => {
  // Helper function for setting up test environment
};
    `.trim()
    );
  }

  private generateSummary(
    analysis: ITestAnalysis,
    suggestions: ITestImprovementSuggestion[]
  ): string {
    return `Analyzed ${analysis.testCount} tests with ${analysis.coverage.toFixed(1)}% coverage. Generated ${suggestions.length} improvement suggestions.`;
  }

  private generateWarnings(analysis: ITestAnalysis): string[] {
    const warnings: string[] = [];

    if (analysis.coverage < 50) {
      warnings.push('Very low test coverage detected');
    }

    if (analysis.performanceIssues.length > 3) {
      warnings.push('Multiple performance issues detected');
    }

    if (analysis.securityIssues.length > 0) {
      warnings.push('Security issues detected in tests');
    }

    return warnings;
  }
}

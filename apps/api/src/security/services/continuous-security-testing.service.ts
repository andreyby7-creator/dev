import { Injectable, Logger } from '@nestjs/common';

// Типы
type SecurityTestType =
  | 'OWASP'
  | 'FUZZING'
  | 'TRIVY'
  | 'SNYK'
  | 'DEPENDENCY_CHECK'
  | 'SAST'
  | 'DAST'
  | 'IAST';
type TestStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMEOUT';
type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// Интерфейсы
export interface ISecurityTest {
  id: string;
  type: SecurityTestType;
  status: TestStatus;
  target: string; // URL, file path, package name
  startedAt: string;
  completedAt?: string;
  duration?: number;
  results: ISecurityTestResult[];
  configuration: ISecurityTestConfig;
  metadata: Record<string, unknown>;
}

export interface ISecurityTestResult {
  id: string;
  severity: SeverityLevel;
  title: string;
  description: string;
  cve?: string;
  cvss?: number;
  location?: string;
  recommendation?: string;
  references?: string[];
  falsePositive?: boolean;
  tags: string[];
}

export interface ISecurityTestConfig {
  timeout: number;
  maxConcurrentTests: number;
  excludePatterns: string[];
  includePatterns: string[];
  customRules?: string[];
  failOnHighSeverity: boolean;
  generateReport: boolean;
  notifyOnFailure: boolean;
}

export interface ISecurityTestRequest {
  type: SecurityTestType;
  target: string;
  configuration?: Partial<ISecurityTestConfig>;
  metadata?: Record<string, unknown>;
}

export interface ISecurityTestReport {
  testId: string;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    vulnerabilities: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    duration: number;
  };
  results: ISecurityTestResult[];
  recommendations: string[];
  compliance: {
    owasp: boolean;
    gdpr: boolean;
    pciDss: boolean;
    sox: boolean;
  };
}

@Injectable()
export class ContinuousSecurityTestingService {
  private readonly logger = new Logger(ContinuousSecurityTestingService.name);
  private readonly activeTests: Map<string, ISecurityTest> = new Map();
  private readonly testHistory: ISecurityTest[] = [];

  constructor() {}

  /**
   * Запустить security тест
   */
  async runSecurityTest(request: ISecurityTestRequest): Promise<ISecurityTest> {
    this.logger.log(
      `Starting security test: ${request.type} for target: ${request.target}`
    );

    const test: ISecurityTest = {
      id: this.generateTestId(),
      type: request.type,
      status: 'PENDING',
      target: request.target,
      startedAt: new Date().toISOString(),
      results: [],
      configuration: this.getDefaultConfig(request.configuration),
      metadata: request.metadata ?? {},
    };

    this.activeTests.set(test.id, test);

    try {
      test.status = 'RUNNING';
      const results = await this.executeTest(test);
      test.results = results;
      test.status = 'COMPLETED';
      test.completedAt = new Date().toISOString();
      test.duration =
        new Date(test.completedAt).getTime() -
        new Date(test.startedAt).getTime();

      this.logger.log(
        `Security test completed: ${test.id} with ${results.length} findings`
      );
    } catch (error) {
      test.status = 'FAILED';
      test.completedAt = new Date().toISOString();
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Security test failed: ${test.id} - ${errorMessage}`);
    }

    this.activeTests.delete(test.id);
    this.testHistory.push(test);

    return test;
  }

  /**
   * Запустить все security тесты для target
   */
  async runAllSecurityTests(
    target: string,
    config?: Partial<ISecurityTestConfig>
  ): Promise<ISecurityTest[]> {
    this.logger.log(`Running all security tests for target: ${target}`);

    const testTypes: SecurityTestType[] = [
      'OWASP',
      'FUZZING',
      'TRIVY',
      'SNYK',
      'DEPENDENCY_CHECK',
    ];
    const tests: ISecurityTest[] = [];

    for (const type of testTypes) {
      const testRequest: ISecurityTestRequest = {
        type,
        target,
      };
      if (config != null) {
        testRequest.configuration = config;
      }
      const test = await this.runSecurityTest(testRequest);
      tests.push(test);
    }

    return tests;
  }

  /**
   * Получить отчет по security тестам
   */
  async generateSecurityReport(
    testIds: string[]
  ): Promise<ISecurityTestReport> {
    const tests = testIds
      .map(id => this.testHistory.find(t => t.id === id))
      .filter(Boolean) as ISecurityTest[];

    if (tests.length === 0) {
      throw new Error('No tests found for the provided IDs');
    }

    const allResults = tests.flatMap(test => test.results);
    const totalDuration = tests.reduce(
      (sum, test) => sum + (test.duration ?? 0),
      0
    );

    const summary = {
      totalTests: tests.length,
      passed: tests.filter(
        t => t.status === 'COMPLETED' && t.results.length === 0
      ).length,
      failed: tests.filter(
        t =>
          t.status === 'FAILED' ||
          (t.status === 'COMPLETED' && t.results.length > 0)
      ).length,
      vulnerabilities: {
        critical: allResults.filter(r => r.severity === 'CRITICAL').length,
        high: allResults.filter(r => r.severity === 'HIGH').length,
        medium: allResults.filter(r => r.severity === 'MEDIUM').length,
        low: allResults.filter(r => r.severity === 'LOW').length,
      },
      duration: totalDuration,
    };

    const recommendations = this.generateRecommendations(allResults);
    const compliance = this.checkCompliance(allResults);

    return {
      testId: testIds.join(','),
      summary,
      results: allResults,
      recommendations,
      compliance,
    };
  }

  /**
   * Получить активные тесты
   */
  getActiveTests(): ISecurityTest[] {
    return Array.from(this.activeTests.values());
  }

  /**
   * Получить историю тестов
   */
  getTestHistory(limit = 100): ISecurityTest[] {
    return this.testHistory.slice(-limit);
  }

  /**
   * Получить тест по ID
   */
  getTestById(testId: string): ISecurityTest | undefined {
    return (
      this.activeTests.get(testId) ??
      this.testHistory.find(t => t.id === testId)
    );
  }

  /**
   * Остановить тест
   */
  async stopTest(testId: string): Promise<boolean> {
    const test = this.activeTests.get(testId);
    if (!test) {
      return false;
    }

    test.status = 'TIMEOUT';
    test.completedAt = new Date().toISOString();
    this.activeTests.delete(testId);
    this.testHistory.push(test);

    this.logger.log(`Test stopped: ${testId}`);
    return true;
  }

  /**
   * Выполнить конкретный тест
   */
  private async executeTest(
    test: ISecurityTest
  ): Promise<ISecurityTestResult[]> {
    switch (test.type) {
      case 'OWASP':
        return this.runOwaspTest();
      case 'FUZZING':
        return this.runFuzzingTest();
      case 'TRIVY':
        return this.runTrivyTest();
      case 'SNYK':
        return this.runSnykTest();
      case 'DEPENDENCY_CHECK':
        return this.runDependencyCheckTest();
      case 'SAST':
        return this.runSastTest();
      case 'DAST':
        return this.runDastTest();
      case 'IAST':
        return this.runIastTest();
      default:
        throw new Error(`Unsupported test type: ${test.type}`);
    }
  }

  /**
   * OWASP тест
   */
  private async runOwaspTest(): Promise<ISecurityTestResult[]> {
    // Симуляция OWASP тестов
    await this.delay(2000);

    return [
      {
        id: `owasp-${Date.now()}-1`,
        severity: 'HIGH',
        title: 'SQL Injection Vulnerability',
        description: 'Potential SQL injection found in user input validation',
        cve: 'CVE-2023-1234',
        cvss: 8.5,
        location: '/api/users/search',
        recommendation: 'Use parameterized queries and input validation',
        references: ['https://owasp.org/www-community/attacks/SQL_Injection'],
        tags: ['sql-injection', 'owasp-top-10'],
      },
      {
        id: `owasp-${Date.now()}-2`,
        severity: 'MEDIUM',
        title: 'XSS Vulnerability',
        description: 'Cross-site scripting vulnerability detected',
        cve: 'CVE-2023-5678',
        cvss: 6.1,
        location: '/api/comments',
        recommendation: 'Implement proper output encoding and CSP headers',
        references: ['https://owasp.org/www-community/attacks/xss/'],
        tags: ['xss', 'owasp-top-10'],
      },
    ];
  }

  /**
   * Fuzzing тест
   */
  private async runFuzzingTest(): Promise<ISecurityTestResult[]> {
    // Симуляция fuzzing тестов
    await this.delay(3000);

    return [
      {
        id: `fuzzing-${Date.now()}-1`,
        severity: 'CRITICAL',
        title: 'Buffer Overflow',
        description: 'Buffer overflow detected during fuzzing test',
        cve: 'CVE-2023-9012',
        cvss: 9.8,
        location: '/api/upload',
        recommendation: 'Implement proper bounds checking and input validation',
        references: [
          'https://owasp.org/www-community/vulnerabilities/Buffer_Overflow',
        ],
        tags: ['buffer-overflow', 'fuzzing'],
      },
    ];
  }

  /**
   * Trivy тест
   */
  private async runTrivyTest(): Promise<ISecurityTestResult[]> {
    // Симуляция Trivy сканирования
    await this.delay(1500);

    return [
      {
        id: `trivy-${Date.now()}-1`,
        severity: 'HIGH',
        title: 'Vulnerable Dependency',
        description: 'Found vulnerable dependency in package.json',
        cve: 'CVE-2023-3456',
        cvss: 7.5,
        location: 'package.json:lodash@4.17.15',
        recommendation: 'Update lodash to version 4.17.21 or later',
        references: ['https://nvd.nist.gov/vuln/detail/CVE-2023-3456'],
        tags: ['dependency', 'trivy'],
      },
    ];
  }

  /**
   * Snyk тест
   */
  private async runSnykTest(): Promise<ISecurityTestResult[]> {
    // Симуляция Snyk сканирования
    await this.delay(2000);

    return [
      {
        id: `snyk-${Date.now()}-1`,
        severity: 'MEDIUM',
        title: 'License Violation',
        description: 'Found license violation in dependencies',
        location: 'package.json:some-package@1.0.0',
        recommendation: 'Replace with compatible license package',
        tags: ['license', 'snyk'],
      },
    ];
  }

  /**
   * Dependency Check тест
   */
  private async runDependencyCheckTest(): Promise<ISecurityTestResult[]> {
    // Симуляция dependency check
    await this.delay(1000);

    return [
      {
        id: `depcheck-${Date.now()}-1`,
        severity: 'LOW',
        title: 'Unused Dependency',
        description: 'Found unused dependency in project',
        location: 'package.json:unused-package@1.0.0',
        recommendation: 'Remove unused dependency to reduce attack surface',
        tags: ['dependency', 'unused'],
      },
    ];
  }

  /**
   * SAST тест
   */
  private async runSastTest(): Promise<ISecurityTestResult[]> {
    // Симуляция SAST анализа
    await this.delay(2500);

    return [
      {
        id: `sast-${Date.now()}-1`,
        severity: 'HIGH',
        title: 'Hardcoded Credentials',
        description: 'Found hardcoded credentials in source code',
        location: 'src/config/database.ts:15',
        recommendation: 'Use environment variables for sensitive data',
        tags: ['credentials', 'sast'],
      },
    ];
  }

  /**
   * DAST тест
   */
  private async runDastTest(): Promise<ISecurityTestResult[]> {
    // Симуляция DAST анализа
    await this.delay(3000);

    return [
      {
        id: `dast-${Date.now()}-1`,
        severity: 'MEDIUM',
        title: 'Information Disclosure',
        description: 'Server information disclosure in headers',
        location: 'HTTP Headers',
        recommendation: 'Remove or modify server headers',
        tags: ['information-disclosure', 'dast'],
      },
    ];
  }

  /**
   * IAST тест
   */
  private async runIastTest(): Promise<ISecurityTestResult[]> {
    // Симуляция IAST анализа
    await this.delay(2000);

    return [
      {
        id: `iast-${Date.now()}-1`,
        severity: 'HIGH',
        title: 'Runtime Vulnerability',
        description: 'Runtime vulnerability detected during execution',
        location: 'Runtime',
        recommendation: 'Implement proper runtime protection',
        tags: ['runtime', 'iast'],
      },
    ];
  }

  /**
   * Генерировать рекомендации
   */
  private generateRecommendations(results: ISecurityTestResult[]): string[] {
    const recommendations: string[] = [];

    const criticalCount = results.filter(r => r.severity === 'CRITICAL').length;
    const highCount = results.filter(r => r.severity === 'HIGH').length;

    if (criticalCount > 0) {
      recommendations.push(
        `Immediate action required: ${criticalCount} critical vulnerabilities found`
      );
    }

    if (highCount > 0) {
      recommendations.push(
        `High priority: ${highCount} high severity vulnerabilities need attention`
      );
    }

    if (results.some(r => r.tags.includes('sql-injection'))) {
      recommendations.push(
        'Implement parameterized queries and input validation'
      );
    }

    if (results.some(r => r.tags.includes('xss'))) {
      recommendations.push(
        'Add Content Security Policy headers and output encoding'
      );
    }

    if (results.some(r => r.tags.includes('dependency'))) {
      recommendations.push(
        'Update vulnerable dependencies and implement dependency scanning in CI/CD'
      );
    }

    return recommendations;
  }

  /**
   * Проверить соответствие стандартам
   */
  private checkCompliance(results: ISecurityTestResult[]): {
    owasp: boolean;
    gdpr: boolean;
    pciDss: boolean;
    sox: boolean;
  } {
    const hasCriticalVulnerabilities = results.some(
      r => r.severity === 'CRITICAL'
    );
    const hasHighVulnerabilities = results.some(r => r.severity === 'HIGH');
    const hasDataExposure = results.some(r =>
      r.tags.includes('information-disclosure')
    );

    return {
      owasp: !hasCriticalVulnerabilities && !hasHighVulnerabilities,
      gdpr: !hasDataExposure,
      pciDss: !hasCriticalVulnerabilities && !hasDataExposure,
      sox: !hasCriticalVulnerabilities,
    };
  }

  /**
   * Получить конфигурацию по умолчанию
   */
  private getDefaultConfig(
    overrides?: Partial<ISecurityTestConfig>
  ): ISecurityTestConfig {
    return {
      timeout: 300000, // 5 minutes
      maxConcurrentTests: 3,
      excludePatterns: ['node_modules/**', 'dist/**', '.git/**'],
      includePatterns: ['**/*.ts', '**/*.js', '**/*.json'],
      failOnHighSeverity: true,
      generateReport: true,
      notifyOnFailure: true,
      ...overrides,
    };
  }

  /**
   * Генерировать ID теста
   */
  private generateTestId(): string {
    return `security-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Задержка для симуляции
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

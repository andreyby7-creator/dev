import { Injectable, Logger } from '@nestjs/common';

export interface IStaticAnalysisResult {
  filePath: string;
  issues: IAnalysisIssue[];
  metrics: ICodeMetrics;
  score: number; // 0-100
}

export interface IAnalysisIssue {
  type: 'error' | 'warning' | 'info';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  line?: number;
  column?: number;
  rule?: string;
  suggestion?: string;
}

export interface ICodeMetrics {
  linesOfCode: number;
  cyclomaticComplexity: number;
  maintainabilityIndex: number;
  testCoverage?: number;
  securityScore: number;
  performanceScore: number;
  codeDuplication: number;
}

export interface IStaticAnalysisConfig {
  enabled: boolean;
  rules: {
    security: boolean;
    performance: boolean;
    maintainability: boolean;
    bestPractices: boolean;
  };
  thresholds: {
    maxComplexity: number;
    minMaintainability: number;
    maxDuplication: number;
    minSecurityScore: number;
  };
  excludedPaths: string[];
}

@Injectable()
export class StaticAnalyzerService {
  private readonly logger = new Logger(StaticAnalyzerService.name);
  private readonly config: IStaticAnalysisConfig;
  private readonly analysisResults: Map<string, IStaticAnalysisResult> =
    new Map();

  constructor() {
    this.config = {
      enabled: process.env.STATIC_ANALYSIS_ENABLED === 'true',
      rules: {
        security: true,
        performance: true,
        maintainability: true,
        bestPractices: true,
      },
      thresholds: {
        maxComplexity: 10,
        minMaintainability: 65,
        maxDuplication: 15,
        minSecurityScore: 80,
      },
      excludedPaths: [
        'node_modules',
        'dist',
        'build',
        'coverage',
        '.git',
        '*.spec.ts',
        '*.test.ts',
      ],
    };

    if (this.config.enabled) {
      this.logger.log('Static analyzer initialized', {
        rules: this.config.rules,
        thresholds: this.config.thresholds,
      });
    }
  }

  /**
   * Анализирует файл на предмет проблем безопасности и производительности
   */
  async analyzeFile(
    filePath: string,
    content: string
  ): Promise<IStaticAnalysisResult> {
    const issues: IAnalysisIssue[] = [];
    const metrics = this.calculateMetrics(content);

    // Анализ безопасности
    if (this.config.rules.security) {
      issues.push(...this.analyzeSecurity(content));
    }

    // Анализ производительности
    if (this.config.rules.performance) {
      issues.push(...this.analyzePerformance(content));
    }

    // Анализ поддерживаемости
    if (this.config.rules.maintainability) {
      issues.push(...this.analyzeMaintainability(content, filePath, metrics));
    }

    // Анализ лучших практик
    if (this.config.rules.bestPractices) {
      issues.push(...this.analyzeBestPractices(content));
    }

    const score = this.calculateScore(issues, metrics);
    const result: IStaticAnalysisResult = {
      filePath,
      issues,
      metrics,
      score,
    };

    this.analysisResults.set(filePath, result);
    return result;
  }

  /**
   * Анализирует безопасность кода
   */
  private analyzeSecurity(content: string): IAnalysisIssue[] {
    const issues: IAnalysisIssue[] = [];

    // Проверка на SQL инъекции
    if (
      content.includes('SELECT') &&
      content.includes('${') &&
      !content.includes('parameterized')
    ) {
      issues.push({
        type: 'error',
        severity: 'critical',
        message: 'Potential SQL injection detected',
        line: this.findLineNumber(content, 'SELECT'),
        rule: 'security-sql-injection',
        suggestion: 'Use parameterized queries or ORM methods',
      });
    }

    // Проверка на XSS
    if (content.includes('innerHTML') || content.includes('outerHTML')) {
      issues.push({
        type: 'warning',
        severity: 'high',
        message: 'Potential XSS vulnerability detected',
        line: this.findLineNumber(content, 'innerHTML'),
        rule: 'security-xss',
        suggestion: 'Use textContent or sanitize HTML content',
      });
    }

    // Проверка на хардкод секретов
    const secretPatterns = [
      /password\s*[:=]\s*['"][^'"]+['"]/i,
      /secret\s*[:=]\s*['"][^'"]+['"]/i,
      /key\s*[:=]\s*['"][^'"]+['"]/i,
      /token\s*[:=]\s*['"][^'"]+['"]/i,
    ];

    for (const pattern of secretPatterns) {
      if (pattern.test(content)) {
        issues.push({
          type: 'error',
          severity: 'critical',
          message: 'Hardcoded secret detected',
          line: this.findLineNumber(content, pattern.source),
          rule: 'security-hardcoded-secret',
          suggestion: 'Use environment variables or secure configuration',
        });
      }
    }

    // Проверка на небезопасные криптографические функции
    const unsafeCrypto = ['md5', 'sha1', 'crypto.createHash', 'Math.random()'];

    for (const crypto of unsafeCrypto) {
      if (content.includes(crypto)) {
        issues.push({
          type: 'warning',
          severity: 'high',
          message: `Unsafe cryptographic function: ${crypto}`,
          line: this.findLineNumber(content, crypto),
          rule: 'security-unsafe-crypto',
          suggestion: 'Use crypto.randomBytes() or bcrypt for hashing',
        });
      }
    }

    return issues;
  }

  /**
   * Анализирует производительность кода
   */
  private analyzePerformance(content: string): IAnalysisIssue[] {
    const issues: IAnalysisIssue[] = [];

    // Проверка на N+1 запросы
    if (content.includes('findOne') && content.includes('forEach')) {
      issues.push({
        type: 'warning',
        severity: 'medium',
        message: 'Potential N+1 query pattern detected',
        line: this.findLineNumber(content, 'findOne'),
        rule: 'performance-n-plus-one',
        suggestion: 'Use include or join to fetch related data',
      });
    }

    // Проверка на отсутствие индексов
    if (content.includes('WHERE') && !content.includes('INDEX')) {
      issues.push({
        type: 'info',
        severity: 'low',
        message: 'Consider adding database indexes for WHERE clauses',
        line: this.findLineNumber(content, 'WHERE'),
        rule: 'performance-missing-index',
        suggestion: 'Add database indexes for frequently queried columns',
      });
    }

    // Проверка на синхронные операции
    const syncOperations = [
      'fs.readFileSync',
      'fs.writeFileSync',
      'fs.existsSync',
    ];

    for (const syncOp of syncOperations) {
      if (content.includes(syncOp)) {
        issues.push({
          type: 'warning',
          severity: 'medium',
          message: `Synchronous operation detected: ${syncOp}`,
          line: this.findLineNumber(content, syncOp),
          rule: 'performance-sync-operation',
          suggestion: 'Use async/await with promise-based operations',
        });
      }
    }

    // Проверка на утечки памяти
    if (content.includes('setInterval') && !content.includes('clearInterval')) {
      issues.push({
        type: 'error',
        severity: 'high',
        message: 'Potential memory leak: setInterval without clearInterval',
        line: this.findLineNumber(content, 'setInterval'),
        rule: 'performance-memory-leak',
        suggestion: 'Always clear intervals when component unmounts',
      });
    }

    return issues;
  }

  /**
   * Анализирует поддерживаемость кода
   */
  private analyzeMaintainability(
    content: string,
    _filePath: string,
    metrics: ICodeMetrics
  ): IAnalysisIssue[] {
    const issues: IAnalysisIssue[] = [];

    // Проверка цикломатической сложности
    if (metrics.cyclomaticComplexity > this.config.thresholds.maxComplexity) {
      issues.push({
        type: 'warning',
        severity: 'medium',
        message: `High cyclomatic complexity: ${metrics.cyclomaticComplexity}`,
        rule: 'maintainability-complexity',
        suggestion: 'Break down complex functions into smaller ones',
      });
    }

    // Проверка индекса поддерживаемости
    if (
      metrics.maintainabilityIndex < this.config.thresholds.minMaintainability
    ) {
      issues.push({
        type: 'warning',
        severity: 'medium',
        message: `Low maintainability index: ${metrics.maintainabilityIndex}`,
        rule: 'maintainability-index',
        suggestion: 'Refactor code to improve maintainability',
      });
    }

    // Проверка дублирования кода
    if (metrics.codeDuplication > this.config.thresholds.maxDuplication) {
      issues.push({
        type: 'warning',
        severity: 'medium',
        message: `High code duplication: ${metrics.codeDuplication}%`,
        rule: 'maintainability-duplication',
        suggestion: 'Extract common code into reusable functions',
      });
    }

    // Проверка длины функций
    const lines = content.split('\n');
    let functionLines = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line != null && (line.includes('function') || line.includes('=>'))) {
        if (functionLines > 50) {
          issues.push({
            type: 'warning',
            severity: 'low',
            message: `Long function detected: ${functionLines} lines`,
            line: i + 1,
            rule: 'maintainability-function-length',
            suggestion: 'Break down long functions into smaller ones',
          });
        }
        functionLines = 0;
      } else {
        functionLines++;
      }
    }

    return issues;
  }

  /**
   * Анализирует лучшие практики
   */
  private analyzeBestPractices(content: string): IAnalysisIssue[] {
    const issues: IAnalysisIssue[] = [];

    // Проверка на console.log в продакшене
    if (content.includes('console.log') && !content.includes('NODE_ENV')) {
      const lineNumber = this.findLineNumber(content, 'console.log');
      if (lineNumber) {
        issues.push({
          type: 'warning',
          severity: 'low',
          message: 'console.log detected in production code',
          line: lineNumber,
          rule: 'best-practices-console-log',
          suggestion: 'Use proper logging library or remove console.log',
        });
      }
    }

    // Проверка на неиспользуемые импорты
    const importMatches = content.match(/import\s+{([^}]+)}\s+from/g);
    if (importMatches) {
      for (const match of importMatches) {
        const importsMatch = match.match(/{([^}]+)}/);
        if (importsMatch?.[1] !== undefined && importsMatch[1] !== '') {
          const importList = importsMatch[1].split(',').map(i => i.trim());
          for (const imp of importList) {
            const impParts = imp.split(' as ');
            const impName = impParts[0];
            if (
              impName != null &&
              impName !== '' &&
              !content.includes(imp) &&
              !content.includes(impName)
            ) {
              const lineNumber = this.findLineNumber(content, imp);
              if (lineNumber) {
                issues.push({
                  type: 'info',
                  severity: 'low',
                  message: `Unused import: ${imp}`,
                  line: lineNumber,
                  rule: 'best-practices-unused-import',
                  suggestion: 'Remove unused imports',
                });
              }
            }
          }
        }
      }
    }

    // Проверка на магические числа
    const magicNumbers = content.match(/\b\d{3,}\b/g);
    if (magicNumbers) {
      for (const number of magicNumbers) {
        if (parseInt(number) > 100) {
          const lineNumber = this.findLineNumber(content, number);
          if (lineNumber) {
            issues.push({
              type: 'info',
              severity: 'low',
              message: `Magic number detected: ${number}`,
              line: lineNumber,
              rule: 'best-practices-magic-number',
              suggestion: 'Define constants for magic numbers',
            });
          }
        }
      }
    }

    return issues;
  }

  /**
   * Вычисляет метрики кода
   */
  private calculateMetrics(content: string): ICodeMetrics {
    const lines = content.split('\n');
    const linesOfCode = lines.length;

    // Простой расчет цикломатической сложности
    let cyclomaticComplexity = 1;
    const complexityKeywords = [
      'if',
      'else',
      'for',
      'while',
      'do',
      'case',
      'catch',
      '&&',
      '||',
      '?',
    ];

    for (const keyword of complexityKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = content.match(regex);
      if (matches) {
        cyclomaticComplexity += matches.length;
      }
    }

    // Простой расчет индекса поддерживаемости
    const maintainabilityIndex = Math.max(
      0,
      171 - 5.2 * Math.log(cyclomaticComplexity) - 0.23 * Math.log(linesOfCode)
    );

    // Простой расчет дублирования кода
    const codeDuplication = this.calculateCodeDuplication(content);

    // Простой расчет security score
    const securityScore = this.calculateSecurityScore(content);

    // Простой расчет performance score
    const performanceScore = this.calculatePerformanceScore(content);

    return {
      linesOfCode,
      cyclomaticComplexity,
      maintainabilityIndex: Math.round(maintainabilityIndex),
      codeDuplication,
      securityScore,
      performanceScore,
    };
  }

  /**
   * Вычисляет дублирование кода
   */
  private calculateCodeDuplication(content: string): number {
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    const duplicates = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
      for (let j = i + 1; j < lines.length; j++) {
        const lineI = lines[i];
        const lineJ = lines[j];
        if (lineI != null && lineJ != null && lineI === lineJ) {
          duplicates.add(lineI);
        }
      }
    }

    return Math.round((duplicates.size / lines.length) * 100);
  }

  /**
   * Вычисляет security score
   */
  private calculateSecurityScore(content: string): number {
    let score = 100;

    // Штрафы за проблемы безопасности
    if (content.includes('innerHTML')) score -= 20;
    if (content.includes('eval(')) score -= 30;
    if (content.includes('md5')) score -= 15;
    if (content.includes('sha1')) score -= 10;

    return Math.max(0, score);
  }

  /**
   * Вычисляет performance score
   */
  private calculatePerformanceScore(content: string): number {
    let score = 100;

    // Штрафы за проблемы производительности
    if (content.includes('setInterval') && !content.includes('clearInterval'))
      score -= 25;
    if (content.includes('readFileSync')) score -= 15;
    if (content.includes('findOne') && content.includes('forEach')) score -= 20;

    return Math.max(0, score);
  }

  /**
   * Вычисляет общий score
   */
  private calculateScore(
    issues: IAnalysisIssue[],
    metrics: ICodeMetrics
  ): number {
    let score = 100;

    // Штрафы за проблемы
    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical':
          score -= 20;
          break;
        case 'high':
          score -= 10;
          break;
        case 'medium':
          score -= 5;
          break;
        case 'low':
          score -= 2;
          break;
      }
    }

    // Штрафы за метрики
    if (metrics.cyclomaticComplexity > this.config.thresholds.maxComplexity) {
      score -= 10;
    }

    if (
      metrics.maintainabilityIndex < this.config.thresholds.minMaintainability
    ) {
      score -= 10;
    }

    if (metrics.securityScore < this.config.thresholds.minSecurityScore) {
      score -= 15;
    }

    return Math.max(0, score);
  }

  /**
   * Находит номер строки для паттерна
   */
  private findLineNumber(content: string, pattern: string): number {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line != null && line.includes(pattern)) {
        return i + 1;
      }
    }
    return 1;
  }

  /**
   * Получает результат анализа файла
   */
  getAnalysisResult(filePath: string): IStaticAnalysisResult | undefined {
    return this.analysisResults.get(filePath);
  }

  /**
   * Получает все результаты анализа
   */
  getAllAnalysisResults(): IStaticAnalysisResult[] {
    return Array.from(this.analysisResults.values());
  }

  /**
   * Очищает результаты анализа
   */
  clearAnalysisResults(): void {
    this.analysisResults.clear();
  }

  /**
   * Обновляет конфигурацию
   */
  updateConfig(updates: Partial<IStaticAnalysisConfig>): void {
    Object.assign(this.config, updates);
    this.logger.log('Static analyzer config updated', updates);
  }
}

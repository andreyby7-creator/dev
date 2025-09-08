import { Injectable, Logger } from '@nestjs/common';

// Типы
type CommitType =
  | 'feat'
  | 'fix'
  | 'docs'
  | 'style'
  | 'refactor'
  | 'test'
  | 'chore'
  | 'perf'
  | 'ci'
  | 'build'
  | 'revert';

type CommitScope =
  | 'api'
  | 'web'
  | 'shared'
  | 'security'
  | 'monitoring'
  | 'devops'
  | 'testing'
  | 'general'
  | 'docs'
  | 'ci'
  | 'deployment';

type CommitSeverity = 'low' | 'medium' | 'high' | 'critical';

// Интерфейсы
export interface ICommitAnalysis {
  commitHash: string;
  message: string;
  type: CommitType;
  scope?: CommitScope;
  severity: CommitSeverity;
  issues: ICommitIssue[];
  suggestions: ICommitSuggestion[];
  score: number;
  timestamp: string;
}

export interface ICommitIssue {
  type: 'convention' | 'security' | 'performance' | 'quality' | 'style';
  description: string;
  line?: number;
  file?: string;
  severity: CommitSeverity;
  fix?: string;
}

export interface ICommitSuggestion {
  type: 'message' | 'scope' | 'body' | 'footer';
  current: string;
  suggested: string;
  reason: string;
  priority: 'low' | 'medium' | 'high';
}

export interface ICommitValidationRequest {
  commitHash: string;
  message: string;
  files: string[];
  diff?: string;
  author: string;
  timestamp: string;
}

export interface ICommitValidationResult {
  isValid: boolean;
  analysis: ICommitAnalysis;
  canCommit: boolean;
  warnings: string[];
  errors: string[];
  recommendations: string[];
}

@Injectable()
export class AiCommitAnalyzerService {
  private readonly logger = new Logger(AiCommitAnalyzerService.name);
  private readonly commitHistory: ICommitAnalysis[] = [];

  /**
   * Анализ коммита на соответствие конвенциям
   */
  async analyzeCommit(
    request: ICommitValidationRequest
  ): Promise<ICommitValidationResult> {
    this.logger.log(`Анализ коммита: ${request.commitHash}`);

    const analysis = await this.performCommitAnalysis(request);
    const validation = this.validateCommit(analysis);

    // Сохраняем анализ в историю
    this.commitHistory.push(analysis);

    return {
      isValid: validation.isValid,
      analysis,
      canCommit: validation.canCommit,
      warnings: validation.warnings,
      errors: validation.errors,
      recommendations: validation.recommendations,
    };
  }

  /**
   * Выполнение анализа коммита
   */
  private async performCommitAnalysis(
    request: ICommitValidationRequest
  ): Promise<ICommitAnalysis> {
    const issues: ICommitIssue[] = [];
    const suggestions: ICommitSuggestion[] = [];
    let score = 100;

    // Анализ сообщения коммита
    if (request.message.trim()) {
      const messageAnalysis = this.analyzeCommitMessage(request.message);
      issues.push(...messageAnalysis.issues);
      suggestions.push(...messageAnalysis.suggestions);
      score -= messageAnalysis.scoreReduction;
    }

    // Анализ измененных файлов
    if (request.files.length > 0) {
      const fileAnalysis = this.analyzeChangedFiles(request.files);
      issues.push(...fileAnalysis.issues);
      suggestions.push(...fileAnalysis.suggestions);
      score -= fileAnalysis.scoreReduction;
    }

    // Анализ diff
    if (request.diff != null && request.diff.trim() !== '') {
      const diffAnalysis = this.analyzeDiff(request.diff);
      issues.push(...diffAnalysis.issues);
      suggestions.push(...diffAnalysis.suggestions);
      score -= diffAnalysis.scoreReduction;
    }

    // Определение типа и scope
    const { type, scope } = this.extractCommitMetadata(request.message || '');

    // Определение severity на основе issues
    const severity = this.calculateSeverity(issues);

    return {
      commitHash: request.commitHash,
      message: request.message,
      type,
      scope: scope ?? ('general' as const),
      severity,
      issues,
      suggestions,
      score: Math.max(0, score),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Анализ сообщения коммита
   */
  private analyzeCommitMessage(message: string): {
    issues: ICommitIssue[];
    suggestions: ICommitSuggestion[];
    scoreReduction: number;
  } {
    const issues: ICommitIssue[] = [];
    const suggestions: ICommitSuggestion[] = [];
    let scoreReduction = 0;

    // Проверка формата conventional commits
    const conventionalCommitRegex =
      /^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\([a-z-]+\))?: .+/;

    if (!conventionalCommitRegex.test(message)) {
      issues.push({
        type: 'convention',
        description:
          'Сообщение коммита не соответствует формату conventional commits',
        severity: 'high',
        fix: 'Используйте формат: type(scope): description',
      });
      scoreReduction += 30;
    }

    // Проверка длины сообщения
    if (message.length > 72) {
      issues.push({
        type: 'convention',
        description: 'Сообщение коммита слишком длинное (>72 символов)',
        severity: 'medium',
        fix: 'Сократите сообщение до 72 символов',
      });
      scoreReduction += 15;
    }

    // Проверка на наличие описания
    if (!message.includes(':')) {
      suggestions.push({
        type: 'message',
        current: message,
        suggested: `${this.extractCommitMetadata(message).type}: ${message}`,
        reason: 'Добавьте описание после двоеточия',
        priority: 'medium',
      });
      scoreReduction += 10;
    }

    // Проверка на использование правильных типов
    const validTypes = [
      'feat',
      'fix',
      'docs',
      'style',
      'refactor',
      'test',
      'chore',
      'perf',
      'ci',
      'build',
      'revert',
    ];
    const messageType = this.extractCommitMetadata(message).type;

    if (!validTypes.includes(messageType)) {
      issues.push({
        type: 'convention',
        description: `Неизвестный тип коммита: ${messageType}`,
        severity: 'medium',
        fix: `Используйте один из: ${validTypes.join(', ')}`,
      });
      scoreReduction += 20;
    }

    return { issues, suggestions, scoreReduction };
  }

  /**
   * Анализ измененных файлов
   */
  private analyzeChangedFiles(files: string[]): {
    issues: ICommitIssue[];
    suggestions: ICommitSuggestion[];
    scoreReduction: number;
  } {
    const issues: ICommitIssue[] = [];
    const suggestions: ICommitSuggestion[] = [];
    let scoreReduction = 0;

    // Проверка на слишком много измененных файлов
    if (files.length > 20) {
      issues.push({
        type: 'quality',
        description: 'Слишком много измененных файлов в одном коммите',
        severity: 'medium',
        fix: 'Разделите изменения на несколько коммитов',
      });
      scoreReduction += 25;
    }

    // Проверка на смешивание разных типов изменений
    const hasSourceFiles = files.some(
      f =>
        f.endsWith('.ts') ||
        f.endsWith('.tsx') ||
        f.endsWith('.js') ||
        f.endsWith('.jsx')
    );
    const hasConfigFiles = files.some(
      f => f.endsWith('.json') || f.endsWith('.yml') || f.endsWith('.yaml')
    );
    const hasDocsFiles = files.some(
      f => f.endsWith('.md') || f.endsWith('.txt')
    );

    if (hasSourceFiles && (hasConfigFiles || hasDocsFiles)) {
      suggestions.push({
        type: 'scope',
        current: 'mixed',
        suggested: 'separate',
        reason:
          'Разделите изменения исходного кода и конфигурации на разные коммиты',
        priority: 'medium',
      });
      scoreReduction += 15;
    }

    return { issues, suggestions, scoreReduction };
  }

  /**
   * Анализ diff
   */
  private analyzeDiff(diff: string): {
    issues: ICommitIssue[];
    suggestions: ICommitSuggestion[];
    scoreReduction: number;
  } {
    const issues: ICommitIssue[] = [];
    const suggestions: ICommitSuggestion[] = [];
    let scoreReduction = 0;

    // Проверка на наличие TODO комментариев
    if (diff.includes('TODO') || diff.includes('FIXME')) {
      issues.push({
        type: 'quality',
        description: 'Обнаружены TODO/FIXME комментарии в коде',
        severity: 'low',
        fix: 'Уберите TODO/FIXME перед коммитом',
      });
      scoreReduction += 10;
    }

    // Проверка на наличие console.log
    if (diff.includes('console.log') || diff.includes('console.error')) {
      issues.push({
        type: 'quality',
        description: 'Обнаружены console.log/console.error в коде',
        severity: 'medium',
        fix: 'Замените на proper logging',
      });
      scoreReduction += 20;
    }

    // Проверка на наличие hardcoded значений
    const hardcodedPatterns = [
      'localhost:3000',
      'password',
      'secret',
      'api_key',
    ];
    for (const pattern of hardcodedPatterns) {
      if (diff.includes(pattern)) {
        issues.push({
          type: 'security',
          description: `Обнаружены hardcoded значения: ${pattern}`,
          severity: 'high',
          fix: 'Используйте environment variables',
        });
        scoreReduction += 30;
      }
    }

    return { issues, suggestions, scoreReduction };
  }

  /**
   * Извлечение метаданных коммита
   */
  private extractCommitMetadata(message: string): {
    type: CommitType;
    scope?: CommitScope;
  } {
    const match = message.match(/^(\w+)(?:\(([a-z-]+)\))?:/);

    if (match) {
      const type = match[1] as CommitType;
      const scope = match[2] as CommitScope;
      return { type, scope };
    }

    return { type: 'chore' };
  }

  /**
   * Расчет severity на основе issues
   */
  private calculateSeverity(issues: ICommitIssue[]): CommitSeverity {
    if (issues.some(issue => issue.severity === 'critical')) {
      return 'critical';
    }
    if (issues.some(issue => issue.severity === 'high')) {
      return 'high';
    }
    if (issues.some(issue => issue.severity === 'medium')) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Валидация коммита
   */
  private validateCommit(analysis: ICommitAnalysis): {
    isValid: boolean;
    canCommit: boolean;
    warnings: string[];
    errors: string[];
    recommendations: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];
    const recommendations: string[] = [];

    // Проверяем критические и высокие issues
    const criticalIssues = analysis.issues.filter(
      issue => issue.severity === 'critical'
    );
    const highIssues = analysis.issues.filter(
      issue => issue.severity === 'high'
    );

    if (criticalIssues.length > 0) {
      errors.push('Критические проблемы в коммите');
      criticalIssues.forEach(issue => errors.push(`- ${issue.description}`));
    }

    if (highIssues.length > 0) {
      errors.push('Высокие проблемы в коммите');
      highIssues.forEach(issue => errors.push(`- ${issue.description}`));
    }

    // Проверяем средние issues
    const mediumIssues = analysis.issues.filter(
      issue => issue.severity === 'medium'
    );
    if (mediumIssues.length > 0) {
      warnings.push('Средние проблемы в коммите');
      mediumIssues.forEach(issue => warnings.push(`- ${issue.description}`));
    }

    // Добавляем рекомендации
    if (analysis.score < 70) {
      recommendations.push(
        'Низкий балл коммита. Рассмотрите исправления перед коммитом.'
      );
    }

    if (analysis.suggestions.length > 0) {
      recommendations.push('Доступны предложения по улучшению коммита.');
    }

    const isValid = errors.length === 0;
    const canCommit = isValid && warnings.length < 3; // Разрешаем коммит с небольшим количеством предупреждений

    return { isValid, canCommit, warnings, errors, recommendations };
  }

  /**
   * Получение истории анализа коммитов
   */
  getCommitHistory(): ICommitAnalysis[] {
    return [...this.commitHistory];
  }

  /**
   * Получение статистики коммитов
   */
  getCommitStatistics(): {
    total: number;
    valid: number;
    invalid: number;
    averageScore: number;
  } {
    const total = this.commitHistory.length;
    const valid = this.commitHistory.filter(
      commit => commit.score >= 70
    ).length;
    const invalid = total - valid;
    const averageScore =
      total > 0
        ? this.commitHistory.reduce((sum, commit) => sum + commit.score, 0) /
          total
        : 0;

    return { total, valid, invalid, averageScore: Math.round(averageScore) };
  }
}

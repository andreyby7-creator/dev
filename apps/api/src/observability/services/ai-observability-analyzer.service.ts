import { Injectable } from '@nestjs/common';
import type { ILogEntry } from './logging.service';
import { LoggingService } from './logging.service';
import { MetricsService } from './metrics.service';

export interface ILogAnalysis {
  timestamp: string;
  logLevel: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendations: string[];
  patterns: string[];
}

export interface IMetricAnalysis {
  metricName: string;
  currentValue: number;
  threshold: number;
  status: 'NORMAL' | 'WARNING' | 'CRITICAL';
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  recommendations: string[];
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface IObservabilityInsight {
  type: 'PERFORMANCE' | 'SECURITY' | 'AVAILABILITY' | 'ERROR_RATE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  recommendations: string[];
  affectedServices: string[];
  estimatedImpact: string;
  timestamp: string;
}

export interface IObservabilityReport {
  overallHealth: number; // 0-100
  insights: IObservabilityInsight[];
  logAnalysis: ILogAnalysis[];
  metricAnalysis: IMetricAnalysis[];
  recommendations: string[];
  alerts: string[];
  timestamp: string;
}

@Injectable()
export class AIObservabilityAnalyzerService {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly loggingService: LoggingService
  ) {}

  /**
   * Анализировать логи и выявлять паттерны
   */

  async analyzeLogs(_timeRange: {
    start: Date;
    end: Date;
  }): Promise<ILogAnalysis[]> {
    const logs = await this.loggingService.getLogs();
    const analysis: ILogAnalysis[] = [];

    for (const log of logs) {
      const severity = this.calculateLogSeverity(log);
      const patterns = this.identifyLogPatterns(log);
      const recommendations = this.generateLogRecommendations(log, patterns);

      analysis.push({
        timestamp: log.timestamp,
        logLevel: log.level as 'info' | 'warn' | 'error' | 'debug',
        message: log.message,
        context: log.context ? JSON.stringify(log.context) : '',
        severity,
        recommendations,
        patterns,
      });
    }

    return analysis;
  }

  /**
   * Анализировать метрики и выявлять аномалии
   */
  async analyzeMetrics(): Promise<IMetricAnalysis[]> {
    const systemMetrics = await this.metricsService.getSystemMetrics();
    // Убираем неиспользуемую переменную
    await this.metricsService.getBusinessMetrics();
    const analysis: IMetricAnalysis[] = [];

    // Анализ системных метрик
    const systemMetricsData = [
      { name: 'cpu_usage', value: systemMetrics.cpu, trend: 0 },
      { name: 'memory_usage', value: systemMetrics.memory, trend: 0 },
      { name: 'error_rate', value: systemMetrics.errorRate, trend: 0 },
      {
        name: 'active_connections',
        value: systemMetrics.activeConnections,
        trend: 0,
      },
    ];

    for (const metric of systemMetricsData) {
      const threshold = this.getMetricThreshold(metric.name);
      const status = this.calculateMetricStatus(metric.value, threshold);
      const trend = this.calculateMetricTrend(metric);
      const recommendations = this.generateMetricRecommendations(
        metric,
        status,
        trend
      );
      const impact = this.calculateMetricImpact(metric.name, status);

      analysis.push({
        metricName: metric.name,
        currentValue: metric.value,
        threshold,
        status,
        trend,
        recommendations,
        impact,
      });
    }

    return analysis;
  }

  /**
   * Генерировать инсайты на основе анализа
   */
  async generateInsights(): Promise<IObservabilityInsight[]> {
    const insights: IObservabilityInsight[] = [];

    // Анализ производительности
    const performanceInsights = await this.analyzePerformance();
    insights.push(...performanceInsights);

    // Анализ безопасности
    const securityInsights = await this.analyzeSecurity();
    insights.push(...securityInsights);

    // Анализ доступности
    const availabilityInsights = await this.analyzeAvailability();
    insights.push(...availabilityInsights);

    // Анализ ошибок
    const errorInsights = await this.analyzeErrorRates();
    insights.push(...errorInsights);

    return insights;
  }

  /**
   * Получить полный отчет по observability
   */
  async getObservabilityReport(): Promise<IObservabilityReport> {
    const timeRange = {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Последние 24 часа
      end: new Date(),
    };

    const [logAnalysis, metricAnalysis, insights] = await Promise.all([
      this.analyzeLogs(timeRange),
      this.analyzeMetrics(),
      this.generateInsights(),
    ]);

    const overallHealth = this.calculateOverallHealth(
      logAnalysis,
      metricAnalysis,
      insights
    );
    const recommendations = this.generateOverallRecommendations(
      logAnalysis,
      metricAnalysis,
      insights
    );
    const alerts = this.generateAlerts(logAnalysis, metricAnalysis, insights);

    return {
      overallHealth,
      insights,
      logAnalysis,
      metricAnalysis,
      recommendations,
      alerts,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Вычислить серьезность лога
   */
  private calculateLogSeverity(
    log: ILogEntry
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const criticalKeywords = [
      'fatal',
      'critical',
      'emergency',
      'panic',
      'out of memory',
    ];
    const highKeywords = [
      'error',
      'exception',
      'failed',
      'timeout',
      'connection refused',
    ];
    const mediumKeywords = ['warning', 'deprecated', 'slow', 'high usage'];

    const message = log.message.toLowerCase();
    const context = log.context
      ? JSON.stringify(log.context).toLowerCase()
      : '';

    if (
      criticalKeywords.some(keyword =>
        Boolean(message.includes(keyword) || context.includes(keyword))
      )
    ) {
      return 'CRITICAL';
    }

    if (
      highKeywords.some(keyword =>
        Boolean(message.includes(keyword) || context.includes(keyword))
      )
    ) {
      return 'HIGH';
    }

    if (
      mediumKeywords.some(keyword =>
        Boolean(message.includes(keyword) || context.includes(keyword))
      )
    ) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  /**
   * Выявить паттерны в логах
   */
  private identifyLogPatterns(log: ILogEntry): string[] {
    const patterns: string[] = [];
    const message = log.message.toLowerCase();

    // Паттерны ошибок
    if (message.includes('timeout')) patterns.push('TIMEOUT_ERROR');
    if (message.includes('connection')) patterns.push('CONNECTION_ISSUE');
    if (message.includes('memory')) patterns.push('MEMORY_ISSUE');
    if (message.includes('database')) patterns.push('DATABASE_ISSUE');
    if (message.includes('authentication')) patterns.push('AUTH_ISSUE');
    if (message.includes('authorization')) patterns.push('AUTH_ISSUE');

    // Паттерны производительности
    if (message.includes('slow')) patterns.push('PERFORMANCE_ISSUE');
    if (message.includes('high usage')) patterns.push('RESOURCE_USAGE');
    if (message.includes('cpu')) patterns.push('CPU_ISSUE');
    if (message.includes('memory usage')) patterns.push('MEMORY_USAGE');

    return patterns;
  }

  /**
   * Генерировать рекомендации по логам
   */
  private generateLogRecommendations(
    _log: ILogEntry,
    patterns: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (patterns.includes('TIMEOUT_ERROR')) {
      recommendations.push(
        'Увеличьте timeout значения для внешних API вызовов'
      );
      recommendations.push('Проверьте сетевую связность с внешними сервисами');
    }

    if (patterns.includes('CONNECTION_ISSUE')) {
      recommendations.push('Проверьте настройки connection pooling');
      recommendations.push('Увеличьте лимиты соединений в базе данных');
    }

    if (patterns.includes('MEMORY_ISSUE')) {
      recommendations.push('Проверьте утечки памяти в приложении');
      recommendations.push('Увеличьте лимиты памяти для контейнеров');
    }

    if (patterns.includes('DATABASE_ISSUE')) {
      recommendations.push('Оптимизируйте медленные SQL запросы');
      recommendations.push('Проверьте индексы в базе данных');
    }

    if (patterns.includes('AUTH_ISSUE')) {
      recommendations.push('Проверьте настройки аутентификации');
      recommendations.push('Обновите токены доступа');
    }

    if (patterns.includes('PERFORMANCE_ISSUE')) {
      recommendations.push('Оптимизируйте алгоритмы обработки данных');
      recommendations.push('Добавьте кеширование для медленных операций');
    }

    return recommendations;
  }

  /**
   * Получить пороговое значение для метрики
   */
  private getMetricThreshold(metricName: string): number {
    const thresholds: Record<string, number> = {
      cpu_usage: 80,
      memory_usage: 85,
      disk_usage: 90,
      error_rate: 5,
      response_time: 1000,
      request_rate: 1000,
      active_connections: 100,
    };

    return thresholds[metricName] ?? 100;
  }

  /**
   * Вычислить статус метрики
   */
  private calculateMetricStatus(
    value: number,
    threshold: number
  ): 'NORMAL' | 'WARNING' | 'CRITICAL' {
    if (value >= threshold * 1.2) return 'CRITICAL';
    if (value >= threshold) return 'WARNING';
    return 'NORMAL';
  }

  /**
   * Вычислить тренд метрики
   */
  private calculateMetricTrend(metric: {
    trend: number;
  }): 'INCREASING' | 'DECREASING' | 'STABLE' {
    // Упрощенная логика - в реальности нужно анализировать историю
    const changeThreshold = 0.1; // 10%

    if (metric.trend > changeThreshold) return 'INCREASING';
    if (metric.trend < -changeThreshold) return 'DECREASING';
    return 'STABLE';
  }

  /**
   * Генерировать рекомендации по метрикам
   */
  private generateMetricRecommendations(
    metric: { name: string; value: number; trend: number },
    status: 'NORMAL' | 'WARNING' | 'CRITICAL',
    trend: 'INCREASING' | 'DECREASING' | 'STABLE'
  ): string[] {
    const recommendations: string[] = [];

    if (status === 'CRITICAL') {
      recommendations.push(
        `НЕМЕДЛЕННО: ${metric.name} превышает критический порог`
      );

      if (metric.name === 'cpu_usage') {
        recommendations.push('Масштабируйте ресурсы CPU');
        recommendations.push('Оптимизируйте алгоритмы обработки');
      }

      if (metric.name === 'memory_usage') {
        recommendations.push('Увеличьте доступную память');
        recommendations.push('Проверьте утечки памяти');
      }

      if (metric.name === 'error_rate') {
        recommendations.push('Исследуйте причины ошибок');
        recommendations.push('Добавьте дополнительное логирование');
      }
    }

    if (status === 'WARNING' && trend === 'INCREASING') {
      recommendations.push(`Мониторьте ${metric.name} - тренд растет`);
      recommendations.push('Подготовьте план масштабирования');
    }

    return recommendations;
  }

  /**
   * Вычислить влияние метрики
   */
  private calculateMetricImpact(
    metricName: string,
    status: 'NORMAL' | 'WARNING' | 'CRITICAL'
  ): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (status === 'CRITICAL') return 'HIGH';

    const highImpactMetrics = ['error_rate', 'response_time', 'cpu_usage'];
    if (highImpactMetrics.includes(metricName)) return 'MEDIUM';

    return 'LOW';
  }

  /**
   * Анализировать производительность
   */
  private async analyzePerformance(): Promise<IObservabilityInsight[]> {
    const insights: IObservabilityInsight[] = [];
    const systemMetrics = await this.metricsService.getSystemMetrics();

    if (systemMetrics.cpu > 80) {
      insights.push({
        type: 'PERFORMANCE',
        severity: 'HIGH',
        title: 'Высокое использование CPU',
        description: `CPU usage составляет ${systemMetrics.cpu}%, что может влиять на производительность`,
        recommendations: [
          'Оптимизируйте алгоритмы обработки данных',
          'Добавьте горизонтальное масштабирование',
          'Проверьте фоновые задачи',
        ],
        affectedServices: ['API', 'Background Jobs'],
        estimatedImpact: 'Среднее влияние на пользовательский опыт',
        timestamp: new Date().toISOString(),
      });
    }

    if (systemMetrics.memory > 1000) {
      insights.push({
        type: 'PERFORMANCE',
        severity: 'MEDIUM',
        title: 'Высокое использование памяти',
        description: `Использование памяти ${systemMetrics.memory}MB превышает норму`,
        recommendations: [
          'Оптимизируйте медленные запросы',
          'Добавьте кеширование',
          'Проверьте утечки памяти',
        ],
        affectedServices: ['API'],
        estimatedImpact: 'Влияние на пользовательский опыт',
        timestamp: new Date().toISOString(),
      });
    }

    return insights;
  }

  /**
   * Анализировать безопасность
   */
  private async analyzeSecurity(): Promise<IObservabilityInsight[]> {
    const insights: IObservabilityInsight[] = [];
    const logs = await this.loggingService.getLogs();

    const authErrors = logs.filter(
      log =>
        log.message.toLowerCase().includes('authentication') ||
        log.message.toLowerCase().includes('authorization')
    );

    if (authErrors.length > 10) {
      insights.push({
        type: 'SECURITY',
        severity: 'HIGH',
        title: 'Подозрительная активность аутентификации',
        description: `Обнаружено ${authErrors.length} ошибок аутентификации за последний час`,
        recommendations: [
          'Проверьте логи на предмет попыток взлома',
          'Усильте мониторинг безопасности',
          'Рассмотрите возможность блокировки подозрительных IP',
        ],
        affectedServices: ['Auth Service'],
        estimatedImpact: 'Потенциальная угроза безопасности',
        timestamp: new Date().toISOString(),
      });
    }

    return insights;
  }

  /**
   * Анализировать доступность
   */
  private async analyzeAvailability(): Promise<IObservabilityInsight[]> {
    const insights: IObservabilityInsight[] = [];
    const systemMetrics = await this.metricsService.getSystemMetrics();

    if (systemMetrics.errorRate > 5) {
      insights.push({
        type: 'AVAILABILITY',
        severity: 'HIGH',
        title: 'Высокий уровень ошибок',
        description: `Уровень ошибок ${systemMetrics.errorRate}% превышает допустимый порог`,
        recommendations: [
          'Исследуйте причины ошибок',
          'Добавьте дополнительное логирование',
          'Проверьте зависимости сервисов',
        ],
        affectedServices: ['All Services'],
        estimatedImpact: 'Влияние на доступность сервиса',
        timestamp: new Date().toISOString(),
      });
    }

    return insights;
  }

  /**
   * Анализировать уровень ошибок
   */
  private async analyzeErrorRates(): Promise<IObservabilityInsight[]> {
    const insights: IObservabilityInsight[] = [];
    const logs = await this.loggingService.getLogs();

    const errorLogs = logs.filter(log => log.level === 'error');
    const totalLogs = logs.length;
    const errorRate = totalLogs > 0 ? (errorLogs.length / totalLogs) * 100 : 0;

    if (errorRate > 5) {
      insights.push({
        type: 'ERROR_RATE',
        severity: 'HIGH',
        title: 'Критический уровень ошибок',
        description: `Уровень ошибок ${errorRate.toFixed(2)}% превышает критический порог`,
        recommendations: [
          'Немедленно исследуйте причины ошибок',
          'Проверьте состояние базы данных',
          'Убедитесь в доступности внешних сервисов',
        ],
        affectedServices: ['All Services'],
        estimatedImpact: 'Критическое влияние на работу системы',
        timestamp: new Date().toISOString(),
      });
    }

    return insights;
  }

  /**
   * Вычислить общее состояние здоровья системы
   */
  private calculateOverallHealth(
    logAnalysis: ILogAnalysis[],
    metricAnalysis: IMetricAnalysis[],
    insights: IObservabilityInsight[]
  ): number {
    let score = 100;

    // Штрафы за критические проблемы
    const criticalLogs = logAnalysis.filter(
      log => log.severity === 'CRITICAL'
    ).length;
    const criticalMetrics = metricAnalysis.filter(
      metric => metric.status === 'CRITICAL'
    ).length;
    const criticalInsights = insights.filter(
      insight => insight.severity === 'CRITICAL'
    ).length;

    score -= criticalLogs * 10;
    score -= criticalMetrics * 15;
    score -= criticalInsights * 20;

    // Штрафы за высокие проблемы
    const highLogs = logAnalysis.filter(log => log.severity === 'HIGH').length;
    const warningMetrics = metricAnalysis.filter(
      metric => metric.status === 'WARNING'
    ).length;
    const highInsights = insights.filter(
      insight => insight.severity === 'HIGH'
    ).length;

    score -= highLogs * 5;
    score -= warningMetrics * 8;
    score -= highInsights * 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Генерировать общие рекомендации
   */
  private generateOverallRecommendations(
    logAnalysis: ILogAnalysis[],
    metricAnalysis: IMetricAnalysis[],

    _insights: IObservabilityInsight[]
  ): string[] {
    const recommendations: string[] = [];

    const criticalIssues =
      logAnalysis.filter(log => log.severity === 'CRITICAL').length +
      metricAnalysis.filter(metric => metric.status === 'CRITICAL').length;

    if (criticalIssues > 0) {
      recommendations.push(
        'НЕМЕДЛЕННО: Устраните критические проблемы в системе'
      );
    }

    const highIssues =
      logAnalysis.filter(log => log.severity === 'HIGH').length +
      metricAnalysis.filter(metric => metric.status === 'WARNING').length;

    if (highIssues > 0) {
      recommendations.push(
        'ВЫСОКИЙ ПРИОРИТЕТ: Обратите внимание на проблемы высокого уровня'
      );
    }

    recommendations.push('Регулярно мониторьте метрики производительности');
    recommendations.push(
      'Настройте автоматические алерты для критических метрик'
    );
    recommendations.push(
      'Проводите регулярный анализ логов на предмет паттернов'
    );

    return recommendations;
  }

  /**
   * Генерировать алерты
   */
  private generateAlerts(
    logAnalysis: ILogAnalysis[],
    metricAnalysis: IMetricAnalysis[],
    insights: IObservabilityInsight[]
  ): string[] {
    const alerts: string[] = [];

    const criticalLogs = logAnalysis.filter(log => log.severity === 'CRITICAL');
    const criticalMetrics = metricAnalysis.filter(
      metric => metric.status === 'CRITICAL'
    );
    const criticalInsights = insights.filter(
      insight => insight.severity === 'CRITICAL'
    );

    if (criticalLogs.length > 0) {
      alerts.push(
        `🚨 КРИТИЧЕСКИЙ: Обнаружено ${criticalLogs.length} критических логов`
      );
    }

    if (criticalMetrics.length > 0) {
      alerts.push(
        `🚨 КРИТИЧЕСКИЙ: ${criticalMetrics.length} метрик превышают критические пороги`
      );
    }

    if (criticalInsights.length > 0) {
      alerts.push(
        `🚨 КРИТИЧЕСКИЙ: ${criticalInsights.length} критических инсайтов требуют внимания`
      );
    }

    return alerts;
  }
}

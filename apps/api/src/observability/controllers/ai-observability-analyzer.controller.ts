import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../types/roles';
import { AIObservabilityAnalyzerService } from '../services/ai-observability-analyzer.service';

export class AnalyzeLogsDto {
  startTime!: string;
  endTime!: string;
}

@ApiTags('AI Observability Analyzer')
@Controller('ai-observability-analyzer')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AIObservabilityAnalyzerController {
  constructor(
    private readonly aiObservabilityAnalyzerService: AIObservabilityAnalyzerService
  ) {}

  @Get('logs-analysis')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Анализ логов с AI рекомендациями' })
  @ApiQuery({
    name: 'startTime',
    required: false,
    description: 'Время начала анализа (ISO string)',
  })
  @ApiQuery({
    name: 'endTime',
    required: false,
    description: 'Время окончания анализа (ISO string)',
  })
  @ApiResponse({
    status: 200,
    description: 'Анализ логов с выявленными паттернами и рекомендациями',
  })
  async analyzeLogs(
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string
  ) {
    const timeRange = {
      start:
        startTime != null && startTime !== ''
          ? new Date(startTime)
          : new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: endTime != null && endTime !== '' ? new Date(endTime) : new Date(),
    };

    const analysis =
      await this.aiObservabilityAnalyzerService.analyzeLogs(timeRange);

    return {
      success: true,
      data: {
        analysis,
        timeRange,
        summary: {
          totalLogs: analysis.length,
          criticalLogs: analysis.filter(log => log.severity === 'CRITICAL')
            .length,
          highLogs: analysis.filter(log => log.severity === 'HIGH').length,
          mediumLogs: analysis.filter(log => log.severity === 'MEDIUM').length,
          lowLogs: analysis.filter(log => log.severity === 'LOW').length,
        },
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('metrics-analysis')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Анализ метрик с AI рекомендациями' })
  @ApiResponse({
    status: 200,
    description: 'Анализ метрик с выявленными аномалиями и рекомендациями',
  })
  async analyzeMetrics() {
    const analysis = await this.aiObservabilityAnalyzerService.analyzeMetrics();

    return {
      success: true,
      data: {
        analysis,
        summary: {
          totalMetrics: analysis.length,
          criticalMetrics: analysis.filter(
            metric => metric.status === 'CRITICAL'
          ).length,
          warningMetrics: analysis.filter(metric => metric.status === 'WARNING')
            .length,
          normalMetrics: analysis.filter(metric => metric.status === 'NORMAL')
            .length,
        },
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('insights')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'AI инсайты по observability' })
  @ApiResponse({
    status: 200,
    description:
      'AI-генерированные инсайты по производительности, безопасности и доступности',
  })
  async generateInsights() {
    const insights =
      await this.aiObservabilityAnalyzerService.generateInsights();

    return {
      success: true,
      data: {
        insights,
        summary: {
          totalInsights: insights.length,
          criticalInsights: insights.filter(
            insight => insight.severity === 'CRITICAL'
          ).length,
          highInsights: insights.filter(insight => insight.severity === 'HIGH')
            .length,
          mediumInsights: insights.filter(
            insight => insight.severity === 'MEDIUM'
          ).length,
          lowInsights: insights.filter(insight => insight.severity === 'LOW')
            .length,
        },
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('report')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Полный AI отчет по observability' })
  @ApiResponse({
    status: 200,
    description: 'Комплексный AI отчет по состоянию системы с рекомендациями',
  })
  async getObservabilityReport() {
    const report =
      await this.aiObservabilityAnalyzerService.getObservabilityReport();

    return {
      success: true,
      data: report,
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Проверка состояния AI-анализатора observability' })
  @ApiResponse({
    status: 200,
    description: 'Статус AI-анализатора observability',
  })
  async getHealth() {
    // Быстрая проверка работоспособности
    const timeRange = {
      start: new Date(Date.now() - 60 * 60 * 1000), // Последний час
      end: new Date(),
    };

    try {
      const [logAnalysis, metricAnalysis, insights] = await Promise.all([
        this.aiObservabilityAnalyzerService.analyzeLogs(timeRange),
        this.aiObservabilityAnalyzerService.analyzeMetrics(),
        this.aiObservabilityAnalyzerService.generateInsights(),
      ]);

      return {
        success: true,
        data: {
          status: 'HEALTHY',
          service: 'AI Observability Analyzer',
          version: '1.0.0',
          checks: {
            logAnalysis: 'OK',
            metricAnalysis: 'OK',
            insightsGeneration: 'OK',
            totalLogsAnalyzed: logAnalysis.length,
            totalMetricsAnalyzed: metricAnalysis.length,
            totalInsightsGenerated: insights.length,
          },
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        data: {
          status: 'UNHEALTHY',
          service: 'AI Observability Analyzer',
          error: errorMessage,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  @Get('dashboard')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'AI дашборд observability' })
  @ApiResponse({
    status: 200,
    description: 'Дашборд с AI-анализом состояния системы',
  })
  async getDashboard() {
    const report =
      await this.aiObservabilityAnalyzerService.getObservabilityReport();

    return {
      success: true,
      data: {
        metrics: {
          overallHealth: report.overallHealth,
          totalInsights: report.insights.length,
          totalLogs: report.logAnalysis.length,
          totalMetrics: report.metricAnalysis.length,
          criticalIssues:
            report.insights.filter(i => i.severity === 'CRITICAL').length +
            report.logAnalysis.filter(l => l.severity === 'CRITICAL').length +
            report.metricAnalysis.filter(m => m.status === 'CRITICAL').length,
        },
        charts: {
          insightSeverity: {
            critical: report.insights.filter(i => i.severity === 'CRITICAL')
              .length,
            high: report.insights.filter(i => i.severity === 'HIGH').length,
            medium: report.insights.filter(i => i.severity === 'MEDIUM').length,
            low: report.insights.filter(i => i.severity === 'LOW').length,
          },
          logSeverity: {
            critical: report.logAnalysis.filter(l => l.severity === 'CRITICAL')
              .length,
            high: report.logAnalysis.filter(l => l.severity === 'HIGH').length,
            medium: report.logAnalysis.filter(l => l.severity === 'MEDIUM')
              .length,
            low: report.logAnalysis.filter(l => l.severity === 'LOW').length,
          },
          metricStatus: {
            critical: report.metricAnalysis.filter(m => m.status === 'CRITICAL')
              .length,
            warning: report.metricAnalysis.filter(m => m.status === 'WARNING')
              .length,
            normal: report.metricAnalysis.filter(m => m.status === 'NORMAL')
              .length,
          },
        },
        recentInsights: report.insights
          .filter(
            insight =>
              insight.severity === 'CRITICAL' || insight.severity === 'HIGH'
          )
          .slice(0, 5)
          .map(insight => ({
            type: insight.type,
            severity: insight.severity,
            title: insight.title,
            description: insight.description,
            recommendations: insight.recommendations.slice(0, 3),
          })),
        alerts: report.alerts,
        recommendations: report.recommendations.slice(0, 10),
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post('custom-analysis')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({
    summary: 'Кастомный анализ с указанным временным диапазоном',
  })
  @ApiResponse({
    status: 200,
    description: 'Анализ за указанный период времени',
  })
  async customAnalysis(@Body() dto: AnalyzeLogsDto) {
    const timeRange = {
      start: new Date(dto.startTime),
      end: new Date(dto.endTime),
    };

    const [logAnalysis, metricAnalysis, insights] = await Promise.all([
      this.aiObservabilityAnalyzerService.analyzeLogs(timeRange),
      this.aiObservabilityAnalyzerService.analyzeMetrics(),
      this.aiObservabilityAnalyzerService.generateInsights(),
    ]);

    const overallHealth = this.calculateOverallHealth(
      logAnalysis,
      metricAnalysis,
      insights
    );

    return {
      success: true,
      data: {
        timeRange,
        logAnalysis,
        metricAnalysis,
        insights,
        overallHealth,
        summary: {
          totalLogs: logAnalysis.length,
          totalMetrics: metricAnalysis.length,
          totalInsights: insights.length,
          criticalIssues:
            logAnalysis.filter(l => l.severity === 'CRITICAL').length +
            metricAnalysis.filter(m => m.status === 'CRITICAL').length +
            insights.filter(i => i.severity === 'CRITICAL').length,
        },
        timestamp: new Date().toISOString(),
      },
    };
  }

  private calculateOverallHealth(
    logAnalysis: unknown[],
    metricAnalysis: unknown[],
    insights: unknown[]
  ): number {
    let score = 100;

    // Штрафы за критические проблемы
    const criticalLogs = logAnalysis.filter(
      (log: unknown) =>
        typeof log === 'object' &&
        log != null &&
        'severity' in log &&
        log.severity === 'CRITICAL'
    ).length;
    const criticalMetrics = metricAnalysis.filter(
      (metric: unknown) =>
        typeof metric === 'object' &&
        metric != null &&
        'status' in metric &&
        metric.status === 'CRITICAL'
    ).length;
    const criticalInsights = insights.filter(
      (insight: unknown) =>
        typeof insight === 'object' &&
        insight != null &&
        'severity' in insight &&
        insight.severity === 'CRITICAL'
    ).length;

    score -= criticalLogs * 10;
    score -= criticalMetrics * 15;
    score -= criticalInsights * 20;

    return Math.max(0, Math.min(100, score));
  }
}

import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ObservabilityService } from './observability.service';
import { DashboardService } from './services/dashboard.service';
import { ElasticsearchService } from './services/elasticsearch.service';
import { HealthService } from './services/health.service';
import { JaegerService } from './services/jaeger.service';
import { LoggingService } from './services/logging.service';
import { MetricsService } from './services/metrics.service';
import { TracingService } from './services/tracing.service';

@ApiTags('Observability')
@Controller('observability')
export class ObservabilityController {
  constructor(
    private readonly observabilityService: ObservabilityService,
    private readonly metricsService: MetricsService,
    private readonly loggingService: LoggingService,
    private readonly tracingService: TracingService,
    private readonly healthService: HealthService,
    private readonly elasticsearchService: ElasticsearchService,
    private readonly dashboardService: DashboardService,
    private readonly jaegerService: JaegerService
  ) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get all metrics (system, business, health)' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  async getMetrics() {
    return this.observabilityService.getMetrics();
  }

  @Get('metrics/system')
  @ApiOperation({ summary: 'Get system metrics' })
  @ApiResponse({
    status: 200,
    description: 'System metrics retrieved successfully',
  })
  async getSystemMetrics() {
    return this.observabilityService.getSystemMetrics();
  }

  @Get('metrics/business')
  @ApiOperation({ summary: 'Get business metrics' })
  @ApiResponse({
    status: 200,
    description: 'Business metrics retrieved successfully',
  })
  async getBusinessMetrics() {
    return this.observabilityService.getBusinessMetrics();
  }

  @Get('metrics/prometheus')
  @ApiOperation({ summary: 'Get Prometheus format metrics' })
  @ApiResponse({
    status: 200,
    description: 'Prometheus metrics in text format',
  })
  async getPrometheusMetrics(@Res() res: Response): Promise<void> {
    const metrics = this.metricsService.getPrometheusMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  }

  @Get('logs')
  @ApiOperation({ summary: 'Get application logs' })
  @ApiQuery({
    name: 'level',
    required: false,
    description: 'Filter logs by level',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of logs to return',
    type: Number,
  })
  @ApiResponse({ status: 200, description: 'Logs retrieved successfully' })
  async getLogs(
    @Query('level') level?: string,
    @Query('limit') limit?: number
  ) {
    return this.loggingService.getLogs(level, limit);
  }

  @Get('logs/stats')
  @ApiOperation({ summary: 'Get log statistics' })
  @ApiResponse({
    status: 200,
    description: 'Log statistics retrieved successfully',
  })
  async getLogStats() {
    return this.loggingService.getLogStats();
  }

  @Delete('logs')
  @ApiOperation({ summary: 'Clear all logs' })
  @ApiResponse({ status: 200, description: 'Logs cleared successfully' })
  async clearLogs() {
    await this.loggingService.clearLogs();
    return { message: 'Logs cleared successfully' };
  }

  @Get('logs/export')
  @ApiOperation({ summary: 'Export logs' })
  @ApiQuery({
    name: 'format',
    required: false,
    description: 'Export format (json or text)',
    enum: ['json', 'text'],
  })
  @ApiResponse({ status: 200, description: 'Logs exported successfully' })
  async exportLogs(@Query('format') format: 'json' | 'text' = 'json') {
    return this.loggingService.exportLogs(format);
  }

  @Get('traces')
  @ApiOperation({ summary: 'Get traces' })
  @ApiQuery({
    name: 'operation',
    required: false,
    description: 'Filter traces by operation',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of traces to return',
    type: Number,
  })
  @ApiResponse({ status: 200, description: 'Traces retrieved successfully' })
  async getTraces(
    @Query('operation') operation?: string,
    @Query('limit') limit?: number
  ) {
    return this.tracingService.getTraces(operation, limit);
  }

  @Get('traces/:traceId')
  @ApiOperation({ summary: 'Get specific trace' })
  @ApiResponse({ status: 200, description: 'Trace retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Trace not found' })
  async getTrace(@Param('traceId') traceId: string) {
    const trace = await this.tracingService.getTrace(traceId);
    if (!trace) {
      return { error: 'Trace not found' };
    }
    return trace;
  }

  @Get('traces/stats')
  @ApiOperation({ summary: 'Get trace statistics' })
  @ApiResponse({
    status: 200,
    description: 'Trace statistics retrieved successfully',
  })
  async getTraceStats() {
    return this.tracingService.getTraceStats();
  }

  @Get('traces/export')
  @ApiOperation({ summary: 'Export traces' })
  @ApiQuery({
    name: 'format',
    required: false,
    description: 'Export format (json or jaeger)',
    enum: ['json', 'jaeger'],
  })
  @ApiResponse({ status: 200, description: 'Traces exported successfully' })
  async exportTraces(@Query('format') format: 'json' | 'jaeger' = 'json') {
    return this.tracingService.exportTraces(format);
  }

  @Delete('traces')
  @ApiOperation({ summary: 'Clear all traces' })
  @ApiResponse({ status: 200, description: 'Traces cleared successfully' })
  async clearTraces() {
    await this.tracingService.clearTraces();
    return { message: 'Traces cleared successfully' };
  }

  @Get('health')
  @ApiOperation({ summary: 'Get health status' })
  @ApiResponse({
    status: 200,
    description: 'Health status retrieved successfully',
  })
  async getHealth() {
    return this.healthService.getStatus();
  }

  @Get('health/detailed')
  @ApiOperation({ summary: 'Get detailed health information' })
  @ApiResponse({
    status: 200,
    description: 'Detailed health information retrieved successfully',
  })
  async getDetailedHealth() {
    return this.healthService.getDetailedHealth();
  }

  @Post('health/check')
  @ApiOperation({ summary: 'Run health checks' })
  @ApiResponse({
    status: 200,
    description: 'Health checks completed successfully',
  })
  async runHealthChecks() {
    await this.healthService.runHealthChecks();
    return { message: 'Health checks completed successfully' };
  }

  @Post('test/error')
  @ApiOperation({ summary: 'Test error logging' })
  @ApiResponse({ status: 200, description: 'Test error logged successfully' })
  async testError() {
    await this.loggingService.error('Test error message', {
      test: true,
      timestamp: new Date().toISOString(),
    });
    this.metricsService.incrementErrorCount();
    return { message: 'Test error logged successfully' };
  }

  @Post('test/trace')
  @ApiOperation({ summary: 'Test tracing' })
  @ApiResponse({ status: 200, description: 'Test trace created successfully' })
  async testTrace() {
    const traceId = await this.tracingService.startTrace('test_operation', {
      test: true,
      timestamp: new Date().toISOString(),
    });

    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 100));

    await this.tracingService.endTrace(traceId, {
      result: 'success',
      duration: 100,
    });

    return {
      message: 'Test trace created successfully',
      traceId,
    };
  }

  // ELK Stack endpoints
  @Get('elasticsearch/health')
  @ApiOperation({ summary: 'Get Elasticsearch health status' })
  @ApiResponse({
    status: 200,
    description: 'Elasticsearch health status retrieved successfully',
  })
  async getElasticsearchHealth() {
    return this.elasticsearchService.healthCheck();
  }

  @Get('elasticsearch/logs')
  @ApiOperation({ summary: 'Search logs in Elasticsearch' })
  @ApiQuery({
    name: 'query',
    required: false,
    description: 'Elasticsearch query (JSON string)',
  })
  @ApiQuery({
    name: 'size',
    required: false,
    description: 'Number of results to return',
    type: Number,
  })
  @ApiResponse({ status: 200, description: 'Logs retrieved successfully' })
  async searchLogs(
    @Query('query') query?: string,
    @Query('size') size?: number
  ) {
    const parsedQuery =
      query != null && query !== '' && query.length > 0
        ? JSON.parse(query)
        : { match_all: {} };
    return this.elasticsearchService.searchLogs(parsedQuery, size);
  }

  @Get('elasticsearch/stats')
  @ApiOperation({ summary: 'Get log statistics from Elasticsearch' })
  @ApiQuery({
    name: 'timeRange',
    required: false,
    description: 'Time range for stats (e.g., 1d, 7d)',
  })
  @ApiResponse({
    status: 200,
    description: 'Log statistics retrieved successfully',
  })
  async getElasticsearchLogStats(@Query('timeRange') timeRange?: string) {
    return this.elasticsearchService.getLogStats(timeRange);
  }

  @Post('elasticsearch/test')
  @ApiOperation({ summary: 'Test Elasticsearch logging' })
  @ApiResponse({ status: 200, description: 'Test log sent successfully' })
  async testElasticsearchLogging() {
    await this.elasticsearchService.info('Test info message from API', {
      test: true,
      timestamp: new Date().toISOString(),
      service: 'salespot-api',
    });

    await this.elasticsearchService.error('Test error message from API', {
      test: true,
      timestamp: new Date().toISOString(),
      service: 'salespot-api',
      error: { code: 'TEST_ERROR', message: 'This is a test error' },
    });

    return { message: 'Test logs sent to Elasticsearch successfully' };
  }

  @Delete('elasticsearch/cleanup')
  @ApiOperation({ summary: 'Clean up old logs from Elasticsearch' })
  @ApiQuery({
    name: 'daysToKeep',
    required: false,
    description: 'Number of days to keep logs',
    type: Number,
  })
  @ApiResponse({ status: 200, description: 'Old logs cleaned up successfully' })
  async cleanupOldLogs(@Query('daysToKeep') daysToKeep?: number) {
    const deleted = await this.elasticsearchService.deleteOldLogs(daysToKeep);
    return {
      message: 'Old logs cleaned up successfully',
      deletedCount: deleted,
    };
  }

  // Dashboard endpoints
  @Get('dashboard/system')
  @ApiOperation({ summary: 'Get system dashboard data' })
  @ApiResponse({
    status: 200,
    description: 'System dashboard data retrieved successfully',
  })
  async getSystemDashboard() {
    return this.dashboardService.getSystemDashboard();
  }

  @Get('dashboard/business')
  @ApiOperation({ summary: 'Get business dashboard data' })
  @ApiResponse({
    status: 200,
    description: 'Business dashboard data retrieved successfully',
  })
  async getBusinessDashboard() {
    return this.dashboardService.getBusinessDashboard();
  }

  @Get('dashboard/:dashboardId')
  @ApiOperation({ summary: 'Get specific dashboard configuration' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard configuration retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Dashboard not found' })
  async getDashboard(@Param('dashboardId') dashboardId: string) {
    const dashboard = await this.dashboardService.getDashboard(dashboardId);
    if (!dashboard) {
      return { error: 'Dashboard not found' };
    }
    return dashboard;
  }

  @Get('dashboard/:dashboardId/widget/:widgetId')
  @ApiOperation({ summary: 'Get widget data for specific dashboard' })
  @ApiResponse({
    status: 200,
    description: 'Widget data retrieved successfully',
  })
  async getWidgetData(
    @Param('dashboardId') dashboardId: string,
    @Param('widgetId') widgetId: string
  ) {
    return this.dashboardService.getWidgetData(dashboardId, widgetId);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get all available dashboards' })
  @ApiResponse({
    status: 200,
    description: 'Dashboards retrieved successfully',
  })
  async getAllDashboards() {
    return this.dashboardService.getAllDashboards();
  }

  // Jaeger endpoints
  @Get('jaeger/health')
  @ApiOperation({ summary: 'Get Jaeger service health status' })
  @ApiResponse({
    status: 200,
    description: 'Jaeger health status retrieved successfully',
  })
  async getJaegerHealth() {
    return this.jaegerService.healthCheck();
  }

  @Get('jaeger/service-info')
  @ApiOperation({ summary: 'Get Jaeger service information' })
  @ApiResponse({
    status: 200,
    description: 'Jaeger service info retrieved successfully',
  })
  async getJaegerServiceInfo() {
    return this.jaegerService.getServiceInfo();
  }

  @Get('jaeger/traces')
  @ApiOperation({ summary: 'Search Jaeger traces' })
  @ApiQuery({
    name: 'serviceName',
    required: false,
    description: 'Filter by service name',
  })
  @ApiQuery({
    name: 'operationName',
    required: false,
    description: 'Filter by operation name',
  })
  @ApiQuery({
    name: 'startTime',
    required: false,
    description: 'Start time filter (timestamp)',
    type: Number,
  })
  @ApiQuery({
    name: 'endTime',
    required: false,
    description: 'End time filter (timestamp)',
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of traces to return',
    type: Number,
  })
  @ApiResponse({ status: 200, description: 'Traces retrieved successfully' })
  async searchJaegerTraces(
    @Query('serviceName') serviceName?: string,
    @Query('operationName') operationName?: string,
    @Query('startTime') startTime?: number,
    @Query('endTime') endTime?: number,
    @Query('limit') limit?: number
  ) {
    const query: {
      serviceName?: string;
      operationName?: string;
      startTime?: number;
      endTime?: number;
      tags?: Record<string, unknown>;
      limit?: number;
    } = {};

    if (serviceName !== undefined) query.serviceName = serviceName;
    if (operationName !== undefined) query.operationName = operationName;
    if (startTime !== undefined) query.startTime = startTime;
    if (endTime !== undefined) query.endTime = endTime;
    if (limit !== undefined) query.limit = limit;

    return this.jaegerService.searchTraces(query);
  }

  @Get('jaeger/traces/:traceId')
  @ApiOperation({ summary: 'Get specific Jaeger trace' })
  @ApiResponse({ status: 200, description: 'Trace retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Trace not found' })
  async getJaegerTrace(@Param('traceId') traceId: string) {
    const trace = await this.jaegerService.getTrace(traceId);
    if (!trace) {
      return { error: 'Trace not found' };
    }
    return trace;
  }

  @Get('jaeger/stats')
  @ApiOperation({ summary: 'Get Jaeger trace statistics' })
  @ApiResponse({
    status: 200,
    description: 'Trace statistics retrieved successfully',
  })
  async getJaegerStats() {
    return this.jaegerService.getTraceStats();
  }

  @Get('jaeger/dependencies')
  @ApiOperation({ summary: 'Get service dependencies from Jaeger' })
  @ApiResponse({
    status: 200,
    description: 'Dependencies retrieved successfully',
  })
  async getJaegerDependencies() {
    return this.jaegerService.getDependencies();
  }

  @Post('jaeger/test')
  @ApiOperation({ summary: 'Test Jaeger tracing' })
  @ApiResponse({ status: 200, description: 'Test trace created successfully' })
  async testJaegerTracing() {
    const span = await this.jaegerService.startSpan('test_jaeger_operation');

    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 150));

    await this.jaegerService.finishSpan(span.traceId, span.spanId, {
      'test.completed': true,
      'test.duration': 150,
    });

    return {
      message: 'Test Jaeger trace created successfully',
      traceId: span.traceId,
      spanId: span.spanId,
    };
  }

  @Delete('jaeger/cleanup')
  @ApiOperation({ summary: 'Clean up old Jaeger traces' })
  @ApiQuery({
    name: 'maxAge',
    required: false,
    description: 'Maximum age in milliseconds',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Old traces cleaned up successfully',
  })
  async cleanupOldJaegerTraces(@Query('maxAge') maxAge?: number) {
    const deleted = await this.jaegerService.cleanupOldTraces(maxAge);
    return {
      message: 'Old traces cleaned up successfully',
      deletedCount: deleted,
    };
  }

  // Комплексные тестовые endpoints
  @Post('test/comprehensive')
  @ApiOperation({ summary: 'Run comprehensive observability test' })
  @ApiResponse({
    status: 200,
    description: 'Comprehensive test completed successfully',
  })
  async runComprehensiveTest() {
    const results = {
      metrics: {},
      logging: {},
      tracing: {},
      health: {},
      elasticsearch: {},
      dashboard: {},
      jaeger: {},
    };

    // Тестируем метрики
    try {
      this.metricsService.incrementRequestCount();
      this.metricsService.trackUserSession('test-user-123');
      this.metricsService.trackTransaction(100.5, 'test-user');
      this.metricsService.trackClick('test-button', 'test-user');
      this.metricsService.trackConversion(100, 'test-user');

      results.metrics = {
        system: await this.metricsService.getSystemMetrics(),
        business: await this.metricsService.getBusinessMetricsExtended(),
        prometheus:
          this.metricsService.getPrometheusMetrics().substring(0, 200) + '...',
      };
    } catch (error) {
      results.metrics = { error: (error as Error).message };
    }

    // Тестируем логирование
    try {
      await this.loggingService.info('Comprehensive test - info message', {
        test: true,
      });
      await this.loggingService.warn('Comprehensive test - warning message', {
        test: true,
      });
      await this.loggingService.error('Comprehensive test - error message', {
        test: true,
      });

      results.logging = {
        stats: await this.loggingService.getLogStats(),
        recentLogs: await this.loggingService.getLogs('info', 5),
      };
    } catch (error) {
      results.logging = { error: (error as Error).message };
    }

    // Тестируем трейсинг
    try {
      const traceId = await this.tracingService.startTrace(
        'comprehensive_test',
        { test: true }
      );
      await new Promise(resolve => setTimeout(resolve, 50));
      await this.tracingService.endTrace(traceId, { result: 'success' });

      results.tracing = {
        stats: await this.tracingService.getTraceStats(),
        recentTraces: await this.tracingService.getTraces(
          'comprehensive_test',
          3
        ),
      };
    } catch (error) {
      results.tracing = { error: (error as Error).message };
    }

    // Тестируем health checks
    try {
      results.health = {
        status: await this.healthService.getStatus(),
        detailed: await this.healthService.getDetailedHealth(),
      };
    } catch (error) {
      results.health = { error: (error as Error).message };
    }

    // Тестируем Elasticsearch
    try {
      await this.elasticsearchService.info('Comprehensive test - ES info', {
        test: true,
      });
      await this.elasticsearchService.error('Comprehensive test - ES error', {
        test: true,
      });

      results.elasticsearch = {
        health: await this.elasticsearchService.healthCheck(),
        stats: await this.elasticsearchService.getLogStats('1h'),
      };
    } catch (error) {
      results.elasticsearch = { error: (error as Error).message };
    }

    // Тестируем дашборды
    try {
      results.dashboard = {
        system: await this.dashboardService.getSystemDashboard(),
        business: await this.dashboardService.getBusinessDashboard(),
        allDashboards: await this.dashboardService.getAllDashboards(),
      };
    } catch (error) {
      results.dashboard = { error: (error as Error).message };
    }

    // Тестируем Jaeger
    try {
      const span = await this.jaegerService.startSpan(
        'comprehensive_test_operation'
      );
      await new Promise(resolve => setTimeout(resolve, 75));
      await this.jaegerService.finishSpan(span.traceId, span.spanId, {
        test: true,
      });

      results.jaeger = {
        health: await this.jaegerService.healthCheck(),
        stats: await this.jaegerService.getTraceStats(),
        serviceInfo: await this.jaegerService.getServiceInfo(),
      };
    } catch (error) {
      results.jaeger = { error: (error as Error).message };
    }

    return {
      message: 'Comprehensive observability test completed',
      timestamp: new Date().toISOString(),
      results,
    };
  }

  @Post('test/load-simulation')
  @ApiOperation({ summary: 'Simulate load for observability testing' })
  @ApiQuery({
    name: 'requests',
    required: false,
    description: 'Number of requests to simulate',
    type: Number,
  })
  @ApiQuery({
    name: 'delay',
    required: false,
    description: 'Delay between requests (ms)',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Load simulation completed successfully',
  })
  async simulateLoad(
    @Query('requests') requests: number = 10,
    @Query('delay') delay: number = 100
  ) {
    const results = [];
    const startTime = Date.now();

    for (let i = 0; i < requests; i++) {
      const requestStart = Date.now();

      // Симулируем запрос
      this.metricsService.incrementRequestCount();

      // Создаем трейс
      const traceId = await this.tracingService.startTrace(
        `load_test_request_${i}`,
        {
          requestId: i,
          loadTest: true,
        }
      );

      // Логируем начало
      await this.loggingService.info(`Load test request ${i} started`, {
        requestId: i,
        loadTest: true,
      });

      // Симулируем работу
      const workTime = Math.random() * 200 + 50; // 50-250ms
      await new Promise(resolve => setTimeout(resolve, workTime));

      // Симулируем ошибки (10% вероятность)
      if (Math.random() < 0.1) {
        this.metricsService.incrementErrorCount();
        await this.loggingService.error(`Load test request ${i} failed`, {
          requestId: i,
          loadTest: true,
          error: 'Simulated error',
        });
      } else {
        await this.loggingService.info(`Load test request ${i} completed`, {
          requestId: i,
          loadTest: true,
          duration: workTime,
        });
      }

      // Завершаем трейс
      await this.tracingService.endTrace(traceId, {
        duration: workTime,
        success: Math.random() >= 0.1,
      });

      const requestDuration = Date.now() - requestStart;
      results.push({
        requestId: i,
        duration: requestDuration,
        workTime,
        success: Math.random() >= 0.1,
      });

      // Задержка между запросами
      if (i < requests - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    const totalDuration = Date.now() - startTime;

    return {
      message: 'Load simulation completed',
      summary: {
        totalRequests: requests,
        totalDuration,
        averageRequestTime:
          results.reduce((sum, r) => sum + r.duration, 0) / results.length,
        successRate:
          (results.filter(r => r.success).length / results.length) * 100,
      },
      results,
    };
  }

  @Post('test/metrics-generation')
  @ApiOperation({ summary: 'Generate test metrics data' })
  @ApiQuery({
    name: 'users',
    required: false,
    description: 'Number of users to simulate',
    type: Number,
  })
  @ApiQuery({
    name: 'transactions',
    required: false,
    description: 'Number of transactions to simulate',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Test metrics generated successfully',
  })
  async generateTestMetrics(
    @Query('users') users: number = 50,
    @Query('transactions') transactions: number = 100
  ) {
    const results = {
      users: [] as Record<string, unknown>[],
      transactions: [] as Record<string, unknown>[],
      clicks: [] as Record<string, unknown>[],
      conversions: [] as Record<string, unknown>[],
    };

    // Генерируем пользовательские сессии
    for (let i = 0; i < users; i++) {
      const userId = `test-user-${i}`;
      this.metricsService.trackUserSession(userId);

      results.users.push({
        userId,
        sessionStarted: new Date().toISOString(),
      });
    }

    // Генерируем транзакции
    for (let i = 0; i < transactions; i++) {
      const amount = Math.random() * 1000 + 10; // 10-1010
      const userId = `test-user-${Math.floor(Math.random() * users)}`;
      this.metricsService.trackTransaction(amount, userId);

      results.transactions.push({
        transactionId: i,
        amount,
        timestamp: new Date().toISOString(),
      });
    }

    // Генерируем клики
    const clickCount = Math.floor(transactions * 2.5); // 2.5 клика на транзакцию
    for (let i = 0; i < clickCount; i++) {
      const element = ['button', 'link', 'image', 'form'][
        Math.floor(Math.random() * 4)
      ];
      const userId = `test-user-${Math.floor(Math.random() * users)}`;
      this.metricsService.trackClick(element ?? 'button', userId);

      results.clicks.push({
        clickId: i,
        element: element ?? 'button',
        timestamp: new Date().toISOString(),
      });
    }

    // Генерируем конверсии
    const conversionCount = Math.floor(transactions * 0.3); // 30% конверсия
    for (let i = 0; i < conversionCount; i++) {
      const funnel = ['signup', 'purchase', 'download', 'subscribe'][
        Math.floor(Math.random() * 4)
      ];
      const userId = `test-user-${Math.floor(Math.random() * users)}`;
      this.metricsService.trackConversion(100, userId);

      results.conversions.push({
        conversionId: i,
        funnel: funnel ?? 'signup',
        timestamp: new Date().toISOString(),
      });
    }

    // Получаем обновленные метрики
    const updatedMetrics =
      await this.metricsService.getBusinessMetricsExtended();

    return {
      message: 'Test metrics generated successfully',
      summary: {
        usersGenerated: users,
        transactionsGenerated: transactions,
        clicksGenerated: clickCount,
        conversionsGenerated: conversionCount,
      },
      updatedMetrics: {
        dau: updatedMetrics.dau,
        mau: updatedMetrics.mau,
        ctr: updatedMetrics.userActivity.ctr,
        roi: updatedMetrics.userActivity.roi,
        conversionRate: updatedMetrics.userActivity.conversionRate,
      },
      results,
    };
  }

  @Get('test/status')
  @ApiOperation({ summary: 'Get overall observability system status' })
  @ApiResponse({
    status: 200,
    description: 'System status retrieved successfully',
  })
  async getSystemStatus() {
    const status: {
      timestamp: string;
      components: Record<string, unknown>;
      overall: string;
      summary?: Record<string, unknown>;
    } = {
      timestamp: new Date().toISOString(),
      components: {} as Record<string, unknown>,
      overall: 'unknown',
    };

    // Проверяем каждый компонент
    const checks = [
      {
        name: 'metrics',
        check: async () => await this.metricsService.getSystemMetrics(),
      },
      {
        name: 'logging',
        check: async () => await this.loggingService.getLogStats(),
      },
      {
        name: 'tracing',
        check: async () => await this.tracingService.getTraceStats(),
      },
      {
        name: 'health',
        check: async () => await this.healthService.getStatus(),
      },
      {
        name: 'elasticsearch',
        check: async () => await this.elasticsearchService.healthCheck(),
      },
      {
        name: 'dashboard',
        check: async () => await this.dashboardService.getAllDashboards(),
      },
      {
        name: 'jaeger',
        check: async () => await this.jaegerService.healthCheck(),
      },
    ];

    let healthyComponents = 0;
    const totalComponents = checks.length;

    for (const component of checks) {
      try {
        const result = await component.check();
        status.components[component.name] = {
          status: 'healthy',
          data: result,
        };
        healthyComponents++;
      } catch (error) {
        status.components[component.name] = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    // Определяем общий статус
    const healthPercentage = (healthyComponents / totalComponents) * 100;
    if (healthPercentage >= 90) {
      status.overall = 'healthy';
    } else if (healthPercentage >= 70) {
      status.overall = 'degraded';
    } else {
      status.overall = 'unhealthy';
    }

    status.summary = {
      totalComponents,
      healthyComponents,
      healthPercentage,
    };

    return status;
  }
}

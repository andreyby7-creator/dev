import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { MonitoringEnhancementController } from '../controllers/monitoring-enhancement.controller';
import { MonitoringEnhancementModule } from '../monitoring-enhancement.module';
import { AlertingService } from '../services/alerting.service';
import { AutomatedReportsService } from '../services/automated-reports.service';
import { CentralizedLoggingService } from '../services/centralized-logging.service';
import { DataVisualizationService } from '../services/data-visualization.service';
import { DistributedTracingService } from '../services/distributed-tracing.service';
import { HealthChecksService } from '../services/health-checks.service';
import { InteractiveDashboardsService } from '../services/interactive-dashboards.service';
import { LocalNotificationsService } from '../services/local-notifications.service';
import { MetricsCollectionService } from '../services/metrics-collection.service';

describe('MonitoringEnhancementModule Integration', () => {
  let module: TestingModule;
  let controller: MonitoringEnhancementController;
  let metricsService: MetricsCollectionService;
  let alertingService: AlertingService;
  let loggingService: CentralizedLoggingService;
  let tracingService: DistributedTracingService;
  let healthService: HealthChecksService;
  let dashboardsService: InteractiveDashboardsService;
  let reportsService: AutomatedReportsService;
  let visualizationService: DataVisualizationService;
  let notificationsService: LocalNotificationsService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
        MonitoringEnhancementModule,
      ],
    }).compile();

    controller = module.get<MonitoringEnhancementController>(
      MonitoringEnhancementController
    );
    metricsService = module.get<MetricsCollectionService>(
      MetricsCollectionService
    );
    alertingService = module.get<AlertingService>(AlertingService);
    loggingService = module.get<CentralizedLoggingService>(
      CentralizedLoggingService
    );
    tracingService = module.get<DistributedTracingService>(
      DistributedTracingService
    );
    healthService = module.get<HealthChecksService>(HealthChecksService);
    dashboardsService = module.get<InteractiveDashboardsService>(
      InteractiveDashboardsService
    );
    reportsService = module.get<AutomatedReportsService>(
      AutomatedReportsService
    );
    visualizationService = module.get<DataVisualizationService>(
      DataVisualizationService
    );
    notificationsService = module.get<LocalNotificationsService>(
      LocalNotificationsService
    );
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
    expect(controller).toBeDefined();
    expect(metricsService).toBeDefined();
    expect(alertingService).toBeDefined();
    expect(loggingService).toBeDefined();
    expect(tracingService).toBeDefined();
    expect(healthService).toBeDefined();
    expect(dashboardsService).toBeDefined();
    expect(reportsService).toBeDefined();
    expect(visualizationService).toBeDefined();
    expect(notificationsService).toBeDefined();
  });

  describe('Complete Monitoring Workflow', () => {
    it('should execute complete monitoring workflow', async () => {
      // 1. Collect metrics
      const metricsResult = await metricsService.collectMetrics({
        interval: 30,
        metrics: ['cpu.usage', 'memory.usage', 'disk.usage'],
        retention: 3600,
        aggregation: 'avg',
      });
      expect(metricsResult.success).toBe(true);

      // 2. Configure alerts
      const alertConfig = {
        rules: [
          {
            id: 'cpu-alert',
            name: 'High CPU Usage',
            metric: 'cpu.usage',
            condition: 'gt' as const,
            threshold: 80,
            severity: 'high' as const,
            enabled: true,
            cooldown: 300,
          },
        ],
        channels: ['email', 'slack'],
        escalation: {
          enabled: true,
          levels: [
            {
              delay: 5,
              channels: ['email'],
            },
          ],
        },
      };
      const alertResult = await alertingService.configureAlerts(alertConfig);
      expect(alertResult.success).toBe(true);

      // 3. Centralize logs
      const logResult = await loggingService.centralizeLogs({
        logs: [
          {
            id: 'log-1',
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'System started successfully',
            _service: 'monitoring-service',
            source: 'startup',
            metadata: { version: '1.0.0' },
          },
        ],
      });
      expect(logResult.success).toBe(true);

      // 4. Start distributed trace
      const traceResult = await tracingService.startTrace({
        _service: 'monitoring-service',
        operation: 'health-check',
        tags: { environment: 'test' },
        metadata: { requestId: 'req-123' },
      });
      expect(traceResult.traceId).toBeDefined();

      // 5. Perform health check
      const healthResult =
        await healthService.performHealthCheck('monitoring-service');
      expect(healthResult._service).toBe('monitoring-service');
      expect(healthResult.status).toMatch(
        /^(healthy|unhealthy|degraded|unknown)$/
      );

      // 6. Create dashboard
      const dashboardResult = await dashboardsService.createDashboard({
        name: 'Monitoring Dashboard',
        description: 'Complete monitoring dashboard',
        widgets: [
          {
            type: 'chart',
            title: 'System Metrics',
            config: { metric: 'cpu.usage' },
            dataSource: 'metrics',
          },
          {
            type: 'metric',
            title: 'Health Status',
            config: { metric: 'health.status' },
            dataSource: 'health',
          },
        ],
      });
      expect(dashboardResult.success).toBe(true);

      // 7. Generate report
      const reportResult = await reportsService.generateReport({
        name: 'Monitoring Report',
        type: 'performance',
        timeRange: '24h',
        sections: [
          {
            title: 'System Performance',
            type: 'chart',
            config: { metric: 'cpu.usage' },
          },
        ],
        format: 'pdf',
      });
      expect(reportResult.success).toBe(true);

      // 8. Create visualization
      const visualizationResult =
        await visualizationService.createVisualization({
          name: 'System Visualization',
          description: 'System performance visualization',
          charts: [
            {
              name: 'CPU Usage Chart',
              type: 'line',
              dataSource: 'metrics',
              timeRange: '1h',
              aggregation: 'avg',
              dimensions: ['timestamp'],
              metrics: ['cpu.usage'],
            },
          ],
        });
      expect(visualizationResult.success).toBe(true);

      // 9. Send notification
      const notificationResult = await notificationsService.sendNotification({
        channels: ['telegram-admin'],
        message: {
          title: 'Monitoring System Online',
          body: 'All monitoring services are operational',
          severity: 'medium',
        },
        _service: 'monitoring-service',
      });
      expect(notificationResult.success).toBe(true);
    });

    it('should handle metrics collection and alerting integration', async () => {
      // Configure alerts first
      await alertingService.configureAlerts({
        rules: [
          {
            id: 'memory-alert',
            name: 'High Memory Usage',
            metric: 'memory.usage',
            condition: 'gt' as const,
            threshold: 90,
            severity: 'critical' as const,
            enabled: true,
            cooldown: 0,
          },
        ],
        channels: ['email'],
        escalation: {
          enabled: false,
          levels: [],
        },
      });

      // Collect metrics that should trigger alert
      await metricsService.collectMetrics({
        interval: 30,
        metrics: ['memory.usage'],
        retention: 3600,
        aggregation: 'avg',
      });

      // Evaluate alerts with high memory usage
      const alertResult = await alertingService.evaluateAlerts({
        'memory.usage': 95,
      });

      expect(alertResult.triggered).toBeGreaterThan(0);
      expect(alertResult.newAlerts.length).toBeGreaterThan(0);
    });

    it('should handle logging and tracing integration', async () => {
      // Start a trace
      const traceResult = await tracingService.startTrace({
        _service: 'api-service',
        operation: 'process-request',
      });

      // Add span logs
      await tracingService.addSpanLog(
        traceResult.spanId,
        'Processing request',
        'info'
      );
      await tracingService.addSpanLog(
        traceResult.spanId,
        'Database query executed',
        'debug'
      );

      // Centralize logs with trace information
      const logResult = await loggingService.centralizeLogs({
        logs: [
          {
            id: 'log-1',
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Request processed successfully',
            _service: 'api-service',
            source: 'request-handler',
            traceId: traceResult.traceId,
            spanId: traceResult.spanId,
            metadata: { requestId: 'req-456' },
          },
        ],
      });

      expect(logResult.success).toBe(true);

      // Finish the trace
      await tracingService.finishSpan(traceResult.spanId, 'completed');

      // Verify trace details
      const traceDetails = await tracingService.getTraceDetails(
        traceResult.traceId
      );
      expect(traceDetails.trace).toBeDefined();
      expect(traceDetails.trace?.status).toBe('completed');
      expect(traceDetails.spans.length).toBeGreaterThan(0);
    });

    it('should handle dashboard and visualization integration', async () => {
      // Create visualization first
      const visualizationResult =
        await visualizationService.createVisualization({
          name: 'System Overview',
          description: 'Complete system overview visualization',
          charts: [
            {
              name: 'CPU Usage',
              type: 'line',
              dataSource: 'metrics',
              timeRange: '1h',
              aggregation: 'avg',
              dimensions: ['timestamp'],
              metrics: ['cpu.usage'],
            },
            {
              name: 'Memory Usage',
              type: 'gauge',
              dataSource: 'metrics',
              timeRange: '1h',
              aggregation: 'avg',
              dimensions: [],
              metrics: ['memory.usage'],
            },
          ],
        });

      expect(visualizationResult.success).toBe(true);

      // Create dashboard with visualization reference
      const dashboardResult = await dashboardsService.createDashboard({
        name: 'System Dashboard',
        description: 'Dashboard with system visualizations',
        widgets: [
          {
            type: 'chart',
            title: 'System Performance',
            config: {
              visualizationId: visualizationResult.visualizationId,
              chartType: 'line',
            },
            dataSource: 'visualization',
          },
        ],
      });

      expect(dashboardResult.success).toBe(true);

      // Get dashboard data
      const dashboardData = await dashboardsService.getDashboard(
        dashboardResult.dashboardId
      );
      expect(dashboardData.dashboard).toBeDefined();
      expect(dashboardData.data).toBeDefined();
    });

    it('should handle reports and notifications integration', async () => {
      // Create report template with schedule
      const templateResult = await reportsService.createReportTemplate({
        name: 'Daily System Report',
        description: 'Daily system performance report',
        type: 'performance',
        sections: [
          {
            title: 'System Metrics',
            type: 'chart',
            config: { metric: 'cpu.usage' },
          },
        ],
        schedule: {
          enabled: true,
          frequency: 'daily',
          time: '08:00',
        },
        recipients: ['admin@example.com'],
        format: 'pdf',
        metadata: { category: 'system' },
      });

      expect(templateResult.success).toBe(true);

      // Generate report from template
      const reportResult = await reportsService.generateReport({
        templateId: templateResult.templateId,
        name: 'Daily System Report - Today',
        type: 'performance',
        timeRange: '24h',
        sections: [
          {
            title: 'System Metrics',
            type: 'chart',
            config: { metric: 'cpu.usage' },
          },
        ],
        format: 'pdf',
        recipients: ['admin@example.com'],
      });

      expect(reportResult.success).toBe(true);

      // Send notification about report generation
      const notificationResult = await notificationsService.sendNotification({
        channels: ['email-alerts'],
        message: {
          title: 'Daily Report Generated',
          body: `System report has been generated: ${reportResult.reportId}`,
          severity: 'high',
        },
        _service: 'reporting-service',
        metadata: {
          reportId: reportResult.reportId,
          reportType: 'performance',
        },
      });

      expect(notificationResult.success).toBe(true);
    });

    it('should handle health checks and monitoring integration', async () => {
      // Add custom health check
      const healthCheckResult = await healthService.addHealthCheck({
        name: 'Database Health Check',
        _service: 'database-service',
        endpoint: '/health/db',
        method: 'GET',
        expectedStatus: 200,
        timeout: 5000,
        interval: 30,
        enabled: true,
        metadata: { type: 'database' },
      });

      expect(healthCheckResult.success).toBe(true);

      // Perform health check
      const healthResult =
        await healthService.performHealthCheck('database-service');
      expect(healthResult._service).toBe('database-service');
      expect(healthResult.checks).toBeGreaterThan(0);

      // Get health status
      const healthStatus = await healthService.getHealthStatus();
      expect(healthStatus.services.length).toBeGreaterThan(0);
      expect(healthStatus.metrics.totalServices).toBeGreaterThan(0);

      // Create dashboard for health monitoring
      const dashboardResult = await dashboardsService.createDashboard({
        name: 'Health Monitoring Dashboard',
        description: 'Dashboard for monitoring system health',
        widgets: [
          {
            type: 'metric',
            title: 'System Health',
            config: {
              dataSource: 'health',
              metric: 'overall.status',
            },
            dataSource: 'health',
          },
        ],
      });

      expect(dashboardResult.success).toBe(true);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle service failures gracefully', async () => {
      // Test with invalid configuration
      const invalidConfig = {
        interval: -1, // Invalid interval
        metrics: [], // Empty metrics
        retention: 0, // Invalid retention
        aggregation: 'invalid' as unknown as 'sum' | 'avg' | 'max' | 'min', // Invalid aggregation
      };

      // Should not throw error, but handle gracefully
      const result = await metricsService.collectMetrics(invalidConfig);
      expect(result).toBeDefined();
    });

    it('should handle missing data gracefully', async () => {
      // Test with non-existent data
      const nonExistentTrace =
        await tracingService.getTraceDetails('non-existent-trace');
      expect(nonExistentTrace.trace).toBeNull();
      expect(nonExistentTrace.status).toBe('not_found');

      const nonExistentDashboard = await dashboardsService.getDashboard(
        'non-existent-dashboard'
      );
      expect(nonExistentDashboard.dashboard).toBeNull();

      const nonExistentReport = await reportsService.getReport(
        'non-existent-report'
      );
      expect(nonExistentReport.report).toBeNull();
    });

    it('should handle concurrent operations', async () => {
      // Perform multiple operations concurrently
      const promises = [
        metricsService.collectMetrics({
          interval: 30,
          metrics: ['cpu.usage'],
          retention: 3600,
          aggregation: 'avg',
        }),
        loggingService.centralizeLogs({
          logs: [
            {
              level: 'info',
              message: 'Concurrent log 1',
              service: 'test-service',
            },
          ],
        }),
        healthService.performHealthCheck('test-service'),
        dashboardsService.createDashboard({
          name: 'Concurrent Dashboard',
          description: 'Dashboard created concurrently',
          widgets: [],
        }),
      ];

      const results = await Promise.all(promises);

      expect((results[0] as { success: boolean }).success).toBe(true);
      expect((results[1] as { success: boolean }).success).toBe(true);
      expect((results[2] as { _service: string })._service).toBe(
        'test-service'
      );
      expect((results[3] as { success: boolean }).success).toBe(true);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across services', async () => {
      // Create a trace
      const traceResult = await tracingService.startTrace({
        _service: 'consistency-test',
        operation: 'test-operation',
      });

      // Add logs with trace information
      await loggingService.centralizeLogs({
        logs: [
          {
            level: 'info',
            message: 'Operation started',
            _service: 'consistency-test',
            traceId: traceResult.traceId,
            spanId: traceResult.spanId,
          },
        ],
      });

      // Create dashboard referencing the service
      const dashboardResult = await dashboardsService.createDashboard({
        name: 'Consistency Dashboard',
        description: 'Dashboard for consistency test',
        widgets: [
          {
            type: 'log',
            title: 'Service Logs',
            config: { service: 'consistency-test' },
            dataSource: 'logs',
          },
        ],
      });

      // Generate report about the service
      const reportResult = await reportsService.generateReport({
        name: 'Consistency Report',
        type: 'custom',
        timeRange: '1h',
        sections: [
          {
            title: 'Service Activity',
            type: 'table',
            config: { service: 'consistency-test' },
          },
        ],
        format: 'html',
      });

      // Verify all operations succeeded
      expect(traceResult.traceId).toBeDefined();
      expect(dashboardResult.success).toBe(true);
      expect(reportResult.success).toBe(true);

      // Verify data can be retrieved consistently
      const traceDetails = await tracingService.getTraceDetails(
        traceResult.traceId
      );
      const dashboardData = await dashboardsService.getDashboard(
        dashboardResult.dashboardId
      );
      const reportData = await reportsService.getReport(reportResult.reportId);

      expect(traceDetails.trace).toBeDefined();
      expect(dashboardData.dashboard).toBeDefined();
      expect(reportData.report).toBeDefined();
    });
  });
});

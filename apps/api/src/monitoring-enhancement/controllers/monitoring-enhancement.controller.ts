import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../types/roles';
import { AlertConfigDto } from '../dto/alert-config.dto';
import { DashboardConfigDto } from '../dto/dashboard-config.dto';
import { MetricsCollectionDto } from '../dto/metrics-collection.dto';
import { NotificationConfigDto } from '../dto/notification-config.dto';
import { ReportConfigDto } from '../dto/report-config.dto';
import { TraceConfigDto } from '../dto/trace-config.dto';
import { VisualizationConfigDto } from '../dto/visualization-config.dto';
import { AlertingService } from '../services/alerting.service';
import { AutomatedReportsService } from '../services/automated-reports.service';
import { CentralizedLoggingService } from '../services/centralized-logging.service';
import { DataVisualizationService } from '../services/data-visualization.service';
import { DistributedTracingService } from '../services/distributed-tracing.service';
import { HealthChecksService } from '../services/health-checks.service';
import { InteractiveDashboardsService } from '../services/interactive-dashboards.service';
import { LocalNotificationsService } from '../services/local-notifications.service';
import { MetricsCollectionService } from '../services/metrics-collection.service';

@Controller('monitoring-enhancement')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MonitoringEnhancementController {
  constructor(
    private readonly metricsCollectionService: MetricsCollectionService,
    private readonly alertingService: AlertingService,
    private readonly centralizedLoggingService: CentralizedLoggingService,
    private readonly distributedTracingService: DistributedTracingService,
    private readonly healthChecksService: HealthChecksService,
    private readonly interactiveDashboardsService: InteractiveDashboardsService,
    private readonly automatedReportsService: AutomatedReportsService,
    private readonly dataVisualizationService: DataVisualizationService,
    private readonly localNotificationsService: LocalNotificationsService
  ) {}

  @Post('metrics/collect')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  @HttpCode(HttpStatus.OK)
  async collectMetrics(@Body() config: MetricsCollectionDto) {
    return this.metricsCollectionService.collectMetrics(config);
  }

  @Get('metrics/performance')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async getPerformanceMetrics(@Query('timeRange') timeRange?: string) {
    return this.metricsCollectionService.getPerformanceMetrics(timeRange);
  }

  @Post('alerts/configure')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  @HttpCode(HttpStatus.OK)
  async configureAlerts(@Body() alertConfig: AlertConfigDto) {
    return this.alertingService.configureAlerts(alertConfig);
  }

  @Get('alerts/status')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async getAlertStatus() {
    return this.alertingService.getAlertStatus();
  }

  @Post('logging/centralize')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  @HttpCode(HttpStatus.OK)
  async centralizeLogs(@Body() logData: Record<string, unknown>) {
    return this.centralizedLoggingService.centralizeLogs(logData);
  }

  @Get('logging/search')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async searchLogs(@Query('query') query?: string) {
    return this.centralizedLoggingService.searchLogs(query);
  }

  @Post('tracing/start')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  @HttpCode(HttpStatus.OK)
  async startTrace(@Body() traceConfig: TraceConfigDto) {
    return this.distributedTracingService.startTrace(traceConfig);
  }

  @Get('tracing/traces')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async getTraces(@Query('service') service?: string) {
    return this.distributedTracingService.getTraces(service);
  }

  @Get('health/check')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async performHealthCheck(@Query('service') service?: string) {
    return this.healthChecksService.performHealthCheck(service);
  }

  @Get('health/status')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async getHealthStatus() {
    return this.healthChecksService.getHealthStatus();
  }

  @Post('dashboards/create')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  @HttpCode(HttpStatus.OK)
  async createDashboard(@Body() dashboardConfig: DashboardConfigDto) {
    return this.interactiveDashboardsService.createDashboard(dashboardConfig);
  }

  @Get('dashboards/:id')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async getDashboard(@Param('id') id: string) {
    return this.interactiveDashboardsService.getDashboard(id);
  }

  @Post('reports/generate')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  @HttpCode(HttpStatus.OK)
  async generateReport(@Body() reportConfig: ReportConfigDto) {
    return this.automatedReportsService.generateReport(reportConfig);
  }

  @Get('reports/scheduled')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async getScheduledReports() {
    return this.automatedReportsService.getScheduledReports();
  }

  @Post('visualization/create')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  @HttpCode(HttpStatus.OK)
  async createVisualization(@Body() vizConfig: VisualizationConfigDto) {
    return this.dataVisualizationService.createVisualization(vizConfig);
  }

  @Get('visualization/charts')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async getCharts(@Query('type') type?: string) {
    return this.dataVisualizationService.getCharts(type);
  }

  @Post('notifications/send')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  @HttpCode(HttpStatus.OK)
  async sendNotification(@Body() notificationConfig: NotificationConfigDto) {
    return this.localNotificationsService.sendNotification(notificationConfig);
  }

  @Get('notifications/channels')
  @Roles(UserRole.ADMIN, UserRole.DEVOPS)
  async getNotificationChannels() {
    return this.localNotificationsService.getNotificationChannels();
  }
}

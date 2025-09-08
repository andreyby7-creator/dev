import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MetricsCollectionService } from './services/metrics-collection.service';
import { AlertingService } from './services/alerting.service';
import { CentralizedLoggingService } from './services/centralized-logging.service';
import { DistributedTracingService } from './services/distributed-tracing.service';
import { HealthChecksService } from './services/health-checks.service';
import { InteractiveDashboardsService } from './services/interactive-dashboards.service';
import { AutomatedReportsService } from './services/automated-reports.service';
import { DataVisualizationService } from './services/data-visualization.service';
import { LocalNotificationsService } from './services/local-notifications.service';
import { MonitoringEnhancementController } from './controllers/monitoring-enhancement.controller';

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'default-secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [MonitoringEnhancementController],
  providers: [
    MetricsCollectionService,
    AlertingService,
    CentralizedLoggingService,
    DistributedTracingService,
    HealthChecksService,
    InteractiveDashboardsService,
    AutomatedReportsService,
    DataVisualizationService,
    LocalNotificationsService,
  ],
  exports: [
    MetricsCollectionService,
    AlertingService,
    CentralizedLoggingService,
    DistributedTracingService,
    HealthChecksService,
    InteractiveDashboardsService,
    AutomatedReportsService,
    DataVisualizationService,
    LocalNotificationsService,
  ],
})
export class MonitoringEnhancementModule {}

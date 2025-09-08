import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TerminusModule } from '@nestjs/terminus';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MonitoringController } from './controllers/monitoring.controller';
import { UnifiedMetricsService } from './services/unified-metrics.service';
import { SelfHealingService } from './services/self-healing.service';
import { ConfigCachingService } from './services/config-caching.service';
import { UnifiedMetricsDashboardService } from './unified-metrics-dashboard.service';
import { SystemHealthCheckService } from './system-health-check.service';
import { UnifiedAlertingService } from './unified-alerting.service';

@Module({
  imports: [HttpModule, TerminusModule, EventEmitterModule],
  controllers: [MonitoringController],
  providers: [
    UnifiedMetricsService,
    SelfHealingService,
    ConfigCachingService,
    UnifiedMetricsDashboardService,
    SystemHealthCheckService,
    UnifiedAlertingService,
  ],
  exports: [
    UnifiedMetricsService,
    SelfHealingService,
    ConfigCachingService,
    UnifiedMetricsDashboardService,
    SystemHealthCheckService,
    UnifiedAlertingService,
  ],
})
export class MonitoringModule {}

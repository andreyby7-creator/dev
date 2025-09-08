import { Module } from '@nestjs/common';
import { AIObservabilityAnalyzerController } from './controllers/ai-observability-analyzer.controller';
import { DynamicScalingController } from './controllers/dynamic-scaling.controller';
import { IncidentSimulationController } from './controllers/incident-simulation.controller';
import { LoggingMiddleware } from './middleware/logging.middleware';
import { ObservabilityController } from './observability.controller';
import { ObservabilityService } from './observability.service';
import { AIObservabilityAnalyzerService } from './services/ai-observability-analyzer.service';
import { DashboardService } from './services/dashboard.service';
import { DynamicScalingService } from './services/dynamic-scaling.service';
import { ElasticsearchService } from './services/elasticsearch.service';
import { HealthService } from './services/health.service';
import { IncidentSimulationService } from './services/incident-simulation.service';
import { JaegerService } from './services/jaeger.service';
import { LoggingService } from './services/logging.service';
import { MetricsService } from './services/metrics.service';
import { TracingService } from './services/tracing.service';

@Module({
  controllers: [
    ObservabilityController,
    AIObservabilityAnalyzerController,
    IncidentSimulationController,
    DynamicScalingController,
  ],
  providers: [
    ObservabilityService,
    MetricsService,
    LoggingService,
    TracingService,
    HealthService,
    ElasticsearchService,
    DashboardService,
    JaegerService,
    AIObservabilityAnalyzerService,
    IncidentSimulationService,
    DynamicScalingService,
    LoggingMiddleware,
  ],
  exports: [
    ObservabilityService,
    MetricsService,
    LoggingService,
    TracingService,
    HealthService,
    ElasticsearchService,
    DashboardService,
    JaegerService,
    AIObservabilityAnalyzerService,
    IncidentSimulationService,
    DynamicScalingService,
    LoggingMiddleware,
  ],
})
export class ObservabilityModule {}

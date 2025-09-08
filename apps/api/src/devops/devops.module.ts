import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AutomatedFailoverController } from './controllers/automated-failover.controller';
import { DevOpsController } from './controllers/devops.controller';
import { ArtifactService } from './services/artifact.service';
import { AutomatedFailoverService } from './services/automated-failover.service';
import { DevOpsService } from './services/devops.service';
import { PipelineMonitoringService } from './services/pipeline-monitoring.service';
import { PipelineService } from './services/pipeline.service';
import { UnifiedCICDPipelineService } from './unified-cicd-pipeline.service';
import { InfrastructureOrchestrationService } from './infrastructure-orchestration.service';

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'test-secret',
      signOptions: { expiresIn: '1h' },
    }),
    EventEmitterModule,
  ],
  controllers: [AutomatedFailoverController, DevOpsController],
  providers: [
    AutomatedFailoverService,
    DevOpsService,
    PipelineService,
    ArtifactService,
    PipelineMonitoringService,
    UnifiedCICDPipelineService,
    InfrastructureOrchestrationService,
  ],
  exports: [
    AutomatedFailoverService,
    DevOpsService,
    PipelineService,
    ArtifactService,
    PipelineMonitoringService,
    UnifiedCICDPipelineService,
    InfrastructureOrchestrationService,
  ],
})
export class DevOpsModule {}

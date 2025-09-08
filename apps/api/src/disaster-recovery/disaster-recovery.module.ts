import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DisasterRecoveryService } from './services/disaster-recovery.service';
import { RegionalFailoverService } from './services/regional-failover.service';
import { NetworkResilienceService } from './services/network-resilience.service';
import { GeographicRoutingService } from './services/geographic-routing.service';
import { IncidentResponseService } from './services/incident-response.service';
import { CapacityPlanningService } from './services/capacity-planning.service';
import { A1IctServicesService } from './services/a1-ict-services.service';
import { DisasterRecoveryController } from './controllers/disaster-recovery.controller';
import { RegionalFailoverController } from './controllers/regional-failover.controller';
import { NetworkResilienceController } from './controllers/network-resilience.controller';
import { GeographicRoutingController } from './controllers/geographic-routing.controller';
import { IncidentResponseController } from './controllers/incident-response.controller';
import { CapacityPlanningController } from './controllers/capacity-planning.controller';
import { A1IctServicesController } from './controllers/a1-ict-services.controller';

@Module({
  imports: [ConfigModule],
  providers: [
    DisasterRecoveryService,
    RegionalFailoverService,
    NetworkResilienceService,
    GeographicRoutingService,
    IncidentResponseService,
    CapacityPlanningService,
    A1IctServicesService,
  ],
  controllers: [
    DisasterRecoveryController,
    RegionalFailoverController,
    NetworkResilienceController,
    GeographicRoutingController,
    IncidentResponseController,
    CapacityPlanningController,
    A1IctServicesController,
  ],
  exports: [
    DisasterRecoveryService,
    RegionalFailoverService,
    NetworkResilienceService,
    GeographicRoutingService,
    IncidentResponseService,
    CapacityPlanningService,
    A1IctServicesService,
  ],
})
export class DisasterRecoveryModule {}

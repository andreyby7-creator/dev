import { Module } from '@nestjs/common';
import { LocalDatacentersService } from './local-datacenters.service';
import { CloudHostingService } from './cloud-hosting.service';
import { CdnProvidersService } from './cdn-providers.service';
import { HybridArchitectureService } from './hybrid-architecture.service';
import { PaymentSystemsService } from './payment-systems.service';
import { RegionalArchitectureController } from './regional-architecture.controller';

@Module({
  controllers: [RegionalArchitectureController],
  providers: [
    LocalDatacentersService,
    CloudHostingService,
    CdnProvidersService,
    HybridArchitectureService,
    PaymentSystemsService,
  ],
  exports: [
    LocalDatacentersService,
    CloudHostingService,
    CdnProvidersService,
    HybridArchitectureService,
    PaymentSystemsService,
  ],
})
export class RegionalArchitectureModule {}

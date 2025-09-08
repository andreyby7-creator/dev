import { Module } from '@nestjs/common';
import { ApiVersioningService } from './api-versioning.service';
import { DdosProtectionService } from './ddos-protection.service';
import { FirewallService } from './firewall.service';
import { IdsIpsService } from './ids-ips.service';
import { NetworkMonitoringService } from './network-monitoring.service';
import { NetworkPerformanceService } from './network-performance.service';
import { NetworkSegmentationService } from './network-segmentation.service';
import { NetworkController } from './network.controller';
import { SslTlsService } from './ssl-tls.service';
import { VpnAdminService } from './vpn-admin.service';
import { ZtnaService } from './ztna.service';

@Module({
  controllers: [NetworkController],
  providers: [
    VpnAdminService,
    NetworkSegmentationService,
    DdosProtectionService,
    SslTlsService,
    ApiVersioningService,
    NetworkMonitoringService,
    FirewallService,
    NetworkPerformanceService,
    ZtnaService,
    IdsIpsService,
  ],
  exports: [
    VpnAdminService,
    NetworkSegmentationService,
    DdosProtectionService,
    SslTlsService,
    ApiVersioningService,
    NetworkMonitoringService,
    FirewallService,
    NetworkPerformanceService,
    ZtnaService,
    IdsIpsService,
  ],
})
export class NetworkModule {}

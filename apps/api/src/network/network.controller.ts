import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../types/roles';
import { ApiVersioningService } from './api-versioning.service';
import { DdosProtectionService } from './ddos-protection.service';
import { FirewallService } from './firewall.service';
import { IdsIpsService } from './ids-ips.service';
import { NetworkMonitoringService } from './network-monitoring.service';
import { NetworkPerformanceService } from './network-performance.service';
import { NetworkSegmentationService } from './network-segmentation.service';
import { SslTlsService } from './ssl-tls.service';
import { VpnAdminService } from './vpn-admin.service';
import { ZtnaService } from './ztna.service';

// Types for request bodies
interface VpnConnectionRequest {
  userId: string;
  clientIp: string;
  userAgent: string;
}

interface WhitelistRequest {
  ipAddress: string;
}

interface BlacklistRequest {
  ipAddress: string;
}

interface SecurityGroupRequest {
  name: string;
  description: string;
  vpcId: string;
  rules: Array<{
    id: string;
    name: string;
    description: string;
    direction: 'inbound' | 'outbound';
    protocol: 'tcp' | 'udp' | 'icmp' | 'all';
    portRange: string;
    source: string;
    destination: string;
    action: 'allow' | 'deny';
    priority: number;
    enabled: boolean;
    tags: Record<string, string>;
  }>;
  attachedResources: string[];
  tags: Record<string, string>;
}

interface PacketAnalysisRequest {
  sourceIp: string;
  destinationIp: string;
  protocol: string;
  port: number;
  payload: string;
  headers: Record<string, string>;
  timestamp: Date;
}

interface FirewallPacketRequest {
  sourceIp: string;
  destinationIp: string;
  protocol: string;
  port: number;
  direction: 'inbound' | 'outbound';
  securityGroupId: string;
}

interface ZtnaSessionRequest {
  userId: string;
  deviceId: string;
  applicationId: string;
  ipAddress: string;
  userAgent: string;
  location: string;
  deviceInfo: Record<string, unknown>;
  userInfo: Record<string, unknown>;
}

interface MfaVerificationRequest {
  mfaToken: string;
}

interface ApiVersionRequest {
  version: string;
  status: 'active' | 'deprecated' | 'sunset';
  releaseDate: Date;
  sunsetDate?: Date;
  features: string[];
  breakingChanges: string[];
  migrationGuide?: string;
  description?: string;
}

@ApiTags('Network Management')
@Controller('network')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NetworkController {
  constructor(
    private readonly vpnAdminService: VpnAdminService,
    private readonly networkSegmentationService: NetworkSegmentationService,
    private readonly ddosProtectionService: DdosProtectionService,
    private readonly sslTlsService: SslTlsService,
    private readonly apiVersioningService: ApiVersioningService,
    private readonly networkMonitoringService: NetworkMonitoringService,
    private readonly firewallService: FirewallService,
    private readonly networkPerformanceService: NetworkPerformanceService,
    private readonly ztnaService: ZtnaService,
    private readonly idsIpsService: IdsIpsService
  ) {}

  // VPN Admin endpoints
  @Get('vpn/health')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Check VPN health' })
  @ApiResponse({ status: 200, description: 'VPN health status' })
  async checkVpnHealth() {
    const health = await this.vpnAdminService.checkVpnHealth();
    return { health, timestamp: new Date() };
  }

  @Get('vpn/stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Get VPN statistics' })
  @ApiResponse({ status: 200, description: 'VPN statistics' })
  getVpnStats() {
    return this.vpnAdminService.getVpnStats();
  }

  @Post('vpn/connections')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create VPN connection' })
  @ApiResponse({ status: 201, description: 'VPN connection created' })
  async createVpnConnection(@Body() body: VpnConnectionRequest) {
    const connectionId = await this.vpnAdminService.createConnection(
      body.userId,
      body.clientIp,
      body.userAgent
    );
    return { connectionId, success: connectionId != null };
  }

  // Network Segmentation endpoints
  @Get('segmentation/stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Get network segmentation statistics' })
  @ApiResponse({ status: 200, description: 'Network segmentation statistics' })
  getNetworkSegmentationStats() {
    return this.networkSegmentationService.getNetworkStats();
  }

  @Get('segmentation/subnets/:subnetId/health')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Check subnet health' })
  @ApiResponse({ status: 200, description: 'Subnet health status' })
  async checkSubnetHealth(@Param('subnetId') subnetId: string) {
    const health =
      await this.networkSegmentationService.checkSubnetHealth(subnetId);
    return { health, subnetId, timestamp: new Date() };
  }

  // DDoS Protection endpoints
  @Get('ddos/stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Get DDoS protection statistics' })
  @ApiResponse({ status: 200, description: 'DDoS protection statistics' })
  getDdosStats() {
    return this.ddosProtectionService.getDdosStats();
  }

  @Post('ddos/whitelist')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add IP to whitelist' })
  @ApiResponse({ status: 201, description: 'IP added to whitelist' })
  addToWhitelist(@Body() body: WhitelistRequest) {
    const added = this.ddosProtectionService.addToWhitelist(body.ipAddress);
    return {
      success: added,
      message: added ? 'IP added to whitelist' : 'IP already in whitelist',
    };
  }

  @Post('ddos/blacklist')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add IP to blacklist' })
  @ApiResponse({ status: 201, description: 'IP added to blacklist' })
  addToBlacklist(@Body() body: BlacklistRequest) {
    const added = this.ddosProtectionService.addToBlacklist(body.ipAddress);
    return {
      success: added,
      message: added ? 'IP added to blacklist' : 'IP already in blacklist',
    };
  }

  // SSL/TLS endpoints
  @Get('ssl/stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Get SSL/TLS statistics' })
  @ApiResponse({ status: 200, description: 'SSL/TLS statistics' })
  getSslStats() {
    return this.sslTlsService.getSslStats();
  }

  @Get('ssl/certificate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Get certificate information' })
  @ApiResponse({ status: 200, description: 'Certificate information' })
  getCertificateInfo() {
    return this.sslTlsService.getCertificateInfo();
  }

  @Get('ssl/certificate/expiry')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Check certificate expiry' })
  @ApiResponse({ status: 200, description: 'Certificate expiry status' })
  checkCertificateExpiry() {
    return this.sslTlsService.checkCertificateExpiry();
  }

  @Post('ssl/certificate/renew')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Renew certificate' })
  @ApiResponse({ status: 201, description: 'Certificate renewal initiated' })
  async renewCertificate() {
    const success = await this.sslTlsService.renewCertificate();
    return {
      success,
      message: success
        ? 'Certificate renewal initiated'
        : 'Certificate renewal failed',
    };
  }

  // API Versioning endpoints
  @Get('api/versions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Get API versioning statistics' })
  @ApiResponse({ status: 200, description: 'API versioning statistics' })
  getApiVersioningStats() {
    return this.apiVersioningService.getVersioningStats();
  }

  @Get('api/versions/:version/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Get version status' })
  @ApiResponse({ status: 200, description: 'Version status' })
  getVersionStatus(@Param('version') version: string) {
    return this.apiVersioningService.getVersionStatus(version);
  }

  @Post('api/versions')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add new API version' })
  @ApiResponse({ status: 201, description: 'New API version added' })
  addApiVersion(@Body() version: ApiVersionRequest) {
    this.apiVersioningService.addVersion(version);
    return { success: true, message: 'New API version added' };
  }

  @Put('api/versions/:version/deprecate')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Deprecate API version' })
  @ApiResponse({ status: 200, description: 'API version deprecated' })
  deprecateApiVersion(
    @Param('version') version: string,
    @Body() body: { sunsetDate: string }
  ) {
    const sunsetDate = new Date(body.sunsetDate);
    this.apiVersioningService.deprecateVersion(version, sunsetDate);
    return { success: true, message: 'API version deprecated' };
  }

  // Network Monitoring endpoints
  @Get('monitoring/stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Get network monitoring statistics' })
  @ApiResponse({ status: 200, description: 'Network monitoring statistics' })
  getNetworkMonitoringStats() {
    return this.networkMonitoringService.getMonitoringStats();
  }

  @Post('monitoring/metrics/collect')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Collect network metrics' })
  @ApiResponse({ status: 201, description: 'Network metrics collected' })
  async collectMetrics() {
    const metrics = await this.networkMonitoringService.collectMetrics();
    return { metrics, timestamp: new Date() };
  }

  @Get('monitoring/alerts')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Get active network alerts' })
  @ApiResponse({ status: 200, description: 'Active network alerts' })
  getActiveAlerts() {
    return this.networkMonitoringService.getActiveAlerts();
  }

  @Post('monitoring/alerts/:alertId/resolve')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Resolve network alert' })
  @ApiResponse({ status: 200, description: 'Alert resolved' })
  resolveAlert(@Param('alertId') alertId: string) {
    const resolved = this.networkMonitoringService.resolveAlert(alertId);
    return {
      success: resolved,
      message: resolved ? 'Alert resolved' : 'Alert not found',
    };
  }

  // Firewall endpoints
  @Get('firewall/stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Get firewall statistics' })
  @ApiResponse({ status: 200, description: 'Firewall statistics' })
  getFirewallStats() {
    return this.firewallService.getFirewallStats();
  }

  @Post('firewall/packet/check')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Check packet through firewall' })
  @ApiResponse({ status: 200, description: 'Packet check result' })
  async checkPacket(@Body() packet: FirewallPacketRequest) {
    const result = await this.firewallService.checkPacket(packet);
    return result;
  }

  @Post('firewall/security-groups')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create security group' })
  @ApiResponse({ status: 201, description: 'Security group created' })
  createSecurityGroup(@Body() group: SecurityGroupRequest) {
    const groupId = this.firewallService.createSecurityGroup(group);
    return { groupId, success: true };
  }

  @Get('firewall/blocked-ips')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Get blocked IP addresses from firewall' })
  @ApiResponse({
    status: 200,
    description: 'Blocked IP addresses from firewall',
  })
  getFirewallBlockedIps() {
    return this.firewallService.getEventsByAction('deny');
  }

  // Network Performance endpoints
  @Get('performance/stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Get network performance statistics' })
  @ApiResponse({ status: 200, description: 'Network performance statistics' })
  getPerformanceStats() {
    return this.networkPerformanceService.getPerformanceStats();
  }

  @Post('performance/metrics/collect')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Collect performance metrics' })
  @ApiResponse({ status: 201, description: 'Performance metrics collected' })
  async collectPerformanceMetrics() {
    const metrics =
      await this.networkPerformanceService.collectPerformanceMetrics();
    return { metrics, timestamp: new Date() };
  }

  @Get('performance/recommendations')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Get performance optimization recommendations' })
  @ApiResponse({ status: 200, description: 'Performance recommendations' })
  getOptimizationRecommendations() {
    return this.networkPerformanceService.getOptimizationRecommendations();
  }

  @Get('performance/trends')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Get performance trends' })
  @ApiResponse({ status: 200, description: 'Performance trends' })
  getPerformanceTrends() {
    return this.networkPerformanceService.getPerformanceTrends();
  }

  // ZTNA endpoints
  @Get('ztna/stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Get ZTNA statistics' })
  @ApiResponse({ status: 200, description: 'ZTNA statistics' })
  getZtnaStats() {
    return this.ztnaService.getZtnaStats();
  }

  @Post('ztna/sessions')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create ZTNA session' })
  @ApiResponse({ status: 201, description: 'ZTNA session created' })
  async createZtnaSession(@Body() sessionData: ZtnaSessionRequest) {
    const result = await this.ztnaService.createSession(sessionData);
    return result;
  }

  @Post('ztna/sessions/:sessionId/verify-mfa')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Verify MFA for ZTNA session' })
  @ApiResponse({ status: 200, description: 'MFA verification result' })
  verifyMfa(
    @Param('sessionId') sessionId: string,
    @Body() body: MfaVerificationRequest
  ) {
    const verified = this.ztnaService.verifyMfa(sessionId, body.mfaToken);
    return {
      success: verified,
      message: verified ? 'MFA verified' : 'MFA verification failed',
    };
  }

  @Delete('ztna/sessions/:sessionId')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'End ZTNA session' })
  @ApiResponse({ status: 200, description: 'ZTNA session ended' })
  endZtnaSession(@Param('sessionId') sessionId: string) {
    const ended = this.ztnaService.endSession(sessionId);
    return {
      success: ended,
      message: ended ? 'Session ended' : 'Session not found',
    };
  }

  @Get('ztna/sessions/active')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Get active ZTNA sessions' })
  @ApiResponse({ status: 200, description: 'Active ZTNA sessions' })
  getActiveZtnaSessions() {
    return this.ztnaService.getActiveSessions();
  }

  // IDS/IPS endpoints
  @Get('ids-ips/stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Get IDS/IPS statistics' })
  @ApiResponse({ status: 200, description: 'IDS/IPS statistics' })
  getIdsStats() {
    return this.idsIpsService.getIdsStats();
  }

  @Post('ids-ips/packet/analyze')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Analyze packet for threats' })
  @ApiResponse({ status: 200, description: 'Packet analysis result' })
  async analyzePacket(@Body() packet: PacketAnalysisRequest) {
    const result = await this.idsIpsService.analyzePacket(packet);
    return result;
  }

  @Get('ids-ips/alerts/recent')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Get recent IDS/IPS alerts' })
  @ApiResponse({ status: 200, description: 'Recent IDS/IPS alerts' })
  getRecentAlerts(@Query('limit') limit: number = 10) {
    return this.idsIpsService.getRecentAlerts(limit);
  }

  @Get('ids-ips/alerts/critical')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Get critical IDS/IPS alerts' })
  @ApiResponse({ status: 200, description: 'Critical IDS/IPS alerts' })
  getCriticalAlerts() {
    return this.idsIpsService.getCriticalAlerts();
  }

  @Get('ids-ips/blocked-ips')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Get blocked IP addresses from IDS/IPS' })
  @ApiResponse({
    status: 200,
    description: 'Blocked IP addresses from IDS/IPS',
  })
  getIdsBlockedIps() {
    return this.idsIpsService.getBlockedIps();
  }

  @Post('ids-ips/blocked-ips/:ip/unblock')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Unblock IP address' })
  @ApiResponse({ status: 200, description: 'IP unblocked' })
  unblockIp(@Param('ip') ip: string) {
    const unblocked = this.idsIpsService.unblockIp(ip);
    return {
      success: unblocked,
      message: unblocked ? 'IP unblocked' : 'IP not found',
    };
  }

  @Post('ids-ips/alerts/:alertId/false-positive')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Mark alert as false positive' })
  @ApiResponse({ status: 200, description: 'Alert marked as false positive' })
  markAsFalsePositive(@Param('alertId') alertId: string) {
    const marked = this.idsIpsService.markAsFalsePositive(alertId);
    return {
      success: marked,
      message: marked ? 'Alert marked as false positive' : 'Alert not found',
    };
  }

  @Get('ids-ips/recommendations')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Get IDS/IPS configuration recommendations' })
  @ApiResponse({ status: 200, description: 'Configuration recommendations' })
  getConfigurationRecommendations() {
    return this.idsIpsService.getConfigurationRecommendations();
  }

  // Combined network health check
  @Get('health')
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  @ApiOperation({ summary: 'Get overall network health' })
  @ApiResponse({ status: 200, description: 'Overall network health status' })
  async getNetworkHealth() {
    const [
      vpnHealth,
      sslCertificateExpiry,
      ddosStats,
      networkStats,
      apiVersioningStats,
      monitoringStats,
      firewallStats,
      performanceStats,
      ztnaStats,
      idsStats,
    ] = await Promise.all([
      this.vpnAdminService.checkVpnHealth(),
      this.sslTlsService.checkCertificateExpiry(),
      this.ddosProtectionService.getDdosStats(),
      this.networkSegmentationService.getNetworkStats(),
      this.apiVersioningService.getVersioningStats(),
      this.networkMonitoringService.getMonitoringStats(),
      this.firewallService.getFirewallStats(),
      this.networkPerformanceService.getPerformanceStats(),
      this.ztnaService.getZtnaStats(),
      this.idsIpsService.getIdsStats(),
    ]);

    const overallHealth = vpnHealth && sslCertificateExpiry.valid;

    return {
      overallHealth,
      timestamp: new Date(),
      services: {
        vpn: { health: vpnHealth },
        ssl: { certificateExpiry: sslCertificateExpiry },
        ddos: { stats: ddosStats },
        network: { stats: networkStats },
        apiVersioning: { stats: apiVersioningStats },
        monitoring: { stats: monitoringStats },
        firewall: { stats: firewallStats },
        performance: { stats: performanceStats },
        ztna: { stats: ztnaStats },
        idsIps: { stats: idsStats },
      },
    };
  }
}

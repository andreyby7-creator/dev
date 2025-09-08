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
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../types/roles';
import { CertificateService } from './certificate.service';
import { ComplianceService } from './compliance.service';
import { IncidentResponseService } from './incident-response.service';
import { JwtSecurityService } from './jwt-security.service';
import { SecretsService } from './secrets.service';
import { SecurityIntegrationService } from './security-integration.service';
import { VulnerabilityService } from './vulnerability.service';
import { WafService } from './waf.service';

@ApiTags('Security')
@ApiBearerAuth()
@Controller('api/v1/security')
@UseGuards(RolesGuard)
export class SecurityController {
  constructor(
    private readonly wafService: WafService,
    private readonly secretsService: SecretsService,
    private readonly certificateService: CertificateService,
    private readonly vulnerabilityService: VulnerabilityService,
    private readonly incidentResponseService: IncidentResponseService,
    private readonly securityIntegrationService: SecurityIntegrationService,
    private readonly jwtSecurityService: JwtSecurityService,
    private readonly complianceService: ComplianceService
  ) {}

  // ==================== WAF Endpoints ====================

  @Get('waf/health')
  @ApiOperation({ summary: 'WAF Health Check' })
  @ApiResponse({ status: 200, description: 'WAF health status' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async getWafHealth() {
    return this.wafService.healthCheck();
  }

  @Get('waf/config')
  @ApiOperation({ summary: 'Get WAF Configuration' })
  @ApiResponse({ status: 200, description: 'WAF configuration' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async getWafConfig() {
    return this.wafService.getWafConfig();
  }

  @Put('waf/config')
  @ApiOperation({ summary: 'Update WAF Configuration' })
  @ApiResponse({ status: 200, description: 'WAF configuration updated' })
  @Roles(UserRole.SUPER_ADMIN)
  async updateWafConfig(@Body() config: Record<string, unknown>) {
    return this.wafService.updateWafConfig(config);
  }

  @Get('waf/rules')
  @ApiOperation({ summary: 'Get All WAF Rules' })
  @ApiResponse({ status: 200, description: 'List of WAF rules' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async getAllWafRules() {
    return this.wafService.getAllRules();
  }

  @Post('waf/rules')
  @ApiOperation({ summary: 'Create WAF Rule' })
  @ApiResponse({ status: 201, description: 'WAF rule created' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async createWafRule(@Body() ruleData: Record<string, unknown>) {
    return this.wafService.createRule(ruleData);
  }

  @Get('waf/stats')
  @ApiOperation({ summary: 'Get WAF Statistics' })
  @ApiResponse({ status: 200, description: 'WAF statistics' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async getWafStats() {
    return this.wafService.getWafStats();
  }

  @Get('waf/events')
  @ApiOperation({ summary: 'Get WAF Events' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'WAF events' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async getWafEvents(@Query('limit') limit = 100) {
    return this.wafService.getEvents(limit);
  }

  // ==================== Secrets Management Endpoints ====================

  @Get('secrets/health')
  @ApiOperation({ summary: 'Secrets Service Health Check' })
  @ApiResponse({ status: 200, description: 'Secrets service health status' })
  @Roles(UserRole.SUPER_ADMIN)
  async getSecretsHealth() {
    return this.secretsService.healthCheck();
  }

  @Get('secrets')
  @ApiOperation({ summary: 'Get All Secrets' })
  @ApiResponse({
    status: 200,
    description: 'List of secrets (values redacted)',
  })
  @Roles(UserRole.SUPER_ADMIN)
  async getAllSecrets() {
    return this.secretsService.getAllSecrets('system', 'super_admin');
  }

  @Post('secrets')
  @ApiOperation({ summary: 'Create Secret' })
  @ApiResponse({ status: 201, description: 'Secret created' })
  @Roles(UserRole.SUPER_ADMIN)
  async createSecret(@Body() secretData: Record<string, unknown>) {
    return this.secretsService.createSecret(secretData);
  }

  @Get('secrets/:id')
  @ApiOperation({ summary: 'Get Secret by ID' })
  @ApiParam({ name: 'id', description: 'Secret ID' })
  @ApiResponse({ status: 200, description: 'Secret details' })
  @Roles(UserRole.SUPER_ADMIN)
  async getSecretById(@Param('id') id: string) {
    return this.secretsService.getSecretById(id, 'system', 'super_admin');
  }

  @Put('secrets/:id')
  @ApiOperation({ summary: 'Update Secret' })
  @ApiParam({ name: 'id', description: 'Secret ID' })
  @ApiResponse({ status: 200, description: 'Secret updated' })
  @Roles(UserRole.SUPER_ADMIN)
  async updateSecret(
    @Param('id') id: string,
    @Body() updates: Record<string, unknown>
  ) {
    return this.secretsService.updateSecret(
      id,
      updates,
      'system',
      'super_admin'
    );
  }

  @Delete('secrets/:id')
  @ApiOperation({ summary: 'Delete Secret' })
  @ApiParam({ name: 'id', description: 'Secret ID' })
  @ApiResponse({ status: 200, description: 'Secret deleted' })
  @Roles(UserRole.SUPER_ADMIN)
  async deleteSecret(@Param('id') id: string) {
    return this.secretsService.deleteSecret(id, 'system', 'super_admin');
  }

  @Get('secrets/stats')
  @ApiOperation({ summary: 'Get Secrets Statistics' })
  @ApiResponse({ status: 200, description: 'Secrets statistics' })
  @Roles(UserRole.SUPER_ADMIN)
  async getSecretsStats() {
    return this.secretsService.getSecretsStats();
  }

  @Post('secrets/:id/rotate')
  @ApiOperation({ summary: 'Rotate Secret' })
  @ApiParam({ name: 'id', description: 'Secret ID' })
  @ApiResponse({ status: 200, description: 'Secret rotated' })
  @Roles(UserRole.SUPER_ADMIN)
  async rotateSecret(@Param('id') id: string) {
    return this.secretsService.rotateSecret(id, 'system');
  }

  // ==================== Certificate Management Endpoints ====================

  @Get('certificates/health')
  @ApiOperation({ summary: 'Certificate Service Health Check' })
  @ApiResponse({
    status: 200,
    description: 'Certificate service health status',
  })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async getCertificateHealth() {
    return this.certificateService.healthCheck();
  }

  @Get('certificates')
  @ApiOperation({ summary: 'Get All Certificates' })
  @ApiResponse({ status: 200, description: 'List of certificates' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async getAllCertificates() {
    return this.certificateService.getAllCertificates();
  }

  @Post('certificates')
  @ApiOperation({ summary: 'Create Certificate' })
  @ApiResponse({ status: 201, description: 'Certificate created' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async createCertificate(@Body() certData: unknown) {
    return this.certificateService.createCertificate(certData);
  }

  @Get('certificates/:id')
  @ApiOperation({ summary: 'Get Certificate by ID' })
  @ApiParam({ name: 'id', description: 'Certificate ID' })
  @ApiResponse({ status: 200, description: 'Certificate details' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async getCertificateById(@Param('id') id: string) {
    return this.certificateService.getCertificateById(id);
  }

  @Put('certificates/:id')
  @ApiOperation({ summary: 'Update Certificate' })
  @ApiParam({ name: 'id', description: 'Certificate ID' })
  @ApiResponse({ status: 200, description: 'Certificate updated' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async updateCertificate(
    @Param('id') id: string,
    @Body() updates: Record<string, unknown>
  ) {
    return this.certificateService.updateCertificate(id, updates);
  }

  @Post('certificates/:id/renew')
  @ApiOperation({ summary: 'Renew Certificate' })
  @ApiParam({ name: 'id', description: 'Certificate ID' })
  @ApiResponse({ status: 200, description: 'Certificate renewed' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async renewCertificate(@Param('id') id: string) {
    return this.certificateService.renewCertificate(id);
  }

  @Post('certificates/:id/revoke')
  @ApiOperation({ summary: 'Revoke Certificate' })
  @ApiParam({ name: 'id', description: 'Certificate ID' })
  @ApiResponse({ status: 200, description: 'Certificate revoked' })
  @Roles(UserRole.SUPER_ADMIN)
  async revokeCertificate(
    @Param('id') id: string,
    @Body() data: { reason?: string }
  ) {
    return this.certificateService.revokeCertificate(id, data.reason);
  }

  @Get('certificates/stats')
  @ApiOperation({ summary: 'Get Certificate Statistics' })
  @ApiResponse({ status: 200, description: 'Certificate statistics' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async getCertificateStats() {
    return this.certificateService.getCertificateStats();
  }

  @Get('certificates/expiring')
  @ApiOperation({ summary: 'Get Expiring Certificates' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Expiring certificates' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async getExpiringCertificates(@Query('days') days = 30) {
    return this.certificateService.getExpiringCertificates(days);
  }

  // ==================== Vulnerability Assessment Endpoints ====================

  @Get('vulnerabilities/health')
  @ApiOperation({ summary: 'Vulnerability Service Health Check' })
  @ApiResponse({
    status: 200,
    description: 'Vulnerability service health status',
  })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async getVulnerabilityHealth() {
    return this.vulnerabilityService.healthCheck();
  }

  @Get('vulnerabilities')
  @ApiOperation({ summary: 'Get All Vulnerabilities' })
  @ApiResponse({ status: 200, description: 'List of vulnerabilities' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async getAllVulnerabilities() {
    return this.vulnerabilityService.getAllVulnerabilities();
  }

  @Get('vulnerabilities/open')
  @ApiOperation({ summary: 'Get Open Vulnerabilities' })
  @ApiResponse({ status: 200, description: 'List of open vulnerabilities' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async getOpenVulnerabilities() {
    return this.vulnerabilityService.getOpenVulnerabilities();
  }

  @Post('vulnerabilities')
  @ApiOperation({ summary: 'Create Vulnerability' })
  @ApiResponse({ status: 201, description: 'Vulnerability created' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async createVulnerability(@Body() vulnData: Record<string, unknown>) {
    return this.vulnerabilityService.createVulnerability(vulnData);
  }

  @Get('vulnerabilities/:id')
  @ApiOperation({ summary: 'Get Vulnerability by ID' })
  @ApiParam({ name: 'id', description: 'Vulnerability ID' })
  @ApiResponse({ status: 200, description: 'Vulnerability details' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async getVulnerabilityById(@Param('id') id: string) {
    return this.vulnerabilityService.getVulnerabilityById(id);
  }

  @Put('vulnerabilities/:id')
  @ApiOperation({ summary: 'Update Vulnerability' })
  @ApiParam({ name: 'id', description: 'Vulnerability ID' })
  @ApiResponse({ status: 200, description: 'Vulnerability updated' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async updateVulnerability(
    @Param('id') id: string,
    @Body() updates: Record<string, unknown>
  ) {
    return this.vulnerabilityService.updateVulnerability(id, updates);
  }

  @Post('vulnerabilities/:id/fix')
  @ApiOperation({ summary: 'Mark Vulnerability as Fixed' })
  @ApiParam({ name: 'id', description: 'Vulnerability ID' })
  @ApiResponse({ status: 200, description: 'Vulnerability marked as fixed' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async markVulnerabilityAsFixed(
    @Param('id') id: string,
    @Body() data: { fixedVersion: string; assignedTo: string }
  ) {
    return this.vulnerabilityService.markVulnerabilityAsFixed(
      id,
      data.fixedVersion,
      data.assignedTo
    );
  }

  @Get('vulnerabilities/stats')
  @ApiOperation({ summary: 'Get Vulnerability Statistics' })
  @ApiResponse({ status: 200, description: 'Vulnerability statistics' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async getVulnerabilityStats() {
    return this.vulnerabilityService.getVulnerabilityStats();
  }

  @Post('scans')
  @ApiOperation({ summary: 'Start Security Scan' })
  @ApiResponse({ status: 201, description: 'Security scan started' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async startSecurityScan(
    @Body()
    scanData: {
      name: string;
      type:
        | 'dependency'
        | 'container'
        | 'infrastructure'
        | 'application'
        | 'network';
      target: string;
      config?: Record<string, unknown>;
    }
  ) {
    return this.vulnerabilityService.startSecurityScan(scanData);
  }

  @Get('scans')
  @ApiOperation({ summary: 'Get All Security Scans' })
  @ApiResponse({ status: 200, description: 'List of security scans' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async getAllScans() {
    return this.vulnerabilityService.getAllScans();
  }

  @Get('scans/:id')
  @ApiOperation({ summary: 'Get Security Scan by ID' })
  @ApiParam({ name: 'id', description: 'Scan ID' })
  @ApiResponse({ status: 200, description: 'Security scan details' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async getScanById(@Param('id') id: string) {
    return this.vulnerabilityService.getScanById(id);
  }

  @Post('scans/:id/cancel')
  @ApiOperation({ summary: 'Cancel Security Scan' })
  @ApiParam({ name: 'id', description: 'Scan ID' })
  @ApiResponse({ status: 200, description: 'Security scan cancelled' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async cancelScan(@Param('id') id: string) {
    return this.vulnerabilityService.cancelScan(id);
  }

  // ==================== Incident Response Endpoints ====================

  @Get('incidents/health')
  @ApiOperation({ summary: 'Incident Response Service Health Check' })
  @ApiResponse({
    status: 200,
    description: 'Incident response service health status',
  })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async getIncidentHealth() {
    return this.incidentResponseService.healthCheck();
  }

  @Get('incidents')
  @ApiOperation({ summary: 'Get All Incidents' })
  @ApiResponse({ status: 200, description: 'List of security incidents' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async getAllIncidents() {
    return this.incidentResponseService.getAllIncidents();
  }

  @Get('incidents/open')
  @ApiOperation({ summary: 'Get Open Incidents' })
  @ApiResponse({ status: 200, description: 'List of open incidents' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async getOpenIncidents() {
    return this.incidentResponseService.getOpenIncidents();
  }

  @Post('incidents')
  @ApiOperation({ summary: 'Create Security Incident' })
  @ApiResponse({ status: 201, description: 'Security incident created' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async createIncident(@Body() incidentData: Record<string, unknown>) {
    return this.incidentResponseService.createIncident(incidentData);
  }

  @Get('incidents/:id')
  @ApiOperation({ summary: 'Get Incident by ID' })
  @ApiParam({ name: 'id', description: 'Incident ID' })
  @ApiResponse({ status: 200, description: 'Incident details' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async getIncidentById(@Param('id') id: string) {
    return this.incidentResponseService.getIncidentById(id);
  }

  @Put('incidents/:id')
  @ApiOperation({ summary: 'Update Incident' })
  @ApiParam({ name: 'id', description: 'Incident ID' })
  @ApiResponse({ status: 200, description: 'Incident updated' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async updateIncident(
    @Param('id') id: string,
    @Body() updates: Record<string, unknown>
  ) {
    return this.incidentResponseService.updateIncident(id, updates);
  }

  @Post('incidents/:id/assign')
  @ApiOperation({ summary: 'Assign Incident' })
  @ApiParam({ name: 'id', description: 'Incident ID' })
  @ApiResponse({ status: 200, description: 'Incident assigned' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async assignIncident(
    @Param('id') id: string,
    @Body() data: { assignedTo: string }
  ) {
    return this.incidentResponseService.assignIncident(id, data.assignedTo);
  }

  @Post('incidents/:id/status')
  @ApiOperation({ summary: 'Update Incident Status' })
  @ApiParam({ name: 'id', description: 'Incident ID' })
  @ApiResponse({ status: 200, description: 'Incident status updated' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async updateIncidentStatus(
    @Param('id') id: string,
    @Body()
    data: {
      status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
      actor: string;
      details?: string;
    }
  ) {
    return this.incidentResponseService.updateIncidentStatus(
      id,
      data.status,
      data.actor,
      data.details
    );
  }

  @Post('incidents/:id/responses')
  @ApiOperation({ summary: 'Add Response to Incident' })
  @ApiParam({ name: 'id', description: 'Incident ID' })
  @ApiResponse({ status: 201, description: 'Response added to incident' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async addResponse(
    @Param('id') id: string,
    @Body()
    data: {
      responseType:
        | 'containment'
        | 'eradication'
        | 'recovery'
        | 'lessons_learned';
      action: string;
      description: string;
      executedBy: string;
    }
  ) {
    return this.incidentResponseService.addResponse(id, data);
  }

  @Get('incidents/:id/responses')
  @ApiOperation({ summary: 'Get Responses for Incident' })
  @ApiParam({ name: 'id', description: 'Incident ID' })
  @ApiResponse({ status: 200, description: 'Incident responses' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async getResponsesForIncident(@Param('id') id: string) {
    return this.incidentResponseService.getResponsesForIncident(id);
  }

  @Get('incidents/stats')
  @ApiOperation({ summary: 'Get Incident Statistics' })
  @ApiResponse({ status: 200, description: 'Incident statistics' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async getIncidentStats() {
    return this.incidentResponseService.getIncidentStats();
  }

  @Get('incidents/metrics')
  @ApiOperation({ summary: 'Get Incident Metrics' })
  @ApiResponse({ status: 200, description: 'Incident metrics' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async getIncidentMetrics() {
    return this.incidentResponseService.getIncidentMetrics();
  }

  // ==================== Security Integration Endpoints ====================

  @Get('integration/health')
  @ApiOperation({ summary: 'Security Integration Health Check' })
  @ApiResponse({
    status: 200,
    description: 'Security integration health status',
  })
  @Roles(UserRole.SUPER_ADMIN)
  async getIntegrationHealth() {
    return this.securityIntegrationService.healthCheck();
  }

  @Get('integration/config')
  @ApiOperation({ summary: 'Get Security Integration Configuration' })
  @ApiResponse({
    status: 200,
    description: 'Security integration configuration',
  })
  @Roles(UserRole.SUPER_ADMIN)
  async getIntegrationConfig() {
    return this.securityIntegrationService.getConfig();
  }

  @Put('integration/config')
  @ApiOperation({ summary: 'Update Security Integration Configuration' })
  @ApiResponse({
    status: 200,
    description: 'Security integration configuration updated',
  })
  @Roles(UserRole.SUPER_ADMIN)
  async updateIntegrationConfig(@Body() config: Record<string, unknown>) {
    return this.securityIntegrationService.updateConfig(config);
  }

  @Get('integration/events')
  @ApiOperation({ summary: 'Get Security Integration Events' })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'source', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Security integration events' })
  @Roles(UserRole.SUPER_ADMIN)
  async getIntegrationEvents(
    @Query('severity') severity?: string,
    @Query('source') source?: string,
    @Query('limit') limit?: number
  ) {
    const params: {
      severity?: 'low' | 'medium' | 'high' | 'critical';
      source?:
        | 'secrets'
        | 'certificates'
        | 'waf'
        | 'vulnerability'
        | 'incident';
      limit?: number;
    } = {};

    if (severity != null && severity !== '')
      params.severity = severity as 'low' | 'medium' | 'high' | 'critical';
    if (source != null && source !== '')
      params.source = source as
        | 'secrets'
        | 'certificates'
        | 'waf'
        | 'vulnerability'
        | 'incident';
    if (limit != null && limit > 0) params.limit = limit;

    return this.securityIntegrationService.getEvents(params);
  }

  @Get('integration/metrics')
  @ApiOperation({ summary: 'Get Security Integration Metrics' })
  @ApiResponse({ status: 200, description: 'Security integration metrics' })
  @Roles(UserRole.SUPER_ADMIN)
  async getIntegrationMetrics() {
    return this.securityIntegrationService.getMetrics();
  }

  @Get('integration/stats')
  @ApiOperation({ summary: 'Get Security Integration Statistics' })
  @ApiResponse({ status: 200, description: 'Security integration statistics' })
  @Roles(UserRole.SUPER_ADMIN)
  async getIntegrationStats() {
    return this.securityIntegrationService.getStats();
  }

  // ==================== JWT Security Endpoints ====================

  @Get('jwt/health')
  @ApiOperation({ summary: 'JWT Security Health Check' })
  @ApiResponse({ status: 200, description: 'JWT security health status' })
  @Roles(UserRole.SUPER_ADMIN)
  async getJwtHealth() {
    return this.jwtSecurityService.healthCheck();
  }

  @Get('jwt/config')
  @ApiOperation({ summary: 'Get JWT Security Configuration' })
  @ApiResponse({ status: 200, description: 'JWT security configuration' })
  @Roles(UserRole.SUPER_ADMIN)
  async getJwtConfig() {
    return this.jwtSecurityService.getConfig();
  }

  @Put('jwt/config')
  @ApiOperation({ summary: 'Update JWT Security Configuration' })
  @ApiResponse({
    status: 200,
    description: 'JWT security configuration updated',
  })
  @Roles(UserRole.SUPER_ADMIN)
  async updateJwtConfig(@Body() config: Record<string, unknown>) {
    return this.jwtSecurityService.updateConfig(config);
  }

  @Post('jwt/tokens')
  @ApiOperation({ summary: 'Create JWT Token' })
  @ApiResponse({ status: 201, description: 'JWT token created' })
  @Roles(UserRole.SUPER_ADMIN)
  async createJwtToken(
    @Body()
    tokenData: {
      userId: string;
      tokenType: 'access' | 'refresh';
      deviceInfo?: {
        userAgent: string;
        ipAddress: string;
        deviceId?: string;
      };
    }
  ) {
    return this.jwtSecurityService.createToken(
      tokenData.userId,
      tokenData.tokenType,
      tokenData.deviceInfo
    );
  }

  @Post('jwt/tokens/refresh')
  @ApiOperation({ summary: 'Refresh JWT Token' })
  @ApiResponse({ status: 200, description: 'JWT token refreshed' })
  @Roles(UserRole.SUPER_ADMIN)
  async refreshJwtToken(
    @Body() data: { refreshTokenId: string; userId: string }
  ) {
    return this.jwtSecurityService.refreshToken(
      data.refreshTokenId,
      data.userId
    );
  }

  @Post('jwt/tokens/:id/revoke')
  @ApiOperation({ summary: 'Revoke JWT Token' })
  @ApiParam({ name: 'id', description: 'Token ID' })
  @ApiResponse({ status: 200, description: 'JWT token revoked' })
  @Roles(UserRole.SUPER_ADMIN)
  async revokeJwtToken(
    @Param('id') id: string,
    @Body() data: { reason?: string }
  ) {
    return this.jwtSecurityService.revokeToken(id, data.reason);
  }

  @Post('jwt/tokens/validate')
  @ApiOperation({ summary: 'Validate JWT Token' })
  @ApiResponse({ status: 200, description: 'JWT token validation result' })
  @Roles(UserRole.SUPER_ADMIN)
  async validateJwtToken(@Body() data: { tokenId: string; userId: string }) {
    return {
      valid: this.jwtSecurityService.validateToken(data.tokenId, data.userId),
    };
  }

  @Post('jwt/rate-limit/check')
  @ApiOperation({ summary: 'Check Rate Limit' })
  @ApiResponse({ status: 200, description: 'Rate limit check result' })
  @Roles(UserRole.SUPER_ADMIN)
  async checkRateLimit(@Body() data: { identifier: string }) {
    return this.jwtSecurityService.checkRateLimit(data.identifier);
  }

  @Get('jwt/stats')
  @ApiOperation({ summary: 'Get JWT Security Statistics' })
  @ApiResponse({ status: 200, description: 'JWT security statistics' })
  @Roles(UserRole.SUPER_ADMIN)
  async getJwtStats() {
    return this.jwtSecurityService.getStats();
  }

  @Get('jwt/events')
  @ApiOperation({ summary: 'Get JWT Security Events' })
  @ApiQuery({ name: 'eventType', required: false })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'JWT security events' })
  @Roles(UserRole.SUPER_ADMIN)
  async getJwtEvents(
    @Query('eventType') eventType?: string,
    @Query('severity') severity?: string,
    @Query('userId') userId?: string,
    @Query('limit') limit?: number
  ) {
    const params: {
      eventType?:
        | 'token_issued'
        | 'token_refreshed'
        | 'token_revoked'
        | 'token_expired'
        | 'suspicious_activity'
        | 'rate_limit_exceeded';
      severity?: 'low' | 'medium' | 'high' | 'critical';
      userId?: string;
      limit?: number;
    } = {};

    if (eventType != null && eventType !== '')
      params.eventType = eventType as
        | 'token_issued'
        | 'token_refreshed'
        | 'token_revoked'
        | 'token_expired'
        | 'suspicious_activity'
        | 'rate_limit_exceeded';
    if (severity != null && severity !== '')
      params.severity = severity as 'low' | 'medium' | 'high' | 'critical';
    if (userId != null && userId !== '') params.userId = userId;
    if (limit != null && limit > 0) params.limit = limit;

    return this.jwtSecurityService.getEvents(params);
  }

  // ==================== Compliance Endpoints ====================

  @Get('compliance/health')
  @ApiOperation({ summary: 'Compliance Service Health Check' })
  @ApiResponse({ status: 200, description: 'Compliance service health status' })
  @Roles(UserRole.SUPER_ADMIN)
  async getComplianceHealth() {
    return this.complianceService.healthCheck();
  }

  @Get('compliance/config')
  @ApiOperation({ summary: 'Get Compliance Configuration' })
  @ApiResponse({ status: 200, description: 'Compliance configuration' })
  @Roles(UserRole.SUPER_ADMIN)
  async getComplianceConfig() {
    return this.complianceService.getConfig();
  }

  @Put('compliance/config')
  @ApiOperation({ summary: 'Update Compliance Configuration' })
  @ApiResponse({ status: 200, description: 'Compliance configuration updated' })
  @Roles(UserRole.SUPER_ADMIN)
  async updateComplianceConfig(@Body() config: Record<string, unknown>) {
    return this.complianceService.updateConfig(config);
  }

  @Get('compliance/requirements')
  @ApiOperation({ summary: 'Get Compliance Requirements' })
  @ApiQuery({ name: 'standard', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, description: 'Compliance requirements' })
  @Roles(UserRole.SUPER_ADMIN)
  async getComplianceRequirements(
    @Query('standard') standard?: string,
    @Query('status') status?: string
  ) {
    const params: {
      standard?: 'GDPR' | 'PCI_DSS' | 'SOX' | 'HIPAA' | 'ISO_27001' | 'SOC_2';
      status?: 'in_progress' | 'compliant' | 'non_compliant' | 'not_applicable';
    } = {};

    if (standard != null && standard !== '')
      params.standard = standard as
        | 'GDPR'
        | 'PCI_DSS'
        | 'SOX'
        | 'HIPAA'
        | 'ISO_27001'
        | 'SOC_2';
    if (status != null && status !== '')
      params.status = status as
        | 'in_progress'
        | 'compliant'
        | 'non_compliant'
        | 'not_applicable';

    return this.complianceService.getRequirements(params);
  }

  @Post('compliance/requirements')
  @ApiOperation({ summary: 'Add Compliance Requirement' })
  @ApiResponse({ status: 201, description: 'Compliance requirement added' })
  @Roles(UserRole.SUPER_ADMIN)
  async addComplianceRequirement(
    @Body()
    requirementData: {
      standard: 'GDPR' | 'PCI_DSS' | 'SOX' | 'HIPAA' | 'ISO_27001' | 'SOC_2';
      requirement: string;
      description: string;
      status: 'in_progress' | 'compliant' | 'non_compliant' | 'not_applicable';
      lastAssessment: Date;
      nextAssessment: Date;
      evidence?: string[];
      notes?: string;
    }
  ) {
    return this.complianceService.addRequirement(requirementData);
  }

  @Put('compliance/requirements/:id/status')
  @ApiOperation({ summary: 'Update Requirement Status' })
  @ApiParam({ name: 'id', description: 'Requirement ID' })
  @ApiResponse({ status: 200, description: 'Requirement status updated' })
  @Roles(UserRole.SUPER_ADMIN)
  async updateRequirementStatus(
    @Param('id') id: string,
    @Body() data: { status: string; evidence?: string[] }
  ) {
    return this.complianceService.updateRequirementStatus(
      id,
      data.status as
        | 'in_progress'
        | 'compliant'
        | 'non_compliant'
        | 'not_applicable',
      data.evidence
    );
  }

  @Get('compliance/audits')
  @ApiOperation({ summary: 'Get Compliance Audits' })
  @ApiQuery({ name: 'compliance', required: false })
  @ApiQuery({ name: 'dataType', required: false })
  @ApiQuery({ name: 'accessType', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Compliance audits' })
  @Roles(UserRole.SUPER_ADMIN)
  async getComplianceAudits(
    @Query('compliance') compliance?: boolean,
    @Query('dataType') dataType?: string,
    @Query('accessType') accessType?: string,
    @Query('userId') userId?: string,
    @Query('limit') limit?: number
  ) {
    const params: {
      compliance?: boolean;
      dataType?: 'personal' | 'financial' | 'health' | 'business' | 'technical';
      accessType?: 'read' | 'write' | 'delete' | 'export';
      userId?: string;
      limit?: number;
    } = {};

    if (compliance !== undefined) params.compliance = compliance;
    if (dataType != null && dataType !== '')
      params.dataType = dataType as
        | 'personal'
        | 'financial'
        | 'health'
        | 'business'
        | 'technical';
    if (accessType != null && accessType !== '')
      params.accessType = accessType as 'read' | 'write' | 'delete' | 'export';
    if (userId != null && userId !== '') params.userId = userId;
    if (limit != null && limit > 0) params.limit = limit;

    return this.complianceService.getAudits(params);
  }

  @Post('compliance/audits')
  @ApiOperation({ summary: 'Log Compliance Audit' })
  @ApiResponse({ status: 201, description: 'Compliance audit logged' })
  @Roles(UserRole.SUPER_ADMIN)
  async logComplianceAudit(
    @Body()
    auditData: {
      action: string;
      resource: string;
      dataType: 'personal' | 'financial' | 'health' | 'business' | 'technical';
      accessType: 'read' | 'write' | 'delete' | 'export';
      compliance: boolean;
      userId?: string;
      violations?: string[];
    }
  ) {
    return this.complianceService.logAudit(auditData);
  }

  @Get('compliance/data-subjects')
  @ApiOperation({ summary: 'Get Data Subjects' })
  @ApiResponse({ status: 200, description: 'Data subjects (GDPR)' })
  @Roles(UserRole.SUPER_ADMIN)
  async getDataSubjects() {
    return this.complianceService.getDataSubjects();
  }

  @Post('compliance/data-subjects')
  @ApiOperation({ summary: 'Add Data Subject' })
  @ApiResponse({ status: 201, description: 'Data subject added' })
  @Roles(UserRole.SUPER_ADMIN)
  async addDataSubject(
    @Body()
    subjectData: {
      name: string;
      email: string;
      dataTypes: (
        | 'personal'
        | 'financial'
        | 'health'
        | 'business'
        | 'technical'
      )[];
      dataCategories: string[];
      retentionPeriod: Date;
      consentGiven: boolean;
      consentDate: Date;
      lastAccess?: Date;
    }
  ) {
    const { ...dataWithoutDates } = subjectData;
    return this.complianceService.addDataSubject(dataWithoutDates);
  }

  @Put('compliance/data-subjects/:id/consent')
  @ApiOperation({ summary: 'Update Data Subject Consent' })
  @ApiParam({ name: 'id', description: 'Data Subject ID' })
  @ApiResponse({ status: 200, description: 'Data subject consent updated' })
  @Roles(UserRole.SUPER_ADMIN)
  async updateDataSubjectConsent(
    @Param('id') id: string,
    @Body() data: { consentGiven: boolean }
  ) {
    return this.complianceService.updateDataSubjectConsent(
      id,
      data.consentGiven
    );
  }

  @Delete('compliance/data-subjects/:id')
  @ApiOperation({ summary: 'Delete Data Subject (Right to be Forgotten)' })
  @ApiParam({ name: 'id', description: 'Data Subject ID' })
  @ApiResponse({ status: 200, description: 'Data subject deleted' })
  @Roles(UserRole.SUPER_ADMIN)
  async deleteDataSubject(@Param('id') id: string) {
    return this.complianceService.deleteDataSubject(id);
  }

  @Get('compliance/stats')
  @ApiOperation({ summary: 'Get Compliance Statistics' })
  @ApiResponse({ status: 200, description: 'Compliance statistics' })
  @Roles(UserRole.SUPER_ADMIN)
  async getComplianceStats() {
    return this.complianceService.getStats();
  }

  @Get('compliance/report')
  @ApiOperation({ summary: 'Generate Compliance Report' })
  @ApiResponse({ status: 200, description: 'Compliance report' })
  @Roles(UserRole.SUPER_ADMIN)
  async generateComplianceReport() {
    return this.complianceService.generateComplianceReport();
  }

  // ==================== Overall Security Dashboard ====================

  @Get('dashboard')
  @ApiOperation({ summary: 'Security Dashboard' })
  @ApiResponse({ status: 200, description: 'Security dashboard data' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.NETWORK_MANAGER)
  async getSecurityDashboard() {
    const [
      wafHealth,
      wafStats,
      secretsHealth,
      secretsStats,
      certificateHealth,
      certificateStats,
      vulnerabilityHealth,
      vulnerabilityStats,
      incidentHealth,
      incidentStats,
      integrationHealth,
      integrationStats,
      jwtHealth,
      jwtStats,
      complianceHealth,
      complianceStats,
    ] = await Promise.all([
      this.wafService.healthCheck(),
      this.wafService.getWafStats(),
      this.secretsService.healthCheck(),
      this.secretsService.getSecretsStats(),
      this.certificateService.healthCheck(),
      this.certificateService.getCertificateStats(),
      this.vulnerabilityService.healthCheck(),
      this.vulnerabilityService.getVulnerabilityStats(),
      this.incidentResponseService.healthCheck(),
      this.incidentResponseService.getIncidentStats(),
      this.securityIntegrationService.healthCheck(),
      this.securityIntegrationService.getStats(),
      this.jwtSecurityService.healthCheck(),
      this.jwtSecurityService.getStats(),
      this.complianceService.healthCheck(),
      this.complianceService.getStats(),
    ]);

    return {
      timestamp: new Date(),
      overallStatus: 'healthy',
      services: {
        waf: wafHealth,
        secrets: secretsHealth,
        certificates: certificateHealth,
        vulnerabilities: vulnerabilityHealth,
        incidents: incidentHealth,
        integration: integrationHealth,
        jwt: jwtHealth,
        compliance: complianceHealth,
      },
      statistics: {
        waf: wafStats,
        secrets: secretsStats,
        certificates: certificateStats,
        vulnerabilities: vulnerabilityStats,
        incidents: incidentStats,
        integration: integrationStats,
        jwt: jwtStats,
        compliance: complianceStats,
      },
      summary: {
        totalBlockedRequests: wafStats.blockedRequests,
        totalSecrets: secretsStats.totalSecrets,
        activeCertificates: certificateStats.activeCertificates,
        openVulnerabilities: vulnerabilityStats.openVulnerabilities,
        openIncidents: incidentStats.openIncidents,
        totalSecurityEvents: integrationStats.totalEvents,
        activeTokens: jwtStats.activeTokens,
        complianceRate:
          complianceStats.compliantRequirements /
          complianceStats.totalRequirements,
      },
    };
  }
}

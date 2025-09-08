import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { AuthorizationService } from './authorization.service';
import { CertificateService } from './certificate.service';
import { ComplianceService } from './compliance.service';
import { ContinuousSecurityTestingController } from './controllers/continuous-security-testing.controller';
import { DynamicRateLimitingService } from './dynamic-rate-limiting.service';
import { IncidentResponseService } from './incident-response.service';
import { JwtSecurityService } from './jwt-security.service';
import { KmsIntegrationService } from './kms-integration.service';
import { SecretsService } from './secrets.service';
import { SecurityAuditService } from './security-audit.service';
import { SecurityIntegrationService } from './security-integration.service';
import { SecurityController } from './security.controller';
import { ContinuousSecurityTestingService } from './services/continuous-security-testing.service';
import { SecretRotationService } from './services/secret-rotation.service';
import { StaticAnalyzerService } from './static-analyzer.service';
import { UnifiedAuthService } from './unified-auth.service';
import { VulnerabilityService } from './vulnerability.service';
import { WafService } from './waf.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'default-secret',
      signOptions: { expiresIn: '1h' },
    }),
    EventEmitterModule,
  ],
  providers: [
    WafService,
    SecretsService,
    CertificateService,
    VulnerabilityService,
    IncidentResponseService,
    SecurityIntegrationService,
    JwtSecurityService,
    ComplianceService,
    SecretRotationService,
    ContinuousSecurityTestingService,
    KmsIntegrationService,
    DynamicRateLimitingService,
    StaticAnalyzerService,
    UnifiedAuthService,
    AuthorizationService,
    SecurityAuditService,
  ],
  controllers: [SecurityController, ContinuousSecurityTestingController],
  exports: [
    WafService,
    SecretsService,
    CertificateService,
    VulnerabilityService,
    IncidentResponseService,
    SecurityIntegrationService,
    JwtSecurityService,
    ComplianceService,
    SecretRotationService,
    ContinuousSecurityTestingService,
    KmsIntegrationService,
    DynamicRateLimitingService,
    StaticAnalyzerService,
    UnifiedAuthService,
    AuthorizationService,
    SecurityAuditService,
  ],
})
export class SecurityModule {}

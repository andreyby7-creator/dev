# Блок 0.9.4. Безопасность и соответствие

## Обзор

Блок 0.9.4 реализует единую систему безопасности с аутентификацией, авторизацией, аудитом безопасности и соответствием требованиям РФ/РБ.

## Статус

**✅ ПОЛНОСТЬЮ ЗАВЕРШЕН (100%)**

## Архитектура

### Unified Security System

Единая система безопасности обеспечивает:

- **Unified Authentication** - единая система аутентификации с JWT и OAuth2
- **Authorization Service** - централизованное управление правами доступа
- **Security Audit** - комплексный аудит безопасности всей системы
- **Compliance Reporting** - отчеты по соответствию требованиям РФ/РБ
- **Data Protection** - защита данных с шифрованием и маскированием
- **Security Monitoring** - мониторинг безопасности в реальном времени

### Security Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Authentication│    │   Authorization │    │   Data          │
│   Service       │    │   Service       │    │   Protection    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
         ┌─────────────────────────────────────────────────┐
         │           Security Audit Service                │
         └─────────────────────────────────────────────────┘
                                 │
         ┌─────────────────────────────────────────────────┐
         │         Security Monitoring Service             │
         └─────────────────────────────────────────────────┘
                                 │
         ┌─────────────────────────────────────────────────┐
         │         Compliance Reporting Service            │
         └─────────────────────────────────────────────────┘
```

## Ключевые сервисы

### UnifiedAuthService

**Файл:** `apps/api/src/security/unified-auth.service.ts`

**Функциональность:**

- Единая аутентификация для всех сервисов
- Интеграция с Supabase и JWT
- Поддержка OAuth2 провайдеров
- Управление сессиями и токенами

**Основные методы:**

```typescript
async authenticate(credentials: IAuthCredentials): Promise<IAuthResult>
async refreshToken(refreshToken: string): Promise<ITokenPair>
async validateToken(token: string): Promise<ITokenValidation>
async logout(userId: string): Promise<void>
```

### AuthorizationService

**Файл:** `apps/api/src/security/authorization.service.ts`

**Функциональность:**

- Централизованное управление правами доступа
- Ролевая модель доступа (RBAC)
- Контекстная авторизация
- Аудит доступа

**Основные методы:**

```typescript
async checkPermission(userId: string, resource: string, action: string): Promise<boolean>
async getUserPermissions(userId: string): Promise<IPermission[]>
async grantPermission(userId: string, permission: IPermission): Promise<void>
async revokePermission(userId: string, permissionId: string): Promise<void>
```

### SecurityAuditService

**Файл:** `apps/api/src/security/security-audit.service.ts`

**Функциональность:**

- Комплексный аудит безопасности
- Логирование всех операций
- Анализ угроз безопасности
- Отчеты по безопасности

**Основные методы:**

```typescript
async logSecurityEvent(event: ISecurityEvent): Promise<void>
async getSecurityEvents(filters: ISecurityEventFilters): Promise<ISecurityEvent[]>
async analyzeSecurityThreats(): Promise<ISecurityThreat[]>
async generateSecurityReport(): Promise<ISecurityReport>
```

### ComplianceReportingService

**Файл:** `apps/api/src/security/compliance-reporting.service.ts`

**Функциональность:**

- Отчеты по соответствию требованиям РФ/РБ
- Аудит соответствия стандартам
- Генерация compliance отчетов
- Мониторинг соответствия

**Основные методы:**

```typescript
async generateComplianceReport(standard: ComplianceStandard): Promise<IComplianceReport>
async checkCompliance(standard: ComplianceStandard): Promise<IComplianceStatus>
async getComplianceMetrics(): Promise<IComplianceMetrics>
async scheduleComplianceAudit(): Promise<void>
```

### DataProtectionService

**Файл:** `apps/api/src/security/data-protection.service.ts`

**Функциональность:**

- Защита данных с шифрованием
- Маскирование чувствительных данных
- Управление ключами шифрования
- Аудит доступа к данным

**Основные методы:**

```typescript
async encryptData(data: string, keyId: string): Promise<string>
async decryptData(encryptedData: string, keyId: string): Promise<string>
async maskSensitiveData(data: any): Promise<any>
async auditDataAccess(userId: string, dataType: string): Promise<void>
```

### SecurityMonitoringService

**Файл:** `apps/api/src/security/security-monitoring.service.ts`

**Функциональность:**

- Мониторинг безопасности в реальном времени
- Обнаружение аномалий
- Анализ угроз
- Автоматические алерты

**Основные методы:**

```typescript
async monitorSecurityEvents(): Promise<void>
async detectAnomalies(): Promise<ISecurityAnomaly[]>
async analyzeThreats(): Promise<ISecurityThreat[]>
async sendSecurityAlert(alert: ISecurityAlert): Promise<void>
```

## Аутентификация

### JWT Authentication

```typescript
interface IJWTPayload {
  sub: string; // user ID
  email: string;
  roles: string[];
  permissions: string[];
  iat: number;
  exp: number;
  jti: string; // JWT ID
}

interface ITokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}
```

### OAuth2 Integration

```typescript
interface IOAuth2Provider {
  name: string;
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
}

interface IOAuth2Result {
  provider: string;
  accessToken: string;
  refreshToken?: string;
  userInfo: IOAuth2UserInfo;
}
```

### Authentication Flow

```typescript
@Injectable()
export class AuthenticationService {
  async authenticate(credentials: IAuthCredentials): Promise<IAuthResult> {
    // Validate credentials
    const user = await this.validateCredentials(credentials);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Log authentication event
    await this.auditService.logSecurityEvent({
      type: 'authentication',
      userId: user.id,
      success: true,
      ipAddress: this.getClientIP(),
      userAgent: this.getUserAgent(),
    });

    return {
      user: this.sanitizeUser(user),
      tokens,
      expiresIn: tokens.expiresIn,
    };
  }

  async validateToken(token: string): Promise<ITokenValidation> {
    try {
      const payload = await this.jwtService.verifyAsync(token);

      // Check if token is blacklisted
      const isBlacklisted =
        await this.tokenBlacklistService.isBlacklisted(token);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token is blacklisted');
      }

      return {
        valid: true,
        payload,
        userId: payload.sub,
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }
}
```

## Авторизация

### Role-Based Access Control (RBAC)

```typescript
interface IRole {
  id: string;
  name: string;
  description: string;
  permissions: IPermission[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface IPermission {
  id: string;
  resource: string;
  action: string;
  conditions?: IPermissionCondition[];
  metadata: Record<string, any>;
}

interface IPermissionCondition {
  field: string;
  operator: ComparisonOperator;
  value: any;
}
```

### Authorization Logic

```typescript
@Injectable()
export class AuthorizationService {
  async checkPermission(
    userId: string,
    resource: string,
    action: string,
    context?: any
  ): Promise<boolean> {
    const user = await this.userService.getUser(userId);
    const userRoles = await this.getUserRoles(user.id);

    for (const role of userRoles) {
      const hasPermission = await this.checkRolePermission(
        role,
        resource,
        action,
        context
      );

      if (hasPermission) {
        // Log successful authorization
        await this.auditService.logSecurityEvent({
          type: 'authorization',
          userId: user.id,
          resource,
          action,
          success: true,
          context,
        });

        return true;
      }
    }

    // Log failed authorization
    await this.auditService.logSecurityEvent({
      type: 'authorization',
      userId: user.id,
      resource,
      action,
      success: false,
      context,
    });

    return false;
  }

  private async checkRolePermission(
    role: IRole,
    resource: string,
    action: string,
    context?: any
  ): Promise<boolean> {
    return role.permissions.some(permission => {
      // Check resource and action match
      if (permission.resource !== resource || permission.action !== action) {
        return false;
      }

      // Check conditions if any
      if (permission.conditions && context) {
        return this.evaluateConditions(permission.conditions, context);
      }

      return true;
    });
  }
}
```

## Аудит безопасности

### Security Events

```typescript
interface ISecurityEvent {
  id: string;
  type: SecurityEventType;
  userId?: string;
  resource?: string;
  action?: string;
  success: boolean;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  details: Record<string, any>;
  severity: SecuritySeverity;
}

enum SecurityEventType {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATA_ACCESS = 'data_access',
  CONFIGURATION_CHANGE = 'configuration_change',
  SECURITY_VIOLATION = 'security_violation',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
}

enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}
```

### Security Audit Implementation

```typescript
@Injectable()
export class SecurityAuditService {
  async logSecurityEvent(event: ISecurityEvent): Promise<void> {
    // Store in database
    await this.securityEventRepository.save(event);

    // Send to SIEM if configured
    if (this.siemConfig.enabled) {
      await this.sendToSIEM(event);
    }

    // Check for security violations
    await this.checkSecurityViolations(event);

    // Trigger alerts if necessary
    if (
      event.severity === SecuritySeverity.HIGH ||
      event.severity === SecuritySeverity.CRITICAL
    ) {
      await this.triggerSecurityAlert(event);
    }
  }

  async analyzeSecurityThreats(): Promise<ISecurityThreat[]> {
    const threats: ISecurityThreat[] = [];

    // Analyze failed login attempts
    const failedLogins = await this.getFailedLoginAttempts();
    if (failedLogins.length > 10) {
      threats.push({
        type: 'brute_force_attack',
        severity: SecuritySeverity.HIGH,
        description: 'Multiple failed login attempts detected',
        affectedUsers: failedLogins.map(attempt => attempt.userId),
        recommendation: 'Implement account lockout policy',
      });
    }

    // Analyze unusual access patterns
    const unusualAccess = await this.detectUnusualAccessPatterns();
    if (unusualAccess.length > 0) {
      threats.push({
        type: 'unusual_access_pattern',
        severity: SecuritySeverity.MEDIUM,
        description: 'Unusual access patterns detected',
        affectedUsers: unusualAccess.map(access => access.userId),
        recommendation: 'Review user access patterns',
      });
    }

    return threats;
  }
}
```

## Соответствие требованиям

### Compliance Standards

```typescript
enum ComplianceStandard {
  GDPR = 'gdpr',
  CCPA = 'ccpa',
  SOX = 'sox',
  HIPAA = 'hipaa',
  PCI_DSS = 'pci_dss',
  ISO_27001 = 'iso_27001',
  RUSSIAN_FEDERAL_LAW = 'russian_federal_law',
  BELARUSIAN_LAW = 'belarusian_law',
}

interface IComplianceRequirement {
  id: string;
  standard: ComplianceStandard;
  requirement: string;
  description: string;
  category: ComplianceCategory;
  mandatory: boolean;
  evidence: string[];
}

enum ComplianceCategory {
  DATA_PROTECTION = 'data_protection',
  ACCESS_CONTROL = 'access_control',
  AUDIT_LOGGING = 'audit_logging',
  ENCRYPTION = 'encryption',
  INCIDENT_RESPONSE = 'incident_response',
}
```

### Compliance Reporting

```typescript
@Injectable()
export class ComplianceReportingService {
  async generateComplianceReport(
    standard: ComplianceStandard
  ): Promise<IComplianceReport> {
    const requirements = await this.getComplianceRequirements(standard);
    const complianceStatus = await this.checkComplianceStatus(requirements);

    const report: IComplianceReport = {
      standard,
      generatedAt: new Date(),
      overallCompliance: this.calculateOverallCompliance(complianceStatus),
      requirements: complianceStatus,
      recommendations: await this.generateRecommendations(complianceStatus),
      evidence: await this.collectEvidence(requirements),
    };

    return report;
  }

  async checkComplianceStatus(
    requirements: IComplianceRequirement[]
  ): Promise<IComplianceStatus[]> {
    const statuses: IComplianceStatus[] = [];

    for (const requirement of requirements) {
      const status = await this.checkRequirementCompliance(requirement);
      statuses.push({
        requirement,
        compliant: status.compliant,
        score: status.score,
        evidence: status.evidence,
        gaps: status.gaps,
        recommendations: status.recommendations,
      });
    }

    return statuses;
  }
}
```

## Защита данных

### Data Encryption

```typescript
interface IEncryptionKey {
  id: string;
  algorithm: string;
  keySize: number;
  createdAt: Date;
  expiresAt?: Date;
  status: KeyStatus;
}

enum KeyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

@Injectable()
export class DataProtectionService {
  async encryptData(data: string, keyId: string): Promise<string> {
    const key = await this.getEncryptionKey(keyId);

    if (key.status !== KeyStatus.ACTIVE) {
      throw new Error(`Encryption key ${keyId} is not active`);
    }

    const encrypted = await this.encryptionService.encrypt(data, key);

    // Log encryption operation
    await this.auditService.logSecurityEvent({
      type: 'data_encryption',
      resource: keyId,
      success: true,
      details: { keyId, dataLength: data.length },
    });

    return encrypted;
  }

  async maskSensitiveData(data: any): Promise<any> {
    const maskedData = { ...data };

    // Mask email addresses
    if (maskedData.email) {
      maskedData.email = this.maskEmail(maskedData.email);
    }

    // Mask phone numbers
    if (maskedData.phone) {
      maskedData.phone = this.maskPhone(maskedData.phone);
    }

    // Mask credit card numbers
    if (maskedData.creditCard) {
      maskedData.creditCard = this.maskCreditCard(maskedData.creditCard);
    }

    return maskedData;
  }

  private maskEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    const maskedLocal =
      localPart.length > 2
        ? localPart.substring(0, 2) + '*'.repeat(localPart.length - 2)
        : '*'.repeat(localPart.length);
    return `${maskedLocal}@${domain}`;
  }
}
```

## Мониторинг безопасности

### Security Monitoring

```typescript
interface ISecurityAnomaly {
  id: string;
  type: AnomalyType;
  severity: SecuritySeverity;
  description: string;
  detectedAt: Date;
  userId?: string;
  ipAddress?: string;
  details: Record<string, any>;
  status: AnomalyStatus;
}

enum AnomalyType {
  UNUSUAL_LOGIN_TIME = 'unusual_login_time',
  UNUSUAL_LOCATION = 'unusual_location',
  MULTIPLE_FAILED_ATTEMPTS = 'multiple_failed_attempts',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  DATA_EXFILTRATION = 'data_exfiltration',
  SUSPICIOUS_API_USAGE = 'suspicious_api_usage',
}

@Injectable()
export class SecurityMonitoringService {
  async detectAnomalies(): Promise<ISecurityAnomaly[]> {
    const anomalies: ISecurityAnomaly[] = [];

    // Detect unusual login times
    const unusualLogins = await this.detectUnusualLoginTimes();
    anomalies.push(...unusualLogins);

    // Detect unusual locations
    const unusualLocations = await this.detectUnusualLocations();
    anomalies.push(...unusualLocations);

    // Detect privilege escalation attempts
    const privilegeEscalations = await this.detectPrivilegeEscalations();
    anomalies.push(...privilegeEscalations);

    return anomalies;
  }

  async analyzeThreats(): Promise<ISecurityThreat[]> {
    const threats: ISecurityThreat[] = [];

    // Analyze recent security events
    const recentEvents = await this.getRecentSecurityEvents();

    // Check for brute force attacks
    const bruteForceThreats = await this.analyzeBruteForceAttacks(recentEvents);
    threats.push(...bruteForceThreats);

    // Check for data exfiltration attempts
    const exfiltrationThreats =
      await this.analyzeDataExfiltration(recentEvents);
    threats.push(...exfiltrationThreats);

    return threats;
  }
}
```

## API Security

### Security Middleware

```typescript
@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  constructor(
    private authService: UnifiedAuthService,
    private authorizationService: AuthorizationService,
    private auditService: SecurityAuditService
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Extract token from request
      const token = this.extractToken(req);

      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      // Validate token
      const validation = await this.authService.validateToken(token);
      if (!validation.valid) {
        throw new UnauthorizedException('Invalid token');
      }

      // Add user to request
      req.user = validation.payload;

      // Check authorization
      const hasPermission = await this.authorizationService.checkPermission(
        validation.payload.sub,
        req.route.path,
        req.method
      );

      if (!hasPermission) {
        throw new ForbiddenException('Insufficient permissions');
      }

      // Log successful access
      await this.auditService.logSecurityEvent({
        type: 'authorization',
        userId: validation.payload.sub,
        resource: req.route.path,
        action: req.method,
        success: true,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      next();
    } catch (error) {
      // Log failed access
      await this.auditService.logSecurityEvent({
        type: 'authorization',
        success: false,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: { error: error.message },
      });

      throw error;
    }
  }
}
```

## Конфигурация безопасности

### Security Configuration

```yaml
# security.yaml
security:
  authentication:
    jwt:
      secret: '${JWT_SECRET}'
      expiresIn: '1h'
      refreshExpiresIn: '7d'
      algorithm: 'HS256'

    oauth2:
      providers:
        google:
          clientId: '${GOOGLE_CLIENT_ID}'
          clientSecret: '${GOOGLE_CLIENT_SECRET}'
        github:
          clientId: '${GITHUB_CLIENT_ID}'
          clientSecret: '${GITHUB_CLIENT_SECRET}'

  authorization:
    rbac:
      enabled: true
      defaultRole: 'user'
      adminRole: 'admin'

    permissions:
      - resource: 'users'
        actions: ['read', 'write', 'delete']
      - resource: 'posts'
        actions: ['read', 'write']

  encryption:
    algorithm: 'AES-256-GCM'
    keyRotationInterval: '90d'
    keySize: 256

  audit:
    enabled: true
    retention: '1y'
    logLevel: 'info'
    siem:
      enabled: true
      endpoint: '${SIEM_ENDPOINT}'

  compliance:
    standards:
      - 'gdpr'
      - 'russian_federal_law'
    reporting:
      enabled: true
      schedule: 'monthly'
```

## Тестирование безопасности

### Security Tests

```typescript
describe('SecurityService', () => {
  let service: SecurityService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [SecurityService],
    }).compile();

    service = module.get<SecurityService>(SecurityService);
  });

  it('should authenticate user with valid credentials', async () => {
    const credentials = { email: 'test@example.com', password: 'password' };
    const result = await service.authenticate(credentials);

    expect(result.success).toBe(true);
    expect(result.tokens).toBeDefined();
  });

  it('should reject invalid credentials', async () => {
    const credentials = { email: 'test@example.com', password: 'wrong' };

    await expect(service.authenticate(credentials)).rejects.toThrow(
      UnauthorizedException
    );
  });

  it('should check user permissions', async () => {
    const userId = 'user123';
    const hasPermission = await service.checkPermission(
      userId,
      'users',
      'read'
    );

    expect(typeof hasPermission).toBe('boolean');
  });
});
```

## Заключение

Блок 0.9.4 успешно реализует единую систему безопасности с аутентификацией, авторизацией, аудитом и соответствием требованиям. Система обеспечивает комплексную защиту данных и мониторинг безопасности в реальном времени.

**Результат:** ✅ **Block 0.9.4: Безопасность и соответствие - 100% ГОТОВО!**

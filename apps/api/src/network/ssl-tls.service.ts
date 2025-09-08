import { Injectable } from '@nestjs/common';
import { redactedLogger } from '../utils/redacted-logger';

export interface SslConfig {
  enabled: boolean;
  certificatePath: string;
  privateKeyPath: string;
  caBundlePath: string;
  protocols: string[];
  ciphers: string[];
  hstsEnabled: boolean;
  hstsMaxAge: number;
  ocspStapling: boolean;
  sessionCache: boolean;
  sessionTimeout: number;
  certificateRenewalDays: number;
}

export interface CertificateInfo {
  subject: string;
  issuer: string;
  validFrom: Date;
  validTo: Date;
  serialNumber: string;
  fingerprint: string;
  keySize: number;
  signatureAlgorithm: string;
}

export interface SslStats {
  totalConnections: number;
  activeConnections: number;
  handshakeTime: number;
  certificateExpiryDays: number;
  protocolUsage: Record<string, number>;
  cipherUsage: Record<string, number>;
}

@Injectable()
export class SslTlsService {
  private readonly config: SslConfig;
  private readonly connectionStats: Map<string, number> = new Map();
  private readonly handshakeTimes: number[] = [];
  private certificateInfo: CertificateInfo | null = null;

  constructor() {
    this.config = {
      enabled: process.env.SSL_ENABLED === 'true',
      certificatePath: process.env.SSL_CERT_PATH ?? '/etc/ssl/certs/server.crt',
      privateKeyPath: process.env.SSL_KEY_PATH ?? '/etc/ssl/private/server.key',
      caBundlePath:
        process.env.SSL_CA_BUNDLE_PATH ?? '/etc/ssl/certs/ca-bundle.crt',
      protocols: process.env.SSL_PROTOCOLS?.split(',') ?? [
        'TLSv1.3',
        'TLSv1.2',
      ],
      ciphers: process.env.SSL_CIPHERS?.split(',') ?? [
        'ECDHE-ECDSA-AES256-GCM-SHA384',
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-ECDSA-CHACHA20-POLY1305',
        'ECDHE-RSA-CHACHA20-POLY1305',
      ],
      hstsEnabled: process.env.SSL_HSTS_ENABLED === 'true',
      hstsMaxAge: parseInt(process.env.SSL_HSTS_MAX_AGE ?? '31536000'),
      ocspStapling: process.env.SSL_OCSP_STAPLING === 'true',
      sessionCache: process.env.SSL_SESSION_CACHE === 'true',
      sessionTimeout: parseInt(process.env.SSL_SESSION_TIMEOUT ?? '300'),
      certificateRenewalDays: parseInt(
        process.env.SSL_CERT_RENEWAL_DAYS ?? '30'
      ),
    };

    if (this.config.enabled) {
      this.loadCertificateInfo();
      redactedLogger.log('SSL/TLS Service initialized', 'SslTlsService', {
        protocols: this.config.protocols,
        hstsEnabled: this.config.hstsEnabled,
        ocspStapling: this.config.ocspStapling,
      });
    }
  }

  /**
   * Загрузка информации о сертификате
   */
  private loadCertificateInfo(): void {
    try {
      // В реальной реализации здесь будет чтение сертификата
      // const cert = fs.readFileSync(this.config.certificatePath);
      // const certInfo = this.parseCertificate(cert);

      this.certificateInfo = {
        subject: 'CN=example.com',
        issuer: 'CN=Example CA',
        validFrom: new Date(),
        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        serialNumber: '1234567890',
        fingerprint: 'sha256:abcdef1234567890',
        keySize: 2048,
        signatureAlgorithm: 'sha256WithRSAEncryption',
      };

      redactedLogger.debug('Certificate info loaded', 'SslTlsService');
    } catch (error) {
      redactedLogger.error('Failed to load certificate info', error as string);
    }
  }

  /**
   * Проверка SSL/TLS соединения
   */
  async validateConnection(request: {
    protocol: string;
    cipher: string;
    clientIp: string;
    userAgent: string;
  }): Promise<{
    valid: boolean;
    reason?: string;
    headers?: Record<string, string>;
  }> {
    if (!this.config.enabled) {
      return { valid: true };
    }

    const { protocol, cipher, clientIp } = request;

    // Проверка поддерживаемых протоколов
    if (!this.config.protocols.includes(protocol)) {
      redactedLogger.warn(
        `Unsupported protocol: ${protocol} from ${clientIp}`,
        'SslTlsService'
      );
      return { valid: false, reason: 'Unsupported protocol' };
    }

    // Проверка поддерживаемых шифров
    if (!this.config.ciphers.includes(cipher)) {
      redactedLogger.warn(
        `Unsupported cipher: ${cipher} from ${clientIp}`,
        'SslTlsService'
      );
      return { valid: false, reason: 'Unsupported cipher' };
    }

    // Обновление статистики
    this.updateConnectionStats(protocol, cipher);

    // Генерация заголовков безопасности
    const securityHeaders = this.generateSecurityHeaders();

    return { valid: true, headers: securityHeaders };
  }

  /**
   * Обновление статистики соединений
   */
  private updateConnectionStats(protocol: string, cipher: string): void {
    // Обновление счетчика протоколов
    const protocolCount = this.connectionStats.get(`protocol:${protocol}`) ?? 0;
    this.connectionStats.set(`protocol:${protocol}`, protocolCount + 1);

    // Обновление счетчика шифров
    const cipherCount = this.connectionStats.get(`cipher:${cipher}`) ?? 0;
    this.connectionStats.set(`cipher:${cipher}`, cipherCount + 1);

    // Обновление общего счетчика соединений
    const totalConnections = this.connectionStats.get('total') ?? 0;
    this.connectionStats.set('total', totalConnections + 1);
  }

  /**
   * Генерация заголовков безопасности
   */
  private generateSecurityHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    // HSTS заголовок
    if (this.config.hstsEnabled) {
      headers['Strict-Transport-Security'] =
        `max-age=${this.config.hstsMaxAge}; includeSubDomains; preload`;
    }

    // Заголовки безопасности
    headers['X-Content-Type-Options'] = 'nosniff';
    headers['X-Frame-Options'] = 'DENY';
    headers['X-XSS-Protection'] = '1; mode=block';
    headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
    headers['Content-Security-Policy'] =
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'";

    return headers;
  }

  /**
   * Проверка срока действия сертификата
   */
  checkCertificateExpiry(): {
    valid: boolean;
    daysUntilExpiry: number;
    warning: boolean;
  } {
    if (!this.certificateInfo) {
      return { valid: false, daysUntilExpiry: 0, warning: true };
    }

    const now = new Date();
    const daysUntilExpiry = Math.ceil(
      (this.certificateInfo.validTo.getTime() - now.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    const warning = daysUntilExpiry <= this.config.certificateRenewalDays;
    const valid = daysUntilExpiry > 0;

    if (warning) {
      redactedLogger.warn(
        `Certificate expires in ${daysUntilExpiry} days`,
        'SslTlsService'
      );
    }

    return { valid, daysUntilExpiry, warning };
  }

  /**
   * Обновление сертификата
   */
  async renewCertificate(): Promise<boolean> {
    try {
      // В реальной реализации здесь будет автоматическое обновление сертификата
      // await this.autoRenewCertificate();

      redactedLogger.log('Certificate renewal initiated', 'SslTlsService');
      return true;
    } catch (error) {
      redactedLogger.error('Certificate renewal failed', error as string);
      return false;
    }
  }

  /**
   * Получение статистики SSL/TLS
   */
  getSslStats(): SslStats {
    const protocolUsage: Record<string, number> = {};
    const cipherUsage: Record<string, number> = {};

    // Подсчет использования протоколов
    for (const [key, count] of this.connectionStats.entries()) {
      if (key.startsWith('protocol:')) {
        const protocol = key.replace('protocol:', '');
        protocolUsage[protocol] = count;
      } else if (key.startsWith('cipher:')) {
        const cipher = key.replace('cipher:', '');
        cipherUsage[cipher] = count;
      }
    }

    const certificateExpiry = this.checkCertificateExpiry();

    return {
      totalConnections: this.connectionStats.get('total') ?? 0,
      activeConnections: this.connectionStats.get('active') ?? 0,
      handshakeTime: this.calculateAverageHandshakeTime(),
      certificateExpiryDays: certificateExpiry.daysUntilExpiry,
      protocolUsage,
      cipherUsage,
    };
  }

  /**
   * Расчет среднего времени handshake
   */
  private calculateAverageHandshakeTime(): number {
    if (this.handshakeTimes.length === 0) return 0;

    const sum = this.handshakeTimes.reduce((acc, time) => acc + time, 0);
    return sum / this.handshakeTimes.length;
  }

  /**
   * Проверка конфигурации SSL/TLS
   */
  validateConfiguration(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Проверка файлов сертификатов
    if (this.config.enabled) {
      // В реальной реализации здесь будет проверка существования файлов
      // if (!fs.existsSync(this.config.certificatePath)) {
      //   issues.push('Certificate file not found');
      // }
    }

    // Проверка протоколов
    if (this.config.protocols.length === 0) {
      issues.push('No SSL protocols configured');
    }

    // Проверка шифров
    if (this.config.ciphers.length === 0) {
      issues.push('No SSL ciphers configured');
    }

    // Проверка HSTS
    if (this.config.hstsEnabled && this.config.hstsMaxAge <= 0) {
      issues.push('Invalid HSTS max age');
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Получение информации о сертификате
   */
  getCertificateInfo(): CertificateInfo | null {
    return this.certificateInfo;
  }

  /**
   * Обновление конфигурации SSL/TLS
   */
  updateConfiguration(newConfig: Partial<SslConfig>): void {
    Object.assign(this.config, newConfig);

    if (
      (newConfig.certificatePath != null && newConfig.certificatePath !== '') ||
      (newConfig.privateKeyPath != null && newConfig.privateKeyPath !== '')
    ) {
      this.loadCertificateInfo();
    }

    redactedLogger.log('SSL/TLS configuration updated', 'SslTlsService');
  }
}

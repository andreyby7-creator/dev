import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { z } from 'zod';

// Zod схемы для валидации
const JwtSecurityConfigSchema = z.object({
  enabled: z.boolean().default(true),
  tokenRotation: z.boolean().default(true),
  refreshTokenExpiry: z.number().min(3600).max(2592000).default(604800), // 7 дней
  accessTokenExpiry: z.number().min(300).max(3600).default(900), // 15 минут
  maxRefreshTokens: z.number().min(1).max(10).default(5),
  blacklistEnabled: z.boolean().default(true),
  rateLimitEnabled: z.boolean().default(true),
  maxAttempts: z.number().min(1).max(100).default(10),
  blockDuration: z.number().min(300).max(3600).default(900), // 15 минут
});

const JwtTokenSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  tokenType: z.enum(['access', 'refresh']),
  tokenHash: z.string(),
  issuedAt: z.date(),
  expiresAt: z.date(),
  revokedAt: z.date().optional(),
  deviceInfo: z
    .object({
      userAgent: z.string(),
      ipAddress: z.string(),
      deviceId: z.string().optional(),
    })
    .optional(),
});

const JwtSecurityEventSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.date(),
  eventType: z.enum([
    'token_issued',
    'token_refreshed',
    'token_revoked',
    'token_expired',
    'suspicious_activity',
    'rate_limit_exceeded',
  ]),
  userId: z.string().uuid().optional(),
  tokenId: z.string().uuid().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  details: z.string(),
});

// Типы
type JwtSecurityConfig = z.infer<typeof JwtSecurityConfigSchema>;
type JwtToken = z.infer<typeof JwtTokenSchema>;
type JwtSecurityEvent = z.infer<typeof JwtSecurityEventSchema>;

export interface JwtSecurityStats {
  totalTokens: number;
  activeTokens: number;
  revokedTokens: number;
  suspiciousActivities: number;
  rateLimitBlocks: number;
  lastEvent: Date;
}

export interface RateLimitInfo {
  attempts: number;
  lastAttempt: Date;
  blockedUntil: Date | null;
}

@Injectable()
export class JwtSecurityService {
  private readonly logger = new Logger(JwtSecurityService.name);
  private config: JwtSecurityConfig;
  private tokens: JwtToken[] = [];
  private events: JwtSecurityEvent[] = [];
  private stats: JwtSecurityStats;
  private rateLimits: Map<string, RateLimitInfo> = new Map();
  private blacklist: Set<string> = new Set();

  constructor() {
    this.config = JwtSecurityConfigSchema.parse({
      enabled: true,
      tokenRotation: true,
      refreshTokenExpiry: 604800,
      accessTokenExpiry: 900,
      maxRefreshTokens: 5,
      blacklistEnabled: true,
      rateLimitEnabled: true,
      maxAttempts: 10,
      blockDuration: 900,
    });

    this.stats = {
      totalTokens: 0,
      activeTokens: 0,
      revokedTokens: 0,
      suspiciousActivities: 0,
      rateLimitBlocks: 0,
      lastEvent: new Date(),
    };

    this.logger.log('JWT Security Service initialized');
  }

  /**
   * Получить конфигурацию JWT безопасности
   */
  getConfig(): JwtSecurityConfig {
    return { ...this.config };
  }

  /**
   * Обновить конфигурацию JWT безопасности
   */
  updateConfig(updates: Partial<JwtSecurityConfig>): JwtSecurityConfig {
    const newConfig = { ...this.config, ...updates };
    this.config = JwtSecurityConfigSchema.parse(newConfig);

    this.logger.log(`JWT security config updated: ${JSON.stringify(updates)}`);
    return this.getConfig();
  }

  /**
   * Создать новый токен
   */
  createToken(
    userId: string,
    tokenType: 'access' | 'refresh',
    deviceInfo?: {
      userAgent: string;
      ipAddress: string;
      deviceId?: string;
    }
  ): JwtToken {
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() +
        (tokenType === 'access'
          ? this.config.accessTokenExpiry
          : this.config.refreshTokenExpiry) *
          1000
    );

    const token: JwtToken = {
      id: crypto.randomUUID(),
      userId,
      tokenType,
      tokenHash: this.generateTokenHash(),
      issuedAt: now,
      expiresAt,
      deviceInfo,
    };

    const validatedToken = JwtTokenSchema.parse(
      token as Record<string, unknown>
    );
    this.tokens.push(validatedToken);
    this.stats.totalTokens++;
    this.stats.activeTokens++;
    this.stats.lastEvent = now;

    this.registerEvent({
      eventType: 'token_issued',
      userId,
      tokenId: token.id,
      ipAddress: deviceInfo?.ipAddress,
      userAgent: deviceInfo?.userAgent,
      severity: 'low',
      details: `${tokenType} token issued for user ${userId}`,
    });

    this.logger.log(`${tokenType} token created for user ${userId}`);
    return validatedToken;
  }

  /**
   * Обновить токен
   */
  refreshToken(refreshTokenId: string, userId: string): JwtToken | null {
    const refreshToken = this.tokens.find(
      t =>
        t.id === refreshTokenId &&
        t.userId === userId &&
        t.tokenType === 'refresh' &&
        !t.revokedAt &&
        t.expiresAt > new Date()
    );

    if (!refreshToken) {
      this.registerEvent({
        eventType: 'suspicious_activity',
        userId,
        tokenId: refreshTokenId,
        severity: 'medium',
        details: 'Invalid refresh token attempt',
      });
      return null;
    }

    // Проверка лимита токенов
    const userTokens = this.tokens.filter(
      t =>
        t.userId === userId &&
        t.tokenType === 'refresh' &&
        !t.revokedAt &&
        t.expiresAt > new Date()
    );

    if (userTokens.length >= this.config.maxRefreshTokens) {
      // Отзываем самый старый токен
      const oldestToken = userTokens.sort(
        (a, b) => a.issuedAt.getTime() - b.issuedAt.getTime()
      )[0];
      if (oldestToken) {
        this.revokeToken(oldestToken.id, 'token_rotation');
      }
    }

    // Создаем новые токены
    const deviceInfo = refreshToken.deviceInfo
      ? {
          userAgent: refreshToken.deviceInfo.userAgent,
          ipAddress: refreshToken.deviceInfo.ipAddress,
          ...(refreshToken.deviceInfo.deviceId != null &&
            refreshToken.deviceInfo.deviceId !== '' && {
              deviceId: refreshToken.deviceInfo.deviceId,
            }),
        }
      : undefined;
    const newAccessToken = this.createToken(userId, 'access', deviceInfo);
    // const newRefreshToken = this.createToken(userId, 'refresh', deviceInfo);

    // Отзываем старый refresh токен
    this.revokeToken(refreshTokenId, 'token_refresh');

    this.registerEvent({
      eventType: 'token_refreshed',
      userId,
      tokenId: refreshTokenId,
      severity: 'low',
      details: 'Token refreshed successfully',
    });

    return newAccessToken;
  }

  /**
   * Отозвать токен
   */
  revokeToken(tokenId: string, reason: string = 'manual_revocation'): boolean {
    const token = this.tokens.find(t => t.id === tokenId);
    if (!token || token.revokedAt) {
      return false;
    }

    token.revokedAt = new Date();
    this.stats.activeTokens--;
    this.stats.revokedTokens++;
    this.stats.lastEvent = new Date();

    if (this.config.blacklistEnabled) {
      this.blacklist.add(token.tokenHash);
    }

    this.registerEvent({
      eventType: 'token_revoked',
      userId: token.userId,
      tokenId: token.id,
      severity: 'medium',
      details: `Token revoked: ${reason}`,
    });

    this.logger.log(`Token ${tokenId} revoked: ${reason}`);
    return true;
  }

  /**
   * Проверить токен
   */
  validateToken(tokenId: string, userId: string): boolean {
    const token = this.tokens.find(
      t => t.id === tokenId && t.userId === userId
    );

    if (!token) {
      return false;
    }

    if (token.revokedAt) {
      this.registerEvent({
        eventType: 'suspicious_activity',
        userId,
        tokenId,
        severity: 'high',
        details: 'Attempt to use revoked token',
      });
      return false;
    }

    if (token.expiresAt <= new Date()) {
      this.registerEvent({
        eventType: 'token_expired',
        userId,
        tokenId,
        severity: 'low',
        details: 'Token expired',
      });
      return false;
    }

    if (this.config.blacklistEnabled && this.blacklist.has(token.tokenHash)) {
      this.registerEvent({
        eventType: 'suspicious_activity',
        userId,
        tokenId,
        severity: 'high',
        details: 'Attempt to use blacklisted token',
      });
      return false;
    }

    return true;
  }

  /**
   * Проверить rate limit
   */
  checkRateLimit(identifier: string): {
    allowed: boolean;
    remainingAttempts: number;
    blockedUntil?: Date;
  } {
    if (!this.config.rateLimitEnabled) {
      return { allowed: true, remainingAttempts: this.config.maxAttempts };
    }

    const now = new Date();
    const rateLimit = this.rateLimits.get(identifier);

    if (!rateLimit) {
      this.rateLimits.set(identifier, {
        attempts: 1,
        lastAttempt: now,
        blockedUntil: null,
      });
      return { allowed: true, remainingAttempts: this.config.maxAttempts - 1 };
    }

    // Проверяем, не заблокирован ли
    if (rateLimit.blockedUntil && rateLimit.blockedUntil > now) {
      return {
        allowed: false,
        remainingAttempts: 0,
        blockedUntil: rateLimit.blockedUntil,
      };
    }

    // Сбрасываем блокировку если время истекло
    if (rateLimit.blockedUntil && rateLimit.blockedUntil <= now) {
      rateLimit.blockedUntil = null;
      rateLimit.attempts = 0;
    }

    // Увеличиваем счетчик попыток
    rateLimit.attempts++;
    rateLimit.lastAttempt = now;

    if (rateLimit.attempts > this.config.maxAttempts) {
      rateLimit.blockedUntil = new Date(
        now.getTime() + this.config.blockDuration * 1000
      );
      this.stats.rateLimitBlocks++;

      this.registerEvent({
        eventType: 'rate_limit_exceeded',
        severity: 'medium',
        details: `Rate limit exceeded for ${identifier}`,
      });

      return {
        allowed: false,
        remainingAttempts: 0,
        blockedUntil: rateLimit.blockedUntil,
      };
    }

    return {
      allowed: true,
      remainingAttempts: this.config.maxAttempts - rateLimit.attempts,
    };
  }

  /**
   * Получить статистику JWT безопасности
   */
  getStats(): JwtSecurityStats {
    return { ...this.stats };
  }

  /**
   * Получить события JWT безопасности
   */
  getEvents(filters?: {
    eventType?: JwtSecurityEvent['eventType'];
    severity?: JwtSecurityEvent['severity'];
    userId?: string;
    limit?: number;
  }): JwtSecurityEvent[] {
    let filteredEvents = [...this.events];

    if (filters?.eventType != null) {
      filteredEvents = filteredEvents.filter(
        e => e.eventType === filters.eventType
      );
    }

    if (filters?.severity != null) {
      filteredEvents = filteredEvents.filter(
        e => e.severity === filters.severity
      );
    }

    if (filters?.userId != null) {
      filteredEvents = filteredEvents.filter(e => e.userId === filters.userId);
    }

    if (filters?.limit != null) {
      filteredEvents = filteredEvents.slice(-filters.limit);
    }

    return filteredEvents.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  /**
   * Проверить состояние JWT безопасности
   */
  healthCheck(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: string;
  } {
    const now = new Date();
    const timeSinceLastEvent = now.getTime() - this.stats.lastEvent.getTime();

    if (timeSinceLastEvent > 600000) {
      // 10 минут
      return {
        status: 'unhealthy',
        details: 'No recent JWT security events detected',
      };
    }

    if (this.stats.suspiciousActivities > 50) {
      return {
        status: 'degraded',
        details: `High number of suspicious activities: ${this.stats.suspiciousActivities}`,
      };
    }

    return {
      status: 'healthy',
      details: 'JWT security operating normally',
    };
  }

  /**
   * Очистить старые токены и события
   */
  cleanup(maxAge: number = 30 * 24 * 60 * 60 * 1000): {
    tokensRemoved: number;
    eventsRemoved: number;
  } {
    const cutoff = new Date(Date.now() - maxAge);

    const initialTokens = this.tokens.length;
    this.tokens = this.tokens.filter(token => token.issuedAt > cutoff);
    const tokensRemoved = initialTokens - this.tokens.length;

    const initialEvents = this.events.length;
    this.events = this.events.filter(event => event.timestamp > cutoff);
    const eventsRemoved = initialEvents - this.events.length;

    this.logger.log(
      `Cleanup completed: ${tokensRemoved} tokens, ${eventsRemoved} events removed`
    );

    return { tokensRemoved, eventsRemoved };
  }

  /**
   * Зарегистрировать событие безопасности
   */
  private registerEvent(
    event: Omit<JwtSecurityEvent, 'id' | 'timestamp'>
  ): void {
    const newEvent: JwtSecurityEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };

    const validatedEvent = JwtSecurityEventSchema.parse(
      newEvent as Record<string, unknown>
    );
    this.events.push(validatedEvent);
    this.stats.lastEvent = new Date();

    if (event.severity === 'high' || event.severity === 'critical') {
      this.stats.suspiciousActivities++;
    }
  }

  /**
   * Генерировать хеш токена
   */
  private generateTokenHash(): string {
    return crypto.randomUUID().replace(/-/g, '');
  }
}

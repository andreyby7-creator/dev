import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { z } from 'zod';

// Zod схемы для валидации
const SecurityIntegrationConfigSchema = z.object({
  enabled: z.boolean().default(true),
  autoResponse: z.boolean().default(true),
  threatIntelligence: z.boolean().default(true),
  complianceMode: z.enum(['strict', 'moderate', 'relaxed']).default('moderate'),
  integrationTimeout: z.number().min(1000).max(30000).default(5000),
});

// Zod схемы для валидации
const SecurityEventSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.date(),
  source: z.enum([
    'waf',
    'secrets',
    'certificates',
    'vulnerability',
    'incident',
  ]),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  eventType: z.string(),
  description: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const SecurityMetricsSchema = z.object({
  totalEvents: z.number(),
  eventsBySeverity: z.record(z.string(), z.number()),
  eventsBySource: z.record(z.string(), z.number()),
  responseTime: z.number(),
  uptime: z.number(),
  lastIncident: z.date().optional(),
});

// Типы
type SecurityIntegrationConfig = z.infer<
  typeof SecurityIntegrationConfigSchema
>;
type SecurityEvent = z.infer<typeof SecurityEventSchema>;
type SecurityMetrics = z.infer<typeof SecurityMetricsSchema>;

export interface SecurityIntegrationStats {
  totalEvents: number;
  activeIncidents: number;
  vulnerabilitiesFound: number;
  certificatesExpiring: number;
  secretsRotated: number;
  wafBlocks: number;
  lastUpdate: Date;
}

@Injectable()
export class SecurityIntegrationService {
  private readonly logger = new Logger(SecurityIntegrationService.name);
  private config: SecurityIntegrationConfig;
  private events: SecurityEvent[] = [];
  private stats: SecurityIntegrationStats;

  constructor() {
    const configData = {
      enabled: true,
      autoResponse: true,
      threatIntelligence: true,
      complianceMode: 'moderate',
      integrationTimeout: 5000,
    };
    this.config = SecurityIntegrationConfigSchema.parse(configData);

    this.stats = {
      totalEvents: 0,
      activeIncidents: 0,
      vulnerabilitiesFound: 0,
      certificatesExpiring: 0,
      secretsRotated: 0,
      wafBlocks: 0,
      lastUpdate: new Date(),
    };

    this.logger.log('Security Integration Service initialized');
  }

  /**
   * Получить конфигурацию интеграции
   */
  getConfig(): SecurityIntegrationConfig {
    return { ...this.config };
  }

  /**
   * Обновить конфигурацию интеграции
   */
  updateConfig(
    updates: Partial<SecurityIntegrationConfig>
  ): SecurityIntegrationConfig {
    const newConfig = { ...this.config, ...updates };
    this.config = SecurityIntegrationConfigSchema.parse(newConfig);

    this.logger.log(
      `Security integration config updated: ${JSON.stringify(updates)}`
    );
    return this.getConfig();
  }

  /**
   * Зарегистрировать событие безопасности
   */
  registerEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): SecurityEvent {
    const newEvent: SecurityEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };

    const validatedEvent = SecurityEventSchema.parse(
      newEvent as Record<string, unknown>
    );
    this.events.push(validatedEvent);
    this.stats.totalEvents++;
    this.stats.lastUpdate = new Date();

    this.logger.log(
      `Security event registered: ${event.eventType} (${event.severity})`
    );

    // Автоматический ответ на критические события
    if (this.config.autoResponse && event.severity === 'critical') {
      this.handleCriticalEvent(validatedEvent);
    }

    return validatedEvent;
  }

  /**
   * Получить события безопасности
   */
  getEvents(filters?: {
    severity?: SecurityEvent['severity'];
    source?: SecurityEvent['source'];
    limit?: number;
  }): SecurityEvent[] {
    let filteredEvents = [...this.events];

    if (filters?.severity) {
      filteredEvents = filteredEvents.filter(
        e => e.severity === filters.severity
      );
    }

    if (filters?.source) {
      filteredEvents = filteredEvents.filter(e => e.source === filters.source);
    }

    if (filters?.limit != null && filters.limit > 0) {
      filteredEvents = filteredEvents.slice(-filters.limit);
    }

    return filteredEvents.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  /**
   * Получить метрики безопасности
   */
  getMetrics(): SecurityMetrics {
    const eventsBySeverity = this.events.reduce(
      (acc, event) => {
        acc[event.severity] = (acc[event.severity] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const eventsBySource = this.events.reduce(
      (acc, event) => {
        acc[event.source] = (acc[event.source] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const lastIncident = this.events
      .filter(e => e.source === 'incident')
      .sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      )[0]?.timestamp;

    return SecurityMetricsSchema.parse({
      totalEvents: this.stats.totalEvents,
      eventsBySeverity,
      eventsBySource,
      responseTime: this.config.integrationTimeout,
      uptime: Date.now() - this.stats.lastUpdate.getTime(),
      lastIncident,
    });
  }

  /**
   * Получить статистику интеграции
   */
  getStats(): SecurityIntegrationStats {
    return { ...this.stats };
  }

  /**
   * Обновить статистику из других сервисов
   */
  updateStats(updates: Partial<SecurityIntegrationStats>): void {
    this.stats = { ...this.stats, ...updates, lastUpdate: new Date() };
  }

  /**
   * Проверить состояние интеграции
   */
  healthCheck(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: string;
  } {
    const now = new Date();
    const timeSinceLastUpdate = now.getTime() - this.stats.lastUpdate.getTime();

    if (timeSinceLastUpdate > 300000) {
      // 5 минут
      return {
        status: 'unhealthy',
        details: 'No recent security events detected',
      };
    }

    if (this.stats.activeIncidents > 10) {
      return {
        status: 'degraded',
        details: `High number of active incidents: ${this.stats.activeIncidents}`,
      };
    }

    return {
      status: 'healthy',
      details: 'Security integration operating normally',
    };
  }

  /**
   * Обработка критических событий
   */
  private handleCriticalEvent(event: SecurityEvent): void {
    this.logger.warn(`Handling critical security event: ${event.eventType}`);

    // Симуляция автоматических действий
    switch (event.source) {
      case 'waf':
        this.logger.warn('Automatically blocking suspicious IP addresses');
        break;
      case 'secrets':
        this.logger.warn('Automatically rotating compromised secrets');
        break;
      case 'certificates':
        this.logger.warn('Automatically renewing expiring certificates');
        break;
      case 'vulnerability':
        this.logger.warn('Automatically patching critical vulnerabilities');
        break;
      case 'incident':
        this.logger.warn('Automatically escalating security incident');
        break;
    }
  }

  /**
   * Очистить старые события
   */
  cleanupOldEvents(maxAge: number = 30 * 24 * 60 * 60 * 1000): number {
    // 30 дней по умолчанию
    const cutoff = new Date(Date.now() - maxAge);
    const initialCount = this.events.length;

    this.events = this.events.filter(event => event.timestamp > cutoff);

    const removedCount = initialCount - this.events.length;
    this.logger.log(`Cleaned up ${removedCount} old security events`);

    return removedCount;
  }
}

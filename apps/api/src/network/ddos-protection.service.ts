import { Injectable } from '@nestjs/common';
import { redactedLogger } from '../utils/redacted-logger';

interface DdosConfig {
  enabled: boolean;
  provider: 'cloudflare' | 'aws-shield' | 'custom';
  apiKey: string;
  apiSecret: string;
  zoneId: string;
  rateLimit: number;
  burstLimit: number;
  blockDuration: number;
  whitelistIps: string[];
  blacklistIps: string[];
  customRules: DdosRule[];
}

interface DdosRule {
  id: string;
  name: string;
  pattern: string;
  action: 'block' | 'challenge' | 'log';
  priority: number;
  enabled: boolean;
}

interface DdosEvent {
  id: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  requestPath: string;
  requestMethod: string;
  eventType: 'block' | 'challenge' | 'rate_limit' | 'whitelist' | 'blacklist';
  reason: string;
  headers: Record<string, string>;
}

@Injectable()
export class DdosProtectionService {
  private readonly config: DdosConfig;
  private readonly blockedIps: Set<string> = new Set();
  private readonly rateLimitCounts: Map<
    string,
    { count: number; resetTime: Date }
  > = new Map();
  private readonly events: DdosEvent[] = [];

  constructor() {
    this.config = {
      enabled: process.env.DDOS_PROTECTION_ENABLED === 'true',

      provider:
        (process.env.DDOS_PROTECTION_PROVIDER as
          | 'cloudflare'
          | 'aws-shield'
          | 'custom') ?? 'cloudflare',
      apiKey: process.env.DDOS_PROTECTION_API_KEY ?? '',
      apiSecret: process.env.DDOS_PROTECTION_API_SECRET ?? '',
      zoneId: process.env.DDOS_PROTECTION_ZONE_ID ?? '',
      rateLimit: parseInt(process.env.DDOS_RATE_LIMIT ?? '100'),
      burstLimit: parseInt(process.env.DDOS_BURST_LIMIT ?? '50'),
      blockDuration: parseInt(process.env.DDOS_BLOCK_DURATION ?? '3600'),
      whitelistIps: process.env.DDOS_WHITELIST_IPS?.split(',') ?? [],
      blacklistIps: process.env.DDOS_BLACKLIST_IPS?.split(',') ?? [],
      customRules: this.getDefaultRules(),
    };

    if (this.config.enabled) {
      redactedLogger.log(
        'DDoS Protection Service initialized',
        'DdosProtectionService',
        {
          provider: this.config.provider,
          rateLimit: this.config.rateLimit,
          burstLimit: this.config.burstLimit,
        }
      );
    }
  }

  /**
   * Проверка запроса на DDoS атаку
   */
  async checkRequest(request: {
    ipAddress: string;
    userAgent: string;
    path: string;
    method: string;
    headers: Record<string, string>;
  }): Promise<{ allowed: boolean; reason?: string; challenge?: boolean }> {
    if (!this.config.enabled) {
      return { allowed: true };
    }

    const { ipAddress, userAgent, path, method, headers } = request;

    // Проверка белого списка
    if (this.config.whitelistIps.includes(ipAddress)) {
      this.logEvent(
        ipAddress,
        userAgent,
        path,
        method,
        headers,
        'whitelist',
        'IP in whitelist'
      );
      return { allowed: true };
    }

    // Проверка черного списка
    if (
      this.config.blacklistIps.includes(ipAddress) ||
      this.blockedIps.has(ipAddress)
    ) {
      this.logEvent(
        ipAddress,
        userAgent,
        path,
        method,
        headers,
        'blacklist',
        'IP in blacklist'
      );
      return { allowed: false, reason: 'IP blocked' };
    }

    // Проверка пользовательских правил
    const customRuleMatch = this.checkCustomRules(
      ipAddress,
      userAgent,
      path,
      method,
      headers
    );
    if (customRuleMatch) {
      if (customRuleMatch.action === 'block') {
        this.blockIp(ipAddress);
        this.logEvent(
          ipAddress,
          userAgent,
          path,
          method,
          headers,
          'block',
          customRuleMatch.reason
        );
        return { allowed: false, reason: customRuleMatch.reason };
      } else if (customRuleMatch.action === 'challenge') {
        this.logEvent(
          ipAddress,
          userAgent,
          path,
          method,
          headers,
          'challenge',
          customRuleMatch.reason
        );
        return { allowed: true, challenge: true };
      }
    }

    // Проверка rate limiting
    const rateLimitResult = this.checkRateLimit(ipAddress);
    if (!rateLimitResult.allowed) {
      this.logEvent(
        ipAddress,
        userAgent,
        path,
        method,
        headers,
        'rate_limit',
        'Rate limit exceeded'
      );
      return { allowed: false, reason: 'Rate limit exceeded' };
    }

    return { allowed: true };
  }

  /**
   * Проверка пользовательских правил
   */
  private checkCustomRules(
    _ipAddress: string,
    userAgent: string,
    path: string,
    method: string,
    headers: Record<string, string>
  ): { action: 'block' | 'challenge' | 'log'; reason: string } | null {
    for (const rule of this.config.customRules) {
      if (!rule.enabled) continue;

      let matches = false;

      // Проверка паттерна в User-Agent
      if (
        rule.pattern.includes('user-agent:') &&
        userAgent
          .toLowerCase()
          .includes(rule.pattern.split(':')[1]?.toLowerCase() ?? '')
      ) {
        matches = true;
      }

      // Проверка паттерна в пути
      if (
        rule.pattern.includes('path:') &&
        path
          .toLowerCase()
          .includes(rule.pattern.split(':')[1]?.toLowerCase() ?? '')
      ) {
        matches = true;
      }

      // Проверка паттерна в методе
      if (
        rule.pattern.includes('method:') &&
        method.toLowerCase() === rule.pattern.split(':')[1]?.toLowerCase()
      ) {
        matches = true;
      }

      // Проверка паттерна в заголовках
      if (
        rule.pattern.includes('header:') &&
        this.checkHeaderPattern(headers, rule.pattern)
      ) {
        matches = true;
      }

      if (matches) {
        return {
          action: rule.action,
          reason: rule.name,
        };
      }
    }

    return null;
  }

  /**
   * Проверка паттерна в заголовках
   */
  private checkHeaderPattern(
    headers: Record<string, string>,
    pattern: string
  ): boolean {
    const [headerName, headerValue] = pattern.split(':').slice(1);
    if (
      headerName == null ||
      headerName === '' ||
      headerValue == null ||
      headerValue === ''
    )
      return false;

    const header = headers[headerName.toLowerCase()];
    return header?.toLowerCase().includes(headerValue.toLowerCase()) === true;
  }

  /**
   * Проверка rate limiting
   */
  private checkRateLimit(ipAddress: string): {
    allowed: boolean;
    remaining: number;
  } {
    const now = new Date();
    const current = this.rateLimitCounts.get(ipAddress);

    if (!current || current.resetTime < now) {
      // Создание нового счетчика
      this.rateLimitCounts.set(ipAddress, {
        count: 1,
        resetTime: new Date(now.getTime() + 60000), // 1 минута
      });
      return { allowed: true, remaining: this.config.rateLimit - 1 };
    }

    if (current.count >= this.config.rateLimit) {
      return { allowed: false, remaining: 0 };
    }

    current.count++;
    return { allowed: true, remaining: this.config.rateLimit - current.count };
  }

  /**
   * Блокировка IP адреса
   */
  private blockIp(ipAddress: string): void {
    this.blockedIps.add(ipAddress);

    // Автоматическое разблокирование через указанное время
    setTimeout(() => {
      this.blockedIps.delete(ipAddress);
      redactedLogger.debug(
        `IP unblocked: ${ipAddress}`,
        'DdosProtectionService'
      );
    }, this.config.blockDuration * 1000);
  }

  /**
   * Логирование события DDoS
   */
  private logEvent(
    ipAddress: string,
    userAgent: string,
    path: string,
    method: string,
    headers: Record<string, string>,
    eventType: DdosEvent['eventType'],
    reason: string
  ): void {
    const event: DdosEvent = {
      id: `ddos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ipAddress,
      userAgent,
      requestPath: path,
      requestMethod: method,
      eventType,
      reason,
      headers,
    };

    this.events.push(event);

    // Ограничение размера лога событий
    if (this.events.length > 10000) {
      this.events.splice(0, 1000);
    }

    redactedLogger.debug(
      `DDoS event: ${eventType} for IP: ${ipAddress}`,
      'DdosProtectionService',
      {
        reason,
        path,
        method,
      }
    );
  }

  /**
   * Получение статистики DDoS защиты
   */
  getDdosStats() {
    const now = new Date();
    const lastHour = new Date(now.getTime() - 3600000);
    const lastDay = new Date(now.getTime() - 86400000);

    const eventsLastHour = this.events.filter(e => e.timestamp > lastHour);
    const eventsLastDay = this.events.filter(e => e.timestamp > lastDay);

    return {
      enabled: this.config.enabled,
      provider: this.config.provider,
      blockedIpsCount: this.blockedIps.size,
      rateLimitCounts: this.rateLimitCounts.size,
      eventsLastHour: eventsLastHour.length,
      eventsLastDay: eventsLastDay.length,
      totalEvents: this.events.length,
      whitelistIpsCount: this.config.whitelistIps.length,
      blacklistIpsCount: this.config.blacklistIps.length,
      customRulesCount: this.config.customRules.length,
      recentEvents: this.events.slice(-10).map(e => ({
        timestamp: e.timestamp,
        ipAddress: e.ipAddress,
        eventType: e.eventType,
        reason: e.reason,
      })),
    };
  }

  /**
   * Добавление IP в белый список
   */
  addToWhitelist(ipAddress: string): boolean {
    if (!this.config.whitelistIps.includes(ipAddress)) {
      this.config.whitelistIps.push(ipAddress);
      redactedLogger.log(
        `IP added to whitelist: ${ipAddress}`,
        'DdosProtectionService'
      );
      return true;
    }
    return false;
  }

  /**
   * Добавление IP в черный список
   */
  addToBlacklist(ipAddress: string): boolean {
    if (!this.config.blacklistIps.includes(ipAddress)) {
      this.config.blacklistIps.push(ipAddress);
      this.blockedIps.add(ipAddress);
      redactedLogger.log(
        `IP added to blacklist: ${ipAddress}`,
        'DdosProtectionService'
      );
      return true;
    }
    return false;
  }

  /**
   * Получение стандартных правил DDoS защиты
   */
  private getDefaultRules(): DdosRule[] {
    return [
      {
        id: 'rule-1',
        name: 'Block common bot user agents',
        pattern: 'user-agent:bot',
        action: 'block',
        priority: 1,
        enabled: true,
      },
      {
        id: 'rule-2',
        name: 'Block suspicious paths',
        pattern: 'path:admin',
        action: 'challenge',
        priority: 2,
        enabled: true,
      },
      {
        id: 'rule-3',
        name: 'Block excessive POST requests',
        pattern: 'method:post',
        action: 'log',
        priority: 3,
        enabled: true,
      },
      {
        id: 'rule-4',
        name: 'Block requests without User-Agent',
        pattern: 'header:user-agent',
        action: 'block',
        priority: 4,
        enabled: true,
      },
    ];
  }
}

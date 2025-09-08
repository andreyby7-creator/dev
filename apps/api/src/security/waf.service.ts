import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { getEnv } from '../utils/getEnv';

// Zod схемы для валидации
const WafRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum([
    'sql_injection',
    'xss',
    'path_traversal',
    'command_injection',
    'file_upload',
    'rate_limit',
    'geo_block',
  ]),
  pattern: z.string(),
  action: z.enum(['block', 'challenge', 'log', 'redirect']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  enabled: z.boolean(),
  priority: z.number(),
  conditions: z
    .array(
      z.object({
        field: z.string(),
        operator: z.enum(['equals', 'contains', 'regex', 'ip_range', 'geo']),
        value: z.string(),
      })
    )
    .optional(),
});

// Zod схемы для валидации
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const WafEventSchema = z.object({
  id: z.string(),
  timestamp: z.date(),
  ruleId: z.string(),
  ruleName: z.string(),
  ruleType: z.string(),
  action: z.string(),
  severity: z.string(),
  sourceIp: z.string(),
  userAgent: z.string(),
  requestUrl: z.string(),
  requestMethod: z.string(),
  requestHeaders: z.record(z.string(), z.string()),
  requestBody: z.string().optional(),
  responseStatus: z.number(),
  responseTime: z.number(),
  blocked: z.boolean(),
  details: z.record(z.string(), z.unknown()).optional(),
});

const WafConfigSchema = z.object({
  enabled: z.boolean(),
  mode: z.enum(['block', 'monitor', 'challenge']),
  defaultAction: z.enum(['block', 'challenge', 'log']),
  maxRequestSize: z.number(),
  maxUrlLength: z.number(),
  maxHeaderCount: z.number(),
  allowedFileTypes: z.array(z.string()),
  blockedFileTypes: z.array(z.string()),
  rateLimitEnabled: z.boolean(),
  rateLimitRequests: z.number(),
  rateLimitWindow: z.number(),
  geoBlockingEnabled: z.boolean(),
  allowedCountries: z.array(z.string()),
  blockedCountries: z.array(z.string()),
  ipWhitelist: z.array(z.string()),
  ipBlacklist: z.array(z.string()),
});

// TypeScript типы из схем
type WafRule = z.infer<typeof WafRuleSchema>;
type WafEvent = z.infer<typeof WafEventSchema>;
type WafConfig = z.infer<typeof WafConfigSchema>;

// Интерфейсы для статистики и мониторинга
export interface WafStats {
  totalRequests: number;
  blockedRequests: number;
  allowedRequests: number;
  blockedRate: number;
  topBlockedIps: Array<{ ip: string; count: number }>;
  topBlockedRules: Array<{ ruleId: string; ruleName: string; count: number }>;
  topBlockedCountries: Array<{ country: string; count: number }>;
  averageResponseTime: number;
  eventsBySeverity: Record<string, number>;
  eventsByType: Record<string, number>;
}

export interface WafThreatIntel {
  maliciousIps: string[];
  suspiciousPatterns: string[];
  knownAttackSignatures: string[];
  reputationScores: Record<string, number>;
  threatFeeds: Array<{
    name: string;
    url: string;
    lastUpdate: Date;
    status: 'active' | 'inactive' | 'error';
  }>;
}

@Injectable()
export class WafService {
  private readonly logger = new Logger(WafService.name);
  private readonly rules: WafRule[] = [];
  private readonly events: WafEvent[] = [];
  private config!: WafConfig;
  private threatIntel!: WafThreatIntel;

  constructor() {
    this.initializeWaf();
  }

  private initializeWaf(): void {
    const configData = {
      enabled: getEnv('WAF_ENABLED', 'boolean', { default: false }),
      mode: getEnv('WAF_MODE', 'string', {
        default: 'monitor',
      }) as WafConfig['mode'],
      defaultAction: getEnv('WAF_DEFAULT_ACTION', 'string', {
        default: 'block',
      }) as WafConfig['defaultAction'],
      maxRequestSize: getEnv('WAF_MAX_REQUEST_SIZE', 'number', {
        default: 10485760,
      }), // 10MB
      maxUrlLength: getEnv('WAF_MAX_URL_LENGTH', 'number', { default: 2048 }),
      maxHeaderCount: getEnv('WAF_MAX_HEADER_COUNT', 'number', { default: 50 }),
      allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'],
      blockedFileTypes: ['exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js'],
      rateLimitEnabled: getEnv('WAF_RATE_LIMIT_ENABLED', 'boolean', {
        default: false,
      }),
      rateLimitRequests: getEnv('WAF_RATE_LIMIT_REQUESTS', 'number', {
        default: 100,
      }),
      rateLimitWindow: getEnv('WAF_RATE_LIMIT_WINDOW', 'number', {
        default: 60000,
      }),
      geoBlockingEnabled: getEnv('WAF_GEO_BLOCKING_ENABLED', 'boolean', {
        default: false,
      }),
      allowedCountries: ['BY', 'RU', 'US', 'GB', 'DE'],
      blockedCountries: [],
      ipWhitelist: [],
      ipBlacklist: [],
    };
    this.config = WafConfigSchema.parse(configData);

    this.threatIntel = {
      maliciousIps: [],
      suspiciousPatterns: [
        'union select',
        'script>',
        '../',
        'cmd.exe',
        'eval(',
        'document.cookie',
      ],
      knownAttackSignatures: ['sqlmap', 'nikto', 'nmap', 'burp', 'owasp'],
      reputationScores: {},
      threatFeeds: [
        {
          name: 'AbuseIPDB',
          url: 'https://api.abuseipdb.com/api/v2/blacklist',
          lastUpdate: new Date(),
          status: 'active',
        },
        {
          name: 'Tor Exit Nodes',
          url: 'https://check.torproject.org/exit-addresses',
          lastUpdate: new Date(),
          status: 'active',
        },
      ],
    };

    this.initializeDefaultRules();
    this.logger.log('WAF service initialized');
  }

  private initializeDefaultRules(): void {
    const defaultRules: WafRule[] = [
      {
        id: 'sql-injection-1',
        name: 'SQL Injection Detection',
        description: 'Detect common SQL injection patterns',
        type: 'sql_injection',
        pattern:
          '(union|select|insert|update|delete|drop|create|alter)\\s+(select|from|where|into|table|database)',
        action: 'block',
        severity: 'high',
        enabled: true,
        priority: 1,
      },
      {
        id: 'xss-1',
        name: 'XSS Detection',
        description: 'Detect cross-site scripting attempts',
        type: 'xss',
        pattern:
          '<script[^>]*>.*?</script>|<script[^>]*>|javascript:|vbscript:|onload=|onerror=',
        action: 'block',
        severity: 'high',
        enabled: true,
        priority: 2,
      },
      {
        id: 'path-traversal-1',
        name: 'Path Traversal Detection',
        description: 'Detect directory traversal attempts',
        type: 'path_traversal',
        pattern: '\\.\\./|\\.\\.\\\\|%2e%2e%2f|%2e%2e%5c',
        action: 'block',
        severity: 'medium',
        enabled: true,
        priority: 3,
      },
      {
        id: 'command-injection-1',
        name: 'Command Injection Detection',
        description: 'Detect command injection attempts',
        type: 'command_injection',
        pattern: ';\\s*(ls|cat|rm|wget|curl|nc|telnet|ssh|ftp|ping|nslookup)',
        action: 'block',
        severity: 'critical',
        enabled: true,
        priority: 1,
      },
      {
        id: 'file-upload-1',
        name: 'Malicious File Upload Detection',
        description: 'Detect malicious file uploads',
        type: 'file_upload',
        pattern: '\\.(exe|bat|cmd|com|pif|scr|vbs|js|php|asp|aspx)$',
        action: 'block',
        severity: 'high',
        enabled: true,
        priority: 2,
      },
    ];

    this.rules.push(...defaultRules);
  }

  // Управление правилами WAF
  async createRule(ruleData: unknown): Promise<WafRule> {
    const validatedRule = WafRuleSchema.parse(
      ruleData as Record<string, unknown>
    );
    this.rules.push(validatedRule);
    this.logger.log(
      `WAF rule created: ${validatedRule.name} (${validatedRule.id})`
    );
    return validatedRule;
  }

  async getRuleById(ruleId: string): Promise<WafRule | null> {
    return this.rules.find(r => r.id === ruleId) ?? null;
  }

  async getAllRules(): Promise<WafRule[]> {
    return this.rules.filter(r => r.enabled);
  }

  async updateRule(
    ruleId: string,
    updates: Partial<WafRule>
  ): Promise<WafRule | null> {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      Object.assign(rule, updates);
      this.logger.log(`WAF rule updated: ${ruleId}`);
      return rule;
    }
    return null;
  }

  async deleteRule(ruleId: string): Promise<void> {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index !== -1) {
      this.rules.splice(index, 1);
      this.logger.log(`WAF rule deleted: ${ruleId}`);
    }
  }

  // Проверка запросов
  async inspectRequest(requestData: {
    sourceIp: string;
    userAgent: string;
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
    country?: string;
  }): Promise<{
    allowed: boolean;
    action: 'allow' | 'block' | 'challenge' | 'log';
    ruleId?: string;
    ruleName?: string;
    severity?: string;
    reason?: string;
  }> {
    if (!this.config.enabled) {
      return { allowed: true, action: 'allow' };
    }

    // Проверка IP whitelist/blacklist
    if (
      this.config.ipWhitelist.length > 0 &&
      !this.config.ipWhitelist.includes(requestData.sourceIp)
    ) {
      return {
        allowed: false,
        action: 'block',
        reason: 'IP not in whitelist',
      };
    }

    if (this.config.ipBlacklist.includes(requestData.sourceIp)) {
      return {
        allowed: false,
        action: 'block',
        reason: 'IP in blacklist',
      };
    }

    // Проверка геоблокировки
    if (
      this.config.geoBlockingEnabled &&
      requestData.country != null &&
      requestData.country !== ''
    ) {
      if (this.config.blockedCountries.includes(requestData.country)) {
        return {
          allowed: false,
          action: 'block',
          reason: `Country ${requestData.country} is blocked`,
        };
      }
    }

    // Проверка размера запроса
    const requestSize = JSON.stringify(requestData).length;
    if (requestSize > this.config.maxRequestSize) {
      return {
        allowed: false,
        action: 'block',
        reason: 'Request too large',
      };
    }

    // Проверка длины URL
    if (requestData.url.length > this.config.maxUrlLength) {
      return {
        allowed: false,
        action: 'block',
        reason: 'URL too long',
      };
    }

    // Проверка количества заголовков
    if (Object.keys(requestData.headers).length > this.config.maxHeaderCount) {
      return {
        allowed: false,
        action: 'block',
        reason: 'Too many headers',
      };
    }

    // Проверка по правилам WAF
    const sortedRules = this.rules
      .filter(r => r.enabled)
      .sort((a, b) => a.priority - b.priority);

    for (const rule of sortedRules) {
      const isMatch = this.checkRuleMatch(rule, requestData);
      if (isMatch) {
        const event: WafEvent = {
          id: `waf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
          ruleId: rule.id,
          ruleName: rule.name,
          ruleType: rule.type,
          action: rule.action,
          severity: rule.severity,
          sourceIp: requestData.sourceIp,
          userAgent: requestData.userAgent,
          requestUrl: requestData.url,
          requestMethod: requestData.method,
          requestHeaders: requestData.headers,
          requestBody: requestData.body,
          responseStatus: 0,
          responseTime: 0,
          blocked: rule.action === 'block',
          details: { matchedPattern: rule.pattern },
        };

        this.events.push(event);
        this.logger.warn(
          `WAF rule triggered: ${rule.name} for IP ${requestData.sourceIp}`
        );

        return {
          allowed: rule.action !== 'block',
          action: rule.action as 'allow' | 'block' | 'challenge' | 'log',
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          reason: `Matched rule: ${rule.name}`,
        };
      }
    }

    return { allowed: true, action: 'allow' };
  }

  private checkRuleMatch(
    rule: WafRule,
    requestData: {
      sourceIp: string;
      userAgent: string;
      url: string;
      method: string;
      headers: Record<string, string>;
      body?: string;
      country?: string;
    }
  ): boolean {
    const searchText = [
      requestData.url,
      requestData.userAgent,
      requestData.body ?? '',
      JSON.stringify(requestData.headers),
    ]
      .join(' ')
      .toLowerCase();

    const regex = new RegExp(rule.pattern, 'i');
    return regex.test(searchText);
  }

  // Управление событиями
  async getEvents(limit = 100): Promise<WafEvent[]> {
    return this.events
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async getEventsByIp(ip: string, limit = 50): Promise<WafEvent[]> {
    return this.events
      .filter(e => e.sourceIp === ip)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async getEventsByRule(ruleId: string, limit = 50): Promise<WafEvent[]> {
    return this.events
      .filter(e => e.ruleId === ruleId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Статистика
  async getWafStats(): Promise<WafStats> {
    const totalRequests = this.events.length;
    const blockedRequests = this.events.filter(e => e.blocked).length;
    const allowedRequests = totalRequests - blockedRequests;
    const blockedRate =
      totalRequests > 0 ? (blockedRequests / totalRequests) * 100 : 0;

    // Top blocked IPs
    const ipCounts = this.events
      .filter(e => e.blocked)
      .reduce(
        (acc, event) => {
          acc[event.sourceIp] = (acc[event.sourceIp] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

    const topBlockedIps = Object.entries(ipCounts)
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top blocked rules
    const ruleCounts = this.events
      .filter(e => e.blocked)
      .reduce(
        (acc, event) => {
          acc[event.ruleId] = (acc[event.ruleId] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

    const topBlockedRules = Object.entries(ruleCounts)
      .map(([ruleId, count]) => {
        const rule = this.rules.find(r => r.id === ruleId);
        return { ruleId, ruleName: rule?.name ?? 'Unknown', count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Events by severity
    const eventsBySeverity = this.events.reduce(
      (acc, event) => {
        acc[event.severity] = (acc[event.severity] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Events by type
    const eventsByType = this.events.reduce(
      (acc, event) => {
        acc[event.ruleType] = (acc[event.ruleType] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalRequests,
      blockedRequests,
      allowedRequests,
      blockedRate,
      topBlockedIps,
      topBlockedRules,
      topBlockedCountries: [], // TODO: Implement country detection
      averageResponseTime: 0, // TODO: Calculate from events
      eventsBySeverity,
      eventsByType,
    };
  }

  // Конфигурация
  async getWafConfig(): Promise<WafConfig> {
    return this.config;
  }

  async updateWafConfig(updates: Partial<WafConfig>): Promise<WafConfig> {
    Object.assign(this.config, updates);
    this.logger.log('WAF configuration updated');
    return this.config;
  }

  // Threat Intelligence
  async getThreatIntel(): Promise<WafThreatIntel> {
    return this.threatIntel;
  }

  async addMaliciousIp(ip: string): Promise<void> {
    if (!this.threatIntel.maliciousIps.includes(ip)) {
      this.threatIntel.maliciousIps.push(ip);
      this.logger.log(`Malicious IP added: ${ip}`);
    }
  }

  async removeMaliciousIp(ip: string): Promise<void> {
    const index = this.threatIntel.maliciousIps.indexOf(ip);
    if (index !== -1) {
      this.threatIntel.maliciousIps.splice(index, 1);
      this.logger.log(`Malicious IP removed: ${ip}`);
    }
  }

  // Health check
  async healthCheck(): Promise<{
    status: string;
    rules: number;
    events: number;
    config: string;
  }> {
    return {
      status: 'healthy',
      rules: this.rules.filter(r => r.enabled).length,
      events: this.events.length,
      config: this.config.enabled ? 'enabled' : 'disabled',
    };
  }
}

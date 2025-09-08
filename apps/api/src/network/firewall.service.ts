import { Injectable } from '@nestjs/common';
import { redactedLogger } from '../utils/redacted-logger';

export interface FirewallRule {
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
}

export interface SecurityGroup {
  id: string;
  name: string;
  description: string;
  vpcId: string;
  rules: FirewallRule[];
  attachedResources: string[];
  tags: Record<string, string>;
}

export interface FirewallPacket {
  sourceIp: string;
  destinationIp: string;
  protocol: string;
  port: number;
  direction: 'inbound' | 'outbound';
  securityGroupId: string;
}

export interface FirewallEvent {
  id: string;
  timestamp: Date;
  ruleId: string;
  action: 'allow' | 'deny';
  sourceIp: string;
  destinationIp: string;
  protocol: string;
  port: number;
  reason: string;
  packetSize: number;
}

@Injectable()
export class FirewallService {
  private readonly securityGroups: Map<string, SecurityGroup> = new Map();
  private readonly firewallEvents: FirewallEvent[] = [];
  private readonly maxEventsHistory = 5000;

  constructor() {
    this.initializeDefaultSecurityGroups();
    redactedLogger.log('Firewall Service initialized', 'FirewallService');
  }

  /**
   * Инициализация стандартных групп безопасности
   */
  private initializeDefaultSecurityGroups(): void {
    const defaultGroups: SecurityGroup[] = [
      {
        id: 'sg-web',
        name: 'Web Security Group',
        description: 'Security group for web servers',
        vpcId: 'vpc-main',
        rules: this.getWebServerRules(),
        attachedResources: [],
        tags: { Environment: 'production', Purpose: 'web' },
      },
      {
        id: 'sg-database',
        name: 'Database Security Group',
        description: 'Security group for database servers',
        vpcId: 'vpc-main',
        rules: this.getDatabaseRules(),
        attachedResources: [],
        tags: { Environment: 'production', Purpose: 'database' },
      },
      {
        id: 'sg-admin',
        name: 'Admin Security Group',
        description: 'Security group for administrative access',
        vpcId: 'vpc-main',
        rules: this.getAdminRules(),
        attachedResources: [],
        tags: { Environment: 'production', Purpose: 'admin' },
      },
    ];

    defaultGroups.forEach(group => {
      this.securityGroups.set(group.id, group);
    });
  }

  /**
   * Правила для веб-серверов
   */
  private getWebServerRules(): FirewallRule[] {
    return [
      {
        id: 'rule-web-http',
        name: 'Allow HTTP',
        description: 'Allow HTTP traffic from anywhere',
        direction: 'inbound',
        protocol: 'tcp',
        portRange: '80',
        source: '0.0.0.0/0',
        destination: '0.0.0.0/0',
        action: 'allow',
        priority: 100,
        enabled: true,
        tags: { Service: 'http' },
      },
      {
        id: 'rule-web-https',
        name: 'Allow HTTPS',
        description: 'Allow HTTPS traffic from anywhere',
        direction: 'inbound',
        protocol: 'tcp',
        portRange: '443',
        source: '0.0.0.0/0',
        destination: '0.0.0.0/0',
        action: 'allow',
        priority: 110,
        enabled: true,
        tags: { Service: 'https' },
      },
      {
        id: 'rule-web-ssh',
        name: 'Allow SSH from admin',
        description: 'Allow SSH access from admin network',
        direction: 'inbound',
        protocol: 'tcp',
        portRange: '22',
        source: '10.0.4.0/24',
        destination: '0.0.0.0/0',
        action: 'allow',
        priority: 120,
        enabled: true,
        tags: { Service: 'ssh' },
      },
    ];
  }

  /**
   * Правила для баз данных
   */
  private getDatabaseRules(): FirewallRule[] {
    return [
      {
        id: 'rule-db-postgres',
        name: 'Allow PostgreSQL',
        description: 'Allow PostgreSQL from application servers',
        direction: 'inbound',
        protocol: 'tcp',
        portRange: '5432',
        source: '10.0.2.0/24',
        destination: '0.0.0.0/0',
        action: 'allow',
        priority: 100,
        enabled: true,
        tags: { Service: 'postgresql' },
      },
      {
        id: 'rule-db-redis',
        name: 'Allow Redis',
        description: 'Allow Redis from application servers',
        direction: 'inbound',
        protocol: 'tcp',
        portRange: '6379',
        source: '10.0.2.0/24',
        destination: '0.0.0.0/0',
        action: 'allow',
        priority: 110,
        enabled: true,
        tags: { Service: 'redis' },
      },
      {
        id: 'rule-db-ssh',
        name: 'Allow SSH from admin',
        description: 'Allow SSH access from admin network',
        direction: 'inbound',
        protocol: 'tcp',
        portRange: '22',
        source: '10.0.4.0/24',
        destination: '0.0.0.0/0',
        action: 'allow',
        priority: 120,
        enabled: true,
        tags: { Service: 'ssh' },
      },
    ];
  }

  /**
   * Правила для административного доступа
   */
  private getAdminRules(): FirewallRule[] {
    return [
      {
        id: 'rule-admin-ssh',
        name: 'Allow SSH from trusted IPs',
        description: 'Allow SSH access from trusted IP addresses',
        direction: 'inbound',
        protocol: 'tcp',
        portRange: '22',
        source: process.env.ADMIN_IPS ?? '10.0.0.0/8',
        destination: '0.0.0.0/0',
        action: 'allow',
        priority: 100,
        enabled: true,
        tags: { Service: 'ssh' },
      },
      {
        id: 'rule-admin-rdp',
        name: 'Allow RDP from trusted IPs',
        description: 'Allow RDP access from trusted IP addresses',
        direction: 'inbound',
        protocol: 'tcp',
        portRange: '3389',
        source: process.env.ADMIN_IPS ?? '10.0.0.0/8',
        destination: '0.0.0.0/0',
        action: 'allow',
        priority: 110,
        enabled: true,
        tags: { Service: 'rdp' },
      },
    ];
  }

  /**
   * Проверка пакета через правила файрвола
   */
  async checkPacket(packet: {
    sourceIp: string;
    destinationIp: string;
    protocol: string;
    port: number;
    direction: 'inbound' | 'outbound';
    securityGroupId: string;
  }): Promise<{ allowed: boolean; ruleId?: string; reason: string }> {
    const { securityGroupId, direction } = packet;

    const securityGroup = this.securityGroups.get(securityGroupId);
    if (!securityGroup) {
      return { allowed: false, reason: 'Security group not found' };
    }

    // Сортировка правил по приоритету (высокий приоритет = низкий номер)
    const sortedRules = securityGroup.rules
      .filter(rule => rule.enabled && rule.direction === direction)
      .sort((a, b) => a.priority - b.priority);

    for (const rule of sortedRules) {
      if (this.matchesRule(packet, rule)) {
        this.logFirewallEvent(packet, rule);
        return {
          allowed: rule.action === 'allow',
          ruleId: rule.id,
          reason: rule.action === 'allow' ? 'Rule allowed' : 'Rule denied',
        };
      }
    }

    // По умолчанию запрещаем
    const defaultAction = 'deny';
    this.logFirewallEvent(packet, {
      id: 'default',
      name: 'Default Rule',
      description: 'Default deny rule',
      direction,
      protocol: 'all',
      portRange: 'all',
      source: '0.0.0.0/0',
      destination: '0.0.0.0/0',
      action: defaultAction,
      priority: 999,
      enabled: true,
      tags: {},
    });

    return { allowed: false, reason: 'Default deny rule' };
  }

  /**
   * Проверка соответствия пакета правилу
   */
  private matchesRule(packet: FirewallPacket, rule: FirewallRule): boolean {
    // Проверка протокола
    if (rule.protocol !== 'all' && rule.protocol !== packet.protocol) {
      return false;
    }

    // Проверка порта
    if (rule.portRange !== 'all') {
      const port = parseInt(rule.portRange);
      if (packet.port !== port) {
        return false;
      }
    }

    // Проверка IP адреса источника
    if (!this.isIpInRange(packet.sourceIp, rule.source)) {
      return false;
    }

    // Проверка IP адреса назначения
    if (!this.isIpInRange(packet.destinationIp, rule.destination)) {
      return false;
    }

    return true;
  }

  /**
   * Проверка IP адреса в диапазоне
   */
  private isIpInRange(ip: string, range: string): boolean {
    if (range === '0.0.0.0/0') return true;

    // Простая проверка CIDR (в продакшене использовать ip-address библиотеку)
    const [networkIp, prefix] = range.split('/');
    const prefixNum = parseInt(prefix ?? '0');

    // Упрощенная логика для демонстрации
    return (
      networkIp != null &&
      ip.startsWith(
        networkIp
          .split('.')
          .slice(0, prefixNum / 8)
          .join('.')
      )
    );
  }

  /**
   * Логирование события файрвола
   */
  private logFirewallEvent(packet: FirewallPacket, rule: FirewallRule): void {
    const event: FirewallEvent = {
      id: `fw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ruleId: rule.id,
      action: rule.action,
      sourceIp: packet.sourceIp,
      destinationIp: packet.destinationIp,
      protocol: packet.protocol,
      port: packet.port,
      reason: rule.action === 'allow' ? 'Rule allowed' : 'Rule denied',
      packetSize: this.generateRandomPacketSize(),
    };

    this.firewallEvents.push(event);
    this.cleanupOldEvents();

    redactedLogger.debug(
      `Firewall event: ${rule.action} ${packet.protocol}:${packet.port}`,
      'FirewallService',
      {
        ruleId: rule.id,
        sourceIp: packet.sourceIp,
        destinationIp: packet.destinationIp,
      }
    );
  }

  /**
   * Генерация случайного размера пакета
   */
  private generateRandomPacketSize(): number {
    return Math.floor(Math.random() * 1500) + 64; // 64-1500 bytes
  }

  /**
   * Очистка старых событий
   */
  private cleanupOldEvents(): void {
    if (this.firewallEvents.length > this.maxEventsHistory) {
      this.firewallEvents.splice(
        0,
        this.firewallEvents.length - this.maxEventsHistory
      );
    }
  }

  /**
   * Создание новой группы безопасности
   */
  createSecurityGroup(group: Omit<SecurityGroup, 'id'>): string {
    const groupId = `sg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newGroup: SecurityGroup = {
      ...group,
      id: groupId,
    };

    this.securityGroups.set(groupId, newGroup);
    redactedLogger.log(`Security group created: ${groupId}`, 'FirewallService');
    return groupId;
  }

  /**
   * Добавление правила в группу безопасности
   */
  addRuleToSecurityGroup(
    securityGroupId: string,
    rule: Omit<FirewallRule, 'id'>
  ): string {
    const securityGroup = this.securityGroups.get(securityGroupId);
    if (!securityGroup) {
      throw new Error('Security group not found');
    }

    const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newRule: FirewallRule = {
      ...rule,
      id: ruleId,
    };

    securityGroup.rules.push(newRule);
    redactedLogger.log(
      `Rule added to security group: ${ruleId}`,
      'FirewallService'
    );
    return ruleId;
  }

  /**
   * Удаление правила из группы безопасности
   */
  removeRuleFromSecurityGroup(
    securityGroupId: string,
    ruleId: string
  ): boolean {
    const securityGroup = this.securityGroups.get(securityGroupId);
    if (!securityGroup) {
      return false;
    }

    const index = securityGroup.rules.findIndex(rule => rule.id === ruleId);
    if (index === -1) {
      return false;
    }

    securityGroup.rules.splice(index, 1);
    redactedLogger.log(
      `Rule removed from security group: ${ruleId}`,
      'FirewallService'
    );
    return true;
  }

  /**
   * Обновление правила
   */
  updateRule(
    securityGroupId: string,
    ruleId: string,
    updates: Partial<FirewallRule>
  ): boolean {
    const securityGroup = this.securityGroups.get(securityGroupId);
    if (!securityGroup) {
      return false;
    }

    const rule = securityGroup.rules.find(r => r.id === ruleId);
    if (!rule) {
      return false;
    }

    Object.assign(rule, updates);
    redactedLogger.log(`Rule updated: ${ruleId}`, 'FirewallService');
    return true;
  }

  /**
   * Получение статистики файрвола
   */
  getFirewallStats() {
    const now = new Date();
    const lastHour = new Date(now.getTime() - 3600000);
    const lastDay = new Date(now.getTime() - 86400000);

    const eventsLastHour = this.firewallEvents.filter(
      e => e.timestamp > lastHour
    );
    const eventsLastDay = this.firewallEvents.filter(
      e => e.timestamp > lastDay
    );

    const allowedEvents = this.firewallEvents.filter(e => e.action === 'allow');
    const deniedEvents = this.firewallEvents.filter(e => e.action === 'deny');

    return {
      totalSecurityGroups: this.securityGroups.size,
      totalRules: Array.from(this.securityGroups.values()).reduce(
        (sum, sg) => sum + sg.rules.length,
        0
      ),
      totalEvents: this.firewallEvents.length,
      eventsLastHour: eventsLastHour.length,
      eventsLastDay: eventsLastDay.length,
      allowedEvents: allowedEvents.length,
      deniedEvents: deniedEvents.length,
      securityGroups: Array.from(this.securityGroups.values()).map(sg => ({
        id: sg.id,
        name: sg.name,
        description: sg.description,
        ruleCount: sg.rules.length,
        attachedResources: sg.attachedResources.length,
      })),
      recentEvents: this.firewallEvents.slice(-10).map(e => ({
        id: e.id,
        timestamp: e.timestamp,
        action: e.action,
        sourceIp: e.sourceIp,
        destinationIp: e.destinationIp,
        protocol: e.protocol,
        port: e.port,
        reason: e.reason,
      })),
    };
  }

  /**
   * Получение событий файрвола за период
   */
  getEventsForPeriod(startTime: Date, endTime: Date): FirewallEvent[] {
    return this.firewallEvents.filter(
      e => e.timestamp >= startTime && e.timestamp <= endTime
    );
  }

  /**
   * Получение событий по действию
   */
  getEventsByAction(action: 'allow' | 'deny'): FirewallEvent[] {
    return this.firewallEvents.filter(e => e.action === action);
  }

  /**
   * Получение событий по правилу
   */
  getEventsByRule(ruleId: string): FirewallEvent[] {
    return this.firewallEvents.filter(e => e.ruleId === ruleId);
  }

  /**
   * Привязка ресурса к группе безопасности
   */
  attachResource(securityGroupId: string, resourceId: string): boolean {
    const securityGroup = this.securityGroups.get(securityGroupId);
    if (!securityGroup) {
      return false;
    }

    if (!securityGroup.attachedResources.includes(resourceId)) {
      securityGroup.attachedResources.push(resourceId);
      redactedLogger.log(
        `Resource attached to security group: ${resourceId}`,
        'FirewallService'
      );
    }

    return true;
  }

  /**
   * Отвязка ресурса от группы безопасности
   */
  detachResource(securityGroupId: string, resourceId: string): boolean {
    const securityGroup = this.securityGroups.get(securityGroupId);
    if (!securityGroup) {
      return false;
    }

    const index = securityGroup.attachedResources.indexOf(resourceId);
    if (index !== -1) {
      securityGroup.attachedResources.splice(index, 1);
      redactedLogger.log(
        `Resource detached from security group: ${resourceId}`,
        'FirewallService'
      );
      return true;
    }

    return false;
  }
}

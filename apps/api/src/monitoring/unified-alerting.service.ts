import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface IAlertRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldown: number; // в секундах
  channels: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IAlert {
  id: string;
  ruleId: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'firing' | 'resolved' | 'acknowledged';
  value: number;
  threshold: number;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  startsAt: Date;
  endsAt?: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface INotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'slack' | 'webhook' | 'telegram' | 'sms';
  config: Record<string, unknown>;
  enabled: boolean;
  rateLimit: {
    maxPerHour: number;
    maxPerDay: number;
  };
  filters: {
    severities: string[];
    tags: string[];
  };
}

export interface INotification {
  id: string;
  channelId: string;
  alertId: string;
  status: 'pending' | 'sent' | 'failed' | 'rate_limited';
  sentAt?: Date;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

@Injectable()
export class UnifiedAlertingService {
  private readonly logger = new Logger(UnifiedAlertingService.name);
  private alertRules = new Map<string, IAlertRule>();
  private activeAlerts = new Map<string, IAlert>();
  private notificationChannels = new Map<string, INotificationChannel>();
  private notifications = new Map<string, INotification>();
  private lastTriggered = new Map<string, Date>();

  constructor(
    private _configService: ConfigService,
    private eventEmitter: EventEmitter2
  ) {
    this.initializeDefaultRules();
    this.initializeDefaultChannels();
    this.startAlertEvaluation();
    // Используем _configService
    this._configService.get('ALERTING_ENABLED');
  }

  private initializeDefaultRules(): void {
    const defaultRules: IAlertRule[] = [
      {
        id: 'high-cpu-usage',
        name: 'High CPU Usage',
        description: 'Alert when CPU usage exceeds 80%',
        condition: 'system.cpu.usage',
        threshold: 80,
        operator: 'gt',
        severity: 'high',
        enabled: true,
        cooldown: 300, // 5 минут
        channels: ['email-alerts', 'slack-devops'],
        tags: ['system', 'performance'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'high-memory-usage',
        name: 'High Memory Usage',
        description: 'Alert when memory usage exceeds 85%',
        condition: 'system.memory.usage',
        threshold: 85,
        operator: 'gt',
        severity: 'high',
        enabled: true,
        cooldown: 300,
        channels: ['email-alerts', 'slack-devops'],
        tags: ['system', 'performance'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        description: 'Alert when error rate exceeds 5%',
        condition: 'http.errors.rate',
        threshold: 5,
        operator: 'gt',
        severity: 'critical',
        enabled: true,
        cooldown: 60, // 1 минута
        channels: ['email-alerts', 'slack-devops', 'telegram-admin'],
        tags: ['api', 'errors'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'low-disk-space',
        name: 'Low Disk Space',
        description: 'Alert when disk space is below 10%',
        condition: 'system.disk.usage',
        threshold: 90,
        operator: 'gt',
        severity: 'medium',
        enabled: true,
        cooldown: 600, // 10 минут
        channels: ['email-alerts'],
        tags: ['system', 'storage'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'service-down',
        name: 'Service Down',
        description: 'Alert when a service is not responding',
        condition: 'service.health',
        threshold: 0,
        operator: 'eq',
        severity: 'critical',
        enabled: true,
        cooldown: 30, // 30 секунд
        channels: [
          'email-alerts',
          'slack-devops',
          'telegram-admin',
          'sms-alerts',
        ],
        tags: ['service', 'availability'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    defaultRules.forEach(rule => {
      this.alertRules.set(rule.id, rule);
    });

    this.logger.log(`Initialized ${defaultRules.length} default alert rules`);
  }

  private initializeDefaultChannels(): void {
    const defaultChannels: INotificationChannel[] = [
      {
        id: 'email-alerts',
        name: 'Email Alerts',
        type: 'email',
        config: {
          smtp: {
            host: this._configService.get('SMTP_HOST', 'localhost'),
            port: this._configService.get('SMTP_PORT', 587),
            secure: false,
            auth: {
              user: this._configService.get('SMTP_USER', ''),
              pass: this._configService.get('SMTP_PASS', ''),
            },
          },
          from: this._configService.get(
            'ALERT_EMAIL_FROM',
            'alerts@example.com'
          ),
          to: this._configService
            .get('ALERT_EMAIL_TO', 'admin@example.com')
            .split(','),
        },
        enabled: true,
        rateLimit: { maxPerHour: 20, maxPerDay: 100 },
        filters: {
          severities: ['medium', 'high', 'critical'],
          tags: [],
        },
      },
      {
        id: 'slack-devops',
        name: 'Slack DevOps',
        type: 'slack',
        config: {
          webhookUrl: this._configService.get('SLACK_WEBHOOK_URL', ''),
          channel: '#devops-alerts',
          username: 'AlertBot',
          iconEmoji: ':warning:',
        },
        enabled: true,
        rateLimit: { maxPerHour: 50, maxPerDay: 200 },
        filters: {
          severities: ['high', 'critical'],
          tags: ['system', 'api', 'service'],
        },
      },
      {
        id: 'telegram-admin',
        name: 'Telegram Admin',
        type: 'telegram',
        config: {
          botToken: this._configService.get('TELEGRAM_BOT_TOKEN', ''),
          chatId: this._configService.get('TELEGRAM_CHAT_ID', ''),
          parseMode: 'HTML',
        },
        enabled: true,
        rateLimit: { maxPerHour: 30, maxPerDay: 150 },
        filters: {
          severities: ['critical'],
          tags: [],
        },
      },
      {
        id: 'sms-alerts',
        name: 'SMS Alerts',
        type: 'sms',
        config: {
          provider: 'twilio',
          accountSid: this._configService.get('TWILIO_ACCOUNT_SID', ''),
          authToken: this._configService.get('TWILIO_AUTH_TOKEN', ''),
          from: this._configService.get('TWILIO_FROM_NUMBER', ''),
          to: this._configService.get('TWILIO_TO_NUMBER', ''),
        },
        enabled: false, // Отключено по умолчанию
        rateLimit: { maxPerHour: 5, maxPerDay: 20 },
        filters: {
          severities: ['critical'],
          tags: ['service', 'availability'],
        },
      },
    ];

    defaultChannels.forEach(channel => {
      this.notificationChannels.set(channel.id, channel);
    });

    this.logger.log(
      `Initialized ${defaultChannels.length} default notification channels`
    );
  }

  private startAlertEvaluation(): void {
    // Оцениваем алерты каждые 30 секунд
    setInterval(() => {
      void this.evaluateAlerts();
    }, 30000);
  }

  private async evaluateAlerts(): Promise<void> {
    for (const [ruleId, rule] of this.alertRules) {
      if (!rule.enabled) {
        continue;
      }

      try {
        await this.evaluateRule(rule);
      } catch (error) {
        this.logger.error(`Error evaluating rule ${ruleId}:`, error);
      }
    }
  }

  private async evaluateRule(rule: IAlertRule): Promise<void> {
    // В реальном приложении здесь был бы запрос к метрикам
    // Для демонстрации используем случайные значения
    const currentValue = this.getMockMetricValue(rule.condition);

    const shouldTrigger = this.evaluateCondition(
      currentValue,
      rule.operator,
      rule.threshold
    );
    const isInCooldown = this.isInCooldown(rule.id, rule.cooldown);

    if (shouldTrigger && !isInCooldown) {
      await this.triggerAlert(rule, currentValue);
    } else if (!shouldTrigger) {
      await this.resolveAlert(rule.id);
    }
  }

  private getMockMetricValue(condition: string): number {
    // Симуляция получения метрик
    const mockValues: Record<string, number> = {
      'system.cpu.usage': Math.random() * 100,
      'system.memory.usage': Math.random() * 100,
      'http.errors.rate': Math.random() * 10,
      'system.disk.usage': Math.random() * 100,
      'service.health': Math.random() > 0.1 ? 1 : 0, // 90% вероятность здорового состояния
    };

    return mockValues[condition] ?? 0;
  }

  private evaluateCondition(
    value: number,
    operator: string,
    threshold: number
  ): boolean {
    switch (operator) {
      case 'gt':
        return value > threshold;
      case 'lt':
        return value < threshold;
      case 'eq':
        return value === threshold;
      case 'gte':
        return value >= threshold;
      case 'lte':
        return value <= threshold;
      default:
        return false;
    }
  }

  private isInCooldown(ruleId: string, cooldown: number): boolean {
    const lastTriggered = this.lastTriggered.get(ruleId);
    if (lastTriggered == null) {
      return false;
    }

    const now = new Date();
    const timeDiff = (now.getTime() - lastTriggered.getTime()) / 1000;
    return timeDiff < cooldown;
  }

  private async triggerAlert(rule: IAlertRule, value: number): Promise<void> {
    const alertId = `${rule.id}-${Date.now()}`;

    const alert: IAlert = {
      id: alertId,
      ruleId: rule.id,
      title: rule.name,
      message: `${rule.description}. Current value: ${value.toFixed(2)}`,
      severity: rule.severity,
      status: 'firing',
      value,
      threshold: rule.threshold,
      labels: {
        rule: rule.id,
        severity: rule.severity,
      },
      annotations: {
        description: rule.description,
        summary: rule.name,
      },
      startsAt: new Date(),
    };

    this.activeAlerts.set(alertId, alert);
    this.lastTriggered.set(rule.id, new Date());

    // Отправляем уведомления
    await this.sendNotifications(alert, rule.channels);

    // Эмитим событие
    this.eventEmitter.emit('alert.fired', alert);

    this.logger.warn(`Alert fired: ${rule.name} (${rule.severity})`);
  }

  private async resolveAlert(ruleId: string): Promise<void> {
    const activeAlert = Array.from(this.activeAlerts.values()).find(
      alert => alert.ruleId === ruleId && alert.status === 'firing'
    );

    if (activeAlert) {
      activeAlert.status = 'resolved';
      activeAlert.endsAt = new Date();
      activeAlert.resolvedAt = new Date();
      activeAlert.resolvedBy = 'system';

      // Эмитим событие
      this.eventEmitter.emit('alert.resolved', activeAlert);

      this.logger.log(`Alert resolved: ${activeAlert.title}`);
    }
  }

  private async sendNotifications(
    alert: IAlert,
    channelIds: string[]
  ): Promise<void> {
    for (const channelId of channelIds) {
      const channel = this.notificationChannels.get(channelId);
      if (channel?.enabled !== true) {
        continue;
      }

      // Проверяем фильтры
      if (!this.shouldSendNotification(alert, channel)) {
        continue;
      }

      // Проверяем rate limiting
      if (!this.checkRateLimit(channelId, channel.rateLimit)) {
        this.logger.warn(`Rate limit exceeded for channel ${channelId}`);
        continue;
      }

      try {
        await this.sendNotification(alert, channel);
      } catch (error) {
        this.logger.error(
          `Failed to send notification to ${channelId}:`,
          error
        );
      }
    }
  }

  private shouldSendNotification(
    alert: IAlert,
    channel: INotificationChannel
  ): boolean {
    // Проверяем severity
    if (!channel.filters.severities.includes(alert.severity)) {
      return false;
    }

    // Проверяем теги
    if (channel.filters.tags.length > 0) {
      const alertTags = Object.values(alert.labels);
      const hasMatchingTag = channel.filters.tags.some(tag =>
        alertTags.includes(tag)
      );
      if (!hasMatchingTag) {
        return false;
      }
    }

    return true;
  }

  private checkRateLimit(
    channelId: string,
    rateLimit: { maxPerHour: number; maxPerDay: number }
  ): boolean {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);
    const oneDayAgo = new Date(now.getTime() - 86400000);

    const recentNotifications = Array.from(this.notifications.values()).filter(
      n =>
        n.channelId === channelId && n.sentAt != null && n.sentAt > oneHourAgo
    );

    const dailyNotifications = Array.from(this.notifications.values()).filter(
      n => n.channelId === channelId && n.sentAt != null && n.sentAt > oneDayAgo
    );

    return (
      recentNotifications.length < rateLimit.maxPerHour &&
      dailyNotifications.length < rateLimit.maxPerDay
    );
  }

  private async sendNotification(
    alert: IAlert,
    channel: INotificationChannel
  ): Promise<void> {
    const notificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const notification: INotification = {
      id: notificationId,
      channelId: channel.id,
      alertId: alert.id,
      status: 'pending',
      retryCount: 0,
      maxRetries: 3,
    };

    this.notifications.set(notificationId, notification);

    try {
      // Симуляция отправки уведомления
      await new Promise(resolve => setTimeout(resolve, 100));

      notification.status = 'sent';
      notification.sentAt = new Date();

      this.logger.log(
        `Notification sent to ${channel.name} for alert ${alert.title}`
      );
    } catch (error) {
      notification.status = 'failed';
      notification.error =
        error instanceof Error ? error.message : 'Unknown error';
      notification.retryCount++;

      this.logger.error(
        `Failed to send notification to ${channel.name}:`,
        error
      );
    }
  }

  async getActiveAlerts(): Promise<IAlert[]> {
    return Array.from(this.activeAlerts.values()).filter(
      alert => alert.status === 'firing'
    );
  }

  async getAllAlerts(): Promise<IAlert[]> {
    return Array.from(this.activeAlerts.values());
  }

  async getAlertRules(): Promise<IAlertRule[]> {
    return Array.from(this.alertRules.values());
  }

  async createAlertRule(
    rule: Omit<IAlertRule, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<IAlertRule> {
    const id = `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newRule: IAlertRule = {
      ...rule,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.alertRules.set(id, newRule);
    this.logger.log(`Created alert rule: ${id}`);

    return newRule;
  }

  async updateAlertRule(
    id: string,
    updates: Partial<IAlertRule>
  ): Promise<IAlertRule | null> {
    const rule = this.alertRules.get(id);
    if (!rule) {
      return null;
    }

    const updatedRule = {
      ...rule,
      ...updates,
      id, // Не позволяем изменять ID
      updatedAt: new Date(),
    };

    this.alertRules.set(id, updatedRule);
    this.logger.log(`Updated alert rule: ${id}`);

    return updatedRule;
  }

  async deleteAlertRule(id: string): Promise<boolean> {
    const deleted = this.alertRules.delete(id);
    if (deleted) {
      this.logger.log(`Deleted alert rule: ${id}`);
    }
    return deleted;
  }

  async acknowledgeAlert(
    alertId: string,
    acknowledgedBy: string
  ): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = acknowledgedBy;

    this.logger.log(`Alert acknowledged: ${alert.title} by ${acknowledgedBy}`);
    return true;
  }

  async getNotificationChannels(): Promise<INotificationChannel[]> {
    return Array.from(this.notificationChannels.values());
  }

  async getNotifications(
    alertId?: string,
    channelId?: string
  ): Promise<INotification[]> {
    let notifications = Array.from(this.notifications.values());

    if (alertId != null) {
      notifications = notifications.filter(n => n.alertId === alertId);
    }

    if (channelId != null) {
      notifications = notifications.filter(n => n.channelId === channelId);
    }

    return notifications.sort(
      (a, b) => (b.sentAt?.getTime() ?? 0) - (a.sentAt?.getTime() ?? 0)
    );
  }
}

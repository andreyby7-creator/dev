import { Injectable } from '@nestjs/common';
import { RedactedLogger } from '../utils/redacted-logger';

export interface MonitoringMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  source: string;
  tags: Record<string, string>;
}

export interface AlertRule {
  id: string;
  name: string;
  metricName: string;
  condition: 'above' | 'below' | 'equals' | 'not-equals';
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldownPeriod: number; // в минутах
  lastTriggered?: Date;
  notificationChannels: NotificationChannel[];
}

export interface Alert {
  id: string;
  ruleId: string;
  metricName: string;
  severity: AlertRule['severity'];
  message: string;
  currentValue: number;
  threshold: number;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
  notificationSent: boolean;
}

export interface NotificationChannel {
  id: string;
  type: 'telegram' | 'viber' | 'email' | 'sms' | 'webhook';
  name: string;
  config: {
    telegram?: {
      botToken: string;
      chatId: string;
    };
    viber?: {
      botToken: string;
      userId: string;
    };
    email?: {
      smtpHost: string;
      smtpPort: number;
      username: string;
      password: string;
      from: string;
      to: string[];
    };
    sms?: {
      provider: string;
      apiKey: string;
      phoneNumbers: string[];
    };
    webhook?: {
      url: string;
      method: 'GET' | 'POST' | 'PUT';
      headers: Record<string, string>;
    };
  };
  enabled: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'alert' | 'summary' | 'maintenance';
  subject: string;
  body: string;
  variables: string[]; // переменные для подстановки
}

export interface MonitoringDashboard {
  id: string;
  name: string;
  description: string;
  metrics: string[];
  refreshInterval: number; // в секундах
  layout: {
    rows: number;
    columns: number;
    widgets: Array<{
      id: string;
      type: 'chart' | 'gauge' | 'table' | 'status';
      position: { row: number; col: number; width: number; height: number };
      config: Record<string, unknown>;
    }>;
  };
}

@Injectable()
export class AutomatedMonitoringService {
  private readonly redactedLogger = new RedactedLogger(
    AutomatedMonitoringService.name
  );
  private readonly metrics = new Map<string, MonitoringMetric>();
  private readonly alertRules = new Map<string, AlertRule>();
  private readonly alerts = new Map<string, Alert>();
  private readonly notificationChannels = new Map<
    string,
    NotificationChannel
  >();
  private readonly notificationTemplates = new Map<
    string,
    NotificationTemplate
  >();
  private readonly dashboards = new Map<string, MonitoringDashboard>();

  constructor() {
    this.initializeNotificationChannels();
    this.initializeAlertRules();
    this.initializeNotificationTemplates();
    this.initializeDashboards();
  }

  private initializeNotificationChannels(): void {
    const defaultChannels: NotificationChannel[] = [
      {
        id: 'telegram-main',
        type: 'telegram',
        name: 'Основной Telegram канал',
        config: {
          telegram: {
            botToken: process.env.TELEGRAM_BOT_TOKEN ?? 'demo-token',
            chatId: process.env.TELEGRAM_CHAT_ID ?? 'demo-chat-id',
          },
        },
        enabled: true,
        priority: 'critical',
      },
      {
        id: 'viber-team',
        type: 'viber',
        name: 'Командный Viber канал',
        config: {
          viber: {
            botToken: process.env.VIBER_BOT_TOKEN ?? 'demo-token',
            userId: process.env.VIBER_USER_ID ?? 'demo-user-id',
          },
        },
        enabled: true,
        priority: 'high',
      },
      {
        id: 'email-admin',
        type: 'email',
        name: 'Email администраторов',
        config: {
          email: {
            smtpHost: process.env.SMTP_HOST ?? 'smtp.gmail.com',
            smtpPort: parseInt(process.env.SMTP_PORT ?? '587'),
            username: process.env.SMTP_USERNAME ?? 'admin@example.com',
            password: process.env.SMTP_PASSWORD ?? 'demo-password',
            from: process.env.SMTP_FROM ?? 'monitoring@example.com',
            to: (process.env.SMTP_TO ?? 'admin@example.com').split(','),
          },
        },
        enabled: true,
        priority: 'medium',
      },
    ];

    defaultChannels.forEach(channel => {
      this.notificationChannels.set(channel.id, channel);
    });
  }

  private initializeAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'cpu-high-usage',
        name: 'High CPU Usage',
        metricName: 'cpu_usage',
        condition: 'above',
        threshold: 85,
        severity: 'high',
        enabled: true,
        cooldownPeriod: 5,
        notificationChannels: this.getNotificationChannelsByIds([
          'telegram-main',
          'email-admin',
        ]),
      },
      {
        id: 'memory-critical-usage',
        name: 'Critical Memory Usage',
        metricName: 'memory_usage',
        condition: 'above',
        threshold: 95,
        severity: 'critical',
        enabled: true,
        cooldownPeriod: 2,
        notificationChannels: this.getNotificationChannelsByIds([
          'telegram-main',
          'viber-team',
          'email-admin',
        ]),
      },
      {
        id: 'disk-space-low',
        name: 'Low Disk Space',
        metricName: 'disk_usage',
        condition: 'above',
        threshold: 90,
        severity: 'high',
        enabled: true,
        cooldownPeriod: 10,
        notificationChannels: this.getNotificationChannelsByIds([
          'telegram-main',
          'email-admin',
        ]),
      },
      {
        id: 'network-latency-high',
        name: 'High Network Latency',
        metricName: 'network_latency',
        condition: 'above',
        threshold: 100, // 100ms
        severity: 'medium',
        enabled: true,
        cooldownPeriod: 15,
        notificationChannels: this.getNotificationChannelsByIds([
          'email-admin',
        ]),
      },
    ];

    defaultRules.forEach(rule => {
      this.alertRules.set(rule.id, rule);
    });
  }

  private getNotificationChannelsByIds(
    channelIds: string[]
  ): NotificationChannel[] {
    const channels: NotificationChannel[] = [];

    for (const id of channelIds) {
      const channel = this.notificationChannels.get(id);
      if (channel) {
        channels.push(channel);
      }
    }

    // Если не найдено ни одного канала, создаем дефолтный
    if (channels.length === 0) {
      channels.push(this.createDefaultNotificationChannel());
    }

    return channels;
  }

  private createDefaultNotificationChannel(): NotificationChannel {
    return {
      id: 'default-email',
      type: 'email',
      name: 'Default Email Channel',
      config: {
        email: {
          smtpHost: 'localhost',
          smtpPort: 587,
          username: 'admin@example.com',
          password: 'password',
          from: 'admin@example.com',
          to: ['admin@example.com'],
        },
      },
      enabled: true,
      priority: 'medium',
    };
  }

  private initializeNotificationTemplates(): void {
    const templates: NotificationTemplate[] = [
      {
        id: 'alert-critical',
        name: 'Critical Alert Template',
        type: 'alert',
        subject: '🚨 КРИТИЧЕСКИЙ АЛЕРТ: {metric_name}',
        body: `Метрика {metric_name} превысила пороговое значение!

Текущее значение: {current_value}
Пороговое значение: {threshold}
Время: {timestamp}
Источник: {source}

Требуется немедленное вмешательство!`,
        variables: [
          'metric_name',
          'current_value',
          'threshold',
          'timestamp',
          'source',
        ],
      },
      {
        id: 'alert-high',
        name: 'High Alert Template',
        type: 'alert',
        subject: '⚠️ ВЫСОКИЙ АЛЕРТ: {metric_name}',
        body: `Метрика {metric_name} превысила пороговое значение.

Текущее значение: {current_value}
Пороговое значение: {threshold}
Время: {timestamp}
Источник: {source}

Рекомендуется проверить систему.`,
        variables: [
          'metric_name',
          'current_value',
          'threshold',
          'timestamp',
          'source',
        ],
      },
      {
        id: 'daily-summary',
        name: 'Daily Summary Template',
        type: 'summary',
        subject: '📊 Ежедневный отчет мониторинга',
        body: `Отчет за {date}

Всего алертов: {total_alerts}
Критических: {critical_alerts}
Высоких: {high_alerts}
Средних: {medium_alerts}
Низких: {low_alerts}

Статус системы: {system_status}`,
        variables: [
          'date',
          'total_alerts',
          'critical_alerts',
          'high_alerts',
          'medium_alerts',
          'low_alerts',
          'system_status',
        ],
      },
    ];

    templates.forEach(template => {
      this.notificationTemplates.set(template.id, template);
    });
  }

  private initializeDashboards(): void {
    const defaultDashboards: MonitoringDashboard[] = [
      {
        id: 'main-overview',
        name: 'Основной обзор',
        description: 'Общий обзор состояния системы',
        metrics: ['cpu_usage', 'memory_usage', 'disk_usage', 'network_latency'],
        refreshInterval: 30,
        layout: {
          rows: 2,
          columns: 2,
          widgets: [
            {
              id: 'cpu-gauge',
              type: 'gauge',
              position: { row: 0, col: 0, width: 1, height: 1 },
              config: { title: 'CPU Usage', min: 0, max: 100, unit: '%' },
            },
            {
              id: 'memory-gauge',
              type: 'gauge',
              position: { row: 0, col: 1, width: 1, height: 1 },
              config: { title: 'Memory Usage', min: 0, max: 100, unit: '%' },
            },
            {
              id: 'disk-chart',
              type: 'chart',
              position: { row: 1, col: 0, width: 1, height: 1 },
              config: { title: 'Disk Usage', type: 'line' },
            },
            {
              id: 'network-status',
              type: 'status',
              position: { row: 1, col: 1, width: 1, height: 1 },
              config: { title: 'Network Status' },
            },
          ],
        },
      },
    ];

    defaultDashboards.forEach(dashboard => {
      this.dashboards.set(dashboard.id, dashboard);
    });
  }

  async collectMetric(
    metric: Omit<MonitoringMetric, 'id' | 'timestamp'>
  ): Promise<string> {
    const metricId = `metric-${Date.now()}`;
    const fullMetric: MonitoringMetric = {
      ...metric,
      id: metricId,
      timestamp: new Date(),
    };

    this.metrics.set(metricId, fullMetric);

    // Проверяем правила алертов
    await this.checkAlertRules(fullMetric);

    return metricId;
  }

  private async checkAlertRules(metric: MonitoringMetric): Promise<void> {
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled || rule.metricName !== metric.name) continue;

      // Проверка cooldown периода
      if (rule.lastTriggered) {
        const cooldownMs = rule.cooldownPeriod * 60 * 1000;
        const timeSinceLastTrigger = Date.now() - rule.lastTriggered.getTime();
        if (timeSinceLastTrigger < cooldownMs) {
          continue;
        }
      }

      const shouldTrigger = this.evaluateAlertRule(rule, metric);
      if (shouldTrigger) {
        await this.createAlert(rule, metric);
        rule.lastTriggered = new Date();
      }
    }
  }

  private evaluateAlertRule(
    rule: AlertRule,
    metric: MonitoringMetric
  ): boolean {
    switch (rule.condition) {
      case 'above':
        return metric.value > rule.threshold;
      case 'below':
        return metric.value < rule.threshold;
      case 'equals':
        return metric.value === rule.threshold;
      case 'not-equals':
        return metric.value !== rule.threshold;
      default:
        return false;
    }
  }

  private async createAlert(
    rule: AlertRule,
    metric: MonitoringMetric
  ): Promise<void> {
    const alert: Alert = {
      id: `alert-${Date.now()}`,
      ruleId: rule.id,
      metricName: metric.name,
      severity: rule.severity,
      message: `${rule.name}: ${metric.value} ${metric.unit}`,
      currentValue: metric.value,
      threshold: rule.threshold,
      timestamp: new Date(),
      acknowledged: false,
      resolved: false,
      notificationSent: false,
    };

    this.alerts.set(alert.id, alert);

    this.redactedLogger.log(`Alert created`, 'AutomatedMonitoringService', {
      alertId: alert.id,
      rule: rule.name,
      severity: rule.severity,
      value: metric.value,
      threshold: rule.threshold,
    });

    // Отправляем уведомления
    await this.sendNotifications(alert, rule);
  }

  private async sendNotifications(
    alert: Alert,
    rule: AlertRule
  ): Promise<void> {
    for (const channel of rule.notificationChannels) {
      if (!channel.enabled) continue;

      try {
        await this.sendNotification(channel, alert);
        alert.notificationSent = true;
      } catch (error) {
        this.redactedLogger.errorWithData(
          `Failed to send notification via ${channel.type}`,
          {
            channelId: channel.id,
            alertId: alert.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          'AutomatedMonitoringService'
        );
      }
    }
  }

  private async sendNotification(
    channel: NotificationChannel,
    alert: Alert
  ): Promise<void> {
    const template = this.getNotificationTemplate(alert.severity);
    const message = this.formatMessage(template, alert);

    switch (channel.type) {
      case 'telegram':
        await this.sendTelegramNotification(channel, message);
        break;
      case 'viber':
        await this.sendViberNotification(channel, message);
        break;
      case 'email':
        await this.sendEmailNotification(channel, message, template.subject);
        break;
      case 'sms':
        await this.sendSmsNotification(channel, message);
        break;
      case 'webhook':
        await this.sendWebhookNotification(channel, message);
        break;
    }
  }

  private getNotificationTemplate(
    severity: Alert['severity']
  ): NotificationTemplate {
    if (severity === 'critical') {
      const template = this.notificationTemplates.get('alert-critical');
      if (template) return template;
    } else if (severity === 'high') {
      const template = this.notificationTemplates.get('alert-high');
      if (template) return template;
    }
    const fallbackTemplate = this.notificationTemplates.get('alert-high');
    if (fallbackTemplate) return fallbackTemplate;

    // Возвращаем дефолтный шаблон если ничего не найдено
    return {
      id: 'default',
      name: 'Default Template',
      type: 'alert',
      subject: 'Alert: {metric_name}',
      body: 'Metric {metric_name} exceeded threshold {threshold}',
      variables: ['metric_name', 'threshold'],
    };
  }

  private formatMessage(template: NotificationTemplate, alert: Alert): string {
    let message = template.body;

    // Подставляем переменные
    message = message.replace('{metric_name}', alert.metricName);
    message = message.replace('{current_value}', alert.currentValue.toString());
    message = message.replace('{threshold}', alert.threshold.toString());
    message = message.replace(
      '{timestamp}',
      alert.timestamp.toLocaleString('ru-RU')
    );
    message = message.replace('{source}', 'Automated Monitoring');

    return message;
  }

  private async sendTelegramNotification(
    channel: NotificationChannel,
    message: string
  ): Promise<void> {
    const config = channel.config.telegram;
    if (!config) return;

    // Имитация отправки в Telegram
    await new Promise(resolve =>
      setTimeout(resolve, 500 + Math.random() * 1000)
    );

    this.redactedLogger.log(
      `Telegram notification sent`,
      'AutomatedMonitoringService',
      {
        chatId: config.chatId,
        messageLength: message.length,
      }
    );
  }

  private async sendViberNotification(
    channel: NotificationChannel,
    message: string
  ): Promise<void> {
    const config = channel.config.viber;
    if (!config) return;

    // Имитация отправки в Viber
    await new Promise(resolve =>
      setTimeout(resolve, 500 + Math.random() * 1000)
    );

    this.redactedLogger.log(
      `Viber notification sent`,
      'AutomatedMonitoringService',
      {
        userId: config.userId,
        messageLength: message.length,
      }
    );
  }

  private async sendEmailNotification(
    channel: NotificationChannel,
    message: string,
    subject: string
  ): Promise<void> {
    const config = channel.config.email;
    if (!config) return;

    // Имитация отправки email
    await new Promise(resolve =>
      setTimeout(resolve, 1000 + Math.random() * 2000)
    );

    this.redactedLogger.log(
      `Email notification sent`,
      'AutomatedMonitoringService',
      {
        to: config.to.join(', '),
        subject,
        messageLength: message.length,
      }
    );
  }

  private async sendSmsNotification(
    channel: NotificationChannel,
    message: string
  ): Promise<void> {
    const config = channel.config.sms;
    if (!config) return;

    // Имитация отправки SMS
    await new Promise(resolve =>
      setTimeout(resolve, 500 + Math.random() * 1000)
    );

    this.redactedLogger.log(
      `SMS notification sent`,
      'AutomatedMonitoringService',
      {
        phoneNumbers: config.phoneNumbers.join(', '),
        messageLength: message.length,
      }
    );
  }

  private async sendWebhookNotification(
    channel: NotificationChannel,
    message: string
  ): Promise<void> {
    const config = channel.config.webhook;
    if (!config) return;

    // Имитация отправки webhook
    await new Promise(resolve =>
      setTimeout(resolve, 300 + Math.random() * 700)
    );

    this.redactedLogger.log(
      `Webhook notification sent`,
      'AutomatedMonitoringService',
      {
        url: config.url,
        method: config.method,
        messageLength: message.length,
      }
    );
  }

  async acknowledgeAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.acknowledged = true;
    alert.acknowledgedAt = new Date();

    this.redactedLogger.log(
      `Alert acknowledged`,
      'AutomatedMonitoringService',
      {
        alertId,
        acknowledgedAt: alert.acknowledgedAt.toISOString(),
      }
    );

    return true;
  }

  async resolveAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = new Date();

    this.redactedLogger.log(`Alert resolved`, 'AutomatedMonitoringService', {
      alertId,
      resolvedAt: alert.resolvedAt.toISOString(),
    });

    return true;
  }

  async getMetrics(
    metricName?: string,
    limit: number = 100
  ): Promise<MonitoringMetric[]> {
    let metrics = Array.from(this.metrics.values());

    if (metricName !== undefined && metricName !== '') {
      metrics = metrics.filter(m => m.name === metricName);
    }

    // Сортируем по времени (новые сначала)
    metrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return metrics.slice(0, limit);
  }

  async getAlertRules(): Promise<AlertRule[]> {
    return Array.from(this.alertRules.values());
  }

  async getAlerts(
    severity?: AlertRule['severity'],
    acknowledged?: boolean,
    resolved?: boolean
  ): Promise<Alert[]> {
    let alerts = Array.from(this.alerts.values());

    if (severity) {
      alerts = alerts.filter(a => a.severity === severity);
    }

    if (acknowledged !== undefined) {
      alerts = alerts.filter(a => a.acknowledged === acknowledged);
    }

    if (resolved !== undefined) {
      alerts = alerts.filter(a => a.resolved === resolved);
    }

    // Сортируем по времени (новые сначала)
    alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return alerts;
  }

  async getNotificationChannels(): Promise<NotificationChannel[]> {
    return Array.from(this.notificationChannels.values());
  }

  async getDashboards(): Promise<MonitoringDashboard[]> {
    return Array.from(this.dashboards.values());
  }

  async addAlertRule(rule: Omit<AlertRule, 'id'>): Promise<string> {
    const ruleId = `rule-${Date.now()}`;
    const newRule: AlertRule = {
      ...rule,
      id: ruleId,
    };

    this.alertRules.set(ruleId, newRule);
    return ruleId;
  }

  async updateAlertRule(
    ruleId: string,
    updates: Partial<Omit<AlertRule, 'id'>>
  ): Promise<boolean> {
    const rule = this.alertRules.get(ruleId);
    if (!rule) {
      return false;
    }

    Object.assign(rule, updates);
    return true;
  }

  async addNotificationChannel(
    channel: Omit<NotificationChannel, 'id'>
  ): Promise<string> {
    const channelId = `channel-${Date.now()}`;
    const newChannel: NotificationChannel = {
      ...channel,
      id: channelId,
    };

    this.notificationChannels.set(channelId, newChannel);
    return channelId;
  }

  async getSystemStatus(): Promise<{
    totalMetrics: number;
    activeAlerts: number;
    criticalAlerts: number;
    systemHealth: 'healthy' | 'degraded' | 'critical';
  }> {
    const totalMetrics = this.metrics.size;
    const activeAlerts = Array.from(this.alerts.values()).filter(
      a => !a.resolved
    ).length;
    const criticalAlerts = Array.from(this.alerts.values()).filter(
      a => a.severity === 'critical' && !a.resolved
    ).length;

    let systemHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (criticalAlerts > 0) {
      systemHealth = 'critical';
    } else if (activeAlerts > 0) {
      systemHealth = 'degraded';
    }

    return {
      totalMetrics,
      activeAlerts,
      criticalAlerts,
      systemHealth,
    };
  }

  async generateDailyReport(): Promise<{
    date: string;
    totalAlerts: number;
    criticalAlerts: number;
    highAlerts: number;
    mediumAlerts: number;
    lowAlerts: number;
    systemStatus: string;
  }> {
    const alerts = Array.from(this.alerts.values());
    const today = new Date();
    const todayAlerts = alerts.filter(
      a => a.timestamp.toDateString() === today.toDateString()
    );

    const criticalAlerts = todayAlerts.filter(
      a => a.severity === 'critical'
    ).length;
    const highAlerts = todayAlerts.filter(a => a.severity === 'high').length;
    const mediumAlerts = todayAlerts.filter(
      a => a.severity === 'medium'
    ).length;
    const lowAlerts = todayAlerts.filter(a => a.severity === 'low').length;

    const systemStatus = await this.getSystemStatus();

    return {
      date: today.toLocaleDateString('ru-RU'),
      totalAlerts: todayAlerts.length,
      criticalAlerts,
      highAlerts,
      mediumAlerts,
      lowAlerts,
      systemStatus: systemStatus.systemHealth,
    };
  }

  /**
   * Мониторинг CPU
   */
  monitorCPU(serviceId: string): {
    serviceId: string;
    metric: string;
    value: number;
    timestamp: Date;
    status: 'normal' | 'warning' | 'critical';
  } {
    const cpuUsage = Math.random() * 100;
    let status: 'normal' | 'warning' | 'critical' = 'normal';

    if (cpuUsage > 90) {
      status = 'critical';
    } else if (cpuUsage > 80) {
      status = 'warning';
    }

    return {
      serviceId,
      metric: 'cpu',
      value: Math.round(cpuUsage * 100) / 100,
      timestamp: new Date(),
      status,
    };
  }

  /**
   * Мониторинг памяти
   */
  monitorMemory(serviceId: string): {
    serviceId: string;
    metric: string;
    value: number;
    timestamp: Date;
    status: 'normal' | 'warning' | 'critical';
  } {
    const memoryUsage = Math.random() * 100;
    let status: 'normal' | 'warning' | 'critical' = 'normal';

    if (memoryUsage > 95) {
      status = 'critical';
    } else if (memoryUsage > 85) {
      status = 'warning';
    }

    return {
      serviceId,
      metric: 'memory',
      value: Math.round(memoryUsage * 100) / 100,
      timestamp: new Date(),
      status,
    };
  }

  /**
   * Мониторинг диска
   */
  monitorDisk(serviceId: string): {
    serviceId: string;
    metric: string;
    value: number;
    timestamp: Date;
    status: 'normal' | 'warning' | 'critical';
  } {
    const diskUsage = Math.random() * 100;
    let status: 'normal' | 'warning' | 'critical' = 'normal';

    if (diskUsage > 95) {
      status = 'critical';
    } else if (diskUsage > 85) {
      status = 'warning';
    }

    return {
      serviceId,
      metric: 'disk',
      value: Math.round(diskUsage * 100) / 100,
      timestamp: new Date(),
      status,
    };
  }

  /**
   * Мониторинг сети
   */
  monitorNetwork(serviceId: string): {
    serviceId: string;
    metric: string;
    value: number;
    timestamp: Date;
    status: 'normal' | 'warning' | 'critical';
  } {
    const networkUsage = Math.random() * 100;
    let status: 'normal' | 'warning' | 'critical' = 'normal';

    if (networkUsage > 90) {
      status = 'critical';
    } else if (networkUsage > 80) {
      status = 'warning';
    }

    return {
      serviceId,
      metric: 'network',
      value: Math.round(networkUsage * 100) / 100,
      timestamp: new Date(),
      status,
    };
  }

  /**
   * Отправка алертов
   */
  sendAlert(alertConfig: {
    serviceId: string;
    metric: string;
    value: number;
    threshold: number;
    severity: string;
  }): {
    serviceId: string;
    metric: string;
    severity: string;
    status: 'sent' | 'failed' | 'queued';
    alertId: string;
    timestamp: Date;
  } {
    const alertId = `alert-${Date.now()}`;
    const status: 'sent' | 'failed' | 'queued' =
      Math.random() > 0.1 ? 'sent' : Math.random() > 0.5 ? 'queued' : 'failed';

    // Создаем алерт
    const alert: Alert = {
      id: alertId,
      ruleId: `rule-${Date.now()}`,
      metricName: alertConfig.metric,
      severity: alertConfig.severity as AlertRule['severity'],
      message: `${alertConfig.metric.toUpperCase()} usage ${alertConfig.value}% exceeds threshold ${alertConfig.threshold}%`,
      currentValue: alertConfig.value,
      threshold: alertConfig.threshold,
      timestamp: new Date(),
      acknowledged: false,
      resolved: false,
      notificationSent: status === 'sent',
    };

    this.alerts.set(alertId, alert);

    return {
      serviceId: alertConfig.serviceId,
      metric: alertConfig.metric,
      severity: alertConfig.severity,
      status,
      alertId,
      timestamp: alert.timestamp,
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';

export interface NotificationChannel {
  id: string;
  name: string;
  type: 'telegram' | 'viber' | 'email' | 'sms' | 'webhook' | 'slack';
  config: {
    enabled: boolean;
    credentials: Record<string, string>;
    settings: Record<string, unknown>;
  };
  priority: 'low' | 'medium' | 'high' | 'critical';
  filters: {
    severity: string[];
    services: string[];
    timeRange: {
      start: string; // HH:MM format
      end: string; // HH:MM format
      days: number[]; // 0-6 (Sunday-Saturday)
    };
  };
  metadata: Record<string, unknown>;
}

export interface NotificationMessage {
  id: string;
  channelId: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  _service: string;
  timestamp: Date;
  status: 'pending' | 'sent' | 'failed' | 'delivered';
  retryCount: number;
  maxRetries: number;
  metadata: Record<string, unknown>;
}

export interface NotificationConfig {
  channels: string[];
  message: {
    title: string;
    body: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
  _service: string;
  metadata?: Record<string, unknown>;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

@Injectable()
export class LocalNotificationsService {
  private readonly logger = new Logger(LocalNotificationsService.name);
  private channels: Map<string, NotificationChannel> = new Map();
  private messages: Map<string, NotificationMessage> = new Map();
  private messageQueue: NotificationMessage[] = [];

  constructor() {
    this.initializeDefaultChannels();
  }

  async sendNotification(config: NotificationConfig): Promise<{
    success: boolean;
    messageId: string;
    channels: string[];
    status: string;
  }> {
    try {
      this.logger.log(`Sending notification: ${config.message.title}`);

      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const channels: string[] = [];
      let successCount = 0;

      for (const channelId of config.channels) {
        const channel = this.channels.get(channelId);
        if (channel?.config.enabled !== true) {
          this.logger.warn(`Channel ${channelId} not found or disabled`);
          continue;
        }

        // Check if notification should be sent based on filters
        if (!this.shouldSendNotification(channel, config)) {
          this.logger.log(`Notification filtered out for channel ${channelId}`);
          continue;
        }

        const message: NotificationMessage = {
          id: `${messageId}-${channelId}`,
          channelId,
          title: config.message.title,
          message: config.message.body,
          severity: config.message.severity,
          _service: config._service,
          timestamp: new Date(),
          status: 'pending',
          retryCount: 0,
          maxRetries: 3,
          metadata: config.metadata ?? {},
        };

        this.messages.set(message.id, message);
        channels.push(channelId);

        // Simulate sending notification
        const sent = await this.sendToChannel(channel, message);
        if (sent) {
          message.status = 'sent';
          successCount++;
        } else {
          message.status = 'failed';
          this.messageQueue.push(message);
        }
      }

      const status = successCount > 0 ? 'sent' : 'failed';
      this.logger.log(
        `Notification ${messageId} sent to ${successCount}/${channels.length} channels`
      );

      return {
        success: channels.length > 0,
        messageId,
        channels,
        status,
      };
    } catch (error) {
      this.logger.error('Failed to send notification', error);
      throw error;
    }
  }

  async getNotificationChannels(): Promise<{
    channels: NotificationChannel[];
    total: number;
    enabled: number;
    disabled: number;
    byType: Record<string, number>;
  }> {
    try {
      this.logger.log('Getting notification channels');

      const channels = Array.from(this.channels.values());
      const enabled = channels.filter(c => c.config.enabled).length;
      const disabled = channels.filter(c => !c.config.enabled).length;
      const byType: Record<string, number> = {};

      for (const channel of channels) {
        byType[channel.type] = (byType[channel.type] ?? 0) + 1;
      }

      return {
        channels,
        total: channels.length,
        enabled,
        disabled,
        byType,
      };
    } catch (error) {
      this.logger.error('Failed to get notification channels', error);
      throw error;
    }
  }

  async createNotificationChannel(
    channel: Omit<NotificationChannel, 'id'>
  ): Promise<{
    success: boolean;
    channelId: string;
    channel: NotificationChannel;
  }> {
    try {
      this.logger.log(`Creating notification channel: ${channel.name}`);

      const channelId = `channel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const newChannel: NotificationChannel = {
        ...channel,
        id: channelId,
      };

      this.channels.set(channelId, newChannel);

      this.logger.log(`Created notification channel ${channelId}`);

      return {
        success: true,
        channelId,
        channel: newChannel,
      };
    } catch (error) {
      this.logger.error('Failed to create notification channel', error);
      throw error;
    }
  }

  async updateNotificationChannel(
    channelId: string,
    updates: Partial<NotificationChannel>
  ): Promise<{
    success: boolean;
    channel: NotificationChannel | null;
  }> {
    try {
      this.logger.log(`Updating notification channel: ${channelId}`);

      const channel = this.channels.get(channelId);
      if (!channel) {
        return {
          success: false,
          channel: null,
        };
      }

      // Update channel properties
      Object.assign(channel, updates);

      this.logger.log(`Updated notification channel ${channelId}`);

      return {
        success: true,
        channel,
      };
    } catch (error) {
      this.logger.error('Failed to update notification channel', error);
      throw error;
    }
  }

  async getNotificationHistory(timeRange?: string): Promise<{
    messages: NotificationMessage[];
    total: number;
    byStatus: Record<string, number>;
    bySeverity: Record<string, number>;
    byChannel: Record<string, number>;
    timeRange: string;
  }> {
    try {
      this.logger.log(
        `Getting notification history for time range: ${timeRange ?? 'default'}`
      );

      const cutoffTime = this.getCutoffTime(timeRange ?? '24h');
      const messages = Array.from(this.messages.values()).filter(
        msg => msg.timestamp >= cutoffTime
      );

      // Sort by timestamp descending
      messages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      const byStatus: Record<string, number> = {};
      const bySeverity: Record<string, number> = {};
      const byChannel: Record<string, number> = {};

      for (const message of messages) {
        byStatus[message.status] = (byStatus[message.status] ?? 0) + 1;
        bySeverity[message.severity] = (bySeverity[message.severity] ?? 0) + 1;
        byChannel[message.channelId] = (byChannel[message.channelId] ?? 0) + 1;
      }

      return {
        messages,
        total: messages.length,
        byStatus,
        bySeverity,
        byChannel,
        timeRange: timeRange ?? '24h',
      };
    } catch (error) {
      this.logger.error('Failed to get notification history', error);
      throw error;
    }
  }

  async retryFailedNotifications(): Promise<{
    retried: number;
    successful: number;
    stillFailed: number;
  }> {
    try {
      this.logger.log('Retrying failed notifications');

      const failedMessages = this.messageQueue.filter(
        msg => msg.status === 'failed' && msg.retryCount < msg.maxRetries
      );

      let retried = 0;
      let successful = 0;
      let stillFailed = 0;

      for (const message of failedMessages) {
        const channel = this.channels.get(message.channelId);
        if (!channel) {
          stillFailed++;
          continue;
        }

        message.retryCount++;
        retried++;

        const sent = await this.sendToChannel(channel, message);
        if (sent) {
          message.status = 'sent';
          successful++;
          // Remove from queue
          const index = this.messageQueue.indexOf(message);
          if (index > -1) {
            this.messageQueue.splice(index, 1);
          }
        } else {
          stillFailed++;
        }
      }

      this.logger.log(
        `Retried ${retried} notifications: ${successful} successful, ${stillFailed} still failed`
      );

      return {
        retried,
        successful,
        stillFailed,
      };
    } catch (error) {
      this.logger.error('Failed to retry notifications', error);
      throw error;
    }
  }

  async testNotificationChannel(channelId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      this.logger.log(`Testing notification channel: ${channelId}`);

      const channel = this.channels.get(channelId);
      if (!channel) {
        return {
          success: false,
          message: 'Channel not found',
        };
      }

      const testMessage: NotificationMessage = {
        id: `test-${Date.now()}`,
        channelId,
        title: 'Test Notification',
        message: 'This is a test notification to verify channel configuration.',
        severity: 'low',
        _service: 'system',
        timestamp: new Date(),
        status: 'pending',
        retryCount: 0,
        maxRetries: 1,
        metadata: { test: true },
      };

      const sent = await this.sendToChannel(channel, testMessage);

      return {
        success: sent,
        message: sent
          ? 'Test notification sent successfully'
          : 'Failed to send test notification',
      };
    } catch (error) {
      this.logger.error('Failed to test notification channel', error);
      return {
        success: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async sendToChannel(
    channel: NotificationChannel,
    message: NotificationMessage
  ): Promise<boolean> {
    try {
      // Simulate sending to different channel types
      switch (channel.type) {
        case 'telegram':
          return this.sendTelegramMessage(channel, message);
        case 'viber':
          return this.sendViberMessage(channel, message);
        case 'email':
          return this.sendEmailMessage(channel, message);
        case 'sms':
          return this.sendSmsMessage(channel, message);
        case 'webhook':
          return this.sendWebhookMessage(channel, message);
        case 'slack':
          return this.sendSlackMessage(channel, message);
        default:
          this.logger.warn(`Unknown channel type: ${channel.type}`);
          return false;
      }
    } catch (error) {
      this.logger.error(
        `Failed to send message to ${channel.type} channel`,
        error
      );
      return false;
    }
  }

  private async sendTelegramMessage(
    _channel: NotificationChannel,
    message: NotificationMessage
  ): Promise<boolean> {
    // Simulate Telegram API call
    this.logger.log(`Sending Telegram message: ${message.title}`);
    return Math.random() > 0.1; // 90% success rate
  }

  private async sendViberMessage(
    _channel: NotificationChannel,
    message: NotificationMessage
  ): Promise<boolean> {
    // Simulate Viber API call
    this.logger.log(`Sending Viber message: ${message.title}`);
    return Math.random() > 0.1; // 90% success rate
  }

  private async sendEmailMessage(
    _channel: NotificationChannel,
    message: NotificationMessage
  ): Promise<boolean> {
    // Simulate email sending
    this.logger.log(`Sending email: ${message.title}`);
    return Math.random() > 0.05; // 95% success rate
  }

  private async sendSmsMessage(
    _channel: NotificationChannel,
    message: NotificationMessage
  ): Promise<boolean> {
    // Simulate SMS sending
    this.logger.log(`Sending SMS: ${message.title}`);
    return Math.random() > 0.1; // 90% success rate
  }

  private async sendWebhookMessage(
    _channel: NotificationChannel,
    message: NotificationMessage
  ): Promise<boolean> {
    // Simulate webhook call
    this.logger.log(`Sending webhook: ${message.title}`);
    return Math.random() > 0.1; // 90% success rate
  }

  private async sendSlackMessage(
    _channel: NotificationChannel,
    message: NotificationMessage
  ): Promise<boolean> {
    // Simulate Slack API call
    this.logger.log(`Sending Slack message: ${message.title}`);
    return Math.random() > 0.1; // 90% success rate
  }

  private shouldSendNotification(
    channel: NotificationChannel,
    config: NotificationConfig
  ): boolean {
    // Check severity filter
    if (!channel.filters.severity.includes(config.message.severity)) {
      return false;
    }

    // Check service filter
    if (
      channel.filters.services.length > 0 &&
      !channel.filters.services.includes(config._service)
    ) {
      return false;
    }

    // Check time range filter
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = channel.filters.timeRange.start
      .split(':')
      .map(Number);
    const [endHour, endMinute] = channel.filters.timeRange.end
      .split(':')
      .map(Number);
    const startTime = (startHour ?? 0) * 60 + (startMinute ?? 0);
    const endTime = (endHour ?? 23) * 60 + (endMinute ?? 59);

    if (currentTime < startTime || currentTime > endTime) {
      return false;
    }

    // Check day of week filter
    if (!channel.filters.timeRange.days.includes(now.getDay())) {
      return false;
    }

    return true;
  }

  private initializeDefaultChannels(): void {
    const defaultChannels: NotificationChannel[] = [
      {
        id: 'telegram-admin',
        name: 'Admin Telegram',
        type: 'telegram',
        config: {
          enabled: true,
          credentials: {
            botToken: 'your-bot-token',
            chatId: 'your-chat-id',
          },
          settings: {
            parseMode: 'HTML',
            disableWebPagePreview: true,
          },
        },
        priority: 'high',
        filters: {
          severity: ['medium', 'high', 'critical'],
          services: [],
          timeRange: {
            start: '00:00',
            end: '23:59',
            days: [1, 2, 3, 4, 5, 6, 0], // All days
          },
        },
        metadata: { category: 'admin' },
      },
      {
        id: 'email-alerts',
        name: 'Email Alerts',
        type: 'email',
        config: {
          enabled: true,
          credentials: {
            smtpHost: 'smtp.example.com',
            smtpPort: '587',
            username: 'alerts@example.com',
            password: 'your-password',
          },
          settings: {
            from: 'alerts@example.com',
            to: ['admin@example.com', 'devops@example.com'],
          },
        },
        priority: 'medium',
        filters: {
          severity: ['high', 'critical'],
          services: [],
          timeRange: {
            start: '00:00',
            end: '23:59',
            days: [1, 2, 3, 4, 5, 6, 0], // All days
          },
        },
        metadata: { category: 'alerts' },
      },
      {
        id: 'slack-devops',
        name: 'DevOps Slack',
        type: 'slack',
        config: {
          enabled: true,
          credentials: {
            webhookUrl: 'https://hooks.slack.com/services/your/webhook/url',
          },
          settings: {
            channel: '#devops-alerts',
            username: 'Monitoring Bot',
            iconEmoji: ':warning:',
          },
        },
        priority: 'medium',
        filters: {
          severity: ['medium', 'high', 'critical'],
          services: [],
          timeRange: {
            start: '09:00',
            end: '18:00',
            days: [1, 2, 3, 4, 5], // Weekdays only
          },
        },
        metadata: { category: 'devops' },
      },
    ];

    for (const channel of defaultChannels) {
      this.channels.set(channel.id, channel);
    }
  }

  private getCutoffTime(timeRange: string): Date {
    const now = new Date();
    const range = timeRange.toLowerCase();

    if (range.includes('1h') || range.includes('hour')) {
      return new Date(now.getTime() - 60 * 60 * 1000);
    } else if (range.includes('24h') || range.includes('day')) {
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (range.includes('7d') || range.includes('week')) {
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range.includes('30d') || range.includes('month')) {
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Default to 24 hours
    return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
}

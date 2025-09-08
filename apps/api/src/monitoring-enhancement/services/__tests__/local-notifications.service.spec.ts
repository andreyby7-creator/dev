import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { LocalNotificationsService } from '../local-notifications.service';

describe('LocalNotificationsService', () => {
  let service: LocalNotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LocalNotificationsService],
    }).compile();

    service = module.get<LocalNotificationsService>(LocalNotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendNotification', () => {
    it('should send notification successfully', async () => {
      const config = {
        channels: ['telegram-admin'],
        message: {
          title: 'Test Alert',
          body: 'This is a test notification',
          severity: 'medium' as const,
        },
        _service: 'test-service',
        metadata: { test: true },
      };

      const result = await service.sendNotification(config);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.channels).toBeDefined();
      expect(Array.isArray(result.channels)).toBe(true);
      expect(result.status).toMatch(/^(sent|failed)$/);
    });

    it('should send notification with minimal config', async () => {
      const config = {
        channels: ['email-alerts'],
        message: {
          title: 'Minimal Alert',
          body: 'Minimal notification',
          severity: 'high' as const,
        },
        _service: 'minimal-service',
      };

      const result = await service.sendNotification(config);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.channels).toBeDefined();
    });

    it('should send notification to multiple channels', async () => {
      const config = {
        channels: ['telegram-admin', 'email-alerts'],
        message: {
          title: 'Multi-Channel Alert',
          body: 'Notification sent to multiple channels',
          severity: 'high' as const,
        },
        _service: 'multi-service',
      };

      const result = await service.sendNotification(config);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.channels).toHaveLength(2);
    });

    it('should handle non-existent channels gracefully', async () => {
      const config = {
        channels: ['non-existent-channel'],
        message: {
          title: 'Test Alert',
          body: 'This should not be sent',
          severity: 'medium' as const,
        },
        _service: 'test-service',
      };

      const result = await service.sendNotification(config);

      expect(result.success).toBe(false);
      expect(result.channels).toHaveLength(0);
      expect(result.status).toBe('failed');
    });

    it('should send notifications with different severity levels', async () => {
      const severities = ['medium', 'high', 'critical'] as const;

      for (const severity of severities) {
        const config = {
          channels: ['telegram-admin'],
          message: {
            title: `${severity.charAt(0).toUpperCase() + severity.slice(1)} Alert`,
            body: `This is a ${severity} severity notification`,
            severity,
          },
          _service: 'severity-test-service',
        };

        const result = await service.sendNotification(config);

        expect(result.success).toBe(true);
        expect(result.messageId).toBeDefined();
      }
    });
  });

  describe('getNotificationChannels', () => {
    it('should return notification channels', async () => {
      const result = await service.getNotificationChannels();

      expect(result.channels).toBeDefined();
      expect(Array.isArray(result.channels)).toBe(true);
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.enabled).toBeGreaterThanOrEqual(0);
      expect(result.disabled).toBeGreaterThanOrEqual(0);
      expect(result.byType).toBeDefined();
    });

    it('should have correct totals', async () => {
      const result = await service.getNotificationChannels();

      expect(result.total).toBe(result.enabled + result.disabled);
    });

    it('should return channels with valid structure', async () => {
      const result = await service.getNotificationChannels();

      for (const channel of result.channels) {
        expect(channel).toHaveProperty('id');
        expect(channel).toHaveProperty('name');
        expect(channel).toHaveProperty('type');
        expect(channel).toHaveProperty('config');
        expect(channel).toHaveProperty('priority');
        expect(channel).toHaveProperty('filters');
        expect(channel).toHaveProperty('metadata');

        expect(channel.config).toHaveProperty('enabled');
        expect(channel.config).toHaveProperty('credentials');
        expect(channel.config).toHaveProperty('settings');
        expect(channel.filters).toHaveProperty('severity');
        expect(channel.filters).toHaveProperty('services');
        expect(channel.filters).toHaveProperty('timeRange');
      }
    });

    it('should aggregate channels by type correctly', async () => {
      const result = await service.getNotificationChannels();

      expect(result.byType).toBeDefined();
      expect(typeof result.byType).toBe('object');

      // Verify that the counts match the actual channels
      let totalFromByType = 0;
      for (const count of Object.values(result.byType)) {
        totalFromByType += count;
      }
      expect(totalFromByType).toBe(result.total);
    });
  });

  describe('createNotificationChannel', () => {
    it('should create notification channel successfully', async () => {
      const channel = {
        name: 'Test Channel',
        type: 'telegram' as const,
        config: {
          enabled: true,
          credentials: {
            botToken: 'test-bot-token',
            chatId: 'test-chat-id',
          },
          settings: {
            parseMode: 'HTML',
            disableWebPagePreview: true,
          },
        },
        priority: 'medium' as const,
        filters: {
          severity: ['medium', 'high', 'critical'],
          services: [],
          timeRange: {
            start: '08:00',
            end: '22:00',
            days: [1, 2, 3, 4, 5, 6, 0],
          },
        },
        metadata: { category: 'test' },
      };

      const result = await service.createNotificationChannel(channel);

      expect(result.success).toBe(true);
      expect(result.channelId).toBeDefined();
      expect(result.channel).toBeDefined();
      expect(result.channel.name).toBe(channel.name);
      expect(result.channel.type).toBe(channel.type);
      expect(result.channel.config.enabled).toBe(channel.config.enabled);
    });

    it('should create channel with minimal config', async () => {
      const channel = {
        name: 'Minimal Channel',
        type: 'email' as const,
        config: {
          enabled: true,
          credentials: {
            smtpHost: 'smtp.example.com',
            username: 'test@example.com',
            password: 'password',
          },
          settings: {},
        },
        priority: 'low' as const,
        filters: {
          severity: ['high', 'critical'],
          services: [],
          timeRange: {
            start: '00:00',
            end: '23:59',
            days: [1, 2, 3, 4, 5, 6, 0],
          },
        },
        metadata: {},
      };

      const result = await service.createNotificationChannel(channel);

      expect(result.success).toBe(true);
      expect(result.channelId).toBeDefined();
      expect(result.channel.name).toBe(channel.name);
    });

    it('should create channels of different types', async () => {
      const channelTypes = [
        'telegram',
        'viber',
        'email',
        'sms',
        'webhook',
        'slack',
      ] as const;

      for (const type of channelTypes) {
        const channel = {
          name: `${type.charAt(0).toUpperCase() + type.slice(1)} Channel`,
          type,
          config: {
            enabled: true,
            credentials: { test: 'value' },
            settings: {},
          },
          priority: 'medium' as const,
          filters: {
            severity: ['medium', 'high'],
            services: [],
            timeRange: {
              start: '08:00',
              end: '18:00',
              days: [1, 2, 3, 4, 5],
            },
          },
          metadata: {},
        };

        const result = await service.createNotificationChannel(channel);

        expect(result.success).toBe(true);
        expect(result.channel.type).toBe(type);
      }
    });

    it('should generate unique channel IDs', async () => {
      const channel1 = {
        name: 'Channel 1',
        type: 'telegram' as const,
        config: {
          enabled: true,
          credentials: { botToken: 'token1' },
          settings: {},
        },
        priority: 'medium' as const,
        filters: {
          severity: ['medium'],
          services: [],
          timeRange: { start: '08:00', end: '18:00', days: [1, 2, 3, 4, 5] },
        },
        metadata: {},
      };

      const channel2 = {
        name: 'Channel 2',
        type: 'email' as const,
        config: {
          enabled: true,
          credentials: { smtpHost: 'smtp.example.com' },
          settings: {},
        },
        priority: 'high' as const,
        filters: {
          severity: ['high'],
          services: [],
          timeRange: {
            start: '00:00',
            end: '23:59',
            days: [1, 2, 3, 4, 5, 6, 0],
          },
        },
        metadata: {},
      };

      const result1 = await service.createNotificationChannel(channel1);
      const result2 = await service.createNotificationChannel(channel2);

      expect(result1.channelId).not.toBe(result2.channelId);
    });
  });

  describe('updateNotificationChannel', () => {
    let channelId: string;

    beforeEach(async () => {
      const result = await service.createNotificationChannel({
        name: 'Original Channel',
        type: 'telegram',
        config: {
          enabled: true,
          credentials: { botToken: 'original-token' },
          settings: { parseMode: 'HTML' },
        },
        priority: 'medium',
        filters: {
          severity: ['medium'],
          services: [],
          timeRange: { start: '08:00', end: '18:00', days: [1, 2, 3, 4, 5] },
        },
        metadata: { original: true },
      });
      channelId = result.channelId;
    });

    it('should update notification channel successfully', async () => {
      const updates = {
        name: 'Updated Channel',
        config: {
          enabled: false,
          credentials: { botToken: 'updated-token' },
          settings: { parseMode: 'Markdown' },
        },
        priority: 'high' as const,
        filters: {
          severity: ['high', 'critical'],
          services: ['updated-service'],
          timeRange: {
            start: '00:00',
            end: '23:59',
            days: [1, 2, 3, 4, 5, 6, 0],
          },
        },
        metadata: { updated: true },
      };

      const result = await service.updateNotificationChannel(
        channelId,
        updates
      );

      expect(result.success).toBe(true);
      expect(result.channel).toBeDefined();
      expect(result.channel?.name).toBe(updates.name);
      expect(result.channel?.config.enabled).toBe(updates.config.enabled);
      expect(result.channel?.priority).toBe(updates.priority);
    });

    it('should return false for non-existent channel', async () => {
      const updates = { name: 'Updated Name' };
      const result = await service.updateNotificationChannel(
        'non-existent-id',
        updates
      );

      expect(result.success).toBe(false);
      expect(result.channel).toBeNull();
    });
  });

  describe('getNotificationHistory', () => {
    beforeEach(async () => {
      // Send some test notifications
      await service.sendNotification({
        channels: ['telegram-admin'],
        message: {
          title: 'Test Alert 1',
          body: 'First test notification',
          severity: 'medium',
        },
        _service: 'test-service-1',
      });

      await service.sendNotification({
        channels: ['email-alerts'],
        message: {
          title: 'Test Alert 2',
          body: 'Second test notification',
          severity: 'high',
        },
        _service: 'test-service-2',
      });
    });

    it('should return notification history', async () => {
      const result = await service.getNotificationHistory('24h');

      expect(result.messages).toBeDefined();
      expect(Array.isArray(result.messages)).toBe(true);
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.byStatus).toBeDefined();
      expect(result.bySeverity).toBeDefined();
      expect(result.byChannel).toBeDefined();
      expect(result.timeRange).toBe('24h');
    });

    it('should return history for different time ranges', async () => {
      const timeRanges = ['1h', '24h', '7d', '30d'];

      for (const timeRange of timeRanges) {
        const result = await service.getNotificationHistory(timeRange);

        expect(result.messages).toBeDefined();
        expect(result.timeRange).toBe(timeRange);
        expect(result.total).toBeGreaterThanOrEqual(0);
        expect(result.byStatus).toBeDefined();
        expect(result.bySeverity).toBeDefined();
        expect(result.byChannel).toBeDefined();
      }
    });

    it('should return messages with valid structure', async () => {
      const result = await service.getNotificationHistory('24h');

      for (const message of result.messages) {
        expect(message).toHaveProperty('id');
        expect(message).toHaveProperty('channelId');
        expect(message).toHaveProperty('title');
        expect(message).toHaveProperty('message');
        expect(message).toHaveProperty('severity');
        expect(message).toHaveProperty('_service');
        expect(message).toHaveProperty('timestamp');
        expect(message).toHaveProperty('status');
        expect(message).toHaveProperty('retryCount');
        expect(message).toHaveProperty('maxRetries');
        expect(message).toHaveProperty('metadata');

        expect(message.timestamp).toBeInstanceOf(Date);
        expect(message.severity).toMatch(/^(low|medium|high|critical)$/);
        expect(message.status).toMatch(/^(pending|sent|failed|delivered)$/);
        expect(message.retryCount).toBeGreaterThanOrEqual(0);
        expect(message.maxRetries).toBeGreaterThanOrEqual(0);
      }
    });

    it('should aggregate notifications by status, severity, and channel', async () => {
      const result = await service.getNotificationHistory('24h');

      expect(result.byStatus).toBeDefined();
      expect(result.bySeverity).toBeDefined();
      expect(result.byChannel).toBeDefined();
      expect(typeof result.byStatus).toBe('object');
      expect(typeof result.bySeverity).toBe('object');
      expect(typeof result.byChannel).toBe('object');
    });

    it('should sort messages by timestamp descending', async () => {
      const result = await service.getNotificationHistory('24h');

      if (result.messages.length > 1) {
        for (let i = 1; i < result.messages.length; i++) {
          expect(result.messages?.[i]?.timestamp.getTime()).toBeLessThanOrEqual(
            result.messages?.[i - 1]?.timestamp.getTime() ?? 0
          );
        }
      }
    });
  });

  describe('retryFailedNotifications', () => {
    it('should retry failed notifications', async () => {
      const result = await service.retryFailedNotifications();

      expect(result.retried).toBeGreaterThanOrEqual(0);
      expect(result.successful).toBeGreaterThanOrEqual(0);
      expect(result.stillFailed).toBeGreaterThanOrEqual(0);
    });

    it('should have consistent totals', async () => {
      const result = await service.retryFailedNotifications();

      expect(result.retried).toBe(result.successful + result.stillFailed);
    });
  });

  describe('testNotificationChannel', () => {
    it('should test existing channel successfully', async () => {
      const result = await service.testNotificationChannel('telegram-admin');

      expect(result.success).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(result.message).toBeDefined();
      expect(typeof result.message).toBe('string');
    });

    it('should return false for non-existent channel', async () => {
      const result = await service.testNotificationChannel(
        'non-existent-channel'
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Channel not found');
    });

    it('should test different channel types', async () => {
      const channelIds = ['telegram-admin', 'email-alerts', 'slack-devops'];

      for (const channelId of channelIds) {
        const result = await service.testNotificationChannel(channelId);

        expect(result.success).toBeDefined();
        expect(typeof result.success).toBe('boolean');
        expect(result.message).toBeDefined();
        expect(typeof result.message).toBe('string');
      }
    });
  });
});

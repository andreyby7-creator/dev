import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotificationPriority,
  NotificationType,
} from '../../../types/notifications';
import type { CreateNotificationDto } from '../../dto/create-notification.dto';
import type { CreateTemplateDto } from '../../dto/create-template.dto';
import { NotificationsService } from '../notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationsService],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);

    // Добавляем канал для тестов
    (
      service as unknown as {
        channels: Array<{
          id: string;
          type: string;
          isActive: boolean;
          config: Record<string, unknown>;
        }>;
      }
    ).channels = [
      {
        id: 'test-channel',
        type: NotificationType.EMAIL,
        isActive: true,
        config: {},
      },
    ];
  });

  describe('createNotification', () => {
    it('should create a new notification successfully', async () => {
      const createDto: CreateNotificationDto = {
        type: NotificationType.EMAIL,
        priority: NotificationPriority.HIGH,
        recipient: 'test@example.com',
        subject: 'Test Subject',
        content: 'Test content',
        metadata: { key: 'value' },
        maxRetries: 3,
      };

      const result = await service.createNotification(createDto);

      expect(result).toBeDefined();
      expect(result.type).toBe(NotificationType.EMAIL);
      expect(result.priority).toBe(NotificationPriority.HIGH);
      expect(result.recipient).toBe('test@example.com');
      expect(result.subject).toBe('Test Subject');
      expect(result.content).toBe('Test content');
      expect(result.metadata).toEqual({ key: 'value' });
      expect(result.maxRetries).toBe(3);
      expect(result.status).toBe('pending');
      expect(result.retryCount).toBe(0);
    });

    it('should create notification with scheduledAt', async () => {
      const scheduledAt = new Date(Date.now() + 3600000); // 1 hour from now
      const createDto: CreateNotificationDto = {
        type: NotificationType.SMS,
        priority: NotificationPriority.MEDIUM,
        recipient: '+1234567890',
        content: 'Scheduled message',
        scheduledAt: scheduledAt.toISOString(),
      };

      const result = await service.createNotification(createDto);

      expect(result.scheduledAt).toEqual(scheduledAt);
    });

    it('should create notification without optional fields', async () => {
      const createDto: CreateNotificationDto = {
        type: NotificationType.PUSH,
        priority: NotificationPriority.LOW,
        recipient: 'user123',
        content: 'Simple notification',
      };

      const result = await service.createNotification(createDto);

      expect(result.subject).toBe('');
      expect(result.metadata).toBeUndefined();
      expect(result.scheduledAt).toBeUndefined();
      expect(result.maxRetries).toBe(3); // default value
    });
  });

  describe('getNotification', () => {
    it('should return notification by id', async () => {
      const createDto: CreateNotificationDto = {
        type: NotificationType.EMAIL,
        priority: NotificationPriority.HIGH,
        recipient: 'test@example.com',
        content: 'Test content',
      };

      const created = await service.createNotification(createDto);
      const result = await service.getNotification(created.id);

      expect(result).toEqual(created);
    });

    it('should throw NotFoundException for non-existent notification', async () => {
      await expect(service.getNotification('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getNotifications', () => {
    beforeEach(async () => {
      // Create test notifications
      await service.createNotification({
        type: NotificationType.EMAIL,
        priority: NotificationPriority.HIGH,
        recipient: 'email1@example.com',
        content: 'Email 1',
      });
      await service.createNotification({
        type: NotificationType.SMS,
        priority: NotificationPriority.MEDIUM,
        recipient: '+1234567890',
        content: 'SMS 1',
      });
      await service.createNotification({
        type: NotificationType.EMAIL,
        priority: NotificationPriority.LOW,
        recipient: 'email2@example.com',
        content: 'Email 2',
      });
    });

    it('should return all notifications', async () => {
      const result = await service.getNotifications();

      expect(result.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter notifications by type', async () => {
      const result = await service.getNotifications(NotificationType.EMAIL);

      expect(result.every(n => n.type === NotificationType.EMAIL)).toBe(true);
    });

    it('should respect limit and offset', async () => {
      const result = await service.getNotifications(undefined, 2, 1);

      expect(result.length).toBeLessThanOrEqual(2);
    });
  });

  describe('updateNotification', () => {
    it('should update notification successfully', async () => {
      const createDto: CreateNotificationDto = {
        type: NotificationType.EMAIL,
        priority: NotificationPriority.HIGH,
        recipient: 'test@example.com',
        content: 'Original content',
      };

      const created = await service.createNotification(createDto);
      const originalUpdatedAt = created.updatedAt;
      const updateData = {
        content: 'Updated content',
        priority: NotificationPriority.CRITICAL,
      };

      // Add delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 100));

      const result = await service.updateNotification(created.id, updateData);

      expect(result.content).toBe('Updated content');
      expect(result.priority).toBe(NotificationPriority.CRITICAL);
      expect(result.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
    });

    it('should throw NotFoundException for non-existent notification', async () => {
      await expect(
        service.updateNotification('non-existent', { content: 'test' })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
      const createDto: CreateNotificationDto = {
        type: NotificationType.EMAIL,
        priority: NotificationPriority.HIGH,
        recipient: 'test@example.com',
        content: 'Test content',
      };

      const created = await service.createNotification(createDto);
      await service.deleteNotification(created.id);

      await expect(service.getNotification(created.id)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw NotFoundException for non-existent notification', async () => {
      await expect(service.deleteNotification('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('createTemplate', () => {
    it('should create a new template successfully', async () => {
      const createDto: CreateTemplateDto = {
        name: 'Welcome Template',
        type: NotificationType.EMAIL,
        subject: 'Welcome {{userName}}',
        content: 'Hello {{userName}}, welcome to our service!',
        variables: ['userName'],
      };

      const result = await service.createTemplate(createDto);

      expect(result).toBeDefined();
      expect(result.name).toBe('Welcome Template');
      expect(result.type).toBe(NotificationType.EMAIL);
      expect(result.subject).toBe('Welcome {{userName}}');
      expect(result.content).toBe(
        'Hello {{userName}}, welcome to our service!'
      );
      expect(result.variables).toEqual(['userName']);
      expect(result.isActive).toBe(true);
    });
  });

  describe('getTemplate', () => {
    it('should return template by id', async () => {
      const createDto: CreateTemplateDto = {
        name: 'Test Template',
        type: NotificationType.EMAIL,
        subject: 'Test Subject',
        content: 'Test content',
        variables: [],
      };

      const created = await service.createTemplate(createDto);
      const result = await service.getTemplate(created.id);

      expect(result).toEqual(created);
    });

    it('should throw NotFoundException for non-existent template', async () => {
      await expect(service.getTemplate('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getTemplates', () => {
    it('should return all active templates', async () => {
      const result = await service.getTemplates();

      expect(result.every(t => t.isActive)).toBe(true);
    });

    it('should filter templates by type', async () => {
      const result = await service.getTemplates(NotificationType.EMAIL);

      expect(result.every(t => t.type === NotificationType.EMAIL)).toBe(true);
    });
  });

  describe('updateTemplate', () => {
    it('should update template successfully', async () => {
      const createDto: CreateTemplateDto = {
        name: 'Original Template',
        type: NotificationType.EMAIL,
        subject: 'Original Subject',
        content: 'Original content',
        variables: [],
      };

      const created = await service.createTemplate(createDto);
      const updateData = {
        name: 'Updated Template',
        content: 'Updated content',
      };

      const originalUpdatedAt = created.updatedAt;

      // Add delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 100));

      const result = await service.updateTemplate(created.id, updateData);

      expect(result.name).toBe('Updated Template');
      expect(result.content).toBe('Updated content');
      expect(result.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
    });
  });

  describe('deleteTemplate', () => {
    it('should delete template successfully', async () => {
      const createDto: CreateTemplateDto = {
        name: 'Test Template',
        type: NotificationType.EMAIL,
        subject: 'Test Subject',
        content: 'Test content',
        variables: [],
      };

      const created = await service.createTemplate(createDto);
      await service.deleteTemplate(created.id);

      await expect(service.getTemplate(created.id)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('sendNotification', () => {
    it('should send notification successfully', async () => {
      const createDto: CreateNotificationDto = {
        type: NotificationType.EMAIL,
        priority: NotificationPriority.HIGH,
        recipient: 'test@example.com',
        content: 'Test content',
      };

      const created = await service.createNotification(createDto);
      const result = await service.sendNotification(created);

      expect(result).toBe(true);
      expect(created.status).toBe('sent');
    });

    it('should handle sending failure', async () => {
      const createDto: CreateNotificationDto = {
        type: NotificationType.EMAIL,
        priority: NotificationPriority.HIGH,
        recipient: 'test@example.com',
        content: 'Test content',
      };

      const created = await service.createNotification(createDto);

      // Mock Math.random to simulate failure
      const originalRandom = Math.random;
      Math.random = () => 0.01; // Force failure (< 0.05 threshold)

      const result = await service.sendNotification(created);

      expect(result).toBe(false);
      expect(created.status).toBe('failed');

      // Restore original Math.random
      Math.random = originalRandom;
    });
  });

  describe('getStats', () => {
    it('should return notification statistics', async () => {
      // Create some test notifications
      await service.createNotification({
        type: NotificationType.EMAIL,
        priority: NotificationPriority.HIGH,
        recipient: 'test1@example.com',
        content: 'Test 1',
      });
      await service.createNotification({
        type: NotificationType.SMS,
        priority: NotificationPriority.MEDIUM,
        recipient: '+1234567890',
        content: 'Test 2',
      });

      const result = await service.getStats();

      expect(result).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(2);
      expect(result.period).toBeDefined();
      expect(result.channelStats).toBeDefined();
    });

    it('should return statistics for custom period', async () => {
      const start = new Date(Date.now() - 3600000); // 1 hour ago
      const end = new Date();

      const result = await service.getStats({ start, end });

      expect(result.period.start).toEqual(start);
      expect(result.period.end).toEqual(end);
    });
  });

  describe('getUserPreferences', () => {
    it('should return user preferences', async () => {
      const result = await service.getUserPreferences('user123');

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('updateUserPreferences', () => {
    it('should create new user preferences', async () => {
      const result = await service.updateUserPreferences(
        'user123',
        NotificationType.EMAIL,
        { isEnabled: true }
      );

      expect(result).toBeDefined();
      expect(result.userId).toBe('user123');
      expect(result.type).toBe(NotificationType.EMAIL);
      expect(result.isEnabled).toBe(true);
    });

    it('should update existing user preferences', async () => {
      // Create initial preference
      await service.updateUserPreferences('user123', NotificationType.EMAIL, {
        isEnabled: true,
      });

      // Update preference
      const result = await service.updateUserPreferences(
        'user123',
        NotificationType.EMAIL,
        { isEnabled: false, channels: [NotificationType.SMS] }
      );

      expect(result.isEnabled).toBe(false);
      expect(result.channels).toEqual([NotificationType.SMS]);
    });
  });
});

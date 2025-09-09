import { vi } from 'vitest';
import {
  NotificationPriority,
  NotificationType,
} from '../../../types/notifications';
import type { CreateNotificationDto } from '../../dto/create-notification.dto';
import type { CreateTemplateDto } from '../../dto/create-template.dto';
import { NotificationsService } from '../../services/notifications.service';
import { NotificationsController } from '../notifications.controller';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let mockNotificationsService: {
    createNotification: ReturnType<typeof vi.fn>;
    getNotification: ReturnType<typeof vi.fn>;
    getNotifications: ReturnType<typeof vi.fn>;
    updateNotification: ReturnType<typeof vi.fn>;
    deleteNotification: ReturnType<typeof vi.fn>;
    createTemplate: ReturnType<typeof vi.fn>;
    getTemplate: ReturnType<typeof vi.fn>;
    getTemplates: ReturnType<typeof vi.fn>;
    updateTemplate: ReturnType<typeof vi.fn>;
    deleteTemplate: ReturnType<typeof vi.fn>;
    getStats: ReturnType<typeof vi.fn>;
    getUserPreferences: ReturnType<typeof vi.fn>;
    updateUserPreferences: ReturnType<typeof vi.fn>;
  };

  const mockNotification = {
    id: '1',
    type: NotificationType.EMAIL,
    priority: NotificationPriority.HIGH,
    recipient: 'test@example.com',
    subject: 'Test Subject',
    content: 'Test content',
    status: 'pending' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    retryCount: 0,
    maxRetries: 3,
  };

  const mockTemplate = {
    id: '1',
    name: 'Test Template',
    type: NotificationType.EMAIL,
    subject: 'Test Subject',
    content: 'Test content',
    variables: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockStats = {
    total: 10,
    pending: 2,
    sent: 7,
    failed: 1,
    cancelled: 0,
    totalDelivered: 7,
    deliveryRate: 70,
    averageDeliveryTime: 1500,
    byType: {} as Record<NotificationType, number>,
    byPriority: {} as Record<NotificationPriority, number>,
    channelStats: {} as Record<string, number>,
    period: { start: new Date(), end: new Date() },
  };

  const mockPreferences = [
    {
      id: '1',
      userId: 'user123',
      type: NotificationType.EMAIL,
      isEnabled: true,
      channels: [NotificationType.EMAIL],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(async () => {
    mockNotificationsService = {
      createNotification: vi.fn().mockResolvedValue(mockNotification),
      getNotification: vi.fn().mockResolvedValue(mockNotification),
      getNotifications: vi.fn().mockResolvedValue([mockNotification]),
      updateNotification: vi.fn().mockResolvedValue(mockNotification),
      deleteNotification: vi.fn().mockResolvedValue(undefined),
      createTemplate: vi.fn().mockResolvedValue(mockTemplate),
      getTemplate: vi.fn().mockResolvedValue(mockTemplate),
      getTemplates: vi.fn().mockResolvedValue([mockTemplate]),
      updateTemplate: vi.fn().mockResolvedValue(mockTemplate),
      deleteTemplate: vi.fn().mockResolvedValue(undefined),
      getStats: vi.fn().mockResolvedValue(mockStats),
      getUserPreferences: vi.fn().mockResolvedValue(mockPreferences),
      updateUserPreferences: vi.fn().mockResolvedValue(mockPreferences[0]),
    };

    controller = new NotificationsController(
      mockNotificationsService as unknown as NotificationsService
    );
  });

  describe('createNotification', () => {
    it('should create a new notification', async () => {
      const createDto: CreateNotificationDto = {
        type: NotificationType.EMAIL,
        priority: NotificationPriority.HIGH,
        recipient: 'test@example.com',
        subject: 'Test Subject',
        content: 'Test content',
      };

      const result = await controller.createNotification(createDto);

      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        createDto
      );
      expect(result).toEqual({
        success: true,
        data: mockNotification,
        message: 'Уведомление успешно создано',
      });
    });
  });

  describe('getNotifications', () => {
    it('should return notifications with default parameters', async () => {
      const result = await controller.getNotifications();

      expect(mockNotificationsService.getNotifications).toHaveBeenCalledWith(
        undefined,
        10,
        0
      );
      expect(result).toEqual({
        success: true,
        data: [mockNotification],
        message: 'Уведомления успешно получены',
      });
    });

    it('should return notifications with custom parameters', async () => {
      const result = await controller.getNotifications(
        '20',
        '10',
        'sent',
        NotificationType.EMAIL
      );

      expect(mockNotificationsService.getNotifications).toHaveBeenCalledWith(
        NotificationType.EMAIL,
        20,
        10
      );
      expect(result).toEqual({
        success: true,
        data: [mockNotification],
        message: 'Уведомления успешно получены',
      });
    });
  });

  describe('getNotification', () => {
    it('should return notification by id', async () => {
      const result = await controller.getNotification('1');

      expect(mockNotificationsService.getNotification).toHaveBeenCalledWith(
        '1'
      );
      expect(result).toEqual({
        success: true,
        data: mockNotification,
        message: 'Уведомление найдено',
      });
    });
  });

  describe('updateNotification', () => {
    it('should update notification with all fields', async () => {
      const updateDto: CreateNotificationDto = {
        type: NotificationType.SMS,
        priority: NotificationPriority.CRITICAL,
        recipient: '+1234567890',
        subject: 'Updated Subject',
        content: 'Updated content',
        metadata: { key: 'value' },
        maxRetries: 5,
        scheduledAt: new Date().toISOString(),
      };

      const result = await controller.updateNotification('1', updateDto);

      expect(mockNotificationsService.updateNotification).toHaveBeenCalledWith(
        '1',
        {
          type: NotificationType.SMS,
          priority: NotificationPriority.CRITICAL,
          recipient: '+1234567890',
          content: 'Updated content',
          subject: 'Updated Subject',
          metadata: { key: 'value' },
          maxRetries: 5,
          scheduledAt: expect.any(Date),
        }
      );
      expect(result).toEqual({
        success: true,
        data: mockNotification,
        message: 'Уведомление успешно обновлено',
      });
    });

    it('should update notification with partial fields', async () => {
      const updateDto: CreateNotificationDto = {
        type: NotificationType.EMAIL,
        priority: NotificationPriority.HIGH,
        recipient: 'test@example.com',
        content: 'Updated content only',
      };

      const result = await controller.updateNotification('1', updateDto);

      expect(mockNotificationsService.updateNotification).toHaveBeenCalledWith(
        '1',
        {
          type: NotificationType.EMAIL,
          priority: NotificationPriority.HIGH,
          recipient: 'test@example.com',
          content: 'Updated content only',
        }
      );
      expect(result).toEqual({
        success: true,
        data: mockNotification,
        message: 'Уведомление успешно обновлено',
      });
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification', async () => {
      const result = await controller.deleteNotification('1');

      expect(mockNotificationsService.deleteNotification).toHaveBeenCalledWith(
        '1'
      );
      expect(result).toEqual({
        success: true,
        message: 'Уведомление успешно удалено',
      });
    });
  });

  describe('createTemplate', () => {
    it('should create a new template', async () => {
      const createDto: CreateTemplateDto = {
        name: 'Test Template',
        type: NotificationType.EMAIL,
        subject: 'Test Subject',
        content: 'Test content',
        variables: ['name'],
      };

      const result = await controller.createTemplate(createDto);

      expect(mockNotificationsService.createTemplate).toHaveBeenCalledWith(
        createDto
      );
      expect(result).toEqual({
        success: true,
        data: mockTemplate,
        message: 'Шаблон успешно создан',
      });
    });
  });

  describe('getTemplates', () => {
    it('should return all templates', async () => {
      const result = await controller.getTemplates();

      expect(mockNotificationsService.getTemplates).toHaveBeenCalledWith(
        undefined
      );
      expect(result).toEqual({
        success: true,
        data: [mockTemplate],
        message: 'Шаблоны успешно получены',
      });
    });

    it('should return templates filtered by type', async () => {
      const result = await controller.getTemplates(NotificationType.EMAIL);

      expect(mockNotificationsService.getTemplates).toHaveBeenCalledWith(
        NotificationType.EMAIL
      );
      expect(result).toEqual({
        success: true,
        data: [mockTemplate],
        message: 'Шаблоны успешно получены',
      });
    });
  });

  describe('getTemplate', () => {
    it('should return template by id', async () => {
      const result = await controller.getTemplate('1');

      expect(mockNotificationsService.getTemplate).toHaveBeenCalledWith('1');
      expect(result).toEqual({
        success: true,
        data: mockTemplate,
        message: 'Шаблон найден',
      });
    });
  });

  describe('updateTemplate', () => {
    it('should update template', async () => {
      const updateDto: CreateTemplateDto = {
        name: 'Updated Template',
        type: NotificationType.EMAIL,
        subject: 'Updated Subject',
        content: 'Updated content',
        variables: ['name', 'email'],
      };

      const result = await controller.updateTemplate('1', updateDto);

      expect(mockNotificationsService.updateTemplate).toHaveBeenCalledWith(
        '1',
        updateDto
      );
      expect(result).toEqual({
        success: true,
        data: mockTemplate,
        message: 'Шаблон успешно обновлен',
      });
    });
  });

  describe('deleteTemplate', () => {
    it('should delete template', async () => {
      const result = await controller.deleteTemplate('1');

      expect(mockNotificationsService.deleteTemplate).toHaveBeenCalledWith('1');
      expect(result).toEqual({
        success: true,
        message: 'Шаблон успешно удален',
      });
    });
  });

  describe('getStats', () => {
    it('should return notification statistics', async () => {
      const result = await controller.getStats();

      expect(mockNotificationsService.getStats).toHaveBeenCalledWith();
      expect(result).toEqual({
        success: true,
        data: mockStats,
        message: 'Статистика успешно получена',
      });
    });
  });

  describe('getUserPreferences', () => {
    it('should return user preferences', async () => {
      const result = await controller.getUserPreferences('user123');

      expect(mockNotificationsService.getUserPreferences).toHaveBeenCalledWith(
        'user123'
      );
      expect(result).toEqual({
        success: true,
        data: mockPreferences,
        message: 'Предпочтения пользователя получены',
      });
    });
  });

  describe('updateUserPreferences', () => {
    it('should update user preferences', async () => {
      const preferences = {
        isEnabled: false,
        channels: [NotificationType.SMS],
      };

      const result = await controller.updateUserPreferences(
        'user123',
        NotificationType.EMAIL,
        preferences
      );

      expect(
        mockNotificationsService.updateUserPreferences
      ).toHaveBeenCalledWith('user123', NotificationType.EMAIL, preferences);
      expect(result).toEqual({
        success: true,
        data: mockPreferences[0],
        message: 'Предпочтения пользователя обновлены',
      });
    });
  });
});

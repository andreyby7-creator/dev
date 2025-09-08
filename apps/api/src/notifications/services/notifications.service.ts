import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  INotification,
  INotificationChannel,
  INotificationPreference,
  INotificationQueue,
  INotificationStats,
  INotificationTemplate,
} from '../../types/notifications';
import { NotificationType } from '../../types/notifications';
import type { CreateNotificationDto } from '../dto/create-notification.dto';
import type { CreateTemplateDto } from '../dto/create-template.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  // В реальном приложении здесь были бы репозитории для работы с БД
  private notifications: INotification[] = [];
  private templates: INotificationTemplate[] = [];
  private channels: INotificationChannel[] = [];
  private preferences: INotificationPreference[] = [];
  private queue: INotificationQueue[] = [];

  constructor() {
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // Создаем тестовые шаблоны
    this.templates = [
      {
        id: '1',
        name: 'Welcome Email',
        type: NotificationType.EMAIL,
        subject: 'Добро пожаловать в систему!',
        content: 'Здравствуйте, {{userName}}! Добро пожаловать в нашу систему.',
        variables: ['userName'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        name: 'Password Reset',
        type: NotificationType.EMAIL,
        subject: 'Сброс пароля',
        content: 'Для сброса пароля перейдите по ссылке: {{resetLink}}',
        variables: ['resetLink'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Создаем тестовые каналы
    this.channels = [
      {
        id: '1',
        type: NotificationType.EMAIL,
        name: 'SMTP Channel',
        config: {
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
        },
        isActive: true,
        priority: 1,
        rateLimit: {
          maxPerMinute: 60,
          maxPerHour: 1000,
          maxPerDay: 10000,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        type: NotificationType.SMS,
        name: 'Twilio SMS',
        config: {
          accountSid: 'your-account-sid',
          authToken: 'your-auth-token',
          fromNumber: '+1234567890',
        },
        isActive: true,
        priority: 2,
        rateLimit: {
          maxPerMinute: 30,
          maxPerHour: 500,
          maxPerDay: 5000,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  // Уведомления
  async createNotification(
    createDto: CreateNotificationDto
  ): Promise<INotification> {
    const notification: INotification = {
      id: Date.now().toString(),
      type: createDto.type,
      priority: createDto.priority,
      status: 'pending',
      recipient: createDto.recipient,
      subject: createDto.subject ?? '',
      content: createDto.content,
      ...(createDto.metadata && { metadata: createDto.metadata }),
      ...(createDto.scheduledAt != null &&
        createDto.scheduledAt !== '' && {
          scheduledAt: new Date(createDto.scheduledAt),
        }),
      createdAt: new Date(),
      updatedAt: new Date(),
      retryCount: 0,
      maxRetries: 3,
    };

    this.notifications.push(notification);
    this.logger.log(
      `Создано уведомление ${notification.id} для ${notification.recipient}`
    );

    // Добавляем в очередь для отправки
    this.addToQueue(notification);

    return notification;
  }

  async getNotification(id: string): Promise<INotification> {
    const notification = this.notifications.find(n => n.id === id);
    if (!notification) {
      throw new NotFoundException(`Уведомление с ID ${id} не найдено`);
    }
    return notification;
  }

  async getNotifications(
    type?: NotificationType,
    limit = 100,
    offset = 0
  ): Promise<INotification[]> {
    let filtered = [...this.notifications];

    if (type != null) {
      filtered = filtered.filter(n => n.type === type);
    }

    return filtered.slice(offset, offset + limit);
  }

  async updateNotification(
    id: string,
    updateDto: Partial<INotification>
  ): Promise<INotification> {
    const notification = await this.getNotification(id);

    Object.assign(notification, updateDto, { updatedAt: new Date() });

    this.logger.log(`Обновлено уведомление ${id}`);
    return notification;
  }

  async deleteNotification(id: string): Promise<void> {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index === -1) {
      throw new NotFoundException(`Уведомление с ID ${id} не найдено`);
    }

    this.notifications.splice(index, 1);
    this.logger.log(`Удалено уведомление ${id}`);
  }

  // Шаблоны
  async createTemplate(
    createDto: CreateTemplateDto
  ): Promise<INotificationTemplate> {
    const template: INotificationTemplate = {
      id: Date.now().toString(),
      name: createDto.name,
      type: createDto.type,
      subject: createDto.subject ?? '',
      content: createDto.content,
      variables: createDto.variables,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.push(template);
    this.logger.log(`Создан шаблон ${template.name}`);
    return template;
  }

  async getTemplate(id: string): Promise<INotificationTemplate> {
    const template = this.templates.find(t => t.id === id);
    if (!template) {
      throw new NotFoundException(`Шаблон с ID ${id} не найден`);
    }
    return template;
  }

  async getTemplates(
    type?: NotificationType
  ): Promise<INotificationTemplate[]> {
    if (type != null) {
      return this.templates.filter(t => t.type === type && t.isActive);
    }
    return this.templates.filter(t => t.isActive);
  }

  async updateTemplate(
    id: string,
    updateDto: Partial<INotificationTemplate>
  ): Promise<INotificationTemplate> {
    const template = await this.getTemplate(id);

    Object.assign(template, updateDto, { updatedAt: new Date() });

    this.logger.log(`Обновлен шаблон ${template.name}`);
    return template;
  }

  async deleteTemplate(id: string): Promise<void> {
    const index = this.templates.findIndex(t => t.id === id);
    if (index === -1) {
      throw new NotFoundException(`Шаблон с ID ${id} не найден`);
    }

    this.templates.splice(index, 1);
    this.logger.log(`Удален шаблон ${id}`);
  }

  // Отправка уведомлений
  async sendNotification(notification: INotification): Promise<boolean> {
    try {
      this.logger.log(
        `Отправка уведомления ${notification.id} через ${notification.type}`
      );

      // В реальном приложении здесь была бы логика отправки через соответствующий канал
      const channel = this.channels.find(
        c => c.type === notification.type && c.isActive
      );
      if (!channel) {
        throw new BadRequestException(
          `Канал для типа ${notification.type} не найден или неактивен`
        );
      }

      // Симуляция отправки
      await this.simulateSending();

      // Обновляем статус
      notification.status = 'sent';
      notification.updatedAt = new Date();

      this.logger.log(`Уведомление ${notification.id} успешно отправлено`);
      return true;
    } catch (error) {
      this.logger.error(
        `Ошибка отправки уведомления ${notification.id}: ${error instanceof Error ? error.message : String(error)}`
      );

      notification.status = 'failed';
      notification.updatedAt = new Date();

      return false;
    }
  }

  private async simulateSending(): Promise<void> {
    // Симуляция задержки отправки
    await new Promise<void>(resolve =>
      (
        globalThis as unknown as {
          setTimeout: (fn: () => void, ms: number) => void;
        }
      ).setTimeout(() => resolve(), 100 + Math.random() * 200)
    );

    // Симуляция случайных ошибок (5% вероятность)
    if (Math.random() < 0.05) {
      throw new Error('Ошибка сети при отправке');
    }
  }

  // Очередь уведомлений
  private addToQueue(notification: INotification): void {
    const queueItem: INotificationQueue = {
      id: `queue-${Date.now()}`,
      notificationId: notification.id,
      channelId: `channel-${notification.type}`,
      priority: notification.priority,
      scheduledAt: notification.scheduledAt ?? new Date(),
      attempts: 0,
      maxAttempts: notification.maxRetries ?? 3,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.queue.push(queueItem);
    this.logger.log(`Уведомление ${notification.id} добавлено в очередь`);
  }

  // Статистика
  async getStats(period?: {
    start: Date;
    end: Date;
  }): Promise<INotificationStats> {
    const now = new Date();
    const start =
      period?.start ?? new Date(now.getTime() - 24 * 60 * 60 * 1000); // Последние 24 часа
    const end = period?.end ?? now;

    const periodNotifications = this.notifications.filter(
      n => n.createdAt >= start && n.createdAt <= end
    );

    const totalDelivered = periodNotifications.filter(
      n => n.status === 'sent'
    ).length;
    const total = periodNotifications.length;

    const deliveryRate = total > 0 ? (totalDelivered / total) * 100 : 0;

    // Расчет среднего времени доставки
    const deliveredNotifications = periodNotifications.filter(
      n => n.status === 'sent'
    );
    const averageDeliveryTime =
      deliveredNotifications.length > 0
        ? deliveredNotifications.reduce((sum, n) => {
            return sum + (n.updatedAt.getTime() - n.createdAt.getTime());
          }, 0) / deliveredNotifications.length
        : 0;

    // Статистика по каналам
    const channelStats: Record<
      NotificationType,
      {
        sent: number;
        delivered: number;
        failed: number;
        rate: number;
      }
    > = {} as Record<
      NotificationType,
      {
        sent: number;
        delivered: number;
        failed: number;
        rate: number;
      }
    >;
    Object.values(NotificationType).forEach(type => {
      const typeNotifications = periodNotifications.filter(
        n => n.type === type
      );
      const typeTotal = typeNotifications.length;
      const typeDelivered = typeNotifications.filter(
        n => n.status === 'sent'
      ).length;

      channelStats[type] = {
        sent: typeTotal,
        delivered: typeDelivered,
        failed: typeTotal - typeDelivered,
        rate: typeTotal > 0 ? (typeDelivered / typeTotal) * 100 : 0,
      };
    });

    return {
      total: total,
      pending: periodNotifications.filter(n => n.status === 'pending').length,
      sent: totalDelivered,
      failed: periodNotifications.filter(n => n.status === 'failed').length,
      cancelled: periodNotifications.filter(n => n.status === 'cancelled')
        .length,
      totalDelivered,
      deliveryRate,
      averageDeliveryTime,
      byType: {} as Record<NotificationType, number>, // Placeholder
      byPriority: {} as Record<string, number>, // Placeholder
      channelStats,
      period: { start, end },
    };
  }

  // Предпочтения пользователей
  async getUserPreferences(userId: string): Promise<INotificationPreference[]> {
    return this.preferences.filter(p => p.userId === userId);
  }

  async updateUserPreferences(
    userId: string,
    type: NotificationType,
    preferences: Partial<INotificationPreference>
  ): Promise<INotificationPreference> {
    let preference = this.preferences.find(
      p => p.userId === userId && p.type === type
    );

    if (!preference) {
      preference = {
        id: Date.now().toString(),
        userId,
        type,
        isEnabled: true,
        channels: [type],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.preferences.push(preference);
    }

    Object.assign(preference, preferences, { updatedAt: new Date() });
    return preference;
  }
}

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type {
  INotification,
  INotificationTemplate,
} from '../../types/notifications';

@Injectable()
export class SmsNotificationService {
  private readonly logger = new Logger(SmsNotificationService.name);

  async sendSms(
    notification: INotification,
    template?: INotificationTemplate
  ): Promise<boolean> {
    try {
      this.logger.log(
        `Отправка SMS уведомления ${notification.id} на ${notification.recipient}`
      );

      // В реальном приложении здесь была бы интеграция с SMS провайдерами
      // Например, через Twilio, AWS SNS или другие сервисы

      // Валидация номера телефона
      if (!this.isValidPhoneNumber(notification.recipient)) {
        throw new BadRequestException(
          `Неверный номер телефона: ${notification.recipient}`
        );
      }

      // Подготовка содержимого SMS
      const smsContent = this.prepareSmsContent(notification, template);

      // Проверка длины SMS (стандарт GSM: 160 символов)
      if (smsContent.length > 160) {
        this.logger.warn(
          `SMS ${notification.id} превышает 160 символов (${smsContent.length})`
        );
      }

      // Симуляция отправки через SMS провайдера
      await this.simulateSmsSend();

      this.logger.log(`SMS уведомление ${notification.id} успешно отправлено`);
      return true;
    } catch (error) {
      this.logger.error(
        `Ошибка отправки SMS уведомления ${notification.id}:`,
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  async sendBulkSms(
    notifications: INotification[]
  ): Promise<{ success: number; failed: number }> {
    this.logger.log(`Отправка ${notifications.length} SMS уведомлений`);

    let success = 0;
    let failed = 0;

    for (const notification of notifications) {
      try {
        await this.sendSms(notification);
        success++;
      } catch (error) {
        this.logger.error(
          `Ошибка отправки SMS ${notification.id}:`,
          error instanceof Error ? error.message : String(error)
        );
        failed++;
      }
    }

    this.logger.log(
      `Массовая отправка SMS завершена: ${success} успешно, ${failed} неудачно`
    );
    return { success, failed };
  }

  private isValidPhoneNumber(phone: string): boolean {
    // Простая валидация международного формата
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }

  private prepareSmsContent(
    notification: INotification,
    template?: INotificationTemplate
  ): string {
    let content = notification.content;

    // Если есть шаблон, используем его
    if (template != null) {
      content = template.content;
    }

    // Заменяем переменные в шаблоне
    if (notification.metadata != null) {
      Object.entries(notification.metadata).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        content = content.replace(new RegExp(placeholder, 'g'), String(value));
      });
    }

    // Ограничиваем длину SMS
    if (content.length > 160) {
      content = content.substring(0, 157) + '...';
    }

    return content;
  }

  private async simulateSmsSend(): Promise<void> {
    // Симуляция задержки SMS сервера
    await new Promise<void>(resolve =>
      (
        globalThis as unknown as {
          setTimeout: (fn: () => void, ms: number) => void;
        }
      ).setTimeout(() => resolve(), 100 + Math.random() * 200)
    );

    // Симуляция случайных ошибок SMS (2% вероятность)
    if (Math.random() < 0.02) {
      throw new Error('SMS сервер недоступен');
    }

    // Симуляция проверки rate limit
    if (Math.random() < 0.01) {
      throw new Error('Превышен лимит отправки SMS');
    }
  }

  // Методы для работы с различными SMS провайдерами
  async sendViaTwilio(notification: INotification): Promise<boolean> {
    this.logger.log(`Отправка через Twilio: ${notification.id}`);
    return this.sendSms(notification);
  }

  async sendViaAWS(notification: INotification): Promise<boolean> {
    this.logger.log(`Отправка через AWS SNS: ${notification.id}`);
    return this.sendSms(notification);
  }

  async sendViaNexmo(notification: INotification): Promise<boolean> {
    this.logger.log(`Отправка через Nexmo: ${notification.id}`);
    return this.sendSms(notification);
  }

  // Методы для работы с различными регионами
  async sendToUS(notification: INotification): Promise<boolean> {
    this.logger.log(`Отправка в США: ${notification.id}`);
    return this.sendSms(notification);
  }

  async sendToEU(notification: INotification): Promise<boolean> {
    this.logger.log(`Отправка в ЕС: ${notification.id}`);
    return this.sendSms(notification);
  }

  async sendToAsia(notification: INotification): Promise<boolean> {
    this.logger.log(`Отправка в Азию: ${notification.id}`);
    return this.sendSms(notification);
  }
}

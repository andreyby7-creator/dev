import { Injectable, Logger } from '@nestjs/common';
import type { INotification } from '../../types/notifications';

@Injectable()
export class EmailNotificationService {
  private readonly logger = new Logger(EmailNotificationService.name);

  async sendEmail(notification: INotification): Promise<boolean> {
    try {
      this.logger.log(`Отправка email уведомления ${notification.id}`);

      if (!this.isValidEmail(notification.recipient)) {
        throw new Error(`Неверный формат email: ${notification.recipient}`);
      }

      // Симуляция отправки через SMTP
      await this.simulateSmtpSend();

      this.logger.log(
        `Email уведомление ${notification.id} успешно отправлено`
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Ошибка отправки email уведомления ${notification.id}:`,
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  async sendBulkEmail(
    notifications: INotification[]
  ): Promise<{ success: number; failed: number }> {
    this.logger.log(`Отправка ${notifications.length} email уведомлений`);

    let success = 0;
    let failed = 0;

    for (const notification of notifications) {
      try {
        await this.sendEmail(notification);
        success++;
      } catch (error) {
        this.logger.error(
          `Ошибка отправки email ${notification.id}:`,
          error instanceof Error ? error.message : String(error)
        );
        failed++;
      }
    }

    this.logger.log(
      `Массовая отправка завершена: ${success} успешно, ${failed} неудачно`
    );
    return { success, failed };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private async simulateSmtpSend(): Promise<void> {
    // Симуляция задержки SMTP сервера
    await new Promise<void>(resolve =>
      (
        globalThis as unknown as {
          setTimeout: (fn: () => void, ms: number) => void;
        }
      ).setTimeout(() => resolve(), 200 + Math.random() * 300)
    );

    // Симуляция случайных ошибок SMTP (3% вероятность)
    if (Math.random() < 0.03) {
      throw new Error('SMTP сервер недоступен');
    }

    // Симуляция проверки rate limit
    if (Math.random() < 0.01) {
      throw new Error('Превышен лимит отправки');
    }
  }

  // Методы для работы с различными SMTP провайдерами
  async sendViaGmail(notification: INotification): Promise<boolean> {
    this.logger.log(`Отправка через Gmail SMTP: ${notification.id}`);
    return this.sendEmail(notification);
  }

  async sendViaSendGrid(notification: INotification): Promise<boolean> {
    this.logger.log(`Отправка через SendGrid: ${notification.id}`);
    return this.sendEmail(notification);
  }

  async sendViaAWS(notification: INotification): Promise<boolean> {
    this.logger.log(`Отправка через AWS SES: ${notification.id}`);
    return this.sendEmail(notification);
  }
}

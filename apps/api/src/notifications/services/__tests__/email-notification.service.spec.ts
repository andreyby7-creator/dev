import { Test, TestingModule } from '@nestjs/testing';
import type { INotification } from '../../../types/notifications';
import {
  NotificationPriority,
  NotificationType,
} from '../../../types/notifications';
import { EmailNotificationService } from '../email-notification.service';

describe('EmailNotificationService', () => {
  let service: EmailNotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailNotificationService],
    }).compile();

    service = module.get<EmailNotificationService>(EmailNotificationService);
  });

  describe('sendEmail', () => {
    it('should send email notification successfully', async () => {
      const notification: INotification = {
        id: '1',
        type: NotificationType.EMAIL,
        priority: NotificationPriority.HIGH,
        recipient: 'test@example.com',
        subject: 'Test Subject',
        content: 'Test content',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };

      // Mock Math.random to ensure success
      const originalRandom = Math.random;
      Math.random = () => 0.5; // Ensure no random errors (> 0.01)

      const result = await service.sendEmail(notification);

      expect(result).toBe(true);

      // Restore original Math.random
      Math.random = originalRandom;
    });

    it('should throw error for invalid email format', async () => {
      const notification: INotification = {
        id: '1',
        type: NotificationType.EMAIL,
        priority: NotificationPriority.HIGH,
        recipient: 'invalid-email',
        subject: 'Test Subject',
        content: 'Test content',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };

      await expect(service.sendEmail(notification)).rejects.toThrow(
        'Неверный формат email: invalid-email'
      );
    });

    it('should handle SMTP server errors', async () => {
      const notification: INotification = {
        id: '1',
        type: NotificationType.EMAIL,
        priority: NotificationPriority.HIGH,
        recipient: 'test@example.com',
        subject: 'Test Subject',
        content: 'Test content',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };

      // Mock Math.random to simulate SMTP error
      const originalRandom = Math.random;
      Math.random = () => 0.02; // Force SMTP error

      await expect(service.sendEmail(notification)).rejects.toThrow(
        'SMTP сервер недоступен'
      );

      // Restore original Math.random
      Math.random = originalRandom;
    });

    it('should handle rate limit errors', async () => {
      const notification: INotification = {
        id: '1',
        type: NotificationType.EMAIL,
        priority: NotificationPriority.HIGH,
        recipient: 'test@example.com',
        subject: 'Test Subject',
        content: 'Test content',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };

      // Mock Math.random to simulate rate limit error
      const originalRandom = Math.random;
      let callCount = 0;
      Math.random = () => {
        callCount++;
        if (callCount === 1) return 0.5; // setTimeout delay
        if (callCount === 2) return 0.5; // SMTP server available (> 0.03)
        if (callCount === 3) return 0.005; // Rate limit error (< 0.01)
        return 0.5;
      };

      await expect(service.sendEmail(notification)).rejects.toThrow(
        'Превышен лимит отправки'
      );

      // Restore original Math.random
      Math.random = originalRandom;
    });
  });

  describe('sendBulkEmail', () => {
    it('should send multiple email notifications successfully', async () => {
      const notifications: INotification[] = [
        {
          id: '1',
          type: NotificationType.EMAIL,
          priority: NotificationPriority.HIGH,
          recipient: 'test1@example.com',
          subject: 'Test Subject 1',
          content: 'Test content 1',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
          retryCount: 0,
          maxRetries: 3,
        },
        {
          id: '2',
          type: NotificationType.EMAIL,
          priority: NotificationPriority.MEDIUM,
          recipient: 'test2@example.com',
          subject: 'Test Subject 2',
          content: 'Test content 2',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
          retryCount: 0,
          maxRetries: 3,
        },
      ];

      // Mock Math.random to ensure success
      const originalRandom = Math.random;
      Math.random = () => 0.5; // Ensure no random errors (> 0.01)

      const result = await service.sendBulkEmail(notifications);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);

      // Restore original Math.random
      Math.random = originalRandom;
    });

    it('should handle mixed success and failure in bulk send', async () => {
      const notifications: INotification[] = [
        {
          id: '1',
          type: NotificationType.EMAIL,
          priority: NotificationPriority.HIGH,
          recipient: 'test@example.com',
          subject: 'Test Subject 1',
          content: 'Test content 1',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
          retryCount: 0,
          maxRetries: 3,
        },
        {
          id: '2',
          type: NotificationType.EMAIL,
          priority: NotificationPriority.MEDIUM,
          recipient: 'invalid-email',
          subject: 'Test Subject 2',
          content: 'Test content 2',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
          retryCount: 0,
          maxRetries: 3,
        },
      ];

      // Mock Math.random to ensure success for valid email
      const originalRandom = Math.random;
      Math.random = () => 0.1; // Ensure no random errors

      const result = await service.sendBulkEmail(notifications);

      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);

      // Restore original Math.random
      Math.random = originalRandom;
    });

    it('should handle empty notifications array', async () => {
      const result = await service.sendBulkEmail([]);

      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
    });
  });

  describe('sendViaGmail', () => {
    it('should send email via Gmail', async () => {
      const notification: INotification = {
        id: '1',
        type: NotificationType.EMAIL,
        priority: NotificationPriority.HIGH,
        recipient: 'test@example.com',
        subject: 'Test Subject',
        content: 'Test content',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };

      // Mock Math.random to ensure success
      const originalRandom = Math.random;
      Math.random = () => 0.5; // Ensure no random errors (> 0.01)

      const result = await service.sendViaGmail(notification);

      expect(result).toBe(true);

      // Restore original Math.random
      Math.random = originalRandom;
    });
  });

  describe('sendViaSendGrid', () => {
    it('should send email via SendGrid', async () => {
      const notification: INotification = {
        id: '1',
        type: NotificationType.EMAIL,
        priority: NotificationPriority.HIGH,
        recipient: 'test@example.com',
        subject: 'Test Subject',
        content: 'Test content',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };

      // Mock Math.random to ensure success
      const originalRandom = Math.random;
      Math.random = () => 0.5; // Ensure no random errors (> 0.01)

      const result = await service.sendViaSendGrid(notification);

      expect(result).toBe(true);

      // Restore original Math.random
      Math.random = originalRandom;
    });
  });

  describe('sendViaAWS', () => {
    it('should send email via AWS SES', async () => {
      const notification: INotification = {
        id: '1',
        type: NotificationType.EMAIL,
        priority: NotificationPriority.HIGH,
        recipient: 'test@example.com',
        subject: 'Test Subject',
        content: 'Test content',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };

      // Mock Math.random to ensure success
      const originalRandom = Math.random;
      Math.random = () => 0.5; // Ensure no random errors (> 0.01)

      const result = await service.sendViaAWS(notification);

      expect(result).toBe(true);

      // Restore original Math.random
      Math.random = originalRandom;
    });
  });

  describe('email validation', () => {
    it('should validate correct email formats', async () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        '123@test-domain.com',
      ];

      // Mock Math.random to ensure success
      const originalRandom = Math.random;
      Math.random = () => 0.5; // Ensure no random errors (> 0.01)

      for (const email of validEmails) {
        const notification: INotification = {
          id: '1',
          type: NotificationType.EMAIL,
          priority: NotificationPriority.HIGH,
          recipient: email,
          subject: 'Test Subject',
          content: 'Test content',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
          retryCount: 0,
          maxRetries: 3,
        };

        const result = await service.sendEmail(notification);
        expect(result).toBe(true);
      }

      // Restore original Math.random
      Math.random = originalRandom;
    });

    it('should reject invalid email formats', async () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test.example.com',
        '',
        'test@.com',
        'test@example.',
      ];

      for (const email of invalidEmails) {
        const notification: INotification = {
          id: '1',
          type: NotificationType.EMAIL,
          priority: NotificationPriority.HIGH,
          recipient: email,
          subject: 'Test Subject',
          content: 'Test content',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
          retryCount: 0,
          maxRetries: 3,
        };

        await expect(service.sendEmail(notification)).rejects.toThrow();
      }
    });
  });
});

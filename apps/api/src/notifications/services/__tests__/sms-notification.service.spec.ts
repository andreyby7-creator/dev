import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type {
  INotification,
  INotificationTemplate,
} from '../../../types/notifications';
import {
  NotificationPriority,
  NotificationType,
} from '../../../types/notifications';
import { SmsNotificationService } from '../sms-notification.service';

describe('SmsNotificationService', () => {
  let service: SmsNotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SmsNotificationService],
    }).compile();

    service = module.get<SmsNotificationService>(SmsNotificationService);
  });

  describe('sendSms', () => {
    it('should send SMS notification successfully', async () => {
      const notification: INotification = {
        id: '1',
        type: NotificationType.SMS,
        priority: NotificationPriority.HIGH,
        recipient: '+1234567890',
        subject: 'Test Subject',
        content: 'Test content',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };

      const result = await service.sendSms(notification);

      expect(result).toBe(true);
    });

    it('should throw BadRequestException for invalid phone number', async () => {
      const notification: INotification = {
        id: '1',
        type: NotificationType.SMS,
        priority: NotificationPriority.HIGH,
        recipient: 'invalid-phone',
        subject: 'Test Subject',
        content: 'Test content',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };

      await expect(service.sendSms(notification)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should handle SMS server errors', async () => {
      const notification: INotification = {
        id: '1',
        type: NotificationType.SMS,
        priority: NotificationPriority.HIGH,
        recipient: '+1234567890',
        subject: 'Test Subject',
        content: 'Test content',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };

      // Mock Math.random to simulate SMS server error
      const originalRandom = Math.random;
      Math.random = () => 0.01; // Force SMS server error

      await expect(service.sendSms(notification)).rejects.toThrow(
        'SMS сервер недоступен'
      );

      // Restore original Math.random
      Math.random = originalRandom;
    });

    it('should handle rate limit errors', async () => {
      const notification: INotification = {
        id: '1',
        type: NotificationType.SMS,
        priority: NotificationPriority.HIGH,
        recipient: '+1234567890',
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
        if (callCount === 2) return 0.5; // SMS server available (> 0.02)
        if (callCount === 3) return 0.005; // Rate limit error (< 0.01)
        return 0.5;
      };

      await expect(service.sendSms(notification)).rejects.toThrow(
        'Превышен лимит отправки SMS'
      );

      // Restore original Math.random
      Math.random = originalRandom;
    });

    it('should send SMS with template', async () => {
      const notification: INotification = {
        id: '1',
        type: NotificationType.SMS,
        priority: NotificationPriority.HIGH,
        recipient: '+1234567890',
        subject: 'Test Subject',
        content: 'Hello {{name}}',
        metadata: { name: 'John' },
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };

      const template: INotificationTemplate = {
        id: '1',
        name: 'Welcome SMS',
        type: NotificationType.SMS,
        subject: 'Welcome',
        content: 'Hello {{name}}, welcome to our service!',
        variables: ['name'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock Math.random to ensure success
      const originalRandom = Math.random;
      Math.random = () => 0.5; // Ensure no random errors (> 0.02)

      const result = await service.sendSms(notification, template);

      expect(result).toBe(true);

      // Restore original Math.random
      Math.random = originalRandom;
    });

    it('should truncate long SMS content', async () => {
      const longContent = 'A'.repeat(200); // 200 characters
      const notification: INotification = {
        id: '1',
        type: NotificationType.SMS,
        priority: NotificationPriority.HIGH,
        recipient: '+1234567890',
        subject: 'Test Subject',
        content: longContent,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };

      // Mock Math.random to ensure success
      const originalRandom = Math.random;
      Math.random = () => 0.5; // Ensure no random errors (> 0.02)

      const result = await service.sendSms(notification);

      expect(result).toBe(true);

      // Restore original Math.random
      Math.random = originalRandom;
    });
  });

  describe('sendBulkSms', () => {
    it('should send multiple SMS notifications successfully', async () => {
      const notifications: INotification[] = [
        {
          id: '1',
          type: NotificationType.SMS,
          priority: NotificationPriority.HIGH,
          recipient: '+1234567890',
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
          type: NotificationType.SMS,
          priority: NotificationPriority.MEDIUM,
          recipient: '+1987654321',
          subject: 'Test Subject 2',
          content: 'Test content 2',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
          retryCount: 0,
          maxRetries: 3,
        },
      ];

      // Mock Math.random to ensure success for all calls
      const originalRandom = Math.random;
      Math.random = () => 0.5; // Ensure no random errors (> 0.02)

      const result = await service.sendBulkSms(notifications);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);

      // Restore original Math.random
      Math.random = originalRandom;
    });

    it('should handle mixed success and failure in bulk send', async () => {
      const notifications: INotification[] = [
        {
          id: '1',
          type: NotificationType.SMS,
          priority: NotificationPriority.HIGH,
          recipient: '+1234567890',
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
          type: NotificationType.SMS,
          priority: NotificationPriority.MEDIUM,
          recipient: 'invalid-phone',
          subject: 'Test Subject 2',
          content: 'Test content 2',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
          retryCount: 0,
          maxRetries: 3,
        },
      ];

      // Mock Math.random to ensure success for valid phone
      const originalRandom = Math.random;
      Math.random = () => 0.1; // Ensure no random errors

      const result = await service.sendBulkSms(notifications);

      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);

      // Restore original Math.random
      Math.random = originalRandom;
    });

    it('should handle empty notifications array', async () => {
      const result = await service.sendBulkSms([]);

      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
    });
  });

  describe('sendViaTwilio', () => {
    it('should send SMS via Twilio', async () => {
      const notification: INotification = {
        id: '1',
        type: NotificationType.SMS,
        priority: NotificationPriority.HIGH,
        recipient: '+1234567890',
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
      Math.random = () => 0.5; // Ensure no random errors (> 0.02)

      const result = await service.sendViaTwilio(notification);

      expect(result).toBe(true);

      // Restore original Math.random
      Math.random = originalRandom;
    });
  });

  describe('sendViaAWS', () => {
    it('should send SMS via AWS SNS', async () => {
      const notification: INotification = {
        id: '1',
        type: NotificationType.SMS,
        priority: NotificationPriority.HIGH,
        recipient: '+1234567890',
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
      Math.random = () => 0.5; // Ensure no random errors (> 0.02)

      const result = await service.sendViaAWS(notification);

      expect(result).toBe(true);

      // Restore original Math.random
      Math.random = originalRandom;
    });
  });

  describe('sendViaNexmo', () => {
    it('should send SMS via Nexmo', async () => {
      const notification: INotification = {
        id: '1',
        type: NotificationType.SMS,
        priority: NotificationPriority.HIGH,
        recipient: '+1234567890',
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
      Math.random = () => 0.5; // Ensure no random errors (> 0.02)

      const result = await service.sendViaNexmo(notification);

      expect(result).toBe(true);

      // Restore original Math.random
      Math.random = originalRandom;
    });
  });

  describe('regional sending', () => {
    it('should send SMS to US', async () => {
      const notification: INotification = {
        id: '1',
        type: NotificationType.SMS,
        priority: NotificationPriority.HIGH,
        recipient: '+1234567890',
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
      Math.random = () => 0.5; // Ensure no random errors (> 0.02)

      const result = await service.sendToUS(notification);

      expect(result).toBe(true);

      // Restore original Math.random
      Math.random = originalRandom;
    });

    it('should send SMS to EU', async () => {
      const notification: INotification = {
        id: '1',
        type: NotificationType.SMS,
        priority: NotificationPriority.HIGH,
        recipient: '+1234567890',
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
      Math.random = () => 0.5; // Ensure no random errors (> 0.02)

      const result = await service.sendToEU(notification);

      expect(result).toBe(true);

      // Restore original Math.random
      Math.random = originalRandom;
    });

    it('should send SMS to Asia', async () => {
      const notification: INotification = {
        id: '1',
        type: NotificationType.SMS,
        priority: NotificationPriority.HIGH,
        recipient: '+1234567890',
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
      Math.random = () => 0.5; // Ensure no random errors (> 0.02)

      const result = await service.sendToAsia(notification);

      expect(result).toBe(true);

      // Restore original Math.random
      Math.random = originalRandom;
    });
  });

  describe('phone number validation', () => {
    it('should validate correct phone number formats', async () => {
      const validPhones = [
        '+1234567890',
        '+44123456789',
        '+8612345678901',
        '+33123456789',
      ];

      // Mock Math.random to ensure success
      const originalRandom = Math.random;
      Math.random = () => 0.5; // Ensure no random errors (> 0.02)

      for (const phone of validPhones) {
        const notification: INotification = {
          id: '1',
          type: NotificationType.SMS,
          priority: NotificationPriority.HIGH,
          recipient: phone,
          subject: 'Test Subject',
          content: 'Test content',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
          retryCount: 0,
          maxRetries: 3,
        };

        const result = await service.sendSms(notification);
        expect(result).toBe(true);
      }

      // Restore original Math.random
      Math.random = originalRandom;
    });

    it('should reject invalid phone number formats', async () => {
      const invalidPhones = [
        '1234567890', // Missing +
        '+1', // Too short (only 1 digit after +)
        '+12345678901234567890', // Too long
        '+0123456789', // Starts with 0
        'invalid-phone',
        '',
        '+abc123456789',
      ];

      for (const phone of invalidPhones) {
        const notification: INotification = {
          id: '1',
          type: NotificationType.SMS,
          priority: NotificationPriority.HIGH,
          recipient: phone,
          subject: 'Test Subject',
          content: 'Test content',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
          retryCount: 0,
          maxRetries: 3,
        };

        await expect(service.sendSms(notification)).rejects.toThrow(
          BadRequestException
        );
      }
    });
  });
});

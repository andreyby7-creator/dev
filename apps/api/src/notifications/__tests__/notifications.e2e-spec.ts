import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { NotificationsModule } from '../notifications.module';
import { NotificationsService } from '../services/notifications.service';
import { EmailNotificationService } from '../services/email-notification.service';
import { SmsNotificationService } from '../services/sms-notification.service';
import {
  NotificationType,
  NotificationPriority,
} from '../../types/notifications';

describe('Notifications E2E', () => {
  let app: INestApplication;
  let notificationsService: NotificationsService;
  let emailService: EmailNotificationService;
  let smsService: SmsNotificationService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [NotificationsModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    notificationsService =
      moduleFixture.get<NotificationsService>(NotificationsService);
    emailService = moduleFixture.get<EmailNotificationService>(
      EmailNotificationService
    );
    smsService = moduleFixture.get<SmsNotificationService>(
      SmsNotificationService
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete notification workflow', () => {
    it('should create, send, and track email notification', async () => {
      // 1. Create notification
      const notification = await notificationsService.createNotification({
        type: NotificationType.EMAIL,
        priority: NotificationPriority.HIGH,
        recipient: 'test@example.com',
        subject: 'E2E Test Email',
        content: 'This is an E2E test email notification',
        metadata: { testId: 'e2e-001' },
      });

      expect(notification).toBeDefined();
      expect(notification.status).toBe('pending');

      // 2. Send notification
      const sendResult =
        await notificationsService.sendNotification(notification);
      expect(sendResult).toBe(true);

      // 3. Verify notification status
      const updatedNotification = await notificationsService.getNotification(
        notification.id
      );
      expect(updatedNotification.status).toBe('sent');
    });

    it('should create, send, and track SMS notification', async () => {
      // 1. Create SMS notification
      const notification = await notificationsService.createNotification({
        type: NotificationType.SMS,
        priority: NotificationPriority.MEDIUM,
        recipient: '+1234567890',
        content: 'E2E test SMS notification',
        metadata: { testId: 'e2e-002' },
      });

      expect(notification).toBeDefined();
      expect(notification.status).toBe('pending');

      // 2. Send notification
      const sendResult =
        await notificationsService.sendNotification(notification);
      expect(sendResult).toBe(true);

      // 3. Verify notification status
      const updatedNotification = await notificationsService.getNotification(
        notification.id
      );
      expect(updatedNotification.status).toBe('sent');
    });

    it('should handle notification with template', async () => {
      // 1. Create template
      const template = await notificationsService.createTemplate({
        name: 'E2E Welcome Template',
        type: NotificationType.EMAIL,
        subject: 'Welcome {{userName}}',
        content:
          'Hello {{userName}}, welcome to our service! Your account {{accountId}} is ready.',
        variables: ['userName', 'accountId'],
      });

      expect(template).toBeDefined();

      // 2. Create notification with metadata for template variables
      const notification = await notificationsService.createNotification({
        type: NotificationType.EMAIL,
        priority: NotificationPriority.HIGH,
        recipient: 'user@example.com',
        subject: 'Welcome John',
        content:
          'Hello John, welcome to our service! Your account ACC-123 is ready.',
        metadata: { userName: 'John', accountId: 'ACC-123' },
      });

      expect(notification).toBeDefined();

      // 3. Send notification
      const sendResult =
        await notificationsService.sendNotification(notification);
      expect(sendResult).toBe(true);
    });

    it('should handle scheduled notification', async () => {
      const scheduledAt = new Date(Date.now() + 60000); // 1 minute from now

      const notification = await notificationsService.createNotification({
        type: NotificationType.EMAIL,
        priority: NotificationPriority.LOW,
        recipient: 'scheduled@example.com',
        subject: 'Scheduled Notification',
        content: 'This notification was scheduled',
        scheduledAt: scheduledAt.toISOString(),
      });

      expect(notification.scheduledAt).toEqual(scheduledAt);
      expect(notification.status).toBe('pending');
    });

    it('should handle bulk email sending', async () => {
      // Create multiple notifications
      const notifications = await Promise.all([
        notificationsService.createNotification({
          type: NotificationType.EMAIL,
          priority: NotificationPriority.MEDIUM,
          recipient: 'bulk1@example.com',
          subject: 'Bulk Email 1',
          content: 'Bulk email content 1',
        }),
        notificationsService.createNotification({
          type: NotificationType.EMAIL,
          priority: NotificationPriority.MEDIUM,
          recipient: 'bulk2@example.com',
          subject: 'Bulk Email 2',
          content: 'Bulk email content 2',
        }),
        notificationsService.createNotification({
          type: NotificationType.EMAIL,
          priority: NotificationPriority.MEDIUM,
          recipient: 'bulk3@example.com',
          subject: 'Bulk Email 3',
          content: 'Bulk email content 3',
        }),
      ]);

      // Send bulk emails
      const bulkResult = await emailService.sendBulkEmail(notifications);
      expect(bulkResult.success).toBe(3);
      expect(bulkResult.failed).toBe(0);
    });

    it('should handle bulk SMS sending', async () => {
      // Create multiple SMS notifications
      const notifications = await Promise.all([
        notificationsService.createNotification({
          type: NotificationType.SMS,
          priority: NotificationPriority.MEDIUM,
          recipient: '+1111111111',
          content: 'Bulk SMS 1',
        }),
        notificationsService.createNotification({
          type: NotificationType.SMS,
          priority: NotificationPriority.MEDIUM,
          recipient: '+2222222222',
          content: 'Bulk SMS 2',
        }),
      ]);

      // Send bulk SMS
      const bulkResult = await smsService.sendBulkSms(notifications);
      expect(bulkResult.success).toBe(2);
      expect(bulkResult.failed).toBe(0);
    });

    it('should handle user preferences workflow', async () => {
      const userId = 'e2e-user-123';

      // 1. Create initial preferences
      const emailPreference = await notificationsService.updateUserPreferences(
        userId,
        NotificationType.EMAIL,
        { isEnabled: true, channels: [NotificationType.EMAIL] }
      );

      expect(emailPreference.userId).toBe(userId);
      expect(emailPreference.type).toBe(NotificationType.EMAIL);
      expect(emailPreference.isEnabled).toBe(true);

      // 2. Update preferences
      const updatedPreference =
        await notificationsService.updateUserPreferences(
          userId,
          NotificationType.EMAIL,
          { isEnabled: false, channels: [NotificationType.SMS] }
        );

      expect(updatedPreference.isEnabled).toBe(false);
      expect(updatedPreference.channels).toEqual([NotificationType.SMS]);

      // 3. Get user preferences
      const preferences = await notificationsService.getUserPreferences(userId);
      expect(preferences.length).toBeGreaterThan(0);
    });

    it('should generate and return statistics', async () => {
      // Create some test notifications first
      await Promise.all([
        notificationsService.createNotification({
          type: NotificationType.EMAIL,
          priority: NotificationPriority.HIGH,
          recipient: 'stats1@example.com',
          content: 'Stats test 1',
        }),
        notificationsService.createNotification({
          type: NotificationType.SMS,
          priority: NotificationPriority.MEDIUM,
          recipient: '+3333333333',
          content: 'Stats test 2',
        }),
        notificationsService.createNotification({
          type: NotificationType.EMAIL,
          priority: NotificationPriority.LOW,
          recipient: 'stats2@example.com',
          content: 'Stats test 3',
        }),
      ]);

      // Get statistics
      const stats = await notificationsService.getStats();

      expect(stats).toBeDefined();
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.period).toBeDefined();
      expect(stats.channelStats).toBeDefined();
      expect(stats.deliveryRate).toBeGreaterThanOrEqual(0);
    });

    it('should handle error scenarios gracefully', async () => {
      // Test invalid email
      const invalidEmailNotification =
        await notificationsService.createNotification({
          type: NotificationType.EMAIL,
          priority: NotificationPriority.HIGH,
          recipient: 'invalid-email',
          content: 'This should fail',
        });

      const emailResult = await emailService.sendEmail(
        invalidEmailNotification
      );
      expect(emailResult).toBe(false);

      // Test invalid phone
      const invalidPhoneNotification =
        await notificationsService.createNotification({
          type: NotificationType.SMS,
          priority: NotificationPriority.HIGH,
          recipient: 'invalid-phone',
          content: 'This should fail',
        });

      await expect(
        smsService.sendSms(invalidPhoneNotification)
      ).rejects.toThrow();
    });

    it('should handle template management workflow', async () => {
      // 1. Create template
      const template = await notificationsService.createTemplate({
        name: 'E2E Management Template',
        type: NotificationType.EMAIL,
        subject: 'Template Subject',
        content: 'Template content with {{variable}}',
        variables: ['variable'],
      });

      expect(template).toBeDefined();

      // 2. Get template
      const retrievedTemplate = await notificationsService.getTemplate(
        template.id
      );
      expect(retrievedTemplate).toEqual(template);

      // 3. Update template
      const updatedTemplate = await notificationsService.updateTemplate(
        template.id,
        {
          name: 'Updated E2E Template',
          content: 'Updated template content',
        }
      );

      expect(updatedTemplate.name).toBe('Updated E2E Template');
      expect(updatedTemplate.content).toBe('Updated template content');

      // 4. Get all templates
      const allTemplates = await notificationsService.getTemplates();
      expect(allTemplates.length).toBeGreaterThan(0);

      // 5. Delete template
      await notificationsService.deleteTemplate(template.id);
      await expect(
        notificationsService.getTemplate(template.id)
      ).rejects.toThrow();
    });
  });
});

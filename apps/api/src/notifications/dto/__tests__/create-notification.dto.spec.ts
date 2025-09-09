import { validate } from 'class-validator';
import {
  NotificationPriority,
  NotificationType,
} from '../../../types/notifications';
import { CreateNotificationDto } from '../create-notification.dto';

describe('CreateNotificationDto', () => {
  let dto: CreateNotificationDto;

  beforeEach(() => {
    dto = new CreateNotificationDto();
  });

  describe('validation', () => {
    it('should pass validation with valid data', async () => {
      dto.type = NotificationType.EMAIL;
      dto.priority = NotificationPriority.HIGH;
      dto.recipient = 'test@example.com';
      dto.subject = 'Test Subject';
      dto.content = 'Test content';
      dto.metadata = { key: 'value' };
      dto.maxRetries = 3;
      dto.scheduledAt = new Date().toISOString();

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with minimal required fields', async () => {
      dto.type = NotificationType.SMS;
      dto.priority = NotificationPriority.MEDIUM;
      dto.recipient = '+1234567890';
      dto.content = 'Test content';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation without type', async () => {
      dto.priority = NotificationPriority.HIGH;
      dto.recipient = 'test@example.com';
      dto.content = 'Test content';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe('type');
    });

    it('should fail validation without priority', async () => {
      dto.type = NotificationType.EMAIL;
      dto.recipient = 'test@example.com';
      dto.content = 'Test content';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe('priority');
    });

    it('should fail validation without recipient', async () => {
      dto.type = NotificationType.EMAIL;
      dto.priority = NotificationPriority.HIGH;
      dto.content = 'Test content';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe('recipient');
    });

    it('should fail validation with empty recipient', async () => {
      dto.type = NotificationType.EMAIL;
      dto.priority = NotificationPriority.HIGH;
      dto.recipient = '';
      dto.content = 'Test content';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe('recipient');
    });

    it('should fail validation without content', async () => {
      dto.type = NotificationType.EMAIL;
      dto.priority = NotificationPriority.HIGH;
      dto.recipient = 'test@example.com';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe('content');
    });

    it('should fail validation with empty content', async () => {
      dto.type = NotificationType.EMAIL;
      dto.priority = NotificationPriority.HIGH;
      dto.recipient = 'test@example.com';
      dto.content = '';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe('content');
    });

    it('should fail validation with invalid type', async () => {
      dto.type = 'invalid-type' as NotificationType;
      dto.priority = NotificationPriority.HIGH;
      dto.recipient = 'test@example.com';
      dto.content = 'Test content';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe('type');
    });

    it('should fail validation with invalid priority', async () => {
      dto.type = NotificationType.EMAIL;
      dto.priority = 'invalid-priority' as NotificationPriority;
      dto.recipient = 'test@example.com';
      dto.content = 'Test content';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe('priority');
    });

    it('should fail validation with invalid maxRetries (too low)', async () => {
      dto.type = NotificationType.EMAIL;
      dto.priority = NotificationPriority.HIGH;
      dto.recipient = 'test@example.com';
      dto.content = 'Test content';
      dto.maxRetries = 0;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe('maxRetries');
    });

    it('should fail validation with invalid maxRetries (too high)', async () => {
      dto.type = NotificationType.EMAIL;
      dto.priority = NotificationPriority.HIGH;
      dto.recipient = 'test@example.com';
      dto.content = 'Test content';
      dto.maxRetries = 11;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe('maxRetries');
    });

    it('should fail validation with invalid scheduledAt format', async () => {
      dto.type = NotificationType.EMAIL;
      dto.priority = NotificationPriority.HIGH;
      dto.recipient = 'test@example.com';
      dto.content = 'Test content';
      dto.scheduledAt = 'invalid-date';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe('scheduledAt');
    });

    it('should pass validation with valid scheduledAt', async () => {
      dto.type = NotificationType.EMAIL;
      dto.priority = NotificationPriority.HIGH;
      dto.recipient = 'test@example.com';
      dto.content = 'Test content';
      dto.scheduledAt = new Date().toISOString();

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with valid metadata object', async () => {
      dto.type = NotificationType.EMAIL;
      dto.priority = NotificationPriority.HIGH;
      dto.recipient = 'test@example.com';
      dto.content = 'Test content';
      dto.metadata = {
        key1: 'value1',
        key2: 123,
        key3: true,
        key4: { nested: 'object' },
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with invalid metadata (not object)', async () => {
      dto.type = NotificationType.EMAIL;
      dto.priority = NotificationPriority.HIGH;
      dto.recipient = 'test@example.com';
      dto.content = 'Test content';
      dto.metadata = 'invalid-metadata' as unknown as Record<string, unknown>;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe('metadata');
    });
  });

  describe('all notification types', () => {
    it('should validate EMAIL type', async () => {
      dto.type = NotificationType.EMAIL;
      dto.priority = NotificationPriority.HIGH;
      dto.recipient = 'test@example.com';
      dto.content = 'Test content';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate SMS type', async () => {
      dto.type = NotificationType.SMS;
      dto.priority = NotificationPriority.HIGH;
      dto.recipient = '+1234567890';
      dto.content = 'Test content';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate PUSH type', async () => {
      dto.type = NotificationType.PUSH;
      dto.priority = NotificationPriority.HIGH;
      dto.recipient = 'user123';
      dto.content = 'Test content';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate WEBHOOK type', async () => {
      dto.type = NotificationType.WEBHOOK;
      dto.priority = NotificationPriority.HIGH;
      dto.recipient = 'https://example.com/webhook';
      dto.content = 'Test content';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('all priority levels', () => {
    it('should validate LOW priority', async () => {
      dto.type = NotificationType.EMAIL;
      dto.priority = NotificationPriority.LOW;
      dto.recipient = 'test@example.com';
      dto.content = 'Test content';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate MEDIUM priority', async () => {
      dto.type = NotificationType.EMAIL;
      dto.priority = NotificationPriority.MEDIUM;
      dto.recipient = 'test@example.com';
      dto.content = 'Test content';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate HIGH priority', async () => {
      dto.type = NotificationType.EMAIL;
      dto.priority = NotificationPriority.HIGH;
      dto.recipient = 'test@example.com';
      dto.content = 'Test content';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate CRITICAL priority', async () => {
      dto.type = NotificationType.EMAIL;
      dto.priority = NotificationPriority.CRITICAL;
      dto.recipient = 'test@example.com';
      dto.content = 'Test content';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});

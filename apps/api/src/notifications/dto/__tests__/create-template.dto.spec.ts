import { validate } from 'class-validator';
import { NotificationType } from '../../../types/notifications';
import { CreateTemplateDto } from '../create-template.dto';

describe('CreateTemplateDto', () => {
  let dto: CreateTemplateDto;

  beforeEach(() => {
    dto = new CreateTemplateDto();
  });

  describe('validation', () => {
    it('should pass validation with valid data', async () => {
      dto.name = 'Test Template';
      dto.type = NotificationType.EMAIL;
      dto.subject = 'Test Subject';
      dto.content = 'Test content with {{variable}}';
      dto.variables = ['variable'];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with minimal required fields', async () => {
      dto.name = 'Minimal Template';
      dto.type = NotificationType.SMS;
      dto.content = 'Simple content';
      dto.variables = [];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation without name', async () => {
      dto.type = NotificationType.EMAIL;
      dto.content = 'Test content';
      dto.variables = [];

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe('name');
    });

    it('should fail validation with empty name', async () => {
      dto.name = '';
      dto.type = NotificationType.EMAIL;
      dto.content = 'Test content';
      dto.variables = [];

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe('name');
    });

    it('should fail validation without type', async () => {
      dto.name = 'Test Template';
      dto.content = 'Test content';
      dto.variables = [];

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe('type');
    });

    it('should fail validation with invalid type', async () => {
      dto.name = 'Test Template';
      dto.type = 'invalid-type' as NotificationType;
      dto.content = 'Test content';
      dto.variables = [];

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe('type');
    });

    it('should fail validation without content', async () => {
      dto.name = 'Test Template';
      dto.type = NotificationType.EMAIL;
      dto.variables = [];

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe('content');
    });

    it('should fail validation with empty content', async () => {
      dto.name = 'Test Template';
      dto.type = NotificationType.EMAIL;
      dto.content = '';
      dto.variables = [];

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe('content');
    });

    it('should fail validation without variables array', async () => {
      dto.name = 'Test Template';
      dto.type = NotificationType.EMAIL;
      dto.content = 'Test content';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe('variables');
    });

    it('should fail validation with invalid variables (not array)', async () => {
      dto.name = 'Test Template';
      dto.type = NotificationType.EMAIL;
      dto.content = 'Test content';
      dto.variables = 'invalid' as unknown as string[];

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe('variables');
    });

    it('should pass validation with empty variables array', async () => {
      dto.name = 'Test Template';
      dto.type = NotificationType.EMAIL;
      dto.content = 'Test content without variables';
      dto.variables = [];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with multiple variables', async () => {
      dto.name = 'Multi Variable Template';
      dto.type = NotificationType.EMAIL;
      dto.subject = 'Welcome {{userName}} to {{serviceName}}';
      dto.content =
        'Hello {{userName}}, welcome to {{serviceName}}! Your account {{accountId}} is ready.';
      dto.variables = ['userName', 'serviceName', 'accountId'];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation without subject (optional field)', async () => {
      dto.name = 'No Subject Template';
      dto.type = NotificationType.SMS;
      dto.content = 'SMS content without subject';
      dto.variables = [];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with empty subject', async () => {
      dto.name = 'Empty Subject Template';
      dto.type = NotificationType.EMAIL;
      dto.subject = '';
      dto.content = 'Content with empty subject';
      dto.variables = [];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('all notification types', () => {
    it('should validate EMAIL type', async () => {
      dto.name = 'Email Template';
      dto.type = NotificationType.EMAIL;
      dto.subject = 'Email Subject';
      dto.content = 'Email content';
      dto.variables = [];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate SMS type', async () => {
      dto.name = 'SMS Template';
      dto.type = NotificationType.SMS;
      dto.content = 'SMS content';
      dto.variables = [];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate PUSH type', async () => {
      dto.name = 'Push Template';
      dto.type = NotificationType.PUSH;
      dto.content = 'Push content';
      dto.variables = [];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate WEBHOOK type', async () => {
      dto.name = 'Webhook Template';
      dto.type = NotificationType.WEBHOOK;
      dto.content = 'Webhook content';
      dto.variables = [];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('template content with variables', () => {
    it('should validate template with single variable', async () => {
      dto.name = 'Single Variable Template';
      dto.type = NotificationType.EMAIL;
      dto.subject = 'Hello {{name}}';
      dto.content = 'Welcome {{name}} to our service!';
      dto.variables = ['name'];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate template with multiple variables', async () => {
      dto.name = 'Multi Variable Template';
      dto.type = NotificationType.EMAIL;
      dto.subject = 'Order {{orderId}} for {{customerName}}';
      dto.content =
        'Dear {{customerName}}, your order {{orderId}} for {{amount}} has been processed.';
      dto.variables = ['orderId', 'customerName', 'amount'];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate template with nested variable syntax', async () => {
      dto.name = 'Nested Variable Template';
      dto.type = NotificationType.EMAIL;
      dto.subject = '{{user.profile.name}} - Account Update';
      dto.content =
        'Hello {{user.profile.name}}, your account {{user.account.id}} has been updated.';
      dto.variables = ['user.profile.name', 'user.account.id'];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate template with array variables', async () => {
      dto.name = 'Array Variable Template';
      dto.type = NotificationType.EMAIL;
      dto.subject = 'Your {{items.length}} items';
      dto.content =
        'You have {{items.length}} items in your cart: {{items.join(", ")}}';
      dto.variables = ['items.length', 'items.join'];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should validate template with very long content', async () => {
      const longContent = 'A'.repeat(1000);
      dto.name = 'Long Content Template';
      dto.type = NotificationType.EMAIL;
      dto.content = longContent;
      dto.variables = [];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate template with special characters in content', async () => {
      dto.name = 'Special Chars Template';
      dto.type = NotificationType.EMAIL;
      dto.content = 'Content with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?';
      dto.variables = [];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate template with unicode characters', async () => {
      dto.name = 'Unicode Template';
      dto.type = NotificationType.EMAIL;
      dto.content = 'Content with unicode: 你好世界 🌍 émojis';
      dto.variables = [];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate template with HTML content', async () => {
      dto.name = 'HTML Template';
      dto.type = NotificationType.EMAIL;
      dto.content = '<h1>Welcome {{name}}</h1><p>Your account is ready!</p>';
      dto.variables = ['name'];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});

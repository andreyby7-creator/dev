import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { NotificationsService } from '../src/notifications/services/notifications.service';
import {
  NotificationType,
  NotificationPriority,
} from '../src/types/notifications';

describe('Notifications E2E Tests', () => {
  let app: INestApplication;
  let notificationsService: NotificationsService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    notificationsService =
      moduleFixture.get<NotificationsService>(NotificationsService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/notifications (POST)', () => {
    it('should create a new notification', () => {
      const createDto = {
        type: NotificationType.EMAIL,
        priority: NotificationPriority.NORMAL,
        recipient: 'test@example.com',
        subject: 'Test Notification',
        content: 'This is a test notification',
      };

      return request(app.getHttpServer())
        .post('/notifications')
        .send(createDto)
        .expect(201)
        .expect(res => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data.type).toBe(NotificationType.EMAIL);
          expect(res.body.data.recipient).toBe('test@example.com');
        });
    });

    it('should create SMS notification', () => {
      const createDto = {
        type: NotificationType.SMS,
        priority: NotificationPriority.HIGH,
        recipient: '+1234567890',
        content: 'Urgent SMS notification',
      };

      return request(app.getHttpServer())
        .post('/notifications')
        .send(createDto)
        .expect(201)
        .expect(res => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.type).toBe(NotificationType.SMS);
          expect(res.body.data.priority).toBe(NotificationPriority.HIGH);
        });
    });
  });

  describe('/notifications (GET)', () => {
    it('should return list of notifications', () => {
      return request(app.getHttpServer())
        .get('/notifications')
        .expect(200)
        .expect(res => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should filter notifications by type', () => {
      return request(app.getHttpServer())
        .get('/notifications?type=email')
        .expect(200)
        .expect(res => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
          if (res.body.data.length > 0) {
            expect(res.body.data[0].type).toBe(NotificationType.EMAIL);
          }
        });
    });

    it('should apply pagination', () => {
      return request(app.getHttpServer())
        .get('/notifications?limit=5&offset=0')
        .expect(200)
        .expect(res => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.length).toBeLessThanOrEqual(5);
        });
    });
  });

  describe('/notifications/templates (POST)', () => {
    it('should create a new template', () => {
      const createDto = {
        name: 'Test Template',
        type: NotificationType.EMAIL,
        subject: 'Test Subject',
        content: 'Hello {{userName}}, this is a test template.',
        variables: ['userName'],
        isActive: true,
      };

      return request(app.getHttpServer())
        .post('/notifications/templates')
        .send(createDto)
        .expect(201)
        .expect(res => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.name).toBe('Test Template');
          expect(res.body.data.variables).toContain('userName');
        });
    });
  });

  describe('/notifications/templates (GET)', () => {
    it('should return list of templates', () => {
      return request(app.getHttpServer())
        .get('/notifications/templates')
        .expect(200)
        .expect(res => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should filter templates by type', () => {
      return request(app.getHttpServer())
        .get('/notifications/templates?type=email')
        .expect(200)
        .expect(res => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
          if (res.body.data.length > 0) {
            expect(res.body.data[0].type).toBe(NotificationType.EMAIL);
          }
        });
    });
  });

  describe('/notifications/stats/overview (GET)', () => {
    it('should return notification statistics', () => {
      return request(app.getHttpServer())
        .get('/notifications/stats/overview')
        .expect(200)
        .expect(res => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('totalSent');
          expect(res.body.data).toHaveProperty('totalDelivered');
          expect(res.body.data).toHaveProperty('totalFailed');
          expect(res.body.data).toHaveProperty('deliveryRate');
        });
    });
  });

  describe('NotificationsService', () => {
    it('should create notification with template', async () => {
      const template = await notificationsService.createTemplate({
        name: 'Service Test Template',
        type: NotificationType.EMAIL,
        subject: 'Service Test',
        content: 'Hello {{userName}} from service test.',
        variables: ['userName'],
      });

      const notification = await notificationsService.createNotification({
        type: NotificationType.EMAIL,
        priority: NotificationPriority.NORMAL,
        recipient: 'service@test.com',
        metadata: { userName: 'TestUser' },
      });

      expect(notification).toBeDefined();
      expect(notification.type).toBe(NotificationType.EMAIL);
      expect(template).toBeDefined();
      expect(template.name).toBe('Service Test Template');
    });

    it('should handle bulk operations', async () => {
      const notifications = [
        {
          type: NotificationType.EMAIL,
          priority: NotificationPriority.LOW,
          recipient: 'bulk1@test.com',
          content: 'Bulk notification 1',
        },
        {
          type: NotificationType.SMS,
          priority: NotificationPriority.NORMAL,
          recipient: '+1234567890',
          content: 'Bulk notification 2',
        },
      ];

      const results = [];
      for (const dto of notifications) {
        const result = await notificationsService.createNotification(dto);
        results.push(result);
      }

      expect(results).toHaveLength(2);
      expect(results[0].type).toBe(NotificationType.EMAIL);
      expect(results[1].type).toBe(NotificationType.SMS);
    });

    it('should calculate statistics correctly', async () => {
      const stats = await notificationsService.getStats();

      expect(stats).toHaveProperty('totalSent');
      expect(stats).toHaveProperty('totalDelivered');
      expect(stats).toHaveProperty('totalFailed');
      expect(stats).toHaveProperty('deliveryRate');
      expect(stats).toHaveProperty('channelStats');
      expect(stats).toHaveProperty('period');

      expect(typeof stats.totalSent).toBe('number');
      expect(typeof stats.deliveryRate).toBe('number');
      expect(stats.deliveryRate).toBeGreaterThanOrEqual(0);
      expect(stats.deliveryRate).toBeLessThanOrEqual(100);
    });
  });

  describe('Error handling', () => {
    it('should handle invalid email address', () => {
      const createDto = {
        type: NotificationType.EMAIL,
        priority: NotificationPriority.NORMAL,
        recipient: 'invalid-email',
        content: 'Test content',
      };

      return request(app.getHttpServer())
        .post('/notifications')
        .send(createDto)
        .expect(400);
    });

    it('should handle missing required fields', () => {
      const createDto = {
        type: NotificationType.EMAIL,
        // Missing recipient and content
      };

      return request(app.getHttpServer())
        .post('/notifications')
        .send(createDto)
        .expect(400);
    });
  });
});

import { Module } from '@nestjs/common';
import { NotificationsController } from './controllers/notifications.controller';
import { NotificationsService } from './services/notifications.service';
import { EmailNotificationService } from './services/email-notification.service';
import { SmsNotificationService } from './services/sms-notification.service';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    EmailNotificationService,
    SmsNotificationService,
  ],
  exports: [
    NotificationsService,
    EmailNotificationService,
    SmsNotificationService,
  ],
})
export class NotificationsModule {}

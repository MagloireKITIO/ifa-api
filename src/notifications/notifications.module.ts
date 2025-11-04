import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from '../entities/notification.entity';
import { FCMToken } from '../entities/fcm-token.entity';
import { NotificationsController } from './notifications.controller';
import {
  NotificationsService,
  FCMService,
  FCMTokensService,
} from './services';
import { SettingsModule } from '../settings/settings.module';
import { NotificationTemplatesModule } from '../notification-templates/notification-templates.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, FCMToken]),
    SettingsModule, // Import SettingsModule to access ConfigurationService
    NotificationTemplatesModule, // Import NotificationTemplatesModule for template rendering
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, FCMService, FCMTokensService],
  exports: [NotificationsService, FCMService, FCMTokensService], // Export for use in other modules
})
export class NotificationsModule {}

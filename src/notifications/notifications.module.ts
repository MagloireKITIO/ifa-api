import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from '../entities/notification.entity';
import { FCMToken } from '../entities/fcm-token.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsUserController } from './notifications-user.controller';
import {
  NotificationsService,
  FCMService,
  FCMTokensService,
} from './services';
import { SettingsModule } from '../settings/settings.module';
import { NotificationTemplatesModule } from '../notification-templates/notification-templates.module';
import { AuthUserModule } from '../auth-user/auth-user.module';

/**
 * Module Notifications pour la gestion des notifications
 *
 * Fonctionnalités :
 * - Admin : Envoyer des notifications (NotificationsController)
 * - User : Voir, marquer comme lu, supprimer ses notifications (NotificationsUserController)
 * - Services : FCM, NotificationsService, FCMTokensService
 *
 * LOGIQUE :
 * - Les notifications peuvent être personnelles (userId) ou broadcast (userId = null)
 * - Les users voient leurs notifications personnelles + les broadcast
 * - Support i18n : titleFr/titleEn, bodyFr/bodyEn
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, FCMToken]),
    SettingsModule, // Import SettingsModule to access ConfigurationService
    NotificationTemplatesModule, // Import NotificationTemplatesModule for template rendering
    AuthUserModule, // Pour utiliser les guards et strategies JWT
  ],
  controllers: [
    NotificationsController, // Admin endpoints (protected)
    NotificationsUserController, // User endpoints for mobile app (authenticated)
  ],
  providers: [NotificationsService, FCMService, FCMTokensService],
  exports: [NotificationsService, FCMService, FCMTokensService], // Export for use in other modules
})
export class NotificationsModule {}

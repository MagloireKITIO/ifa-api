import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrayersController } from './prayers.controller';
import { PrayersPublicController } from './prayers-public.controller';
import { PrayersUserController } from './prayers-user.controller';
import { PrayersService } from './prayers.service';
import { Prayer } from '../entities/prayer.entity';
import { PrayerReaction } from '../entities/prayer-reaction.entity';
import { AdminActivityLog } from '../entities/admin-activity-log.entity';
import { Testimony } from '../entities/testimony.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthUserModule } from '../auth-user/auth-user.module';

/**
 * Module Prayers pour la gestion des demandes de prières
 *
 * Fonctionnalités :
 * - Admin : Gestion complète des prières (PrayersController)
 * - Public : Liste des prières actives (PrayersPublicController)
 * - User : Créer, réagir, témoigner (PrayersUserController)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Prayer, PrayerReaction, AdminActivityLog, Testimony]),
    forwardRef(() => NotificationsModule), // For NotificationsService
    AuthUserModule, // Pour utiliser les guards et strategies JWT
  ],
  controllers: [
    PrayersController, // Admin endpoints (protected)
    PrayersPublicController, // Public endpoints for mobile app
    PrayersUserController, // User endpoints for mobile app (authenticated)
  ],
  providers: [PrayersService],
  exports: [PrayersService], // Export for use in other modules (e.g., notifications)
})
export class PrayersModule {}

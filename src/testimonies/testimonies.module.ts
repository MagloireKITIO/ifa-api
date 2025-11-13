import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestimoniesController } from './testimonies.controller';
import { TestimoniesPublicController } from './testimonies-public.controller';
import { TestimoniesUserController } from './testimonies-user.controller';
import { TestimoniesService } from './testimonies.service';
import { Testimony } from '../entities/testimony.entity';
import { Prayer } from '../entities/prayer.entity';
import { AdminActivityLog } from '../entities/admin-activity-log.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthUserModule } from '../auth-user/auth-user.module';
import { AiModerationService } from '../common/services/ai-moderation.service';
import { SettingsModule } from '../settings/settings.module';

/**
 * Module Testimonies pour la gestion des témoignages
 *
 * Fonctionnalités :
 * - Admin : Modération des témoignages (approve/reject) + Consultation des actions IA (TestimoniesController)
 * - Public : Liste des témoignages approuvés (TestimoniesPublicController)
 * - User : Soumettre, voir mes témoignages (TestimoniesUserController)
 *
 * Workflow :
 * 1. User soumet un témoignage → Analyse automatique par IA
 * 2. IA décide → AUTO_APPROVED (visible publiquement) ou AUTO_REJECTED (non visible)
 * 3. Admin peut consulter toutes les actions IA dans les logs
 * 4. Admin peut toujours approve/reject manuellement si nécessaire
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Testimony, Prayer, AdminActivityLog]),
    forwardRef(() => NotificationsModule), // For NotificationsService
    AuthUserModule, // Pour utiliser les guards et strategies JWT
    SettingsModule, // For ConfigurationService (used by AiModerationService)
  ],
  controllers: [
    TestimoniesController, // Admin endpoints (protected)
    TestimoniesPublicController, // Public endpoints for mobile app
    TestimoniesUserController, // User endpoints for mobile app (authenticated)
  ],
  providers: [TestimoniesService, AiModerationService],
  exports: [TestimoniesService], // Export for use in other modules (e.g., notifications)
})
export class TestimoniesModule {}

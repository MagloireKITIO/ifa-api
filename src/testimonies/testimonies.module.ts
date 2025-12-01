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
import { StorageService } from '../common/services/storage.service';
import { SettingsModule } from '../settings/settings.module';

/**
 * Module Testimonies pour la gestion des témoignages
 *
 * Fonctionnalités :
 * - Admin : Consultation et suppression des témoignages (TestimoniesController)
 * - Public : Liste des témoignages publics (TestimoniesPublicController)
 * - User : Soumettre, voir et supprimer mes témoignages (TestimoniesUserController)
 *
 * Workflow :
 * 1. User soumet un témoignage → Publié immédiatement sans validation
 * 2. Si le témoignage est lié à une prière (prayerId), la prière est mise à jour avec le témoignage
 * 3. Admin peut consulter et supprimer les témoignages
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
  providers: [TestimoniesService, AiModerationService, StorageService],
  exports: [TestimoniesService], // Export for use in other modules (e.g., notifications)
})
export class TestimoniesModule {}

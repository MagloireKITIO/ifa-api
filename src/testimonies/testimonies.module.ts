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

/**
 * Module Testimonies pour la gestion des témoignages
 *
 * Fonctionnalités :
 * - Admin : Modération des témoignages (approve/reject) (TestimoniesController)
 * - Public : Liste des témoignages approuvés (TestimoniesPublicController)
 * - User : Soumettre, voir mes témoignages (TestimoniesUserController)
 *
 * Workflow :
 * 1. User soumet un témoignage → status PENDING
 * 2. Admin approve → status APPROVED (visible publiquement) + notification envoyée
 * 3. Admin reject → status REJECTED (non visible)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Testimony, Prayer, AdminActivityLog]),
    forwardRef(() => NotificationsModule), // For NotificationsService
    AuthUserModule, // Pour utiliser les guards et strategies JWT
  ],
  controllers: [
    TestimoniesController, // Admin endpoints (protected)
    TestimoniesPublicController, // Public endpoints for mobile app
    TestimoniesUserController, // User endpoints for mobile app (authenticated)
  ],
  providers: [TestimoniesService],
  exports: [TestimoniesService], // Export for use in other modules (e.g., notifications)
})
export class TestimoniesModule {}

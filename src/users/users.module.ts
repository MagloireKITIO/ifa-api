import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from '../entities/user.entity';
import { FCMToken } from '../entities/fcm-token.entity';
import { Center } from '../entities/center.entity';
import { AuthUserModule } from '../auth-user/auth-user.module';

/**
 * Module Users pour la gestion des profils utilisateurs (mobile app)
 *
 * Fonctionnalités :
 * - GET /users/me : Récupérer son profil
 * - PATCH /users/me : Mettre à jour son profil
 * - PATCH /users/me/language : Changer de langue
 * - PATCH /users/me/center : Changer de centre
 * - POST /users/me/fcm-token : Enregistrer un token FCM
 * - DELETE /users/me/fcm-token : Supprimer un token FCM
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([User, FCMToken, Center]),
    AuthUserModule, // Pour utiliser les guards et strategies JWT
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService], // Export pour utilisation dans d'autres modules si nécessaire
})
export class UsersModule {}

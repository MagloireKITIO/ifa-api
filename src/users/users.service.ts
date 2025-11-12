import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { FCMToken } from '../entities/fcm-token.entity';
import { Center } from '../entities/center.entity';
import { UserNotificationPreference } from '../entities/user-notification-preference.entity';
import {
  UpdateProfileDto,
  UpdateLanguageDto,
  UpdateCenterDto,
  RegisterFcmTokenDto,
  DeleteFcmTokenDto,
  UpdateNotificationPreferencesDto,
  UserResponseDto,
} from './dto';

/**
 * Service pour gérer les utilisateurs (mobile app)
 * Gère les profils, FCM tokens, préférences
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(FCMToken)
    private readonly fcmTokenRepository: Repository<FCMToken>,

    @InjectRepository(Center)
    private readonly centerRepository: Repository<Center>,

    @InjectRepository(UserNotificationPreference)
    private readonly notificationPreferenceRepository: Repository<UserNotificationPreference>,
  ) {}

  /**
   * Récupérer le profil de l'utilisateur connecté
   * GET /users/me
   */
  async getMyProfile(userId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['center'],
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Mettre à jour lastSeenAt
    await this.userRepository.update(userId, { lastSeenAt: new Date() });

    return this.mapToUserResponse(user);
  }

  /**
   * Mettre à jour le profil de l'utilisateur
   * PATCH /users/me
   */
  async updateMyProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Mettre à jour les champs fournis
    if (updateProfileDto.displayName !== undefined) {
      user.displayName = updateProfileDto.displayName;
    }
    if (updateProfileDto.photoURL !== undefined) {
      user.photoURL = updateProfileDto.photoURL;
    }
    if (updateProfileDto.city !== undefined) {
      user.city = updateProfileDto.city;
    }
    if (updateProfileDto.country !== undefined) {
      user.country = updateProfileDto.country;
    }

    await this.userRepository.save(user);

    // Recharger avec les relations
    const updatedUser = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['center'],
    });

    if (!updatedUser) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return this.mapToUserResponse(updatedUser);
  }

  /**
   * Changer la langue préférée
   * PATCH /users/me/language
   */
  async updateLanguage(
    userId: string,
    updateLanguageDto: UpdateLanguageDto,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    user.preferredLanguage = updateLanguageDto.preferredLanguage;
    await this.userRepository.save(user);

    // Recharger avec les relations
    const updatedUser = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['center'],
    });

    if (!updatedUser) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return this.mapToUserResponse(updatedUser);
  }

  /**
   * Changer de centre IFA
   * PATCH /users/me/center
   */
  async updateCenter(
    userId: string,
    updateCenterDto: UpdateCenterDto,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Si centerId est fourni, vérifier qu'il existe
    if (updateCenterDto.centerId !== null) {
      const center = await this.centerRepository.findOne({
        where: { id: updateCenterDto.centerId },
      });

      if (!center) {
        throw new NotFoundException('Centre non trouvé');
      }

      user.centerId = updateCenterDto.centerId;
    } else {
      // Retirer le centre
      user.centerId = null as any;
    }

    await this.userRepository.save(user);

    // Recharger avec les relations
    const updatedUser = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['center'],
    });

    if (!updatedUser) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return this.mapToUserResponse(updatedUser);
  }

  /**
   * Enregistrer un FCM token pour les notifications push
   * POST /users/me/fcm-token
   */
  async registerFcmToken(
    userId: string,
    registerFcmTokenDto: RegisterFcmTokenDto,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Vérifier si le token existe déjà
    const existingToken = await this.fcmTokenRepository.findOne({
      where: { token: registerFcmTokenDto.token },
    });

    if (existingToken) {
      // Si le token appartient à un autre utilisateur, erreur
      if (existingToken.userId !== userId) {
        throw new ConflictException(
          'Ce token est déjà enregistré pour un autre utilisateur',
        );
      }

      // Si le token appartient à cet utilisateur, le réactiver
      existingToken.isActive = true;
      existingToken.platform = registerFcmTokenDto.platform || existingToken.platform;
      existingToken.deviceName =
        registerFcmTokenDto.deviceName || existingToken.deviceName;
      existingToken.lastUsedAt = new Date();

      await this.fcmTokenRepository.save(existingToken);

      return { message: 'Token FCM mis à jour avec succès' };
    }

    // Créer un nouveau token
    const newToken = this.fcmTokenRepository.create({
      userId,
      token: registerFcmTokenDto.token,
      platform: registerFcmTokenDto.platform,
      deviceName: registerFcmTokenDto.deviceName,
      isActive: true,
      lastUsedAt: new Date(),
    });

    await this.fcmTokenRepository.save(newToken);

    return { message: 'Token FCM enregistré avec succès' };
  }

  /**
   * Supprimer un FCM token (lors de la déconnexion)
   * DELETE /users/me/fcm-token
   */
  async deleteFcmToken(
    userId: string,
    deleteFcmTokenDto: DeleteFcmTokenDto,
  ): Promise<{ message: string }> {
    const token = await this.fcmTokenRepository.findOne({
      where: {
        token: deleteFcmTokenDto.token,
        userId,
      },
    });

    if (!token) {
      throw new NotFoundException('Token FCM non trouvé');
    }

    // Marquer comme inactif au lieu de supprimer
    token.isActive = false;
    await this.fcmTokenRepository.save(token);

    return { message: 'Token FCM supprimé avec succès' };
  }

  /**
   * Récupérer les préférences de notifications de l'utilisateur
   * GET /users/me/notification-preferences
   */
  async getNotificationPreferences(
    userId: string,
  ): Promise<UserNotificationPreference> {
    let preferences = await this.notificationPreferenceRepository.findOne({
      where: { userId },
    });

    // Si l'utilisateur n'a pas encore de préférences, en créer une avec les valeurs par défaut
    if (!preferences) {
      preferences = this.notificationPreferenceRepository.create({
        userId,
        eventsEnabled: true,
        prayersEnabled: true,
        testimoniesEnabled: true,
        donationsEnabled: true,
        generalEnabled: true,
      });
      await this.notificationPreferenceRepository.save(preferences);
    }

    return preferences;
  }

  /**
   * Mettre à jour les préférences de notifications
   * PATCH /users/me/notification-preferences
   */
  async updateNotificationPreferences(
    userId: string,
    updateDto: UpdateNotificationPreferencesDto,
  ): Promise<UserNotificationPreference> {
    // Récupérer ou créer les préférences
    let preferences = await this.notificationPreferenceRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      preferences = this.notificationPreferenceRepository.create({
        userId,
      });
    }

    // Mettre à jour uniquement les champs fournis
    if (updateDto.eventsEnabled !== undefined) {
      preferences.eventsEnabled = updateDto.eventsEnabled;
    }
    if (updateDto.prayersEnabled !== undefined) {
      preferences.prayersEnabled = updateDto.prayersEnabled;
    }
    if (updateDto.testimoniesEnabled !== undefined) {
      preferences.testimoniesEnabled = updateDto.testimoniesEnabled;
    }
    if (updateDto.donationsEnabled !== undefined) {
      preferences.donationsEnabled = updateDto.donationsEnabled;
    }
    if (updateDto.generalEnabled !== undefined) {
      preferences.generalEnabled = updateDto.generalEnabled;
    }

    await this.notificationPreferenceRepository.save(preferences);

    return preferences;
  }

  /**
   * Helper: Mapper User entity vers UserResponseDto
   */
  private mapToUserResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      displayName: user.displayName,
      photoURL: user.photoURL,
      city: user.city,
      country: user.country,
      centerId: user.centerId,
      center: user.center
        ? {
            id: user.center.id,
            nameFr: user.center.nameFr,
            nameEn: user.center.nameEn,
            city: user.center.city,
            country: user.center.country,
          }
        : null,
      isFirstTimer: user.isFirstTimer,
      preferredLanguage: user.preferredLanguage,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      lastSeenAt: user.lastSeenAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

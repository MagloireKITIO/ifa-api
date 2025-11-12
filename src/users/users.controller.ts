import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtUserAuthGuard } from '../auth-user/guards';
import { CurrentUser } from '../auth-user/decorators';
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
 * Controller pour gérer les utilisateurs (mobile app)
 * Toutes les routes sont protégées par JwtUserAuthGuard
 */
@ApiTags('Users (Mobile)')
@Controller('users')
@UseGuards(JwtUserAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /users/me
   * Récupérer le profil de l'utilisateur connecté
   */
  @Get('me')
  @ApiOperation({
    summary: 'Récupérer mon profil',
    description: 'Récupère les informations du profil de l\'utilisateur connecté',
  })
  @ApiResponse({
    status: 200,
    description: 'Profil récupéré avec succès',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 404,
    description: 'Utilisateur non trouvé',
  })
  async getMyProfile(
    @CurrentUser('sub') userId: string,
  ): Promise<UserResponseDto> {
    return this.usersService.getMyProfile(userId);
  }

  /**
   * PATCH /users/me
   * Mettre à jour le profil de l'utilisateur
   */
  @Patch('me')
  @ApiOperation({
    summary: 'Mettre à jour mon profil',
    description: 'Permet de mettre à jour les informations du profil (nom, photo, ville, pays)',
  })
  @ApiResponse({
    status: 200,
    description: 'Profil mis à jour avec succès',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 404,
    description: 'Utilisateur non trouvé',
  })
  async updateMyProfile(
    @CurrentUser('sub') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateMyProfile(userId, updateProfileDto);
  }

  /**
   * PATCH /users/me/language
   * Changer la langue préférée
   */
  @Patch('me/language')
  @ApiOperation({
    summary: 'Changer ma langue préférée',
    description: 'Permet de changer la langue préférée de l\'utilisateur (FR ou EN)',
  })
  @ApiResponse({
    status: 200,
    description: 'Langue mise à jour avec succès',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 404,
    description: 'Utilisateur non trouvé',
  })
  async updateLanguage(
    @CurrentUser('sub') userId: string,
    @Body() updateLanguageDto: UpdateLanguageDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateLanguage(userId, updateLanguageDto);
  }

  /**
   * PATCH /users/me/center
   * Changer de centre IFA
   */
  @Patch('me/center')
  @ApiOperation({
    summary: 'Changer mon centre IFA',
    description: 'Permet de définir ou changer le centre IFA de l\'utilisateur',
  })
  @ApiResponse({
    status: 200,
    description: 'Centre mis à jour avec succès',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 404,
    description: 'Utilisateur ou centre non trouvé',
  })
  async updateCenter(
    @CurrentUser('sub') userId: string,
    @Body() updateCenterDto: UpdateCenterDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateCenter(userId, updateCenterDto);
  }

  /**
   * POST /users/me/fcm-token
   * Enregistrer un FCM token pour les notifications push
   */
  @Post('me/fcm-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enregistrer un token FCM',
    description: 'Enregistre un token Firebase Cloud Messaging pour recevoir les notifications push',
  })
  @ApiResponse({
    status: 200,
    description: 'Token FCM enregistré avec succès',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Token FCM enregistré avec succès' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 404,
    description: 'Utilisateur non trouvé',
  })
  @ApiResponse({
    status: 409,
    description: 'Token déjà enregistré pour un autre utilisateur',
  })
  async registerFcmToken(
    @CurrentUser('sub') userId: string,
    @Body() registerFcmTokenDto: RegisterFcmTokenDto,
  ): Promise<{ message: string }> {
    return this.usersService.registerFcmToken(userId, registerFcmTokenDto);
  }

  /**
   * DELETE /users/me/fcm-token
   * Supprimer un FCM token (lors de la déconnexion)
   */
  @Delete('me/fcm-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Supprimer un token FCM',
    description: 'Supprime un token FCM (appelé lors de la déconnexion)',
  })
  @ApiResponse({
    status: 200,
    description: 'Token FCM supprimé avec succès',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Token FCM supprimé avec succès' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 404,
    description: 'Token FCM non trouvé',
  })
  async deleteFcmToken(
    @CurrentUser('sub') userId: string,
    @Body() deleteFcmTokenDto: DeleteFcmTokenDto,
  ): Promise<{ message: string }> {
    return this.usersService.deleteFcmToken(userId, deleteFcmTokenDto);
  }

  /**
   * GET /users/me/notification-preferences
   * Récupérer les préférences de notifications de l'utilisateur
   */
  @Get('me/notification-preferences')
  @UseGuards(JwtUserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get notification preferences',
    description: 'Retrieve notification preferences for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getNotificationPreferences(@CurrentUser('sub') userId: string) {
    return this.usersService.getNotificationPreferences(userId);
  }

  /**
   * PATCH /users/me/notification-preferences
   * Mettre à jour les préférences de notifications
   */
  @Patch('me/notification-preferences')
  @UseGuards(JwtUserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update notification preferences',
    description:
      'Update notification preferences for the authenticated user (events, prayers, testimonies, donations, general)',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateNotificationPreferences(
    @CurrentUser('sub') userId: string,
    @Body() updateNotificationPreferencesDto: UpdateNotificationPreferencesDto,
  ) {
    return this.usersService.updateNotificationPreferences(
      userId,
      updateNotificationPreferencesDto,
    );
  }
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
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
  ApiParam,
} from '@nestjs/swagger';
import { NotificationsService } from './services/notifications.service';
import { FCMTokensService } from './services/fcm-tokens.service';
import { JwtUserAuthGuard } from '../auth-user/guards';
import { CurrentUser } from '../auth-user/decorators';
import {
  QueryNotificationsDto,
  NotificationUserResponseDto,
  PaginatedNotificationsResponseDto,
  RegisterFCMTokenDto,
} from './dto';
import { Notification } from '../entities/notification.entity';

/**
 * Controller pour les endpoints user des notifications (mobile app)
 * Toutes les routes sont protégées par JwtUserAuthGuard
 *
 * LOGIQUE :
 * - GET /notifications/my-notifications : Voir mes notifications avec pagination
 * - GET /notifications/unread-count : Badge de notifications non lues
 * - PATCH /notifications/:id/read : Marquer comme lu
 * - PATCH /notifications/mark-all-read : Tout marquer comme lu
 * - DELETE /notifications/:id : Supprimer une notification
 */
@ApiTags('Notifications User (Mobile)')
@Controller('notifications')
@UseGuards(JwtUserAuthGuard)
@ApiBearerAuth()
export class NotificationsUserController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly fcmTokensService: FCMTokensService,
  ) {}

  /**
   * POST /notifications/register-token
   * Enregistrer un token FCM pour recevoir des notifications push
   */
  @Post('register-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enregistrer un token FCM',
    description: 'Enregistre un token FCM de l\'appareil pour recevoir des notifications push',
  })
  @ApiResponse({
    status: 200,
    description: 'Token enregistré avec succès',
  })
  @ApiResponse({
    status: 400,
    description: 'Token invalide',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  async registerToken(
    @CurrentUser('sub') userId: string,
    @Body() registerTokenDto: RegisterFCMTokenDto,
  ) {
    return this.fcmTokensService.registerToken(userId, registerTokenDto);
  }

  /**
   * DELETE /notifications/deactivate-token/:token
   * Désactiver un token FCM (par exemple, lors de la déconnexion)
   */
  @Delete('deactivate-token/:token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Désactiver un token FCM',
    description: 'Désactive un token FCM de l\'appareil (par exemple, lors de la déconnexion)',
  })
  @ApiParam({
    name: 'token',
    description: 'Token FCM à désactiver',
  })
  @ApiResponse({
    status: 204,
    description: 'Token désactivé avec succès',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  async deactivateToken(@Param('token') token: string) {
    await this.fcmTokensService.deactivateToken(token);
  }

  /**
   * GET /notifications/my-notifications
   * Récupérer mes notifications avec pagination et filtres
   */
  @Get('my-notifications')
  @ApiOperation({
    summary: 'Mes notifications',
    description: 'Récupère les notifications de l\'utilisateur connecté (personnelles + broadcast)',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des notifications',
    type: PaginatedNotificationsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  async getMyNotifications(
    @CurrentUser('sub') userId: string,
    @Query() query: QueryNotificationsDto,
  ): Promise<PaginatedNotificationsResponseDto> {
    const result = await this.notificationsService.getUserNotifications(
      userId,
      query,
    );

    const page = query.page || 1;
    const limit = query.limit || 20;
    const totalPages = Math.ceil(result.total / limit);

    return {
      notifications: result.notifications.map((notification) =>
        this.mapToUserResponse(notification),
      ),
      total: result.total,
      meta: {
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * GET /notifications/unread-count
   * Nombre de notifications non lues (badge)
   */
  @Get('unread-count')
  @ApiOperation({
    summary: 'Nombre de notifications non lues',
    description: 'Récupère le nombre de notifications non lues (pour afficher un badge)',
  })
  @ApiResponse({
    status: 200,
    description: 'Nombre de notifications non lues',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 5 },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  async getUnreadCount(
    @CurrentUser('sub') userId: string,
  ): Promise<{ count: number }> {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  /**
   * PATCH /notifications/:id/read
   * Marquer une notification comme lue
   */
  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Marquer comme lu',
    description: 'Marque une notification comme lue',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la notification',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification marquée comme lue',
    type: NotificationUserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 404,
    description: 'Notification non trouvée',
  })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ): Promise<NotificationUserResponseDto> {
    const notification = await this.notificationsService.markAsRead(id, userId);
    return this.mapToUserResponse(notification);
  }

  /**
   * PATCH /notifications/mark-all-read
   * Marquer toutes les notifications comme lues
   */
  @Patch('mark-all-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Tout marquer comme lu',
    description: 'Marque toutes les notifications de l\'utilisateur comme lues',
  })
  @ApiResponse({
    status: 200,
    description: 'Toutes les notifications marquées comme lues',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'All notifications marked as read' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  async markAllAsRead(
    @CurrentUser('sub') userId: string,
  ): Promise<{ message: string }> {
    await this.notificationsService.markAllAsRead(userId);
    return { message: 'All notifications marked as read' };
  }

  /**
   * DELETE /notifications/:id
   * Supprimer une notification
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Supprimer une notification',
    description: 'Supprime une notification de l\'utilisateur',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la notification',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification supprimée',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Notification deleted successfully' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 404,
    description: 'Notification non trouvée',
  })
  async delete(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ): Promise<{ message: string }> {
    await this.notificationsService.deleteNotification(id, userId);
    return { message: 'Notification deleted successfully' };
  }

  /**
   * Helper: Mapper Notification entity vers NotificationUserResponseDto
   */
  private mapToUserResponse(
    notification: Notification,
  ): NotificationUserResponseDto {
    return {
      id: notification.id,
      type: notification.type,
      titleFr: notification.titleFr,
      titleEn: notification.titleEn,
      bodyFr: notification.bodyFr,
      bodyEn: notification.bodyEn,
      data: notification.data,
      isRead: notification.isRead,
      sentAt: notification.sentAt,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    };
  }
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
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
import type { Request } from 'express';
import { NotificationsService, FCMTokensService } from './services';
import {
  SendNotificationDto,
  QueryNotificationsDto,
  RegisterFCMTokenDto,
} from './dto';
import { JwtAdminAuthGuard, PermissionsGuard } from '../auth-admin/guards';
import { RequirePermissions, CurrentAdmin } from '../auth-admin/decorators';
import { AdminPermission } from '../common/enums';
import { Admin } from '../entities/admin.entity';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly fcmTokensService: FCMTokensService,
  ) {}

  // ==================== ADMIN ENDPOINTS ====================

  @Post('send')
  @UseGuards(JwtAdminAuthGuard, PermissionsGuard)
  @RequirePermissions(AdminPermission.NOTIFICATIONS_SEND)
  @ApiOperation({
    summary: 'Send notification (Admin only)',
    description:
      'Send a push notification to specific users or broadcast to all users. Only accessible by admins with notifications:send permission.',
  })
  @ApiResponse({
    status: 201,
    description: 'Notification sent successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async sendNotification(
    @Body() sendNotificationDto: SendNotificationDto,
    @CurrentAdmin() admin: Admin,
  ) {
    return this.notificationsService.sendNotification(
      sendNotificationDto,
      'fr', // Default language, could be made configurable
    );
  }

  @Get('stats')
  @UseGuards(JwtAdminAuthGuard, PermissionsGuard)
  @RequirePermissions(AdminPermission.NOTIFICATIONS_READ)
  @ApiOperation({
    summary: 'Get notification statistics (Admin only)',
    description:
      'Get statistics about FCM tokens (total, active, by platform). Only accessible by admins.',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async getStats() {
    return this.fcmTokensService.getTokenStats();
  }

  // ==================== USER ENDPOINTS ====================
  // NOTE: Tous les endpoints USER ont été déplacés vers NotificationsUserController
  // qui utilise JwtUserAuthGuard pour l'authentification.
  // Ce contrôleur ne gère maintenant QUE les endpoints ADMIN.
}

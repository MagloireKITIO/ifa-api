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
  // TODO: These will be protected with JwtUserAuthGuard once user auth is implemented

  @Post('register-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Register FCM token (User)',
    description:
      'Register a device FCM token for receiving push notifications. User must be authenticated.',
  })
  @ApiResponse({
    status: 200,
    description: 'Token registered successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid token' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async registerToken(
    @Body() registerTokenDto: RegisterFCMTokenDto,
    // @CurrentUser() user: User, // TODO: Add when user auth is ready
  ) {
    // TODO: Replace hardcoded userId with actual user from auth
    const userId = 'temp-user-id'; // Placeholder
    return this.fcmTokensService.registerToken(userId, registerTokenDto);
  }

  @Delete('deactivate-token/:token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deactivate FCM token (User)',
    description:
      'Deactivate a device FCM token (e.g., on logout). User must be authenticated.',
  })
  @ApiParam({
    name: 'token',
    description: 'FCM token to deactivate',
  })
  @ApiResponse({
    status: 204,
    description: 'Token deactivated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deactivateToken(
    @Param('token') token: string,
    // @CurrentUser() user: User, // TODO: Add when user auth is ready
  ) {
    await this.fcmTokensService.deactivateToken(token);
  }

  @Get()
  @ApiOperation({
    summary: 'Get user notifications (User)',
    description:
      'Retrieve notifications for the authenticated user with pagination and filters.',
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserNotifications(
    @Query() queryDto: QueryNotificationsDto,
    // @CurrentUser() user: User, // TODO: Add when user auth is ready
  ) {
    // TODO: Replace hardcoded userId with actual user from auth
    const userId = 'temp-user-id'; // Placeholder
    return this.notificationsService.getUserNotifications(userId, queryDto);
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Get unread notification count (User)',
    description: 'Get the number of unread notifications for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUnreadCount(
    // @CurrentUser() user: User, // TODO: Add when user auth is ready
  ) {
    // TODO: Replace hardcoded userId with actual user from auth
    const userId = 'temp-user-id'; // Placeholder
    const count = await this.notificationsService.getUnreadCount(userId);
    return { unreadCount: count };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark notification as read (User)',
    description: 'Mark a specific notification as read.',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(
    @Param('id') id: string,
    // @CurrentUser() user: User, // TODO: Add when user auth is ready
  ) {
    // TODO: Replace hardcoded userId with actual user from auth
    const userId = 'temp-user-id'; // Placeholder
    return this.notificationsService.markAsRead(id, userId);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Mark all notifications as read (User)',
    description: 'Mark all notifications as read for the authenticated user.',
  })
  @ApiResponse({
    status: 204,
    description: 'All notifications marked as read',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markAllAsRead(
    // @CurrentUser() user: User, // TODO: Add when user auth is ready
  ) {
    // TODO: Replace hardcoded userId with actual user from auth
    const userId = 'temp-user-id'; // Placeholder
    await this.notificationsService.markAllAsRead(userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete notification (User)',
    description: 'Delete a specific notification.',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
  })
  @ApiResponse({
    status: 204,
    description: 'Notification deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async deleteNotification(
    @Param('id') id: string,
    // @CurrentUser() user: User, // TODO: Add when user auth is ready
  ) {
    // TODO: Replace hardcoded userId with actual user from auth
    const userId = 'temp-user-id'; // Placeholder
    await this.notificationsService.deleteNotification(id, userId);
  }
}

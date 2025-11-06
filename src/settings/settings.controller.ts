import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
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
import { SettingsService } from './services';
import { UpdateSettingDto, PublicSettingsResponseDto } from './dto';
import { JwtAdminAuthGuard, PermissionsGuard } from '../auth-admin/guards';
import { RequirePermissions, CurrentAdmin } from '../auth-admin/decorators';
import { AdminPermission, AppSettingsCategory } from '../common/enums';
import { Admin } from '../entities/admin.entity';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('public')
  @ApiOperation({
    summary: 'Get public settings (no authentication required)',
    description:
      'Retrieve public settings for the mobile application. Only returns non-sensitive settings (isEncrypted = false).',
  })
  @ApiResponse({
    status: 200,
    description: 'Public settings retrieved successfully',
    type: PublicSettingsResponseDto,
  })
  async getPublicSettings(): Promise<PublicSettingsResponseDto> {
    return this.settingsService.getPublicSettings();
  }

  @Get()
  @UseGuards(JwtAdminAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions(AdminPermission.SETTINGS_READ)
  @ApiOperation({
    summary: 'Get all settings',
    description:
      'Retrieve all application settings grouped by category. Only accessible by super-admin or admins with settings:read permission.',
  })
  @ApiResponse({
    status: 200,
    description: 'Settings retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async getAllSettings() {
    return this.settingsService.getAllSettings();
  }

  @Get('category/:category')
  @UseGuards(JwtAdminAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions(AdminPermission.SETTINGS_READ)
  @ApiOperation({
    summary: 'Get settings by category',
    description: 'Retrieve all settings for a specific category.',
  })
  @ApiParam({
    name: 'category',
    enum: AppSettingsCategory,
    description: 'Settings category',
  })
  @ApiResponse({
    status: 200,
    description: 'Settings retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async getSettingsByCategory(
    @Param('category') category: AppSettingsCategory,
  ) {
    return this.settingsService.getSettingsByCategory(category);
  }

  @Get('key/:key')
  @UseGuards(JwtAdminAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions(AdminPermission.SETTINGS_READ)
  @ApiOperation({
    summary: 'Get setting by key',
    description: 'Retrieve a specific setting by its unique key.',
  })
  @ApiParam({
    name: 'key',
    description: 'Setting key',
    example: 'firebase_config',
  })
  @ApiResponse({
    status: 200,
    description: 'Setting retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Setting not found' })
  async getSettingByKey(@Param('key') key: string) {
    return this.settingsService.getSettingByKey(key);
  }

  @Put()
  @UseGuards(JwtAdminAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions(AdminPermission.SETTINGS_UPDATE)
  @ApiOperation({
    summary: 'Update or create a setting',
    description:
      'Update an existing setting or create a new one. Activity is logged automatically.',
  })
  @ApiResponse({
    status: 200,
    description: 'Setting updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async updateSetting(
    @Body() updateSettingDto: UpdateSettingDto,
    @CurrentAdmin() admin: Admin,
    @Req() request: Request,
  ) {
    const ipAddress = request.ip || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];

    return this.settingsService.updateSetting(
      updateSettingDto.key,
      updateSettingDto.value,
      updateSettingDto.category,
      updateSettingDto.isEncrypted,
      admin.id,
      ipAddress,
      userAgent,
    );
  }

  @Delete(':key')
  @UseGuards(JwtAdminAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions(AdminPermission.SETTINGS_UPDATE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a setting',
    description: 'Delete a setting by its key. Activity is logged automatically.',
  })
  @ApiParam({
    name: 'key',
    description: 'Setting key to delete',
    example: 'firebase_config',
  })
  @ApiResponse({
    status: 204,
    description: 'Setting deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Setting not found' })
  async deleteSetting(
    @Param('key') key: string,
    @CurrentAdmin() admin: Admin,
    @Req() request: Request,
  ) {
    const ipAddress = request.ip || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];

    await this.settingsService.deleteSetting(
      key,
      admin.id,
      ipAddress,
      userAgent,
    );
  }

  @Get('logs')
  @UseGuards(JwtAdminAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions(AdminPermission.SETTINGS_READ)
  @ApiOperation({
    summary: 'Get settings activity logs',
    description: 'Retrieve recent activity logs for settings changes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Activity logs retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async getSettingsActivityLogs() {
    return this.settingsService.getSettingsActivityLogs(50);
  }

  @Put('cache/reload')
  @UseGuards(JwtAdminAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions(AdminPermission.SETTINGS_UPDATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reload configuration cache',
    description:
      'Clear and reload the configuration cache from database. Useful after manual database updates.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache reloaded successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async reloadCache() {
    await this.settingsService.reloadCache();
    return { message: 'Configuration cache reloaded successfully' };
  }
}

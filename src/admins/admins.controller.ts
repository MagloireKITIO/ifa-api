import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminsService } from './admins.service';
import {
  CreateAdminDto,
  UpdateAdminDto,
  ChangePasswordDto,
  AdminResponseDto,
} from './dto';
import { JwtAdminAuthGuard, PermissionsGuard } from '../auth-admin/guards';
import { RequirePermissions, CurrentAdmin } from '../auth-admin/decorators';
import { AdminPermission, AdminRole } from '../common/enums';
import { Admin } from '../entities/admin.entity';

@ApiTags('Admins')
@ApiBearerAuth()
@Controller('admins')
@UseGuards(JwtAdminAuthGuard, PermissionsGuard)
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Post()
  @RequirePermissions(AdminPermission.ADMINS_CREATE)
  @ApiOperation({
    summary: 'Create a new admin',
    description:
      'Create a new admin account. Only accessible by super-admins or admins with admins:create permission.',
  })
  @ApiResponse({
    status: 201,
    description: 'Admin created successfully',
    type: AdminResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - email already exists',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async create(
    @Body() createAdminDto: CreateAdminDto,
    @CurrentAdmin() currentAdmin: Admin,
  ): Promise<AdminResponseDto> {
    // Prevent non-super-admins from creating super-admins
    if (
      createAdminDto.role === AdminRole.SUPER_ADMIN &&
      currentAdmin.role !== AdminRole.SUPER_ADMIN
    ) {
      throw new Error('Only super-admins can create super-admin accounts');
    }

    const admin = await this.adminsService.create(createAdminDto);
    return this.toResponseDto(admin);
  }

  @Get()
  @RequirePermissions(AdminPermission.ADMINS_READ)
  @ApiOperation({
    summary: 'Get all admins',
    description:
      'Retrieve all admin accounts with optional filter for inactive admins.',
  })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Include inactive admins in results',
  })
  @ApiResponse({
    status: 200,
    description: 'Admins retrieved successfully',
    type: [AdminResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async findAll(
    @Query('includeInactive') includeInactive?: boolean,
  ): Promise<AdminResponseDto[]> {
    const admins = await this.adminsService.findAll(includeInactive);
    return admins.map((admin) => this.toResponseDto(admin));
  }

  @Get(':id')
  @RequirePermissions(AdminPermission.ADMINS_READ)
  @ApiOperation({
    summary: 'Get admin by ID',
    description: 'Retrieve a specific admin by their ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Admin UUID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Admin retrieved successfully',
    type: AdminResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AdminResponseDto> {
    const admin = await this.adminsService.findById(id);
    return this.toResponseDto(admin);
  }

  @Put(':id')
  @RequirePermissions(AdminPermission.ADMINS_UPDATE)
  @ApiOperation({
    summary: 'Update an admin',
    description:
      'Update admin details (except password). Use the change-password endpoint to update password.',
  })
  @ApiParam({
    name: 'id',
    description: 'Admin UUID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Admin updated successfully',
    type: AdminResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - email already exists',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAdminDto: UpdateAdminDto,
    @CurrentAdmin() currentAdmin: Admin,
  ): Promise<AdminResponseDto> {
    // Prevent non-super-admins from promoting admins to super-admin
    if (
      updateAdminDto.role === AdminRole.SUPER_ADMIN &&
      currentAdmin.role !== AdminRole.SUPER_ADMIN
    ) {
      throw new Error('Only super-admins can promote admins to super-admin');
    }

    // Prevent admins from modifying their own role/permissions
    if (id === currentAdmin.id && (updateAdminDto.role || updateAdminDto.permissions)) {
      throw new Error('You cannot modify your own role or permissions');
    }

    const admin = await this.adminsService.update(id, updateAdminDto);
    return this.toResponseDto(admin);
  }

  @Put(':id/change-password')
  @RequirePermissions(AdminPermission.ADMINS_UPDATE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Change admin password',
    description:
      'Change the password of an admin. Requires current password for verification.',
  })
  @ApiParam({
    name: 'id',
    description: 'Admin UUID',
    type: String,
  })
  @ApiResponse({
    status: 204,
    description: 'Password changed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - current password is incorrect',
  })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async changePassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() changePasswordDto: ChangePasswordDto,
    @CurrentAdmin() currentAdmin: Admin,
  ): Promise<void> {
    // Only allow admins to change their own password or super-admins to change any password
    if (id !== currentAdmin.id && currentAdmin.role !== AdminRole.SUPER_ADMIN) {
      throw new Error('You can only change your own password');
    }

    await this.adminsService.changePassword(id, changePasswordDto);
  }

  @Delete(':id')
  @RequirePermissions(AdminPermission.ADMINS_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Soft delete an admin',
    description:
      'Deactivate an admin account (soft delete). The admin will no longer be able to login.',
  })
  @ApiParam({
    name: 'id',
    description: 'Admin UUID',
    type: String,
  })
  @ApiResponse({
    status: 204,
    description: 'Admin deactivated successfully',
  })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async softDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin() currentAdmin: Admin,
  ): Promise<void> {
    // Prevent admins from deleting themselves
    if (id === currentAdmin.id) {
      throw new Error('You cannot delete your own account');
    }

    await this.adminsService.softDelete(id);
  }

  @Put(':id/restore')
  @RequirePermissions(AdminPermission.ADMINS_UPDATE)
  @ApiOperation({
    summary: 'Restore a soft-deleted admin',
    description: 'Reactivate a previously deactivated admin account.',
  })
  @ApiParam({
    name: 'id',
    description: 'Admin UUID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Admin restored successfully',
    type: AdminResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async restore(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AdminResponseDto> {
    const admin = await this.adminsService.restore(id);
    return this.toResponseDto(admin);
  }

  /**
   * Transform Admin entity to AdminResponseDto
   * Removes sensitive data like password
   */
  private toResponseDto(admin: Admin): AdminResponseDto {
    return {
      id: admin.id,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      fullName: admin.fullName,
      role: admin.role,
      permissions: admin.permissions || [],
      lastLoginAt: admin.lastLoginAt,
      isActive: admin.isActive,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    };
  }
}

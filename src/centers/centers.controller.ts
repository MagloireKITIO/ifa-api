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
import { CentersService } from './centers.service';
import {
  CreateCenterDto,
  UpdateCenterDto,
  QueryCentersDto,
} from './dto';
import { JwtAdminAuthGuard, PermissionsGuard } from '../auth-admin/guards';
import { RequirePermissions, CurrentAdmin } from '../auth-admin/decorators';
import { AdminPermission } from '../common/enums';
import { Admin } from '../entities/admin.entity';

/**
 * Admin controller for centers management
 * All endpoints require admin authentication and appropriate permissions
 */
@ApiTags('Centers - Admin')
@ApiBearerAuth()
@Controller('centers')
@UseGuards(JwtAdminAuthGuard, PermissionsGuard)
export class CentersController {
  constructor(private readonly centersService: CentersService) {}

  @Post()
  @RequirePermissions(AdminPermission.CENTERS_CREATE)
  @ApiOperation({
    summary: 'Create a new center (Admin)',
    description:
      'Create a new IFA center with location details. Only accessible by admins with centers:create permission.',
  })
  @ApiResponse({
    status: 201,
    description: 'Center created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async create(
    @Body() createCenterDto: CreateCenterDto,
    @CurrentAdmin() admin: Admin,
    @Req() request: Request,
  ) {
    const ipAddress = request.ip || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];

    return this.centersService.create(
      createCenterDto,
      admin.id,
      ipAddress,
      userAgent,
    );
  }

  @Get()
  @RequirePermissions(AdminPermission.CENTERS_READ)
  @ApiOperation({
    summary: 'Get all centers (Admin)',
    description:
      'Retrieve all centers with optional filters (active status, city, country).',
  })
  @ApiResponse({
    status: 200,
    description: 'Centers retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async findAll(@Query() queryDto: QueryCentersDto) {
    return this.centersService.findAll(queryDto);
  }

  @Get(':id')
  @RequirePermissions(AdminPermission.CENTERS_READ)
  @ApiOperation({
    summary: 'Get center by ID (Admin)',
    description: 'Retrieve a specific center by its ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Center ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Center retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Center not found' })
  async findOne(@Param('id') id: string) {
    return this.centersService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(AdminPermission.CENTERS_UPDATE)
  @ApiOperation({
    summary: 'Update a center (Admin)',
    description:
      'Update an existing center. Activity is logged automatically.',
  })
  @ApiParam({
    name: 'id',
    description: 'Center ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Center updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Center not found' })
  async update(
    @Param('id') id: string,
    @Body() updateCenterDto: UpdateCenterDto,
    @CurrentAdmin() admin: Admin,
    @Req() request: Request,
  ) {
    const ipAddress = request.ip || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];

    return this.centersService.update(
      id,
      updateCenterDto,
      admin.id,
      ipAddress,
      userAgent,
    );
  }

  @Delete(':id')
  @RequirePermissions(AdminPermission.CENTERS_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a center (Admin)',
    description:
      'Delete a center by its ID. Activity is logged automatically.',
  })
  @ApiParam({
    name: 'id',
    description: 'Center ID to delete',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 204,
    description: 'Center deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Center not found' })
  async remove(
    @Param('id') id: string,
    @CurrentAdmin() admin: Admin,
    @Req() request: Request,
  ) {
    const ipAddress = request.ip || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];

    await this.centersService.remove(id, admin.id, ipAddress, userAgent);
  }
}

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
import { FundsService } from './funds.service';
import {
  CreateFundDto,
  UpdateFundDto,
  QueryFundsDto,
  UpdateFundStatusDto,
} from './dto';
import { JwtAdminAuthGuard, PermissionsGuard } from '../auth-admin/guards';
import { RequirePermissions, CurrentAdmin } from '../auth-admin/decorators';
import { AdminPermission } from '../common/enums';
import { Admin } from '../entities/admin.entity';

@ApiTags('Funds')
@ApiBearerAuth()
@Controller('funds')
@UseGuards(JwtAdminAuthGuard, PermissionsGuard)
export class FundsController {
  constructor(private readonly fundsService: FundsService) {}

  @Post()
  @RequirePermissions(AdminPermission.FUNDS_CREATE)
  @ApiOperation({
    summary: 'Create a new fund',
    description:
      'Create a new fund (tithe, offering, or campaign). Only accessible by admins with funds:create permission.',
  })
  @ApiResponse({
    status: 201,
    description: 'Fund created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async create(
    @Body() createFundDto: CreateFundDto,
    @CurrentAdmin() admin: Admin,
    @Req() request: Request,
  ) {
    const ipAddress = request.ip || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];

    return this.fundsService.create(
      createFundDto,
      admin.id,
      ipAddress,
      userAgent,
    );
  }

  @Get()
  @RequirePermissions(AdminPermission.FUNDS_READ)
  @ApiOperation({
    summary: 'Get all funds',
    description:
      'Retrieve all funds with optional filters (type, status, search).',
  })
  @ApiResponse({
    status: 200,
    description: 'Funds retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async findAll(@Query() queryDto: QueryFundsDto) {
    return this.fundsService.findAll(queryDto);
  }

  @Get('active')
  @RequirePermissions(AdminPermission.FUNDS_READ)
  @ApiOperation({
    summary: 'Get active funds',
    description:
      'Retrieve all active funds (for public display on mobile app).',
  })
  @ApiResponse({
    status: 200,
    description: 'Active funds retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async findActive() {
    return this.fundsService.findActive();
  }

  @Get('statistics')
  @RequirePermissions(AdminPermission.FUNDS_READ)
  @ApiOperation({
    summary: 'Get fund statistics',
    description:
      'Get statistics about funds (total, active, total collected, by type).',
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
  async getStatistics() {
    return this.fundsService.getStatistics();
  }

  @Get(':id')
  @RequirePermissions(AdminPermission.FUNDS_READ)
  @ApiOperation({
    summary: 'Get fund by ID',
    description: 'Retrieve a specific fund by its ID with related data.',
  })
  @ApiParam({
    name: 'id',
    description: 'Fund ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Fund retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Fund not found' })
  async findOne(@Param('id') id: string) {
    return this.fundsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(AdminPermission.FUNDS_UPDATE)
  @ApiOperation({
    summary: 'Update a fund',
    description: 'Update an existing fund. Activity is logged automatically.',
  })
  @ApiParam({
    name: 'id',
    description: 'Fund ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Fund updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Fund not found' })
  async update(
    @Param('id') id: string,
    @Body() updateFundDto: UpdateFundDto,
    @CurrentAdmin() admin: Admin,
    @Req() request: Request,
  ) {
    const ipAddress = request.ip || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];

    return this.fundsService.update(
      id,
      updateFundDto,
      admin.id,
      ipAddress,
      userAgent,
    );
  }

  @Patch(':id/status')
  @RequirePermissions(AdminPermission.FUNDS_UPDATE)
  @ApiOperation({
    summary: 'Update fund status',
    description:
      'Update the status of a fund (active, completed, closed). Activity is logged automatically.',
  })
  @ApiParam({
    name: 'id',
    description: 'Fund ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Fund status updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Fund not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateFundStatusDto,
    @CurrentAdmin() admin: Admin,
    @Req() request: Request,
  ) {
    const ipAddress = request.ip || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];

    return this.fundsService.updateStatus(
      id,
      updateStatusDto,
      admin.id,
      ipAddress,
      userAgent,
    );
  }

  @Delete(':id')
  @RequirePermissions(AdminPermission.FUNDS_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a fund',
    description:
      'Delete a fund by its ID. Only funds without donations can be deleted. Activity is logged automatically.',
  })
  @ApiParam({
    name: 'id',
    description: 'Fund ID to delete',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 204,
    description: 'Fund deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete fund with donations',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Fund not found' })
  async remove(
    @Param('id') id: string,
    @CurrentAdmin() admin: Admin,
    @Req() request: Request,
  ) {
    const ipAddress = request.ip || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];

    await this.fundsService.remove(id, admin.id, ipAddress, userAgent);
  }
}

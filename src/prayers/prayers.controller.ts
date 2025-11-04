import {
  Controller,
  Get,
  Post,
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
import { PrayersService } from './prayers.service';
import { QueryPrayersDto, AddTestimonyDto, ReactPrayerDto } from './dto';
import { JwtAdminAuthGuard, PermissionsGuard } from '../auth-admin/guards';
import { RequirePermissions, CurrentAdmin } from '../auth-admin/decorators';
import { AdminPermission } from '../common/enums';
import { Admin } from '../entities/admin.entity';

@ApiTags('Prayers')
@ApiBearerAuth()
@Controller('prayers')
@UseGuards(JwtAdminAuthGuard, PermissionsGuard)
export class PrayersController {
  constructor(private readonly prayersService: PrayersService) {}

  @Get()
  @RequirePermissions(AdminPermission.PRAYERS_READ)
  @ApiOperation({
    summary: 'Get all prayers',
    description:
      'Retrieve all prayers with filters (admin view - sees all statuses: active, answered, closed).',
  })
  @ApiResponse({
    status: 200,
    description: 'Prayers retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async findAll(@Query() queryDto: QueryPrayersDto) {
    return this.prayersService.findAll(queryDto);
  }

  @Get('active')
  @RequirePermissions(AdminPermission.PRAYERS_READ)
  @ApiOperation({
    summary: 'Get active prayers only',
    description:
      'Retrieve only active prayers (public view - for mobile app).',
  })
  @ApiResponse({
    status: 200,
    description: 'Active prayers retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async findActive() {
    return this.prayersService.findActive();
  }

  @Get('stats/count-by-status')
  @RequirePermissions(AdminPermission.PRAYERS_READ)
  @ApiOperation({
    summary: 'Get prayers count by status',
    description:
      'Get count of prayers by status (active, answered, closed, total). Useful for displaying badges in UI.',
  })
  @ApiResponse({
    status: 200,
    description: 'Count retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async getCountByStatus() {
    return this.prayersService.getCountByStatus();
  }

  @Get(':id')
  @RequirePermissions(AdminPermission.PRAYERS_READ)
  @ApiOperation({
    summary: 'Get prayer by ID',
    description: 'Retrieve a specific prayer by its ID with related data.',
  })
  @ApiParam({
    name: 'id',
    description: 'Prayer ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Prayer retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Prayer not found' })
  async findOne(@Param('id') id: string) {
    return this.prayersService.findOne(id);
  }

  @Post(':id/react')
  @RequirePermissions(AdminPermission.PRAYERS_READ)
  @ApiOperation({
    summary: 'React to a prayer',
    description:
      'User reacts to a prayer (prayed or fasted). User can have only ONE reaction per prayer but can change it.',
  })
  @ApiParam({
    name: 'id',
    description: 'Prayer ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Reaction added/updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Prayer not found' })
  async react(
    @Param('id') prayerId: string,
    @Body() reactDto: ReactPrayerDto,
    @CurrentAdmin() admin: Admin,
  ) {
    // Note: In production, this would use userId from authenticated user
    // For now using admin.id as placeholder
    return this.prayersService.react(prayerId, admin.id, reactDto);
  }

  @Delete(':id/react')
  @RequirePermissions(AdminPermission.PRAYERS_READ)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove reaction from a prayer',
    description: 'User removes their reaction from a prayer.',
  })
  @ApiParam({
    name: 'id',
    description: 'Prayer ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Reaction removed successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Prayer or reaction not found' })
  async removeReaction(
    @Param('id') prayerId: string,
    @CurrentAdmin() admin: Admin,
  ) {
    // Note: In production, this would use userId from authenticated user
    return this.prayersService.removeReaction(prayerId, admin.id);
  }

  @Post(':id/testimony')
  @RequirePermissions(AdminPermission.PRAYERS_READ)
  @ApiOperation({
    summary: 'Add testimony to a prayer',
    description:
      'Prayer author adds testimony of answered prayer. Status changes to "answered".',
  })
  @ApiParam({
    name: 'id',
    description: 'Prayer ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Testimony added successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only prayer author can add testimony',
  })
  @ApiResponse({ status: 404, description: 'Prayer not found' })
  async addTestimony(
    @Param('id') prayerId: string,
    @Body() testimonyDto: AddTestimonyDto,
    @CurrentAdmin() admin: Admin,
  ) {
    // Note: In production, this would use userId from authenticated user
    return this.prayersService.addTestimony(prayerId, admin.id, testimonyDto);
  }

  @Delete(':id')
  @RequirePermissions(AdminPermission.PRAYERS_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a prayer',
    description:
      'Delete a prayer by its ID (admin only). Activity is logged automatically.',
  })
  @ApiParam({
    name: 'id',
    description: 'Prayer ID to delete',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 204,
    description: 'Prayer deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Prayer not found' })
  async remove(
    @Param('id') id: string,
    @CurrentAdmin() admin: Admin,
    @Req() request: Request,
  ) {
    const ipAddress = request.ip || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];

    await this.prayersService.remove(
      id,
      undefined,
      admin.id,
      ipAddress,
      userAgent,
    );
  }
}

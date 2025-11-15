import {
  Controller,
  Get,
  Delete,
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
import { TestimoniesService } from './testimonies.service';
import { QueryTestimoniesDto } from './dto';
import { JwtAdminAuthGuard, PermissionsGuard } from '../auth-admin/guards';
import { RequirePermissions, CurrentAdmin } from '../auth-admin/decorators';
import { AdminPermission } from '../common/enums';
import { Admin } from '../entities/admin.entity';

@ApiTags('Testimonies')
@ApiBearerAuth()
@Controller('admin/testimonies')
@UseGuards(JwtAdminAuthGuard, PermissionsGuard)
export class TestimoniesController {
  constructor(private readonly testimoniesService: TestimoniesService) {}

  @Get()
  @RequirePermissions(AdminPermission.TESTIMONIES_READ)
  @ApiOperation({
    summary: 'Get all testimonies',
    description:
      'Retrieve all testimonies with filters. All testimonies are published directly without moderation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Testimonies retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async findAll(@Query() queryDto: QueryTestimoniesDto) {
    return this.testimoniesService.findAll(queryDto);
  }

  @Get('stats/count-by-status')
  @RequirePermissions(AdminPermission.TESTIMONIES_READ)
  @ApiOperation({
    summary: 'Get testimonies count',
    description: 'Get total count of testimonies.',
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
    return this.testimoniesService.getCountByStatus();
  }

  @Get(':id')
  @RequirePermissions(AdminPermission.TESTIMONIES_READ)
  @ApiOperation({
    summary: 'Get testimony by ID',
    description: 'Retrieve a specific testimony by its ID with related data.',
  })
  @ApiParam({
    name: 'id',
    description: 'Testimony ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Testimony retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Testimony not found' })
  async findOne(@Param('id') id: string) {
    return this.testimoniesService.findOne(id);
  }

  @Delete(':id')
  @RequirePermissions(AdminPermission.TESTIMONIES_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a testimony',
    description:
      'Delete a testimony by its ID. Activity is logged automatically.',
  })
  @ApiParam({
    name: 'id',
    description: 'Testimony ID to delete',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 204,
    description: 'Testimony deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Testimony not found' })
  async remove(
    @Param('id') id: string,
    @CurrentAdmin() admin: Admin,
    @Req() request: Request,
  ) {
    const ipAddress = request.ip || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];

    await this.testimoniesService.remove(id, admin.id, ipAddress, userAgent);
  }
}

import {
  Controller,
  Get,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DashboardStatsService } from './dashboard-stats.service';
import { JwtAdminAuthGuard, PermissionsGuard } from '../auth-admin/guards';
import { RequirePermissions } from '../auth-admin/decorators';
import { AdminPermission } from '../common/enums';
import { GetStatsDto } from './dto';

@ApiTags('Dashboard Stats')
@ApiBearerAuth()
@Controller('dashboard-stats')
@UseGuards(JwtAdminAuthGuard, PermissionsGuard)
export class DashboardStatsController {
  constructor(
    private readonly dashboardStatsService: DashboardStatsService,
  ) {}

  @Get()
  @RequirePermissions(AdminPermission.EVENTS_READ)
  @ApiOperation({
    summary: 'Get dashboard statistics',
    description:
      'Retrieve statistics for the admin dashboard including events, testimonies, prayers, and donations counts.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async getStats(@Query() queryDto: GetStatsDto) {
    return this.dashboardStatsService.getStats(queryDto);
  }

  @Get('activities')
  @RequirePermissions(AdminPermission.EVENTS_READ)
  @ApiOperation({
    summary: 'Get recent admin activities',
    description:
      'Retrieve recent admin activities for the dashboard. Returns the last 10 activities by default.',
  })
  @ApiResponse({
    status: 200,
    description: 'Recent activities retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async getRecentActivities(@Query('limit') limit?: number) {
    return this.dashboardStatsService.getRecentActivities(limit || 10);
  }
}

import {
  Controller,
  Get,
  Post,
  Put,
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
import { EventsService } from './events.service';
import {
  CreateEventDto,
  UpdateEventDto,
  QueryEventsDto,
  UpdateReplayLinkDto,
} from './dto';
import { JwtAdminAuthGuard, PermissionsGuard } from '../auth-admin/guards';
import { RequirePermissions, CurrentAdmin } from '../auth-admin/decorators';
import { AdminPermission } from '../common/enums';
import { Admin } from '../entities/admin.entity';

@ApiTags('Events')
@ApiBearerAuth()
@Controller('events')
@UseGuards(JwtAdminAuthGuard, PermissionsGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @RequirePermissions(AdminPermission.EVENTS_CREATE)
  @ApiOperation({
    summary: 'Create a new event',
    description:
      'Create a new event. Only accessible by admins with events:create permission.',
  })
  @ApiResponse({
    status: 201,
    description: 'Event created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async create(
    @Body() createEventDto: CreateEventDto,
    @CurrentAdmin() admin: Admin,
    @Req() request: Request,
  ) {
    const ipAddress = request.ip || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];

    return this.eventsService.create(
      createEventDto,
      admin.id,
      ipAddress,
      userAgent,
    );
  }

  @Get()
  @RequirePermissions(AdminPermission.EVENTS_READ)
  @ApiOperation({
    summary: 'Get all events',
    description:
      'Retrieve all events with optional filters (type, status, date range, center, search).',
  })
  @ApiResponse({
    status: 200,
    description: 'Events retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async findAll(@Query() queryDto: QueryEventsDto) {
    return this.eventsService.findAll(queryDto);
  }

  @Get(':id')
  @RequirePermissions(AdminPermission.EVENTS_READ)
  @ApiOperation({
    summary: 'Get event by ID',
    description: 'Retrieve a specific event by its ID with related data.',
  })
  @ApiParam({
    name: 'id',
    description: 'Event ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Event retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(AdminPermission.EVENTS_UPDATE)
  @ApiOperation({
    summary: 'Update an event',
    description:
      'Update an existing event. Activity is logged automatically.',
  })
  @ApiParam({
    name: 'id',
    description: 'Event ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Event updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
    @CurrentAdmin() admin: Admin,
    @Req() request: Request,
  ) {
    const ipAddress = request.ip || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];

    return this.eventsService.update(
      id,
      updateEventDto,
      admin.id,
      ipAddress,
      userAgent,
    );
  }

  @Patch(':id/replay-link')
  @RequirePermissions(AdminPermission.EVENTS_UPDATE)
  @ApiOperation({
    summary: 'Update event replay link',
    description:
      'Update the replay link for a past event. Useful for adding YouTube replay after the event.',
  })
  @ApiParam({
    name: 'id',
    description: 'Event ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Replay link updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async updateReplayLink(
    @Param('id') id: string,
    @Body() updateReplayLinkDto: UpdateReplayLinkDto,
    @CurrentAdmin() admin: Admin,
    @Req() request: Request,
  ) {
    const ipAddress = request.ip || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];

    return this.eventsService.updateReplayLink(
      id,
      updateReplayLinkDto,
      admin.id,
      ipAddress,
      userAgent,
    );
  }

  @Delete(':id')
  @RequirePermissions(AdminPermission.EVENTS_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete an event',
    description: 'Delete an event by its ID. Activity is logged automatically.',
  })
  @ApiParam({
    name: 'id',
    description: 'Event ID to delete',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 204,
    description: 'Event deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async remove(
    @Param('id') id: string,
    @CurrentAdmin() admin: Admin,
    @Req() request: Request,
  ) {
    const ipAddress = request.ip || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];

    await this.eventsService.remove(id, admin.id, ipAddress, userAgent);
  }

  @Get('admin/past-without-replay')
  @RequirePermissions(AdminPermission.EVENTS_READ)
  @ApiOperation({
    summary: 'Get past events without replay link',
    description:
      'Retrieve past events that are missing replay links (for admin reminders).',
  })
  @ApiResponse({
    status: 200,
    description: 'Events retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async findPastWithoutReplay() {
    return this.eventsService.findPastEventsWithoutReplay();
  }
}

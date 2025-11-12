import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
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
import { EventRemindersService } from './event-reminders.service';
import { JwtUserAuthGuard } from '../auth-user/guards/jwt-user-auth.guard';
import { CurrentUser } from '../auth-user/decorators/current-user.decorator';
import { User } from '../entities/user.entity';

@ApiTags('Event Reminders')
@ApiBearerAuth()
@Controller('event-reminders')
@UseGuards(JwtUserAuthGuard)
export class EventRemindersController {
  constructor(
    private readonly eventRemindersService: EventRemindersService,
  ) {}

  @Post('events/:eventId')
  @ApiOperation({
    summary: 'Set a reminder for an event',
    description:
      'Create a reminder to be notified 1 hour before the event starts. Only works for upcoming events.',
  })
  @ApiParam({
    name: 'eventId',
    description: 'Event ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 201,
    description: 'Reminder created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - event is not upcoming or less than 1h away',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - reminder already exists',
  })
  async create(@Param('eventId') eventId: string, @CurrentUser() user: User) {
    return this.eventRemindersService.create(user.id, { eventId });
  }

  @Get()
  @ApiOperation({
    summary: 'Get all my event reminders',
    description:
      'Retrieve all event reminders for the authenticated user, ordered by scheduled time.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reminders retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@CurrentUser() user: User) {
    return this.eventRemindersService.findAllByUser(user.id);
  }

  @Get('events/:eventId')
  @ApiOperation({
    summary: 'Check if I have a reminder for an event',
    description:
      'Check if the authenticated user has set a reminder for a specific event.',
  })
  @ApiParam({
    name: 'eventId',
    description: 'Event ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Reminder found (or null if not found)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(@Param('eventId') eventId: string, @CurrentUser() user: User) {
    return this.eventRemindersService.findOne(user.id, eventId);
  }

  @Delete('events/:eventId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a reminder for an event',
    description: 'Remove a previously set reminder for an event.',
  })
  @ApiParam({
    name: 'eventId',
    description: 'Event ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 204,
    description: 'Reminder deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Reminder not found' })
  async remove(@Param('eventId') eventId: string, @CurrentUser() user: User) {
    await this.eventRemindersService.remove(user.id, eventId);
  }
}

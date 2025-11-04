import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, IsNull } from 'typeorm';
import { Event } from '../entities/event.entity';
import { AdminActivityLog } from '../entities/admin-activity-log.entity';
import { CreateEventDto, UpdateEventDto, QueryEventsDto, UpdateReplayLinkDto } from './dto';
import { EventStatus, Language } from '../common/enums';

/**
 * Service for managing events with activity logging
 */
@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(AdminActivityLog)
    private readonly activityLogRepository: Repository<AdminActivityLog>,
  ) {}

  /**
   * Create a new event
   * @param createEventDto - Event data
   * @param adminId - ID of the admin creating the event
   * @param ipAddress - IP address of the request
   * @param userAgent - User agent of the request
   */
  async create(
    createEventDto: CreateEventDto,
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Event> {
    // Validate event date is in the future
    const eventDate = new Date(createEventDto.eventDate);
    if (eventDate < new Date()) {
      throw new BadRequestException('Event date must be in the future');
    }

    // Create event with automatic status determination
    const event = this.eventRepository.create({
      ...createEventDto,
      createdById: adminId,
      status: EventStatus.UPCOMING,
      notificationSent: false,
    });

    const savedEvent = await this.eventRepository.save(event);

    // Log activity
    await this.logActivity(
      adminId,
      'created_event',
      'events',
      savedEvent.id,
      {
        titleFr: savedEvent.titleFr,
        titleEn: savedEvent.titleEn,
        type: savedEvent.type,
        eventDate: savedEvent.eventDate,
      },
      ipAddress,
      userAgent,
    );

    return savedEvent;
  }

  /**
   * Get all events with optional filters
   * @param queryDto - Query filters
   */
  async findAll(queryDto: QueryEventsDto): Promise<Event[]> {
    const query = this.eventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.center', 'center')
      .leftJoinAndSelect('event.createdBy', 'createdBy');

    // Apply filters
    if (queryDto.type) {
      query.andWhere('event.type = :type', { type: queryDto.type });
    }

    if (queryDto.status) {
      query.andWhere('event.status = :status', { status: queryDto.status });
    }

    if (queryDto.centerId) {
      query.andWhere('event.centerId = :centerId', {
        centerId: queryDto.centerId,
      });
    }

    if (queryDto.fromDate && queryDto.toDate) {
      query.andWhere('event.eventDate BETWEEN :fromDate AND :toDate', {
        fromDate: queryDto.fromDate,
        toDate: queryDto.toDate,
      });
    } else if (queryDto.fromDate) {
      query.andWhere('event.eventDate >= :fromDate', {
        fromDate: queryDto.fromDate,
      });
    } else if (queryDto.toDate) {
      query.andWhere('event.eventDate <= :toDate', {
        toDate: queryDto.toDate,
      });
    }

    // Search in title (both languages)
    if (queryDto.search) {
      query.andWhere(
        '(LOWER(event.titleFr) LIKE LOWER(:search) OR LOWER(event.titleEn) LIKE LOWER(:search))',
        { search: `%${queryDto.search}%` },
      );
    }

    // Order by event date (upcoming first, then past)
    query.orderBy('event.eventDate', 'DESC');

    const events = await query.getMany();

    // If language preference is specified, we can format the response accordingly
    // For now, return all fields and let the controller/client handle it
    return events;
  }

  /**
   * Get a single event by ID
   * @param id - Event ID
   */
  async findOne(id: string): Promise<Event> {
    const event = await this.eventRepository.findOne({
      where: { id },
      relations: ['center', 'createdBy'],
    });

    if (!event) {
      throw new NotFoundException(`Event with ID "${id}" not found`);
    }

    return event;
  }

  /**
   * Update an event
   * @param id - Event ID
   * @param updateEventDto - Updated event data
   * @param adminId - ID of the admin updating the event
   * @param ipAddress - IP address of the request
   * @param userAgent - User agent of the request
   */
  async update(
    id: string,
    updateEventDto: UpdateEventDto,
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Event> {
    const event = await this.findOne(id);

    // If updating event date, validate it
    if (updateEventDto.eventDate) {
      const newEventDate = new Date(updateEventDto.eventDate);
      if (newEventDate < new Date() && event.status === EventStatus.UPCOMING) {
        throw new BadRequestException(
          'Cannot set event date in the past for upcoming events',
        );
      }
    }

    // Update event
    Object.assign(event, updateEventDto);
    const updatedEvent = await this.eventRepository.save(event);

    // Log activity
    await this.logActivity(
      adminId,
      'updated_event',
      'events',
      updatedEvent.id,
      {
        titleFr: updatedEvent.titleFr,
        titleEn: updatedEvent.titleEn,
        changes: updateEventDto,
      },
      ipAddress,
      userAgent,
    );

    return updatedEvent;
  }

  /**
   * Update replay link for a past event
   * @param id - Event ID
   * @param updateReplayLinkDto - Replay link data
   * @param adminId - ID of the admin updating the link
   * @param ipAddress - IP address of the request
   * @param userAgent - User agent of the request
   */
  async updateReplayLink(
    id: string,
    updateReplayLinkDto: UpdateReplayLinkDto,
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Event> {
    const event = await this.findOne(id);

    event.replayLink = updateReplayLinkDto.replayLink;
    event.replayLinkUpdatedAt = new Date();

    const updatedEvent = await this.eventRepository.save(event);

    // Log activity
    await this.logActivity(
      adminId,
      'updated_replay_link',
      'events',
      updatedEvent.id,
      {
        titleFr: updatedEvent.titleFr,
        titleEn: updatedEvent.titleEn,
        replayLink: updatedEvent.replayLink,
      },
      ipAddress,
      userAgent,
    );

    return updatedEvent;
  }

  /**
   * Delete an event
   * @param id - Event ID
   * @param adminId - ID of the admin deleting the event
   * @param ipAddress - IP address of the request
   * @param userAgent - User agent of the request
   */
  async remove(
    id: string,
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const event = await this.findOne(id);

    // Log activity before deletion
    await this.logActivity(
      adminId,
      'deleted_event',
      'events',
      event.id,
      {
        titleFr: event.titleFr,
        titleEn: event.titleEn,
        type: event.type,
        eventDate: event.eventDate,
      },
      ipAddress,
      userAgent,
    );

    await this.eventRepository.remove(event);
  }

  /**
   * Update event statuses based on current date
   * This method should be called by a cron job
   */
  async updateEventStatuses(): Promise<void> {
    const now = new Date();
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

    // Mark events as ongoing (started but less than 3 hours ago)
    await this.eventRepository
      .createQueryBuilder()
      .update(Event)
      .set({ status: EventStatus.ONGOING })
      .where('eventDate <= :now', { now })
      .andWhere('eventDate > :threeHoursAgo', { threeHoursAgo })
      .andWhere('status = :upcomingStatus', {
        upcomingStatus: EventStatus.UPCOMING,
      })
      .execute();

    // Mark events as past (more than 3 hours ago)
    await this.eventRepository
      .createQueryBuilder()
      .update(Event)
      .set({ status: EventStatus.PAST })
      .where('eventDate <= :threeHoursAgo', { threeHoursAgo })
      .andWhere('status IN (:...statuses)', {
        statuses: [EventStatus.UPCOMING, EventStatus.ONGOING],
      })
      .execute();
  }

  /**
   * Get events that are past and missing replay link
   * For admin notifications
   */
  async findPastEventsWithoutReplay(): Promise<Event[]> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    return this.eventRepository.find({
      where: {
        status: EventStatus.PAST,
        replayLink: IsNull(),
      },
      relations: ['center', 'createdBy'],
    });
  }

  /**
   * Get upcoming events for notifications
   */
  async findUpcomingEventsForNotification(): Promise<Event[]> {
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
    const now = new Date();

    return this.eventRepository.find({
      where: {
        status: EventStatus.UPCOMING,
        notificationSent: false,
      },
      relations: ['center'],
    });
  }

  /**
   * Mark event notification as sent
   * @param id - Event ID
   */
  async markNotificationSent(id: string): Promise<void> {
    await this.eventRepository.update(id, { notificationSent: true });
  }

  /**
   * Helper method to log admin activity
   */
  private async logActivity(
    adminId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const log = this.activityLogRepository.create({
      adminId,
      action,
      entityType,
      entityId,
      metadata,
      ipAddress,
      userAgent,
    });

    await this.activityLogRepository.save(log);
  }
}

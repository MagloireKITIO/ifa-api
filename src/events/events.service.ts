import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, IsNull } from 'typeorm';
import { Event } from '../entities/event.entity';
import { AdminActivityLog } from '../entities/admin-activity-log.entity';
import { CreateEventDto, UpdateEventDto, QueryEventsDto, UpdateReplayLinkDto } from './dto';
import { EventStatus, EventType, Language } from '../common/enums';
import { NotificationsService } from '../notifications/services/notifications.service';

/**
 * Service for managing events with activity logging
 */
@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(AdminActivityLog)
    private readonly activityLogRepository: Repository<AdminActivityLog>,
    private readonly notificationsService: NotificationsService,
  ) {
    // Migrer les anciennes données au démarrage
    this.migrateOldEvents();
  }

  /**
   * Migrer les anciens événements qui utilisent eventDate vers startDate/endDate
   */
  private async migrateOldEvents(): Promise<void> {
    try {
      // Trouver tous les événements qui ont eventDate mais pas startDate
      const oldEvents = await this.eventRepository
        .createQueryBuilder('event')
        .where('event.eventDate IS NOT NULL')
        .andWhere('event.startDate IS NULL')
        .getMany();

      if (oldEvents.length > 0) {
        this.logger.log(`Migrating ${oldEvents.length} old events to new date format...`);

        for (const event of oldEvents) {
          // startDate = eventDate
          event.startDate = event.eventDate;
          // endDate = eventDate + 3 heures (valeur par défaut raisonnable)
          event.endDate = new Date(event.eventDate.getTime() + 3 * 60 * 60 * 1000);
        }

        await this.eventRepository.save(oldEvents);
        this.logger.log(`Successfully migrated ${oldEvents.length} events`);
      }
    } catch (error) {
      this.logger.error('Error migrating old events:', error);
    }
  }

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
    // Support legacy eventDate field
    let startDate: Date;
    let endDate: Date;
    let eventDate: Date;

    if (createEventDto.startDate && createEventDto.endDate) {
      // Nouveau format
      startDate = new Date(createEventDto.startDate);
      endDate = new Date(createEventDto.endDate);
      eventDate = startDate;
    } else if (createEventDto.eventDate) {
      // Format legacy
      eventDate = new Date(createEventDto.eventDate);
      startDate = eventDate;
      endDate = new Date(eventDate.getTime() + 3 * 60 * 60 * 1000); // +3h par défaut
    } else {
      throw new BadRequestException(
        'Either startDate/endDate or eventDate must be provided',
      );
    }

    if (startDate < new Date()) {
      throw new BadRequestException('Event start date must be in the future');
    }

    if (endDate < startDate) {
      throw new BadRequestException('Event end date must be after start date');
    }

    // Create event with automatic status determination
    const event = this.eventRepository.create({
      ...createEventDto,
      startDate,
      endDate,
      eventDate, // Legacy field
      createdById: adminId,
      status: EventStatus.UPCOMING, // Will be computed dynamically
      notificationSent: false,
    });

    const savedEvent = await this.eventRepository.save(event);

    // Update status based on computed value
    savedEvent.status = savedEvent.getComputedStatus();
    await this.eventRepository.save(savedEvent);

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
        startDate: savedEvent.startDate,
        endDate: savedEvent.endDate,
      },
      ipAddress,
      userAgent,
    );

    // Send notification to all users about new event
    try {
      await this.notificationsService.createEventNotification(
        savedEvent.id,
        savedEvent.titleFr,
        savedEvent.titleEn,
      );
      this.logger.log(`Notification sent for new event: ${savedEvent.id}`);
    } catch (error) {
      this.logger.error(`Failed to send notification for event ${savedEvent.id}:`, error);
      // Don't fail event creation if notification fails
    }

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
      query.andWhere('event.startDate BETWEEN :fromDate AND :toDate', {
        fromDate: queryDto.fromDate,
        toDate: queryDto.toDate,
      });
    } else if (queryDto.fromDate) {
      query.andWhere('event.startDate >= :fromDate', {
        fromDate: queryDto.fromDate,
      });
    } else if (queryDto.toDate) {
      query.andWhere('event.startDate <= :toDate', {
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
    query.orderBy('event.startDate', 'DESC');

    const events = await query.getMany();

    // Update status for all events based on current time
    const eventsWithUpdatedStatus = events.map((event) => {
      event.status = event.getComputedStatus();
      return event;
    });

    // Persist updated statuses
    if (eventsWithUpdatedStatus.length > 0) {
      await this.eventRepository.save(eventsWithUpdatedStatus);
    }

    // If language preference is specified, we can format the response accordingly
    // For now, return all fields and let the controller/client handle it
    return eventsWithUpdatedStatus;
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

    // Update and persist status based on current time
    event.status = event.getComputedStatus();
    await this.eventRepository.save(event);

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

    // If updating dates, validate them
    const startDate = updateEventDto.startDate
      ? new Date(updateEventDto.startDate)
      : event.startDate;
    const endDate = updateEventDto.endDate
      ? new Date(updateEventDto.endDate)
      : event.endDate;

    if (startDate && endDate && endDate < startDate) {
      throw new BadRequestException('Event end date must be after start date');
    }

    // Legacy eventDate handling
    if (updateEventDto.eventDate) {
      const newEventDate = new Date(updateEventDto.eventDate);
      if (newEventDate < new Date() && event.status === EventStatus.UPCOMING) {
        throw new BadRequestException(
          'Cannot set event date in the past for upcoming events',
        );
      }
      // Si eventDate est mis à jour mais pas startDate/endDate, les synchroniser
      if (!updateEventDto.startDate) {
        updateEventDto.startDate = updateEventDto.eventDate;
      }
      if (!updateEventDto.endDate) {
        const eventDateObj = new Date(updateEventDto.eventDate);
        updateEventDto.endDate = new Date(
          eventDateObj.getTime() + 3 * 60 * 60 * 1000,
        ).toISOString();
      }
    }

    // Update event
    Object.assign(event, updateEventDto);

    // Recompute status after update
    event.status = event.getComputedStatus();

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
   * ============================================
   * PUBLIC ENDPOINTS FOR MOBILE APP
   * ============================================
   */

  /**
   * Get all public events with pagination
   * GET /events/public
   */
  async findAllPublic(
    page: number = 1,
    limit: number = 10,
    type?: EventType,
    status?: EventStatus,
    centerId?: string,
  ): Promise<{
    data: Event[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const query = this.eventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.center', 'center');

    // Apply filters
    if (type) {
      query.andWhere('event.type = :type', { type });
    }

    if (status) {
      query.andWhere('event.status = :status', { status });
    }

    if (centerId) {
      query.andWhere('event.centerId = :centerId', { centerId });
    }

    // Order by event date (upcoming first, then descending for past)
    query.orderBy('event.eventDate', 'DESC');

    // Pagination
    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    const [data, total] = await query.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Get a single public event by ID
   * GET /events/public/:id
   */
  async findOnePublic(id: string): Promise<Event> {
    const event = await this.eventRepository.findOne({
      where: { id },
      relations: ['center'],
    });

    if (!event) {
      throw new NotFoundException(`Event with ID "${id}" not found`);
    }

    return event;
  }

  /**
   * Get the ongoing event (currently happening)
   * GET /events/public/ongoing
   */
  async findOngoingEvent(): Promise<Event | null> {
    const event = await this.eventRepository.findOne({
      where: { status: EventStatus.ONGOING },
      relations: ['center'],
      order: { eventDate: 'DESC' },
    });

    return event || null;
  }

  /**
   * Get the next upcoming event (soonest)
   * GET /events/public/upcoming
   */
  async findNextUpcomingEvent(): Promise<Event | null> {
    const now = new Date();

    const event = await this.eventRepository.findOne({
      where: { status: EventStatus.UPCOMING },
      relations: ['center'],
      order: { eventDate: 'ASC' },
    });

    return event || null;
  }

  /**
   * Get list of upcoming events
   * GET /events/public/upcoming-list
   */
  async findUpcomingEvents(limit: number = 10): Promise<Event[]> {
    const now = new Date();

    const events = await this.eventRepository.find({
      where: { status: EventStatus.UPCOMING },
      relations: ['center'],
      order: { eventDate: 'ASC' },
      take: limit,
    });

    return events;
  }

  /**
   * Get list of past events (replays)
   * GET /events/public/past
   */
  async findPastEvents(
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: Event[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const query = this.eventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.center', 'center')
      .where('event.status = :status', { status: EventStatus.PAST })
      .orderBy('event.eventDate', 'DESC');

    // Pagination
    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    const [data, total] = await query.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
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

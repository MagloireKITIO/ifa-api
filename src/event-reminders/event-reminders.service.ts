import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventReminder } from '../entities/event-reminder.entity';
import { Event } from '../entities/event.entity';
import { CreateEventReminderDto } from './dto';

@Injectable()
export class EventRemindersService {
  constructor(
    @InjectRepository(EventReminder)
    private readonly eventReminderRepository: Repository<EventReminder>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

  /**
   * Create a reminder for an event (1 hour before)
   */
  async create(userId: string, createDto: CreateEventReminderDto) {
    const { eventId } = createDto;

    // Verify event exists
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    // Check if event is upcoming
    if (event.status !== 'upcoming') {
      throw new BadRequestException(
        'Can only set reminders for upcoming events',
      );
    }

    // Check if event is at least 1 hour in the future
    const oneHourFromNow = new Date();
    oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);

    if (event.eventDate < oneHourFromNow) {
      throw new BadRequestException(
        'Event is less than 1 hour away, too late to set reminder',
      );
    }

    // Check if reminder already exists
    const existingReminder = await this.eventReminderRepository.findOne({
      where: { userId, eventId },
    });

    if (existingReminder) {
      throw new ConflictException('Reminder already exists for this event');
    }

    // Calculate reminder time (1 hour before event)
    const scheduledFor = new Date(event.eventDate);
    scheduledFor.setHours(scheduledFor.getHours() - 1);

    // Create reminder
    const reminder = this.eventReminderRepository.create({
      userId,
      eventId,
      scheduledFor,
      sent: false,
    });

    return this.eventReminderRepository.save(reminder);
  }

  /**
   * Get all reminders for a user
   */
  async findAllByUser(userId: string) {
    return this.eventReminderRepository.find({
      where: { userId },
      relations: ['event', 'event.center'],
      order: { scheduledFor: 'ASC' },
    });
  }

  /**
   * Check if user has a reminder for a specific event
   */
  async findOne(userId: string, eventId: string) {
    return this.eventReminderRepository.findOne({
      where: { userId, eventId },
      relations: ['event'],
    });
  }

  /**
   * Delete a reminder
   */
  async remove(userId: string, eventId: string) {
    const reminder = await this.eventReminderRepository.findOne({
      where: { userId, eventId },
    });

    if (!reminder) {
      throw new NotFoundException('Reminder not found');
    }

    await this.eventReminderRepository.remove(reminder);
  }

  /**
   * Get all pending reminders that need to be sent (for cron job)
   */
  async findPendingReminders() {
    const now = new Date();

    return this.eventReminderRepository.find({
      where: {
        sent: false,
      },
      relations: ['user', 'event'],
      order: { scheduledFor: 'ASC' },
    });
  }

  /**
   * Mark reminder as sent
   */
  async markAsSent(reminderId: string) {
    await this.eventReminderRepository.update(reminderId, {
      sent: true,
      sentAt: new Date(),
    });
  }
}

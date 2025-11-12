import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventRemindersService } from './event-reminders.service';
import { EventRemindersController } from './event-reminders.controller';
import { EventRemindersSchedulerService } from './event-reminders-scheduler.service';
import { EventReminder } from '../entities/event-reminder.entity';
import { Event } from '../entities/event.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EventReminder, Event]),
    NotificationsModule,
  ],
  controllers: [EventRemindersController],
  providers: [EventRemindersService, EventRemindersSchedulerService],
  exports: [EventRemindersService],
})
export class EventRemindersModule {}

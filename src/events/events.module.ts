import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsController } from './events.controller';
import { EventsPublicController } from './events-public.controller';
import { EventsService } from './events.service';
import { Event } from '../entities/event.entity';
import { AdminActivityLog } from '../entities/admin-activity-log.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, AdminActivityLog]),
    forwardRef(() => NotificationsModule), // For NotificationsService
  ],
  controllers: [
    EventsController, // Admin endpoints (protected)
    EventsPublicController, // Public endpoints for mobile app
  ],
  providers: [EventsService],
  exports: [EventsService], // Export for use in other modules (e.g., notifications)
})
export class EventsModule {}

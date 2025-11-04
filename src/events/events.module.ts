import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { Event } from '../entities/event.entity';
import { AdminActivityLog } from '../entities/admin-activity-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Event, AdminActivityLog])],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService], // Export for use in other modules (e.g., notifications)
})
export class EventsModule {}

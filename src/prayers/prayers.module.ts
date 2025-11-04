import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrayersController } from './prayers.controller';
import { PrayersService } from './prayers.service';
import { Prayer } from '../entities/prayer.entity';
import { PrayerReaction } from '../entities/prayer-reaction.entity';
import { AdminActivityLog } from '../entities/admin-activity-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Prayer, PrayerReaction, AdminActivityLog]),
  ],
  controllers: [PrayersController],
  providers: [PrayersService],
  exports: [PrayersService], // Export for use in other modules (e.g., notifications)
})
export class PrayersModule {}

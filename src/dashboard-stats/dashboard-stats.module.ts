import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardStatsController } from './dashboard-stats.controller';
import { DashboardStatsService } from './dashboard-stats.service';
import { Event } from '../entities/event.entity';
import { Testimony } from '../entities/testimony.entity';
import { Prayer } from '../entities/prayer.entity';
import { Donation } from '../entities/donation.entity';
import { AdminActivityLog } from '../entities/admin-activity-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Event,
      Testimony,
      Prayer,
      Donation,
      AdminActivityLog,
    ]),
  ],
  controllers: [DashboardStatsController],
  providers: [DashboardStatsService],
  exports: [DashboardStatsService],
})
export class DashboardStatsModule {}

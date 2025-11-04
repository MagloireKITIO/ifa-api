import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestimoniesController } from './testimonies.controller';
import { TestimoniesService } from './testimonies.service';
import { Testimony } from '../entities/testimony.entity';
import { AdminActivityLog } from '../entities/admin-activity-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Testimony, AdminActivityLog])],
  controllers: [TestimoniesController],
  providers: [TestimoniesService],
  exports: [TestimoniesService], // Export for use in other modules (e.g., notifications)
})
export class TestimoniesModule {}

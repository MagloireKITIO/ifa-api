import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CentersController } from './centers.controller';
import { CentersPublicController } from './centers-public.controller';
import { CentersService } from './centers.service';
import { Center } from '../entities/center.entity';
import { AdminActivityLog } from '../entities/admin-activity-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Center, AdminActivityLog])],
  controllers: [
    CentersController,        // Admin endpoints
    CentersPublicController,  // Public endpoints (mobile app)
  ],
  providers: [CentersService],
  exports: [CentersService], // Export for use in other modules
})
export class CentersModule {}

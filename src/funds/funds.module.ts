import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FundsController } from './funds.controller';
import { FundsPublicController } from './funds-public.controller';
import { FundsService } from './funds.service';
import { Fund } from '../entities/fund.entity';
import { AdminActivityLog } from '../entities/admin-activity-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Fund, AdminActivityLog])],
  controllers: [
    FundsController,        // Admin endpoints
    FundsPublicController,  // Public endpoints (mobile app)
  ],
  providers: [FundsService],
  exports: [FundsService], // Export for use in donations and withdrawals modules
})
export class FundsModule {}

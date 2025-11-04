import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WithdrawalsController } from './withdrawals.controller';
import { WithdrawalsService } from './withdrawals.service';
import { Withdrawal } from '../entities/withdrawal.entity';
import { Fund } from '../entities/fund.entity';
import { AdminActivityLog } from '../entities/admin-activity-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Withdrawal, Fund, AdminActivityLog])],
  controllers: [WithdrawalsController],
  providers: [WithdrawalsService],
  exports: [WithdrawalsService], // Export for use in other modules
})
export class WithdrawalsModule {}

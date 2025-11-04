import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DonationsController } from './donations.controller';
import { DonationsService } from './donations.service';
import { Donation } from '../entities/donation.entity';
import { Fund } from '../entities/fund.entity';
import { AdminActivityLog } from '../entities/admin-activity-log.entity';
import { NotchPayService } from '../common/services';
import { SettingsModule } from '../settings/settings.module';
import { FundsModule } from '../funds/funds.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Donation, Fund, AdminActivityLog]),
    SettingsModule, // For ConfigurationService (NotchPay config)
    FundsModule, // For FundsService
  ],
  controllers: [DonationsController],
  providers: [DonationsService, NotchPayService],
  exports: [DonationsService], // Export for use in other modules
})
export class DonationsModule {}

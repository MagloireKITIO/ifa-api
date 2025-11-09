import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsController } from './settings.controller';
import { BeneficiariesController } from './beneficiaries.controller';
import { ConfigurationService, SettingsService } from './services';
import { BeneficiariesService } from './services/beneficiaries.service';
import { NotchPayService } from '../common/services';
import { AppSettings } from '../entities/app-settings.entity';
import { AdminActivityLog } from '../entities/admin-activity-log.entity';
import { Beneficiary } from '../entities/beneficiary.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AppSettings, AdminActivityLog, Beneficiary]),
  ],
  controllers: [SettingsController, BeneficiariesController],
  providers: [
    ConfigurationService,
    SettingsService,
    BeneficiariesService,
    NotchPayService,
  ],
  exports: [ConfigurationService, SettingsService, BeneficiariesService], // Export for use in other modules
})
export class SettingsModule {}

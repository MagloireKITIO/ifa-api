import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsController } from './settings.controller';
import { BeneficiariesController } from './beneficiaries.controller';
import { ConfigurationService, SettingsService } from './services';
import { NotchPayService } from '../common/services';
import { AppSettings } from '../entities/app-settings.entity';
import { AdminActivityLog } from '../entities/admin-activity-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AppSettings, AdminActivityLog])],
  controllers: [SettingsController, BeneficiariesController],
  providers: [ConfigurationService, SettingsService, NotchPayService],
  exports: [ConfigurationService, SettingsService], // Export for use in other modules
})
export class SettingsModule {}

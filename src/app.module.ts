import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import envConfig from './config/env.config';
import { typeOrmAsyncConfig } from './config/typeorm.config';
import { AdminsModule } from './admins/admins.module';
import { AuthAdminModule } from './auth-admin/auth-admin.module';
import { AuthUserModule } from './auth-user/auth-user.module';
import { DatabaseModule } from './database/database.module';
import { SettingsModule } from './settings/settings.module';
import { EventsModule } from './events/events.module';
import { TestimoniesModule } from './testimonies/testimonies.module';
import { FundsModule } from './funds/funds.module';
import { DonationsModule } from './donations/donations.module';
import { WithdrawalsModule } from './withdrawals/withdrawals.module';
import { PrayersModule } from './prayers/prayers.module';
import { NotificationsModule } from './notifications/notifications.module';
import { NotificationTemplatesModule } from './notification-templates/notification-templates.module';
import { DashboardStatsModule } from './dashboard-stats/dashboard-stats.module';
import { UsersModule } from './users/users.module';
import { CentersModule } from './centers/centers.module';

@Module({
  imports: [
    // Configuration Module
    ConfigModule.forRoot({
      isGlobal: true, // Rend le ConfigModule disponible dans toute l'application
      load: [envConfig], // Charge la configuration depuis env.config.ts
      envFilePath: '.env', // Chemin du fichier .env
      cache: true, // Cache la configuration pour de meilleures performances
    }),

    // TypeORM Module
    TypeOrmModule.forRootAsync(typeOrmAsyncConfig),

    // Schedule Module (for cron jobs)
    ScheduleModule.forRoot(),

    // Database Module (Seeding)
    DatabaseModule,

    // Feature Modules
    AdminsModule,
    AuthAdminModule,
    AuthUserModule,
    UsersModule, // Module Users pour mobile app
    SettingsModule,
    EventsModule,
    TestimoniesModule,
    FundsModule,
    DonationsModule,
    WithdrawalsModule,
    PrayersModule,
    CentersModule, // Module Centers pour admin & mobile app
    NotificationsModule,
    NotificationTemplatesModule,
    DashboardStatsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

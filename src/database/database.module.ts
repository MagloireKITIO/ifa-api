import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { AdminsModule } from '../admins/admins.module';
import { NotificationTemplate } from '../entities/notification-template.entity';

@Module({
  imports: [
    AdminsModule,
    TypeOrmModule.forFeature([NotificationTemplate]),
  ],
  providers: [SeedService],
  exports: [SeedService],
})
export class DatabaseModule {}

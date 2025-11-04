import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';
import { AdminsModule } from '../admins/admins.module';

@Module({
  imports: [AdminsModule],
  providers: [SeedService],
  exports: [SeedService],
})
export class DatabaseModule {}

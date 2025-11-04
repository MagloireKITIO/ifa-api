import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthAdminService } from './auth-admin.service';
import { AuthAdminController } from './auth-admin.controller';
import { AdminsModule } from '../admins/admins.module';
import { AdminActivityLog } from '../entities/admin-activity-log.entity';
import { JwtAdminStrategy } from './strategies/jwt-admin.strategy';
import { JwtAdminRefreshStrategy } from './strategies/jwt-admin-refresh.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}), // Configuration dynamique dans le service
    TypeOrmModule.forFeature([AdminActivityLog]),
    AdminsModule, // Import pour utiliser AdminsService
  ],
  providers: [
    AuthAdminService,
    JwtAdminStrategy,
    JwtAdminRefreshStrategy,
  ],
  controllers: [AuthAdminController],
  exports: [AuthAdminService], // Export pour utilisation dans d'autres modules si nécessaire
})
export class AuthAdminModule {}

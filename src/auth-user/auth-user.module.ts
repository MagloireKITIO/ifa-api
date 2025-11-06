import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthUserService } from './auth-user.service';
import { AuthUserController } from './auth-user.controller';
import { User } from '../entities/user.entity';
import { FCMToken } from '../entities/fcm-token.entity';
import { JwtUserStrategy, JwtUserRefreshStrategy } from './strategies';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}), // Configuration dynamique dans le service
    TypeOrmModule.forFeature([User, FCMToken]),
    SettingsModule, // Import pour utiliser ConfigurationService
  ],
  providers: [AuthUserService, JwtUserStrategy, JwtUserRefreshStrategy],
  controllers: [AuthUserController],
  exports: [AuthUserService], // Export pour utilisation dans d'autres modules si nécessaire
})
export class AuthUserModule {}

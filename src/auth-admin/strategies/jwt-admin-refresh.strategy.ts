import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AdminsService } from '../../admins/admins.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtAdminRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-admin-refresh',
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly adminsService: AdminsService,
  ) {
    const secret = configService.get<string>('JWT_ADMIN_REFRESH_SECRET');

    if (!secret) {
      throw new Error('JWT_ADMIN_REFRESH_SECRET is not defined in environment variables');
    }

    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    // Verify token type
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Fetch admin from database
    const admin = await this.adminsService.findById(payload.sub);

    // Check if admin is active
    if (!admin.isActive) {
      throw new UnauthorizedException('Admin account is inactive');
    }

    // Return admin (will be attached to request.user)
    return admin;
  }
}

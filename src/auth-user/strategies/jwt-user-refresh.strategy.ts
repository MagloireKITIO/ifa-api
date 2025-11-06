import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { JwtUserPayload } from '../interfaces';

@Injectable()
export class JwtUserRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-user-refresh',
) {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    const secret = configService.get<string>('JWT_USER_REFRESH_SECRET');
    if (!secret) {
      throw new Error('JWT_USER_REFRESH_SECRET is not defined');
    }
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtUserPayload): Promise<User> {
    // Verify payload type
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Find user by ID
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      relations: ['center'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}

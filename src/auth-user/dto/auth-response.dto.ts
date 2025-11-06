import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../entities/user.entity';

export class AuthUserResponseDto {
  @ApiProperty({
    description: 'Authenticated user data',
    type: () => User,
  })
  user: User;

  @ApiProperty({
    description: 'JWT access token (expires in 7 days)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT refresh token (expires in 30 days)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Whether the user needs to complete their profile',
    example: false,
  })
  needsProfileCompletion: boolean;
}

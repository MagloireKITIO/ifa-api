import { ApiProperty } from '@nestjs/swagger';
import { Admin } from '../../entities/admin.entity';

export class AuthResponseDto {
  @ApiProperty({
    description: 'Authenticated admin (without password)',
  })
  admin: Partial<Admin>;

  @ApiProperty({
    description: 'Access token (expires in 1 day)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Refresh token (expires in 7 days)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;
}

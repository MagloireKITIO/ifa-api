import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdminRole } from '../../common/enums';

export class AdminResponseDto {
  @ApiProperty({
    description: 'Admin unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Admin email address',
    example: 'admin@ifa.church',
  })
  email: string;

  @ApiProperty({
    description: 'Admin first name',
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    description: 'Admin last name',
    example: 'Doe',
  })
  lastName: string;

  @ApiProperty({
    description: 'Admin full name',
    example: 'John Doe',
  })
  fullName: string;

  @ApiProperty({
    description: 'Admin role',
    enum: AdminRole,
    example: AdminRole.ADMIN,
  })
  role: AdminRole;

  @ApiProperty({
    description: 'Array of permission strings for granular access control',
    example: ['events:read', 'events:create', 'testimonies:moderate'],
    type: [String],
  })
  permissions: string[];

  @ApiPropertyOptional({
    description: 'Last login timestamp',
    example: '2024-01-15T10:30:00Z',
    nullable: true,
  })
  lastLoginAt: Date | null;

  @ApiProperty({
    description: 'Whether the admin account is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: Date;
}

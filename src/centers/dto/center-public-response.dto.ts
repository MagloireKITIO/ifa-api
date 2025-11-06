import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for public center response (mobile app)
 */
export class CenterPublicResponseDto {
  @ApiProperty({
    description: 'Center ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Center name in French',
    example: 'IFA Yaoundé',
  })
  nameFr: string;

  @ApiProperty({
    description: 'Center name in English',
    example: 'IFA Yaounde',
  })
  nameEn: string;

  @ApiProperty({
    description: 'Full address',
    example: 'Quartier Bastos, Avenue Charles de Gaulle',
  })
  address: string;

  @ApiProperty({
    description: 'City',
    example: 'Yaoundé',
  })
  city: string;

  @ApiProperty({
    description: 'Country',
    example: 'Cameroun',
  })
  country: string;

  @ApiPropertyOptional({
    description: 'Latitude (for map integration)',
    example: 3.8667,
  })
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude (for map integration)',
    example: 11.5167,
  })
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+237 6 XX XX XX XX',
  })
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Email address',
    example: 'yaounde@ifa.church',
  })
  email?: string;

  @ApiPropertyOptional({
    description: 'Description in French',
    example: 'Centre IFA de Yaoundé, situé au cœur de Bastos',
  })
  descriptionFr?: string;

  @ApiPropertyOptional({
    description: 'Description in English',
    example: 'IFA Center in Yaounde, located in the heart of Bastos',
  })
  descriptionEn?: string;

  @ApiPropertyOptional({
    description: 'Service schedules',
    example: {
      sunday: '9h00 - 12h00',
      wednesday: '18h00 - 20h00',
    },
  })
  schedules?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Cover image URL',
    example: 'https://storage.example.com/centers/yaounde.jpg',
  })
  coverImage?: string;

  @ApiProperty({
    description: 'Creation date',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt: Date;
}

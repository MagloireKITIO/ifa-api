import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsNumber,
  IsBoolean,
  MaxLength,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a new center (Admin)
 */
export class CreateCenterDto {
  @ApiProperty({
    description: 'Center name in French',
    example: 'IFA Yaoundé',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nameFr: string;

  @ApiProperty({
    description: 'Center name in English',
    example: 'IFA Yaounde',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nameEn: string;

  @ApiProperty({
    description: 'Full address',
    example: 'Quartier Bastos, Avenue Charles de Gaulle',
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({
    description: 'City',
    example: 'Yaoundé',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @ApiProperty({
    description: 'Country',
    example: 'Cameroun',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  country: string;

  @ApiPropertyOptional({
    description: 'Latitude (for map integration)',
    example: 3.8667,
  })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude (for map integration)',
    example: 11.5167,
  })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+237 6 XX XX XX XX',
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Email address',
    example: 'yaounde@ifa.church',
  })
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    description: 'Description in French',
    example: 'Centre IFA de Yaoundé, situé au cœur de Bastos',
  })
  @IsString()
  @IsOptional()
  descriptionFr?: string;

  @ApiPropertyOptional({
    description: 'Description in English',
    example: 'IFA Center in Yaounde, located in the heart of Bastos',
  })
  @IsString()
  @IsOptional()
  descriptionEn?: string;

  @ApiPropertyOptional({
    description: 'Service schedules (JSON format)',
    example: {
      sunday: '9h00 - 12h00',
      wednesday: '18h00 - 20h00',
    },
  })
  @IsObject()
  @IsOptional()
  schedules?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Cover image URL',
    example: 'https://storage.example.com/centers/yaounde.jpg',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  coverImage?: string;

  @ApiPropertyOptional({
    description: 'Whether the center is active',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

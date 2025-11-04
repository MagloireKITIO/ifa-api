import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsUrl,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for general application settings
 */
export class GeneralSettingsDto {
  @ApiProperty({
    description: 'Application name',
    example: 'IFA Church',
  })
  @IsString()
  @IsNotEmpty()
  appName: string;

  @ApiPropertyOptional({
    description: 'Application URL (mobile app or website)',
    example: 'https://app.ifa.church',
  })
  @IsUrl()
  @IsOptional()
  appUrl?: string;

  @ApiPropertyOptional({
    description: 'Admin dashboard URL',
    example: 'https://admin.ifa.church',
  })
  @IsUrl()
  @IsOptional()
  adminUrl?: string;

  @ApiProperty({
    description: 'Support email address',
    example: 'support@ifa.church',
  })
  @IsEmail()
  @IsNotEmpty()
  supportEmail: string;

  @ApiPropertyOptional({
    description: 'Application description (French)',
    example: 'Application mobile de l\'église IFA',
  })
  @IsString()
  @IsOptional()
  descriptionFr?: string;

  @ApiPropertyOptional({
    description: 'Application description (English)',
    example: 'IFA Church mobile application',
  })
  @IsString()
  @IsOptional()
  descriptionEn?: string;

  @ApiPropertyOptional({
    description: 'Application logo URL',
    example: 'https://cdn.ifa.church/logo.png',
  })
  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Default timezone',
    example: 'Africa/Douala',
  })
  @IsString()
  @IsOptional()
  timezone?: string;
}

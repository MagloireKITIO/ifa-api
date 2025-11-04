import {
  IsString,
  IsNotEmpty,
  IsUrl,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for Supabase storage configuration settings
 */
export class SupabaseSettingsDto {
  @ApiProperty({
    description: 'Supabase project URL',
    example: 'https://xxxxxxxxxxxxx.supabase.co',
  })
  @IsUrl()
  @IsNotEmpty()
  url: string;

  @ApiProperty({
    description: 'Supabase anonymous key (public key)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  anonKey: string;

  @ApiProperty({
    description: 'Supabase service role key (secret key)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  serviceRoleKey: string;

  @ApiPropertyOptional({
    description: 'Storage bucket name for file uploads',
    example: 'ifa-uploads',
  })
  @IsString()
  @IsOptional()
  storageBucket?: string;

  @ApiPropertyOptional({
    description: 'Maximum file size in bytes (default: 5MB)',
    example: 5242880,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxFileSize?: number;
}

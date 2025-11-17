import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
  IsUrl,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FundType } from '../../common/enums';

/**
 * DTO for creating a new fund/campaign
 */
export class CreateFundDto {
  @ApiProperty({
    description: 'Fund title in French',
    example: 'Dîme Mensuelle',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  titleFr: string;

  @ApiProperty({
    description: 'Fund title in English',
    example: 'Monthly Tithe',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  titleEn: string;

  @ApiPropertyOptional({
    description: 'URL-friendly slug for payment links (auto-generated from titleEn if not provided)',
    example: 'monthly-tithe-2025',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  slug?: string;

  @ApiPropertyOptional({
    description: 'Fund description in French',
    example: 'Soutenez l\'œuvre de Dieu par votre dîme mensuelle.',
  })
  @IsString()
  @IsOptional()
  descriptionFr?: string;

  @ApiPropertyOptional({
    description: 'Fund description in English',
    example: 'Support God\'s work through your monthly tithe.',
  })
  @IsString()
  @IsOptional()
  descriptionEn?: string;

  @ApiProperty({
    description: 'Type of fund',
    enum: FundType,
    example: FundType.TITHE,
  })
  @IsEnum(FundType)
  @IsNotEmpty()
  type: FundType;

  @ApiPropertyOptional({
    description: 'Target amount for campaigns (required for campaigns, null for tithe/offering)',
    example: 50000000,
    minimum: 0,
  })
  @ValidateIf((o) => o.type === FundType.CAMPAIGN)
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  targetAmount?: number;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'XAF',
    default: 'XAF',
    maxLength: 3,
  })
  @IsString()
  @IsOptional()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({
    description: 'Start date for campaigns (required for campaigns)',
    example: '2025-01-01T00:00:00Z',
  })
  @ValidateIf((o) => o.type === FundType.CAMPAIGN)
  @IsDateString()
  @IsNotEmpty()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for campaigns (required for campaigns)',
    example: '2025-12-31T23:59:59Z',
  })
  @ValidateIf((o) => o.type === FundType.CAMPAIGN)
  @IsDateString()
  @IsNotEmpty()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'URL of the fund cover image',
    example: 'https://storage.supabase.co/funds/cover-123.jpg',
    maxLength: 500,
  })
  @IsUrl()
  @IsOptional()
  @MaxLength(500)
  coverImage?: string;
}

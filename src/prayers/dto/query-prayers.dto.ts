import {
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PrayerStatus, Language } from '../../common/enums';
import { Transform } from 'class-transformer';

/**
 * DTO for querying prayers with filters
 */
export class QueryPrayersDto {
  @ApiPropertyOptional({
    description: 'Filter by prayer status',
    enum: PrayerStatus,
    example: PrayerStatus.ACTIVE,
  })
  @IsEnum(PrayerStatus)
  @IsOptional()
  status?: PrayerStatus;

  @ApiPropertyOptional({
    description: 'Filter by anonymous prayers',
    example: true,
  })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by language',
    enum: Language,
    example: Language.FR,
  })
  @IsEnum(Language)
  @IsOptional()
  language?: Language;

  @ApiPropertyOptional({
    description: 'Filter prayers from this date (ISO 8601)',
    example: '2025-01-01T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Filter prayers until this date (ISO 8601)',
    example: '2025-12-31T23:59:59Z',
  })
  @IsDateString()
  @IsOptional()
  toDate?: string;

  @ApiPropertyOptional({
    description: 'Search query for content (both languages)',
    example: 'guérison',
  })
  @IsString()
  @IsOptional()
  search?: string;
}

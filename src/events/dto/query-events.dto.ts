import {
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  IsString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EventType, EventStatus, Language } from '../../common/enums';

/**
 * DTO for querying events with filters
 */
export class QueryEventsDto {
  @ApiPropertyOptional({
    description: 'Filter by event type',
    enum: EventType,
    example: EventType.SUNDAY_SERVICE,
  })
  @IsEnum(EventType)
  @IsOptional()
  type?: EventType;

  @ApiPropertyOptional({
    description: 'Filter by event status',
    enum: EventStatus,
    example: EventStatus.UPCOMING,
  })
  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;

  @ApiPropertyOptional({
    description: 'Filter by center ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsOptional()
  centerId?: string;

  @ApiPropertyOptional({
    description: 'Filter events from this date (ISO 8601)',
    example: '2025-01-01T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Filter events until this date (ISO 8601)',
    example: '2025-12-31T23:59:59Z',
  })
  @IsDateString()
  @IsOptional()
  toDate?: string;

  @ApiPropertyOptional({
    description: 'Preferred language for multilingual fields',
    enum: Language,
    example: Language.FR,
  })
  @IsEnum(Language)
  @IsOptional()
  language?: Language;

  @ApiPropertyOptional({
    description: 'Search query for title (both languages)',
    example: 'croisade',
  })
  @IsString()
  @IsOptional()
  search?: string;
}

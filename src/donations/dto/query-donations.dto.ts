import {
  IsEnum,
  IsOptional,
  IsUUID,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DonationStatus } from '../../common/enums';

/**
 * DTO for querying donations with filters
 */
export class QueryDonationsDto {
  @ApiPropertyOptional({
    description: 'Filter by fund ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsOptional()
  fundId?: string;

  @ApiPropertyOptional({
    description: 'Filter by user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by donation status',
    enum: DonationStatus,
    example: DonationStatus.COMPLETED,
  })
  @IsEnum(DonationStatus)
  @IsOptional()
  status?: DonationStatus;

  @ApiPropertyOptional({
    description: 'Filter donations from this date',
    example: '2025-01-01',
  })
  @IsDateString()
  @IsOptional()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Filter donations until this date',
    example: '2025-12-31',
  })
  @IsDateString()
  @IsOptional()
  toDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by anonymous donations',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by recurring donations',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;
}

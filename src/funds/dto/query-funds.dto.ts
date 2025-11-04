import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { FundType, FundStatus } from '../../common/enums';

/**
 * DTO for querying funds with filters
 */
export class QueryFundsDto {
  @ApiPropertyOptional({
    description: 'Filter by fund type',
    enum: FundType,
    example: FundType.CAMPAIGN,
  })
  @IsEnum(FundType)
  @IsOptional()
  type?: FundType;

  @ApiPropertyOptional({
    description: 'Filter by fund status',
    enum: FundStatus,
    example: FundStatus.ACTIVE,
  })
  @IsEnum(FundStatus)
  @IsOptional()
  status?: FundStatus;

  @ApiPropertyOptional({
    description: 'Search in fund title (both languages)',
    example: 'mission',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter campaigns starting from this date',
    example: '2025-01-01',
  })
  @IsDateString()
  @IsOptional()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Filter campaigns ending before this date',
    example: '2025-12-31',
  })
  @IsDateString()
  @IsOptional()
  toDate?: string;
}

import { IsUUID, IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for querying withdrawals with filters
 */
export class QueryWithdrawalsDto {
  @ApiPropertyOptional({
    description: 'Filter by fund ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsOptional()
  fundId?: string;

  @ApiPropertyOptional({
    description: 'Filter by admin who made the withdrawal',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsOptional()
  createdById?: string;

  @ApiPropertyOptional({
    description: 'Filter withdrawals from this date',
    example: '2025-01-01',
  })
  @IsDateString()
  @IsOptional()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Filter withdrawals until this date',
    example: '2025-12-31',
  })
  @IsDateString()
  @IsOptional()
  toDate?: string;
}

import { IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetStatsDto {
  @ApiPropertyOptional({
    description: 'Start date for filtering donations (this month)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'End date for filtering donations (this month)',
    example: '2024-01-31',
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}

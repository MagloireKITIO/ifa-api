import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for querying public centers (mobile app)
 */
export class QueryPublicCentersDto {
  @ApiPropertyOptional({
    description: 'Filter by city',
    example: 'Yaoundé',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'Filter by country',
    example: 'Cameroun',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    description: 'User latitude (for nearby search)',
    example: 3.8667,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({
    description: 'User longitude (for nearby search)',
    example: 11.5167,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;
}

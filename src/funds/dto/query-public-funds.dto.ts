import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { FundType } from '../../common/enums';

/**
 * DTO for querying public funds (mobile app)
 * Only active funds are returned
 */
export class QueryPublicFundsDto {
  @ApiPropertyOptional({
    description: 'Filter by fund type',
    enum: FundType,
    example: FundType.CAMPAIGN,
  })
  @IsOptional()
  @IsEnum(FundType)
  type?: FundType;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 10,
    minimum: 1,
    maximum: 50,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

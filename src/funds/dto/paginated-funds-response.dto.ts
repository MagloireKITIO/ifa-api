import { ApiProperty } from '@nestjs/swagger';
import { FundPublicResponseDto } from './fund-public-response.dto';

/**
 * DTO for paginated funds response (mobile app)
 */
export class PaginatedFundsResponseDto {
  @ApiProperty({
    description: 'List of funds',
    type: [FundPublicResponseDto],
  })
  data: FundPublicResponseDto[];

  @ApiProperty({
    description: 'Total number of items',
    example: 25,
  })
  total: number;

  @ApiProperty({
    description: 'Current page',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Items per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total pages',
    example: 3,
  })
  totalPages: number;
}

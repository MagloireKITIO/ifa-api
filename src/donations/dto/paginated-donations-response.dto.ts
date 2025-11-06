import { ApiProperty } from '@nestjs/swagger';
import { DonationUserResponseDto } from './donation-user-response.dto';

/**
 * DTO for paginated donations response (mobile app)
 */
export class PaginatedDonationsResponseDto {
  @ApiProperty({
    description: 'List of donations',
    type: [DonationUserResponseDto],
  })
  data: DonationUserResponseDto[];

  @ApiProperty({
    description: 'Total number of items',
    example: 15,
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
    example: 2,
  })
  totalPages: number;
}

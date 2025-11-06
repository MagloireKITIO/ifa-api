import { ApiProperty } from '@nestjs/swagger';
import { PrayerPublicResponseDto } from './prayer-public-response.dto';

/**
 * DTO de réponse paginée pour les prières
 */
export class PaginatedPrayersResponseDto {
  @ApiProperty({
    description: 'Liste des prières',
    type: [PrayerPublicResponseDto],
  })
  data: PrayerPublicResponseDto[];

  @ApiProperty({
    description: 'Métadonnées de pagination',
  })
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

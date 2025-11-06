import { ApiProperty } from '@nestjs/swagger';
import { TestimonyPublicResponseDto } from './testimony-public-response.dto';

/**
 * DTO de réponse paginée pour les témoignages
 */
export class PaginatedTestimoniesResponseDto {
  @ApiProperty({
    description: 'Liste des témoignages',
    type: [TestimonyPublicResponseDto],
  })
  data: TestimonyPublicResponseDto[];

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

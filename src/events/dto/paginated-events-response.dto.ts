import { ApiProperty } from '@nestjs/swagger';
import { EventPublicResponseDto } from './event-public-response.dto';

/**
 * DTO de réponse paginée pour les événements publics
 */
export class PaginatedEventsResponseDto {
  @ApiProperty({
    description: 'Liste des événements',
    type: [EventPublicResponseDto],
  })
  data: EventPublicResponseDto[];

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

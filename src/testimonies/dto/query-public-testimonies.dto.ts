import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO pour filtrer les témoignages publics (mobile app)
 * Endpoint: GET /testimonies/public
 *
 * LOGIQUE :
 * - Les témoignages publics sont uniquement les APPROVED
 * - Pagination pour réduire la charge réseau
 * - Triés par date d'approbation (plus récents d'abord)
 */
export class QueryPublicTestimoniesDto {
  @ApiPropertyOptional({
    description: 'Numéro de page (pagination)',
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
    description: 'Nombre d\'éléments par page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

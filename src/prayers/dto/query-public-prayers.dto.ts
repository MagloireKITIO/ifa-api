import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PrayerStatus } from '../../common/enums';

/**
 * DTO pour filtrer les prières publiques (mobile app)
 * Endpoint: GET /prayers/public
 *
 * LOGIQUE :
 * - Les prières publiques sont visibles par tous (pas d'auth requise)
 * - Filtrage par statut (active, answered)
 * - Pagination pour réduire la charge réseau
 */
export class QueryPublicPrayersDto {
  @ApiPropertyOptional({
    description: 'Filtrer par statut',
    enum: PrayerStatus,
    example: PrayerStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(PrayerStatus)
  status?: PrayerStatus;

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

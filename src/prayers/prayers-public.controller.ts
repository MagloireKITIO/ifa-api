import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { PrayersService } from './prayers.service';
import {
  QueryPublicPrayersDto,
  PrayerPublicResponseDto,
  PaginatedPrayersResponseDto,
} from './dto';
import { Prayer } from '../entities/prayer.entity';

/**
 * Controller pour les endpoints publics des prières (mobile app)
 * Tous les endpoints sont PUBLICS (pas d'authentification requise)
 *
 * LOGIQUE :
 * - Permet aux visiteurs de voir les demandes de prières
 * - Les infos user sont cachées si isAnonymous = true
 * - Pagination pour réduire la charge réseau
 */
@ApiTags('Prayers Public (Mobile)')
@Controller('prayers/public')
export class PrayersPublicController {
  constructor(private readonly prayersService: PrayersService) {}

  /**
   * GET /prayers/public
   * Liste de toutes les prières publiques avec pagination
   */
  @Get()
  @ApiOperation({
    summary: 'Liste des prières publiques',
    description: 'Récupère la liste des prières (par défaut actives) avec pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des prières récupérée avec succès',
    type: PaginatedPrayersResponseDto,
  })
  async findAll(
    @Query() query: QueryPublicPrayersDto,
  ): Promise<PaginatedPrayersResponseDto> {
    const result = await this.prayersService.findAllPublic(
      query.page,
      query.limit,
      query.status,
    );

    return {
      data: result.data.map((prayer) => this.mapToPublicResponse(prayer)),
      meta: result.meta,
    };
  }

  /**
   * GET /prayers/public/:id
   * Détail d'une prière
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Détail d\'une prière',
    description: 'Récupère les détails complets d\'une prière par son ID',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la prière',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Détails de la prière',
    type: PrayerPublicResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Prière non trouvée',
  })
  async findOne(@Param('id') id: string): Promise<PrayerPublicResponseDto> {
    const prayer = await this.prayersService.findOnePublic(id);
    return this.mapToPublicResponse(prayer);
  }

  /**
   * Helper: Mapper Prayer entity vers PrayerPublicResponseDto
   */
  private mapToPublicResponse(prayer: Prayer): PrayerPublicResponseDto {
    return {
      id: prayer.id,
      userId: prayer.userId,
      contentFr: prayer.contentFr,
      contentEn: prayer.contentEn,
      isAnonymous: prayer.isAnonymous,
      status: prayer.status,
      prayedCount: prayer.prayedCount,
      fastedCount: prayer.fastedCount,
      testimonyContentFr: prayer.testimonyContentFr,
      testimonyContentEn: prayer.testimonyContentEn,
      testimoniedAt: prayer.testimoniedAt,
      language: prayer.language,
      user: prayer.user && !prayer.isAnonymous
        ? {
            id: prayer.user.id,
            displayName: prayer.user.displayName,
            photoURL: prayer.user.photoURL,
          }
        : null,
      createdAt: prayer.createdAt,
      updatedAt: prayer.updatedAt,
    };
  }
}

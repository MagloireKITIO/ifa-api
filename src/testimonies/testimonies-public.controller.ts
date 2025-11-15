import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { TestimoniesService } from './testimonies.service';
import {
  QueryPublicTestimoniesDto,
  TestimonyPublicResponseDto,
  PaginatedTestimoniesResponseDto,
} from './dto';
import { Testimony } from '../entities/testimony.entity';

/**
 * Controller pour les endpoints publics des témoignages (mobile app)
 * Tous les endpoints sont PUBLICS (pas d'authentification requise)
 *
 * LOGIQUE :
 * - Permet aux visiteurs de voir les témoignages approuvés
 * - Les infos user sont cachées si isAnonymous = true
 * - Seuls les témoignages APPROVED sont visibles
 */
@ApiTags('Testimonies Public (Mobile)')
@Controller('testimonies/public')
export class TestimoniesPublicController {
  constructor(private readonly testimoniesService: TestimoniesService) {}

  /**
   * GET /testimonies/public
   * Liste de tous les témoignages approuvés avec pagination
   */
  @Get()
  @ApiOperation({
    summary: 'Liste des témoignages approuvés',
    description: 'Récupère la liste des témoignages approuvés avec pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des témoignages récupérée avec succès',
    type: PaginatedTestimoniesResponseDto,
  })
  async findAll(
    @Query() query: QueryPublicTestimoniesDto,
  ): Promise<PaginatedTestimoniesResponseDto> {
    const result = await this.testimoniesService.findAllPublic(
      query.page,
      query.limit,
    );

    return {
      data: result.data.map((testimony) => this.mapToPublicResponse(testimony)),
      meta: result.meta,
    };
  }

  /**
   * GET /testimonies/public/:id
   * Détail d'un témoignage approuvé
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Détail d\'un témoignage',
    description: 'Récupère les détails complets d\'un témoignage approuvé par son ID',
  })
  @ApiParam({
    name: 'id',
    description: 'ID du témoignage',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Détails du témoignage',
    type: TestimonyPublicResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Témoignage non trouvé ou non approuvé',
  })
  async findOne(@Param('id') id: string): Promise<TestimonyPublicResponseDto> {
    const testimony = await this.testimoniesService.findOnePublic(id);
    return this.mapToPublicResponse(testimony);
  }

  /**
   * Helper: Mapper Testimony entity vers TestimonyPublicResponseDto
   */
  private mapToPublicResponse(testimony: Testimony): TestimonyPublicResponseDto {
    return {
      id: testimony.id,
      contentFr: testimony.contentFr,
      contentEn: testimony.contentEn,
      isAnonymous: testimony.isAnonymous,
      language: testimony.language,
      submittedAt: testimony.submittedAt,
      user: testimony.user && !testimony.isAnonymous
        ? {
            id: testimony.user.id,
            displayName: testimony.user.displayName,
            photoURL: testimony.user.photoURL,
          }
        : null,
      createdAt: testimony.createdAt,
      updatedAt: testimony.updatedAt,
    };
  }
}

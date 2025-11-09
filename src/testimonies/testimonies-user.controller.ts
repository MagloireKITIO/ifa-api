import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { TestimoniesService } from './testimonies.service';
import { JwtUserAuthGuard } from '../auth-user/guards';
import { CurrentUser } from '../auth-user/decorators';
import {
  CreateTestimonyDto,
  TestimonyUserResponseDto,
} from './dto';
import { Testimony } from '../entities/testimony.entity';

/**
 * Controller pour les endpoints user des témoignages (mobile app)
 * Toutes les routes sont protégées par JwtUserAuthGuard
 *
 * LOGIQUE :
 * - POST /testimonies : Soumettre un témoignage (créé avec status PENDING)
 * - GET /testimonies/my-testimonies : Voir mes témoignages et leur statut
 * - DELETE /testimonies/:id : Supprimer un témoignage non approuvé
 */
@ApiTags('Testimonies User (Mobile)')
@Controller('user/testimonies')
@UseGuards(JwtUserAuthGuard)
@ApiBearerAuth()
export class TestimoniesUserController {
  constructor(private readonly testimoniesService: TestimoniesService) {}

  /**
   * POST /testimonies
   * Soumettre un témoignage (USER AUTH)
   */
  @Post()
  @ApiOperation({
    summary: 'Soumettre un témoignage',
    description: 'Permet à un utilisateur connecté de soumettre un témoignage (sera en attente de modération)',
  })
  @ApiResponse({
    status: 201,
    description: 'Témoignage soumis avec succès (en attente d\'approbation)',
    type: TestimonyUserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() createTestimonyDto: CreateTestimonyDto,
  ): Promise<TestimonyUserResponseDto> {
    const testimony = await this.testimoniesService.create(
      userId,
      createTestimonyDto,
    );
    return this.mapToUserResponse(testimony);
  }

  /**
   * GET /testimonies/my-testimonies
   * Récupérer mes témoignages (USER AUTH)
   */
  @Get('my-testimonies')
  @ApiOperation({
    summary: 'Mes témoignages',
    description: 'Récupère tous les témoignages soumis par l\'utilisateur connecté (tous statuts)',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste de mes témoignages',
    type: [TestimonyUserResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  async getMyTestimonies(
    @CurrentUser('sub') userId: string,
  ): Promise<TestimonyUserResponseDto[]> {
    const testimonies = await this.testimoniesService.findMyTestimonies(userId);
    return testimonies.map((testimony) => this.mapToUserResponse(testimony));
  }

  /**
   * DELETE /testimonies/:id
   * Supprimer mon témoignage (USER AUTH)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Supprimer mon témoignage',
    description: 'Permet de supprimer un témoignage non approuvé (PENDING ou REJECTED uniquement)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID du témoignage',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Témoignage supprimé avec succès',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Testimony deleted successfully' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 403,
    description: 'Vous ne pouvez supprimer que vos propres témoignages non approuvés',
  })
  @ApiResponse({
    status: 404,
    description: 'Témoignage non trouvé',
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ): Promise<{ message: string }> {
    await this.testimoniesService.removeByUser(id, userId);
    return { message: 'Testimony deleted successfully' };
  }

  /**
   * Helper: Mapper Testimony entity vers TestimonyUserResponseDto
   */
  private mapToUserResponse(testimony: Testimony): TestimonyUserResponseDto {
    return {
      id: testimony.id,
      contentFr: testimony.contentFr,
      contentEn: testimony.contentEn,
      isAnonymous: testimony.isAnonymous,
      status: testimony.status,
      language: testimony.language,
      submittedAt: testimony.submittedAt,
      approvedAt: testimony.approvedAt,
      createdAt: testimony.createdAt,
      updatedAt: testimony.updatedAt,
    };
  }
}

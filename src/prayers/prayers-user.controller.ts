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
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PrayersService } from './prayers.service';
import { JwtUserAuthGuard } from '../auth-user/guards';
import { CurrentUser } from '../auth-user/decorators';
import {
  CreatePrayerDto,
  ReactPrayerDto,
  AddTestimonyDto,
  PrayerPublicResponseDto,
  PrayerUserResponseDto,
  QueryPublicPrayersDto,
} from './dto';
import { Prayer } from '../entities/prayer.entity';

/**
 * Controller pour les endpoints user des prières (mobile app)
 * Toutes les routes sont protégées par JwtUserAuthGuard
 *
 * LOGIQUE :
 * - POST /prayers : Créer une demande de prière
 * - POST /prayers/:id/react : Réagir (prayed ou fasted)
 * - DELETE /prayers/:id/react : Supprimer sa réaction
 * - POST /prayers/:id/testimony : Ajouter un témoignage d'exaucement
 * - GET /prayers/my-prayers : Mes demandes de prière
 */
@ApiTags('Prayers User (Mobile)')
@Controller('user/prayers')
@UseGuards(JwtUserAuthGuard)
@ApiBearerAuth()
export class PrayersUserController {
  constructor(private readonly prayersService: PrayersService) {}

  /**
   * POST /prayers
   * Créer une demande de prière (USER AUTH)
   */
  @Post()
  @ApiOperation({
    summary: 'Créer une demande de prière',
    description: 'Permet à un utilisateur connecté de soumettre une demande de prière',
  })
  @ApiResponse({
    status: 201,
    description: 'Prière créée avec succès',
    type: PrayerPublicResponseDto,
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
    @Body() createPrayerDto: CreatePrayerDto,
  ): Promise<PrayerPublicResponseDto> {
    const prayer = await this.prayersService.create(userId, createPrayerDto);
    return this.mapToPublicResponse(prayer);
  }

  /**
   * GET /prayers/feed
   * Récupère la liste des prières avec les réactions de l'utilisateur (USER AUTH)
   */
  @Get('feed')
  @ApiOperation({
    summary: 'Feed de prières avec réactions utilisateur',
    description: 'Récupère la liste paginée des prières publiques avec les réactions de l\'utilisateur connecté',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'answered'],
    description: 'Filtrer par statut',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Numéro de page (défaut: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Nombre d\'éléments par page (défaut: 20)',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste paginée des prières avec réactions utilisateur',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  async getFeedWithReactions(
    @CurrentUser('sub') userId: string,
    @Query() query: QueryPublicPrayersDto,
  ): Promise<any> {
    const result = await this.prayersService.findAllPublic(
      query.page,
      query.limit,
      query.status,
    );

    // Récupérer les réactions utilisateur pour toutes les prières
    const prayerIds = result.data.map(p => p.id);
    const reactions = await this.prayersService.getUserReactionsBulk(prayerIds, userId);

    // Mapper les prières avec les réactions
    const dataWithReactions = result.data.map((prayer) => {
      const reaction = reactions.find(r => r.prayerId === prayer.id);
      const response = this.mapToPublicResponse(prayer) as PrayerUserResponseDto;
      response.userReaction = reaction ? reaction.type : null;
      return response;
    });

    return {
      data: dataWithReactions,
      meta: result.meta,
    };
  }

  /**
   * GET /prayers/my-prayers
   * Récupérer mes demandes de prière (USER AUTH)
   */
  @Get('my-prayers')
  @ApiOperation({
    summary: 'Mes demandes de prière',
    description: 'Récupère toutes les prières soumises par l\'utilisateur connecté',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste de mes prières',
    type: [PrayerPublicResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  async getMyPrayers(
    @CurrentUser('sub') userId: string,
  ): Promise<PrayerPublicResponseDto[]> {
    const prayers = await this.prayersService.findMyPrayers(userId);
    return prayers.map((prayer) => this.mapToPublicResponse(prayer));
  }

  /**
   * GET /prayers/:id/with-reaction
   * Récupérer une prière avec la réaction de l'utilisateur (USER AUTH)
   */
  @Get(':id/with-reaction')
  @ApiOperation({
    summary: 'Prière avec ma réaction',
    description: 'Récupère une prière avec l\'information de la réaction de l\'utilisateur connecté',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la prière',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Prière avec réaction utilisateur',
    type: PrayerUserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 404,
    description: 'Prière non trouvée',
  })
  async findOneWithReaction(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ): Promise<PrayerUserResponseDto> {
    const prayer = await this.prayersService.findOnePublic(id);
    const userReaction = await this.prayersService.getUserReaction(id, userId);

    const response = this.mapToPublicResponse(prayer) as PrayerUserResponseDto;
    response.userReaction = userReaction ? userReaction.type : null;

    return response;
  }

  /**
   * POST /prayers/:id/react
   * Réagir à une prière (prayed ou fasted) (USER AUTH)
   */
  @Post(':id/react')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Réagir à une prière',
    description: 'Permet de réagir à une prière (j\'ai prié ou j\'ai jeûné)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la prière',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Réaction ajoutée/mise à jour avec succès',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Reaction added successfully' },
        reaction: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            prayerId: { type: 'string' },
            userId: { type: 'string' },
            type: { type: 'string', enum: ['prayed', 'fasted'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Vous avez déjà cette réaction',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 404,
    description: 'Prière non trouvée',
  })
  async react(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() reactDto: ReactPrayerDto,
  ): Promise<{ message: string; reaction: any }> {
    return this.prayersService.react(id, userId, reactDto);
  }

  /**
   * DELETE /prayers/:id/react
   * Supprimer sa réaction à une prière (USER AUTH)
   */
  @Delete(':id/react')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Supprimer sa réaction',
    description: 'Permet de supprimer sa réaction à une prière',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la prière',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Réaction supprimée avec succès',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Reaction removed successfully' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 404,
    description: 'Réaction non trouvée',
  })
  async removeReaction(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ): Promise<{ message: string }> {
    return this.prayersService.removeReaction(id, userId);
  }

  /**
   * POST /prayers/:id/testimony
   * Ajouter un témoignage d'exaucement (USER AUTH)
   */
  @Post(':id/testimony')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ajouter un témoignage d\'exaucement',
    description: 'Permet au créateur de la prière d\'ajouter un témoignage d\'exaucement',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la prière',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Témoignage ajouté avec succès',
    type: PrayerPublicResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Prière déjà exaucée',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 403,
    description: 'Seul l\'auteur peut ajouter un témoignage',
  })
  @ApiResponse({
    status: 404,
    description: 'Prière non trouvée',
  })
  async addTestimony(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() testimonyDto: AddTestimonyDto,
  ): Promise<PrayerPublicResponseDto> {
    const prayer = await this.prayersService.addTestimony(
      id,
      userId,
      testimonyDto,
    );
    return this.mapToPublicResponse(prayer);
  }

  /**
   * Helper: Mapper Prayer entity vers PrayerPublicResponseDto
   */
  private mapToPublicResponse(prayer: Prayer): PrayerPublicResponseDto {
    return {
      id: prayer.id,
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

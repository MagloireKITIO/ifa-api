import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { EventsService } from './events.service';
import {
  QueryPublicEventsDto,
  EventPublicResponseDto,
  PaginatedEventsResponseDto,
} from './dto';
import { Event } from '../entities/event.entity';

/**
 * Controller pour les endpoints publics des événements (mobile app)
 * Tous les endpoints sont PUBLICS (pas d'authentification requise)
 */
@ApiTags('Events Public (Mobile)')
@Controller('events/public')
export class EventsPublicController {
  constructor(private readonly eventsService: EventsService) {}

  /**
   * GET /events/public
   * Liste de tous les événements avec filtres et pagination
   */
  @Get()
  @ApiOperation({
    summary: 'Liste des événements publics',
    description: 'Récupère la liste de tous les événements avec filtres optionnels et pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des événements récupérée avec succès',
    type: PaginatedEventsResponseDto,
  })
  async findAll(
    @Query() query: QueryPublicEventsDto,
  ): Promise<PaginatedEventsResponseDto> {
    const result = await this.eventsService.findAllPublic(
      query.page,
      query.limit,
      query.type,
      query.status,
      query.centerId,
    );

    return {
      data: result.data.map((event) => this.mapToPublicResponse(event)),
      meta: result.meta,
    };
  }

  /**
   * GET /events/public/ongoing
   * Événement en cours (EN DIRECT)
   */
  @Get('ongoing')
  @ApiOperation({
    summary: 'Événement en cours',
    description: 'Récupère l\'événement actuellement en cours (statut ONGOING)',
  })
  @ApiResponse({
    status: 200,
    description: 'Événement en cours récupéré',
    type: EventPublicResponseDto,
  })
  async findOngoing(): Promise<EventPublicResponseDto | null> {
    const event = await this.eventsService.findOngoingEvent();
    return event ? this.mapToPublicResponse(event) : null;
  }

  /**
   * GET /events/public/upcoming
   * Prochain événement à venir
   */
  @Get('upcoming')
  @ApiOperation({
    summary: 'Prochain événement',
    description: 'Récupère le prochain événement à venir (le plus proche dans le temps)',
  })
  @ApiResponse({
    status: 200,
    description: 'Prochain événement récupéré',
    type: EventPublicResponseDto,
  })
  async findUpcoming(): Promise<EventPublicResponseDto | null> {
    const event = await this.eventsService.findNextUpcomingEvent();
    return event ? this.mapToPublicResponse(event) : null;
  }

  /**
   * GET /events/public/upcoming-list
   * Liste des événements à venir
   */
  @Get('upcoming-list')
  @ApiOperation({
    summary: 'Liste des événements à venir',
    description: 'Récupère la liste des événements à venir, triés par date',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Nombre d\'événements à récupérer (max 50)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des événements à venir',
    type: [EventPublicResponseDto],
  })
  async findUpcomingList(
    @Query('limit') limit?: number,
  ): Promise<EventPublicResponseDto[]> {
    const limitValue = Math.min(limit || 10, 50); // Max 50
    const events = await this.eventsService.findUpcomingEvents(limitValue);
    return events.map((event) => this.mapToPublicResponse(event));
  }

  /**
   * GET /events/public/past
   * Liste des événements passés (replays)
   */
  @Get('past')
  @ApiOperation({
    summary: 'Liste des événements passés (replays)',
    description: 'Récupère la liste des événements passés avec pagination',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Numéro de page',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Nombre d\'événements par page',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des événements passés',
    type: PaginatedEventsResponseDto,
  })
  async findPast(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginatedEventsResponseDto> {
    const result = await this.eventsService.findPastEvents(
      page || 1,
      limit || 10,
    );

    return {
      data: result.data.map((event) => this.mapToPublicResponse(event)),
      meta: result.meta,
    };
  }

  /**
   * GET /events/public/:id
   * Détail d'un événement
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Détail d\'un événement',
    description: 'Récupère les détails complets d\'un événement par son ID',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de l\'événement',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Détails de l\'événement',
    type: EventPublicResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Événement non trouvé',
  })
  async findOne(@Param('id') id: string): Promise<EventPublicResponseDto> {
    const event = await this.eventsService.findOnePublic(id);
    return this.mapToPublicResponse(event);
  }

  /**
   * Helper: Mapper Event entity vers EventPublicResponseDto
   */
  private mapToPublicResponse(event: Event): EventPublicResponseDto {
    return {
      id: event.id,
      titleFr: event.titleFr,
      titleEn: event.titleEn,
      descriptionFr: event.descriptionFr,
      descriptionEn: event.descriptionEn,
      type: event.type,
      eventDate: event.eventDate,
      location: event.location,
      streamLink: event.streamLink,
      replayLink: event.replayLink,
      coverImage: event.coverImage,
      status: event.status,
      center: event.center
        ? {
            id: event.center.id,
            nameFr: event.center.nameFr,
            nameEn: event.center.nameEn,
            city: event.center.city,
            country: event.center.country,
          }
        : null,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }
}

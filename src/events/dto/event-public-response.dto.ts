import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventType, EventStatus } from '../../common/enums';

/**
 * DTO de réponse pour un événement public (mobile app)
 * Contient les champs en FR et EN
 */
export class EventPublicResponseDto {
  @ApiProperty({
    description: 'ID unique de l\'événement',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Titre de l\'événement en français',
    example: 'Croisade de Guérison',
  })
  titleFr: string;

  @ApiProperty({
    description: 'Titre de l\'événement en anglais',
    example: 'Healing Crusade',
  })
  titleEn: string;

  @ApiPropertyOptional({
    description: 'Description de l\'événement en français',
    example: 'Une grande croisade de guérison et de miracles',
    nullable: true,
  })
  descriptionFr: string | null;

  @ApiPropertyOptional({
    description: 'Description de l\'événement en anglais',
    example: 'A great healing and miracles crusade',
    nullable: true,
  })
  descriptionEn: string | null;

  @ApiProperty({
    description: 'Type d\'événement',
    enum: EventType,
    example: EventType.CRUSADE,
  })
  type: EventType;

  @ApiProperty({
    description: 'Date et heure de l\'événement',
    example: '2024-02-15T18:00:00Z',
  })
  eventDate: Date;

  @ApiPropertyOptional({
    description: 'Lieu physique de l\'événement',
    example: 'Palais des Sports de Yaoundé',
    nullable: true,
  })
  location: string | null;

  @ApiPropertyOptional({
    description: 'Lien du stream en direct (YouTube, Facebook)',
    example: 'https://youtube.com/watch?v=...',
    nullable: true,
  })
  streamLink: string | null;

  @ApiPropertyOptional({
    description: 'Lien du replay',
    example: 'https://youtube.com/watch?v=...',
    nullable: true,
  })
  replayLink: string | null;

  @ApiPropertyOptional({
    description: 'URL de l\'image de couverture',
    example: 'https://example.com/event-cover.jpg',
    nullable: true,
  })
  coverImage: string | null;

  @ApiProperty({
    description: 'Statut actuel de l\'événement',
    enum: EventStatus,
    example: EventStatus.UPCOMING,
  })
  status: EventStatus;

  @ApiPropertyOptional({
    description: 'Informations du centre organisateur',
    nullable: true,
  })
  center: {
    id: string;
    nameFr: string;
    nameEn: string;
    city: string;
    country: string;
  } | null;

  @ApiProperty({
    description: 'Date de création',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date de dernière mise à jour',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: Date;
}

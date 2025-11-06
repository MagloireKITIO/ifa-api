import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../../common/enums';

/**
 * DTO de réponse pour une notification user
 *
 * LOGIQUE :
 * - Contient les infos FR et EN pour l'i18n
 * - Le client mobile choisit quelle langue afficher
 * - data contient les deeplinks et informations supplémentaires
 */
export class NotificationUserResponseDto {
  @ApiProperty({
    description: 'ID unique de la notification',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Type de notification',
    enum: NotificationType,
    example: NotificationType.EVENT,
  })
  type: NotificationType;

  @ApiPropertyOptional({
    description: 'Titre de la notification en français',
    example: 'Nouvel événement',
    nullable: true,
  })
  titleFr: string | null;

  @ApiPropertyOptional({
    description: 'Titre de la notification en anglais',
    example: 'New Event',
    nullable: true,
  })
  titleEn: string | null;

  @ApiPropertyOptional({
    description: 'Corps de la notification en français',
    example: 'Croisade de Guérison a été ajouté',
    nullable: true,
  })
  bodyFr: string | null;

  @ApiPropertyOptional({
    description: 'Corps de la notification en anglais',
    example: 'Healing Crusade has been added',
    nullable: true,
  })
  bodyEn: string | null;

  @ApiPropertyOptional({
    description: 'Données supplémentaires (deeplinks, IDs, etc.)',
    example: {
      eventId: '123e4567-e89b-12d3-a456-426614174000',
      deepLink: '/events/123e4567-e89b-12d3-a456-426614174000',
    },
    nullable: true,
  })
  data: Record<string, any> | null;

  @ApiProperty({
    description: 'Si la notification a été lue',
    example: false,
  })
  isRead: boolean;

  @ApiProperty({
    description: 'Date d\'envoi de la notification',
    example: '2024-01-15T10:30:00Z',
  })
  sentAt: Date;

  @ApiPropertyOptional({
    description: 'Date de lecture de la notification',
    example: '2024-01-15T11:00:00Z',
    nullable: true,
  })
  readAt: Date | null;

  @ApiProperty({
    description: 'Date de création',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;
}

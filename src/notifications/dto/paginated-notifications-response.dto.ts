import { ApiProperty } from '@nestjs/swagger';
import { NotificationUserResponseDto } from './notification-user-response.dto';

/**
 * DTO de réponse paginée pour les notifications
 */
export class PaginatedNotificationsResponseDto {
  @ApiProperty({
    description: 'Liste des notifications',
    type: [NotificationUserResponseDto],
  })
  notifications: NotificationUserResponseDto[];

  @ApiProperty({
    description: 'Nombre total de notifications',
    example: 50,
  })
  total: number;

  @ApiProperty({
    description: 'Métadonnées de pagination',
  })
  meta: {
    page: number;
    limit: number;
    totalPages: number;
  };
}

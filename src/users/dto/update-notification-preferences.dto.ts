import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO pour mettre à jour les préférences de notifications
 * Endpoint: PATCH /users/me/notification-preferences
 */
export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({
    description: 'Recevoir des notifications pour les événements',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  eventsEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Recevoir des notifications pour les prières',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  prayersEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Recevoir des notifications pour les témoignages',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  testimoniesEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Recevoir des notifications pour les dons',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  donationsEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Recevoir des notifications générales',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  generalEnabled?: boolean;
}

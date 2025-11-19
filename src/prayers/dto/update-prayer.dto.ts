import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO pour modifier une prière (USER AUTH)
 * Endpoint: PATCH /user/prayers/:id
 *
 * LOGIQUE :
 * - L'utilisateur peut modifier le contenu de sa prière
 * - Seul le créateur de la prière peut la modifier
 * - La modification n'est possible que si la prière est en statut ACTIVE
 */
export class UpdatePrayerDto {
  @ApiPropertyOptional({
    description: 'Contenu de la prière (optionnel)',
    example: 'Je demande vos prières pour ma guérison complète',
  })
  @IsOptional()
  @IsString()
  content?: string;
}

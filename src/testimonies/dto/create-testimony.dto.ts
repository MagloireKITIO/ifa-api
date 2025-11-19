import { IsString, IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Language } from '../../common/enums';

/**
 * DTO pour créer un témoignage (USER AUTH)
 * Endpoint: POST /testimonies
 *
 * LOGIQUE :
 * - L'utilisateur soumet son témoignage dans SA langue
 * - Il peut choisir de rester anonyme
 * - Peut être lié à une prière exaucée (prayerId optionnel)
 * - Le témoignage est créé avec status PENDING
 * - L'admin devra l'approuver avant qu'il soit visible publiquement
 */
export class CreateTestimonyDto {
  @ApiProperty({
    description: 'Contenu du témoignage (dans la langue de l\'utilisateur)',
    example: 'Dieu m\'a guéri d\'une maladie incurable ! Gloire à Lui !',
  })
  @IsString()
  content: string;

  @ApiProperty({
    description: 'Rester anonyme',
    example: false,
    default: false,
  })
  @IsBoolean()
  isAnonymous: boolean;

  @ApiPropertyOptional({
    description: 'ID de la prière à laquelle ce témoignage est lié (pour les prières exaucées)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  prayerId?: string;

  @ApiProperty({
    description: 'Langue dans laquelle le témoignage a été soumis',
    enum: Language,
    example: Language.FR,
  })
  @IsEnum(Language)
  language: Language;
}

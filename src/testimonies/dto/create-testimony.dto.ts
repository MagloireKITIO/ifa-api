import { IsString, IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Language } from '../../common/enums';

/**
 * DTO pour créer un témoignage (USER AUTH)
 * Endpoint: POST /user/testimonies
 *
 * LOGIQUE :
 * - L'utilisateur soumet son témoignage dans SA langue (texte OU audio OU les deux)
 * - Il peut choisir de rester anonyme
 * - Peut être lié à une prière exaucée (prayerId optionnel)
 * - Si audio : upload d'abord via POST /user/testimonies/upload-audio
 */
export class CreateTestimonyDto {
  @ApiPropertyOptional({
    description: 'Contenu du témoignage écrit (dans la langue de l\'utilisateur) - optionnel si audio fourni',
    example: 'Dieu m\'a guéri d\'une maladie incurable ! Gloire à Lui !',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: 'URL de l\'audio uploadé (obtenu via /upload-audio) - optionnel si texte fourni',
    example: 'https://xxx.supabase.co/storage/v1/object/public/ifa-testimonies/testimonies/abc.mp3',
  })
  @IsOptional()
  @IsString()
  audioUrl?: string;

  @ApiPropertyOptional({
    description: 'Durée de l\'audio en secondes (max 300s = 5 min)',
    example: 180,
    type: Number,
  })
  @IsOptional()
  audioDuration?: number | null;

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

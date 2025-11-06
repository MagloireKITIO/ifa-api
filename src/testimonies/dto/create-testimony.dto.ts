import { IsString, IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Language } from '../../common/enums';

/**
 * DTO pour créer un témoignage (USER AUTH)
 * Endpoint: POST /testimonies
 *
 * LOGIQUE :
 * - L'utilisateur soumet son témoignage en FR ou EN
 * - Il peut choisir de rester anonyme
 * - Le témoignage est créé avec status PENDING
 * - L'admin devra l'approuver avant qu'il soit visible publiquement
 */
export class CreateTestimonyDto {
  @ApiPropertyOptional({
    description: 'Contenu du témoignage en français',
    example: 'Dieu m\'a guéri d\'une maladie incurable ! Gloire à Lui !',
  })
  @IsOptional()
  @IsString()
  contentFr?: string;

  @ApiPropertyOptional({
    description: 'Contenu du témoignage en anglais',
    example: 'God healed me from an incurable disease! Glory to Him!',
  })
  @IsOptional()
  @IsString()
  contentEn?: string;

  @ApiProperty({
    description: 'Rester anonyme',
    example: false,
    default: false,
  })
  @IsBoolean()
  isAnonymous: boolean;

  @ApiProperty({
    description: 'Langue dans laquelle le témoignage a été soumis',
    enum: Language,
    example: Language.FR,
  })
  @IsEnum(Language)
  language: Language;
}

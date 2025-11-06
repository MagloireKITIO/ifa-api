import { IsString, IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Language } from '../../common/enums';

/**
 * DTO pour créer une demande de prière (USER AUTH)
 * Endpoint: POST /prayers
 *
 * LOGIQUE :
 * - L'utilisateur soumet sa demande de prière en FR ou EN
 * - Il peut choisir de rester anonyme
 * - La langue est automatiquement détectée selon le champ rempli
 */
export class CreatePrayerDto {
  @ApiPropertyOptional({
    description: 'Contenu de la prière en français',
    example: 'Je demande vos prières pour ma guérison',
  })
  @IsOptional()
  @IsString()
  contentFr?: string;

  @ApiPropertyOptional({
    description: 'Contenu de la prière en anglais',
    example: 'I ask for your prayers for my healing',
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
    description: 'Langue dans laquelle la prière a été soumise',
    enum: Language,
    example: Language.FR,
  })
  @IsEnum(Language)
  language: Language;
}

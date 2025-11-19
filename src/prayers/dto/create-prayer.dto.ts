import { IsString, IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Language } from '../../common/enums';

/**
 * DTO pour créer une demande de prière (USER AUTH)
 * Endpoint: POST /prayers
 *
 * LOGIQUE :
 * - L'utilisateur soumet sa demande de prière dans SA langue
 * - Il peut choisir de rester anonyme
 * - La langue est celle de son interface (FR ou EN)
 */
export class CreatePrayerDto {
  @ApiProperty({
    description: 'Contenu de la prière (dans la langue de l\'utilisateur)',
    example: 'Je demande vos prières pour ma guérison',
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

  @ApiProperty({
    description: 'Langue dans laquelle la prière a été soumise',
    enum: Language,
    example: Language.FR,
  })
  @IsEnum(Language)
  language: Language;
}

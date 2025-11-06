import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Language } from '../../common/enums';

/**
 * DTO pour changer la langue préférée
 * Endpoint: PATCH /users/me/language
 */
export class UpdateLanguageDto {
  @ApiProperty({
    description: 'Langue préférée de l\'utilisateur',
    enum: Language,
    example: Language.FR,
  })
  @IsEnum(Language)
  preferredLanguage: Language;
}

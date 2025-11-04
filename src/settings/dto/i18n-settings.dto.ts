import { IsString, IsNotEmpty, IsArray, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Language } from '../../common/enums';

/**
 * DTO for internationalization (i18n) configuration settings
 */
export class I18nSettingsDto {
  @ApiProperty({
    description: 'Default language for the application',
    enum: Language,
    example: 'fr',
  })
  @IsEnum(Language)
  @IsNotEmpty()
  defaultLanguage: Language;

  @ApiProperty({
    description: 'Fallback language when translation is missing',
    enum: Language,
    example: 'fr',
  })
  @IsEnum(Language)
  @IsNotEmpty()
  fallbackLanguage: Language;

  @ApiProperty({
    description: 'List of supported languages',
    enum: Language,
    isArray: true,
    example: ['fr', 'en'],
  })
  @IsArray()
  @IsEnum(Language, { each: true })
  supportedLanguages: Language[];
}

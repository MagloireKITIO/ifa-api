import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class TranslateTextDto {
  @ApiProperty({
    description: 'Text to translate',
    example: 'Bonjour le monde',
  })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({
    description: 'Source language',
    enum: ['fr', 'en'],
    example: 'fr',
  })
  @IsEnum(['fr', 'en'])
  fromLanguage: 'fr' | 'en';

  @ApiProperty({
    description: 'Target language',
    enum: ['fr', 'en'],
    example: 'en',
  })
  @IsEnum(['fr', 'en'])
  toLanguage: 'fr' | 'en';

  @ApiProperty({
    description: 'Context for better translation (e.g., "event title", "event description")',
    required: false,
    example: 'event title',
  })
  @IsString()
  @IsOptional()
  context?: string;
}

export class FieldToTranslate {
  @ApiProperty({
    description: 'Field key/identifier',
    example: 'title',
  })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({
    description: 'Text to translate',
    example: 'Culte du dimanche',
  })
  @IsString()
  @IsNotEmpty()
  text: string;
}

export class TranslateFieldsDto {
  @ApiProperty({
    description: 'Array of fields to translate',
    type: [FieldToTranslate],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldToTranslate)
  fields: FieldToTranslate[];

  @ApiProperty({
    description: 'Source language',
    enum: ['fr', 'en'],
    example: 'fr',
  })
  @IsEnum(['fr', 'en'])
  fromLanguage: 'fr' | 'en';

  @ApiProperty({
    description: 'Target language',
    enum: ['fr', 'en'],
    example: 'en',
  })
  @IsEnum(['fr', 'en'])
  toLanguage: 'fr' | 'en';

  @ApiProperty({
    description: 'Context for better translation',
    required: false,
    example: 'event',
  })
  @IsString()
  @IsOptional()
  context?: string;
}

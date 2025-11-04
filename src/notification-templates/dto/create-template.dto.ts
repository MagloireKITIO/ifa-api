import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  IsObject,
  IsNumber,
  MaxLength,
} from 'class-validator';
import {
  NotificationTemplateCategory,
  NotificationTemplateTrigger,
} from '../../entities/notification-template.entity';

export class CreateTemplateDto {
  @IsEnum(NotificationTemplateTrigger)
  @IsNotEmpty()
  trigger: NotificationTemplateTrigger;

  @IsEnum(NotificationTemplateCategory)
  @IsNotEmpty()
  category: NotificationTemplateCategory;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  titleFr: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  titleEn: string;

  @IsString()
  @IsNotEmpty()
  bodyFr: string;

  @IsString()
  @IsNotEmpty()
  bodyEn: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  variables?: string[];

  @IsObject()
  @IsOptional()
  exampleValues?: Record<string, string>;

  @IsObject()
  @IsOptional()
  conditions?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  priority?: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  bibleVerseFr?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  bibleVerseEn?: string;
}

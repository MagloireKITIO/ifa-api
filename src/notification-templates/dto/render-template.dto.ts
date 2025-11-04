import { IsEnum, IsNotEmpty, IsObject } from 'class-validator';
import { NotificationTemplateTrigger } from '../../entities/notification-template.entity';

export class RenderTemplateDto {
  @IsEnum(NotificationTemplateTrigger)
  @IsNotEmpty()
  trigger: NotificationTemplateTrigger;

  @IsObject()
  @IsNotEmpty()
  variables: Record<string, any>;

  @IsEnum(['fr', 'en'])
  @IsNotEmpty()
  language: 'fr' | 'en';
}

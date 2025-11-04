import { IsOptional, IsEnum, IsBoolean, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import {
  NotificationTemplateCategory,
  NotificationTemplateTrigger,
} from '../../entities/notification-template.entity';

export class QueryTemplatesDto {
  @IsOptional()
  @IsEnum(NotificationTemplateCategory)
  category?: NotificationTemplateCategory;

  @IsOptional()
  @IsEnum(NotificationTemplateTrigger)
  trigger?: NotificationTemplateTrigger;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  search?: string;
}

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsArray,
  IsObject,
} from 'class-validator';
import { NotificationType } from '../../common/enums';

export class SendNotificationDto {
  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType;

  @IsString()
  @IsNotEmpty()
  titleFr: string;

  @IsString()
  @IsNotEmpty()
  titleEn: string;

  @IsString()
  @IsNotEmpty()
  bodyFr: string;

  @IsString()
  @IsNotEmpty()
  bodyEn: string;

  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  userIds?: string[]; // Si fourni, envoie uniquement à ces utilisateurs

  @IsUUID()
  @IsOptional()
  userId?: string; // Pour envoyer à un seul utilisateur
}

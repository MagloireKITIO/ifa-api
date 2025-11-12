import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  Matches,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SessionType } from '../../common/types/event-schedule.types';

/**
 * DTO pour une session individuelle
 */
export class EventSessionDto {
  @ApiProperty({
    description: 'ID unique de la session',
    example: 'session-1',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Titre de la session en français',
    example: 'Adoration et louange',
  })
  @IsString()
  @IsNotEmpty()
  titleFr: string;

  @ApiProperty({
    description: 'Titre de la session en anglais',
    example: 'Worship and Praise',
  })
  @IsString()
  @IsNotEmpty()
  titleEn: string;

  @ApiProperty({
    description: 'Heure de début (format HH:mm)',
    example: '18:00',
  })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be in format HH:mm',
  })
  startTime: string;

  @ApiProperty({
    description: 'Heure de fin (format HH:mm)',
    example: '21:00',
  })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime must be in format HH:mm',
  })
  endTime: string;

  @ApiPropertyOptional({
    description: 'Description en français',
    example: 'Temps de louange et d\'adoration intense',
  })
  @IsString()
  @IsOptional()
  descriptionFr?: string;

  @ApiPropertyOptional({
    description: 'Description en anglais',
    example: 'Intense worship and praise time',
  })
  @IsString()
  @IsOptional()
  descriptionEn?: string;

  @ApiPropertyOptional({
    description: 'Nom de l\'intervenant',
    example: 'Pasteur Jean Dupont',
  })
  @IsString()
  @IsOptional()
  speaker?: string;

  @ApiPropertyOptional({
    description: 'Type de session',
    enum: SessionType,
    example: SessionType.WORSHIP,
  })
  @IsEnum(SessionType)
  @IsOptional()
  type?: SessionType;
}

/**
 * DTO pour un jour du programme
 */
export class EventScheduleDayDto {
  @ApiProperty({
    description: 'ID unique du jour',
    example: 'day-1',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Numéro du jour',
    example: 1,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  day: number;

  @ApiProperty({
    description: 'Date du jour (YYYY-MM-DD)',
    example: '2025-01-15',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in format YYYY-MM-DD',
  })
  date: string;

  @ApiPropertyOptional({
    description: 'Titre du jour en français',
    example: 'Journée de guérison',
  })
  @IsString()
  @IsOptional()
  titleFr?: string;

  @ApiPropertyOptional({
    description: 'Titre du jour en anglais',
    example: 'Healing day',
  })
  @IsString()
  @IsOptional()
  titleEn?: string;

  @ApiProperty({
    description: 'Liste des sessions du jour',
    type: [EventSessionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventSessionDto)
  sessions: EventSessionDto[];
}

/**
 * DTO pour le programme complet (tableau de jours)
 */
export class EventScheduleDto {
  @ApiProperty({
    description: 'Programme de l\'événement (jours)',
    type: [EventScheduleDayDto],
    isArray: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventScheduleDayDto)
  days: EventScheduleDayDto[];
}

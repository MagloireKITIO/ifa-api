import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsDateString,
  IsUUID,
  IsOptional,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventType } from '../../common/enums';

/**
 * DTO for creating a new event
 */
export class CreateEventDto {
  @ApiProperty({
    description: 'Event title in French',
    example: 'Croisade de Guérison',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  titleFr: string;

  @ApiProperty({
    description: 'Event title in English',
    example: 'Healing Crusade',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  titleEn: string;

  @ApiPropertyOptional({
    description: 'Event description in French',
    example: 'Une soirée puissante de prière et de guérison divine.',
  })
  @IsString()
  @IsOptional()
  descriptionFr?: string;

  @ApiPropertyOptional({
    description: 'Event description in English',
    example: 'A powerful evening of prayer and divine healing.',
  })
  @IsString()
  @IsOptional()
  descriptionEn?: string;

  @ApiProperty({
    description: 'Type of event',
    enum: EventType,
    example: EventType.CRUSADE,
  })
  @IsEnum(EventType)
  @IsNotEmpty()
  type: EventType;

  @ApiProperty({
    description: 'Date and time when the event takes place',
    example: '2025-12-25T18:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  eventDate: string;

  @ApiPropertyOptional({
    description: 'Physical location of the event',
    example: 'IFA Church Yaoundé, Cameroon',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({
    description: 'ID of the center organizing this event',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsOptional()
  centerId?: string;

  @ApiPropertyOptional({
    description: 'Link to live stream (YouTube/Facebook)',
    example: 'https://youtube.com/live/abc123',
    maxLength: 500,
  })
  @IsUrl()
  @IsOptional()
  @MaxLength(500)
  streamLink?: string;

  @ApiPropertyOptional({
    description: 'Link to event replay',
    example: 'https://youtube.com/watch?v=abc123',
    maxLength: 500,
  })
  @IsUrl()
  @IsOptional()
  @MaxLength(500)
  replayLink?: string;

  @ApiPropertyOptional({
    description: 'URL of the event cover image',
    example: 'https://storage.supabase.co/events/cover-123.jpg',
    maxLength: 500,
  })
  @IsUrl()
  @IsOptional()
  @MaxLength(500)
  coverImage?: string;
}

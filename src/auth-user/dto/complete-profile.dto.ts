import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { Language } from '../../common/enums';

export class CompleteProfileDto {
  @ApiProperty({
    description: 'User display name',
    example: 'Jean Dupont',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  displayName: string;

  @ApiProperty({
    description: 'City where the user is located',
    example: 'Douala',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @ApiProperty({
    description: 'Country where the user is located',
    example: 'Cameroun',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  country?: string;

  @ApiProperty({
    description: 'ID of the center the user belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  centerId?: string;

  @ApiProperty({
    description: 'Whether this is the user first time visiting IFA',
    example: true,
  })
  @IsBoolean()
  isFirstTimer: boolean;

  @ApiProperty({
    description: 'User preferred language',
    enum: Language,
    example: Language.FR,
  })
  @IsEnum(Language)
  preferredLanguage: Language;
}

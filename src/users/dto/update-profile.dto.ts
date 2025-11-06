import { IsString, IsOptional, IsUrl, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO pour mettre à jour le profil utilisateur
 * Endpoint: PATCH /users/me
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'Nom complet de l\'utilisateur',
    example: 'Jean Dupont',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string;

  @ApiPropertyOptional({
    description: 'URL de la photo de profil',
    example: 'https://example.com/photo.jpg',
    maxLength: 500,
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  photoURL?: string;

  @ApiPropertyOptional({
    description: 'Ville de l\'utilisateur',
    example: 'Douala',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({
    description: 'Pays de l\'utilisateur',
    example: 'Cameroon',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;
}

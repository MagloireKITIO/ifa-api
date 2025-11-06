import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Language } from '../../common/enums';

/**
 * DTO de réponse pour le profil utilisateur
 * Utilisé par GET /users/me
 */
export class UserResponseDto {
  @ApiProperty({
    description: 'ID unique de l\'utilisateur',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiPropertyOptional({
    description: 'Adresse email de l\'utilisateur',
    example: 'jean.dupont@gmail.com',
    nullable: true,
  })
  email: string | null;

  @ApiPropertyOptional({
    description: 'Numéro de téléphone de l\'utilisateur',
    example: '+237670000000',
    nullable: true,
  })
  phoneNumber: string | null;

  @ApiProperty({
    description: 'Nom complet de l\'utilisateur',
    example: 'Jean Dupont',
  })
  displayName: string;

  @ApiPropertyOptional({
    description: 'URL de la photo de profil',
    example: 'https://example.com/photo.jpg',
    nullable: true,
  })
  photoURL: string | null;

  @ApiPropertyOptional({
    description: 'Ville de l\'utilisateur',
    example: 'Douala',
    nullable: true,
  })
  city: string | null;

  @ApiPropertyOptional({
    description: 'Pays de l\'utilisateur',
    example: 'Cameroon',
    nullable: true,
  })
  country: string | null;

  @ApiPropertyOptional({
    description: 'ID du centre IFA de l\'utilisateur',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  centerId: string | null;

  @ApiPropertyOptional({
    description: 'Informations du centre IFA',
    nullable: true,
  })
  center: {
    id: string;
    nameFr: string;
    nameEn: string;
    city: string;
    country: string;
  } | null;

  @ApiProperty({
    description: 'Si c\'est la première fois que l\'utilisateur visite IFA',
    example: true,
  })
  isFirstTimer: boolean;

  @ApiProperty({
    description: 'Langue préférée de l\'utilisateur',
    enum: Language,
    example: Language.FR,
  })
  preferredLanguage: Language;

  @ApiProperty({
    description: 'Si l\'email est vérifié',
    example: true,
  })
  emailVerified: boolean;

  @ApiProperty({
    description: 'Si le numéro de téléphone est vérifié',
    example: true,
  })
  phoneVerified: boolean;

  @ApiPropertyOptional({
    description: 'Dernière activité de l\'utilisateur',
    example: '2024-01-15T10:30:00Z',
    nullable: true,
  })
  lastSeenAt: Date | null;

  @ApiProperty({
    description: 'Date de création du compte',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date de dernière mise à jour',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: Date;
}

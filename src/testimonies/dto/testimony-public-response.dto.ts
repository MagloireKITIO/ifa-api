import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Language } from '../../common/enums';

/**
 * DTO de réponse pour un témoignage public
 *
 * LOGIQUE :
 * - Contient le contenu dans la langue de soumission
 * - Si isAnonymous = true, user sera null
 * - Tous les témoignages sont publiés directement
 */
export class TestimonyPublicResponseDto {
  @ApiProperty({
    description: 'ID unique du témoignage',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Contenu du témoignage (dans la langue de l\'utilisateur)',
    example: 'Dieu m\'a guéri d\'une maladie incurable ! Gloire à Lui !',
  })
  content: string;

  @ApiProperty({
    description: 'Si le témoignage est anonyme',
    example: false,
  })
  isAnonymous: boolean;

  @ApiProperty({
    description: 'Langue de soumission',
    enum: Language,
    example: Language.FR,
  })
  language: Language;

  @ApiProperty({
    description: 'Date de soumission',
    example: '2024-01-15T10:30:00Z',
  })
  submittedAt: Date;

  @ApiPropertyOptional({
    description: 'Informations de l\'utilisateur (null si anonyme)',
    nullable: true,
  })
  user: {
    id: string;
    displayName: string;
    photoURL: string | null;
  } | null;

  @ApiProperty({
    description: 'Date de création',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date de dernière mise à jour',
    example: '2024-01-16T14:20:00Z',
  })
  updatedAt: Date;
}

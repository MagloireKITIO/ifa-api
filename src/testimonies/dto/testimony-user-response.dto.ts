import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Language } from '../../common/enums';

/**
 * DTO de réponse pour un témoignage (vue utilisateur)
 *
 * LOGIQUE :
 * - Utilisé pour GET /testimonies/my-testimonies
 * - L'utilisateur peut voir tous ses témoignages publiés
 */
export class TestimonyUserResponseDto {
  @ApiProperty({
    description: 'ID unique du témoignage',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiPropertyOptional({
    description: 'Contenu du témoignage écrit (dans la langue de l\'utilisateur) - optionnel si audio fourni',
    example: 'Dieu m\'a guéri d\'une maladie incurable ! Gloire à Lui !',
    nullable: true,
  })
  content: string | null;

  @ApiPropertyOptional({
    description: 'URL de l\'audio du témoignage (stocké sur Supabase)',
    example: 'https://xxx.supabase.co/storage/v1/object/public/ifa-testimonies/testimonies/abc.mp3',
    nullable: true,
  })
  audioUrl: string | null;

  @ApiPropertyOptional({
    description: 'Durée de l\'audio en secondes',
    example: 180,
    nullable: true,
  })
  audioDuration: number | null;

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

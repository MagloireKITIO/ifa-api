import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TestimonyStatus, Language } from '../../common/enums';

/**
 * DTO de réponse pour un témoignage (vue utilisateur)
 *
 * LOGIQUE :
 * - Utilisé pour GET /testimonies/my-testimonies
 * - Inclut le status (PENDING, APPROVED, REJECTED) pour que l'user sache où en est sa soumission
 * - L'utilisateur peut voir ses propres témoignages même s'ils sont en attente
 */
export class TestimonyUserResponseDto {
  @ApiProperty({
    description: 'ID unique du témoignage',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiPropertyOptional({
    description: 'Contenu du témoignage en français',
    example: 'Dieu m\'a guéri d\'une maladie incurable ! Gloire à Lui !',
    nullable: true,
  })
  contentFr: string | null;

  @ApiPropertyOptional({
    description: 'Contenu du témoignage en anglais',
    example: 'God healed me from an incurable disease! Glory to Him!',
    nullable: true,
  })
  contentEn: string | null;

  @ApiProperty({
    description: 'Si le témoignage est anonyme',
    example: false,
  })
  isAnonymous: boolean;

  @ApiProperty({
    description: 'Statut du témoignage (permet de savoir s\'il est en attente, approuvé ou rejeté)',
    enum: TestimonyStatus,
    example: TestimonyStatus.PENDING,
  })
  status: TestimonyStatus;

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
    description: 'Date d\'approbation (si approuvé)',
    example: '2024-01-16T14:20:00Z',
    nullable: true,
  })
  approvedAt: Date | null;

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

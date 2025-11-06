import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrayerStatus, Language, PrayerReactionType } from '../../common/enums';

/**
 * DTO de réponse pour une prière publique
 *
 * LOGIQUE :
 * - Contient les infos FR et EN
 * - Si isAnonymous = true, user sera null
 * - Inclut les compteurs (prayedCount, fastedCount)
 * - Inclut le témoignage d'exaucement si présent
 */
export class PrayerPublicResponseDto {
  @ApiProperty({
    description: 'ID unique de la prière',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiPropertyOptional({
    description: 'Contenu de la prière en français',
    example: 'Je demande vos prières pour ma guérison',
    nullable: true,
  })
  contentFr: string | null;

  @ApiPropertyOptional({
    description: 'Contenu de la prière en anglais',
    example: 'I ask for your prayers for my healing',
    nullable: true,
  })
  contentEn: string | null;

  @ApiProperty({
    description: 'Si la prière est anonyme',
    example: false,
  })
  isAnonymous: boolean;

  @ApiProperty({
    description: 'Statut de la prière',
    enum: PrayerStatus,
    example: PrayerStatus.ACTIVE,
  })
  status: PrayerStatus;

  @ApiProperty({
    description: 'Nombre de personnes qui ont prié',
    example: 45,
  })
  prayedCount: number;

  @ApiProperty({
    description: 'Nombre de personnes qui ont jeûné',
    example: 12,
  })
  fastedCount: number;

  @ApiPropertyOptional({
    description: 'Témoignage d\'exaucement en français',
    example: 'Dieu m\'a guéri ! Gloire à Lui !',
    nullable: true,
  })
  testimonyContentFr: string | null;

  @ApiPropertyOptional({
    description: 'Témoignage d\'exaucement en anglais',
    example: 'God healed me! Glory to Him!',
    nullable: true,
  })
  testimonyContentEn: string | null;

  @ApiPropertyOptional({
    description: 'Date du témoignage',
    example: '2024-02-01T10:00:00Z',
    nullable: true,
  })
  testimoniedAt: Date | null;

  @ApiProperty({
    description: 'Langue de soumission',
    enum: Language,
    example: Language.FR,
  })
  language: Language;

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
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: Date;
}

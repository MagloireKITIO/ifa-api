import { ApiProperty } from '@nestjs/swagger';
import { PrayerPublicResponseDto } from './prayer-public-response.dto';
import { PrayerReactionType } from '../../common/enums';

/**
 * DTO de réponse pour une prière avec réaction de l'utilisateur connecté
 *
 * LOGIQUE :
 * - Hérite de PrayerPublicResponseDto
 * - Ajoute le champ userReaction pour savoir si l'user a réagi
 * - Permet au client mobile de savoir quel bouton highlighter
 */
export class PrayerUserResponseDto extends PrayerPublicResponseDto {
  @ApiProperty({
    description: 'Réaction de l\'utilisateur connecté (null si pas de réaction)',
    enum: PrayerReactionType,
    example: PrayerReactionType.PRAYED,
    nullable: true,
  })
  userReaction: PrayerReactionType | null;
}

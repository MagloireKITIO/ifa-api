import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PrayerReactionType } from '../../common/enums';

/**
 * DTO for reacting to a prayer (prayed or fasted)
 */
export class ReactPrayerDto {
  @ApiProperty({
    description: 'Type of reaction',
    enum: PrayerReactionType,
    example: PrayerReactionType.PRAYED,
  })
  @IsEnum(PrayerReactionType)
  @IsNotEmpty()
  type: PrayerReactionType;
}

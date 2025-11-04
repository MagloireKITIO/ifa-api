import { IsUrl, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for updating event replay link
 */
export class UpdateReplayLinkDto {
  @ApiProperty({
    description: 'Link to event replay',
    example: 'https://youtube.com/watch?v=abc123',
    maxLength: 500,
  })
  @IsUrl()
  @IsNotEmpty()
  @MaxLength(500)
  replayLink: string;
}

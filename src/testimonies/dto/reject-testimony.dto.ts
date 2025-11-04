import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

/**
 * DTO for rejecting a testimony
 * Admin must provide a reason for rejection
 */
export class RejectTestimonyDto {
  @ApiProperty({
    description: 'Reason for rejecting the testimony',
    example: 'Inappropriate content',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

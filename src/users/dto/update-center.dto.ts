import { IsUUID, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour changer de centre IFA
 * Endpoint: PATCH /users/me/center
 */
export class UpdateCenterDto {
  @ApiProperty({
    description: 'ID du centre IFA (null pour retirer le centre)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  centerId: string | null;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * DTO for approving a testimony
 * Admin can optionally add a note when approving
 */
export class ApproveTestimonyDto {
  @ApiPropertyOptional({
    description: 'Optional admin note when approving',
    example: 'Approved - Powerful testimony of healing',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  adminNote?: string;
}

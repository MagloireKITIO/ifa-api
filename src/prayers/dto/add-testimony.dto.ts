import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for adding testimony to an answered prayer
 */
export class AddTestimonyDto {
  @ApiProperty({
    description: 'Testimony content (user writes in their language)',
    example: 'Ma prière a été exaucée ! Dieu est fidèle.',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  testimonyContent: string;
}

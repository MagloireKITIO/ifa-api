import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for adding testimony to an answered prayer
 */
export class AddTestimonyDto {
  @ApiProperty({
    description: 'Testimony content in French',
    example: 'Ma prière a été exaucée ! Dieu est fidèle.',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  testimonyContentFr: string;

  @ApiProperty({
    description: 'Testimony content in English',
    example: 'My prayer has been answered! God is faithful.',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  testimonyContentEn: string;
}

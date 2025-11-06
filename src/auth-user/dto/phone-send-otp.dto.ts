import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class PhoneSendOtpDto {
  @ApiProperty({
    description: 'Phone number in international format (E.164)',
    example: '+237612345678',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in international format (E.164), e.g. +237612345678',
  })
  phoneNumber: string;
}

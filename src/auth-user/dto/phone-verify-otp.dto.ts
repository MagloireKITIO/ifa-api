import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches, Length } from 'class-validator';

export class PhoneVerifyOtpDto {
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

  @ApiProperty({
    description: 'OTP code (6 digits)',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'OTP must contain only digits' })
  otp: string;
}

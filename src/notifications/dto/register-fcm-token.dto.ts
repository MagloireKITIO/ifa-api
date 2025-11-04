import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class RegisterFCMTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsEnum(['ios', 'android', 'web'])
  @IsNotEmpty()
  platform: string;

  @IsString()
  @IsOptional()
  deviceName?: string;
}

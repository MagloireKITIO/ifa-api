import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum NotchPayEnvironment {
  SANDBOX = 'sandbox',
  PRODUCTION = 'production',
}

/**
 * DTO for NotchPay payment configuration settings
 */
export class NotchPaySettingsDto {
  @ApiProperty({
    description: 'NotchPay public key',
    example: 'pk_live_xxxxxxxxxxxxx',
  })
  @IsString()
  @IsNotEmpty()
  publicKey: string;

  @ApiProperty({
    description: 'NotchPay private/secret key',
    example: 'sk_live_xxxxxxxxxxxxx',
  })
  @IsString()
  @IsNotEmpty()
  privateKey: string;

  @ApiPropertyOptional({
    description: 'NotchPay webhook secret for signature verification',
    example: 'whsec_xxxxxxxxxxxxx',
  })
  @IsString()
  @IsOptional()
  webhookSecret?: string;

  @ApiProperty({
    description: 'NotchPay environment (sandbox or production)',
    enum: NotchPayEnvironment,
    example: 'production',
  })
  @IsEnum(NotchPayEnvironment)
  @IsNotEmpty()
  environment: NotchPayEnvironment;

  @ApiPropertyOptional({
    description: 'Default currency code',
    example: 'XAF',
  })
  @IsString()
  @IsOptional()
  defaultCurrency?: string;
}

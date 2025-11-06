import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO pour enregistrer un FCM token
 * Endpoint: POST /users/me/fcm-token
 */
export class RegisterFcmTokenDto {
  @ApiProperty({
    description: 'Firebase Cloud Messaging token',
    example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  })
  @IsString()
  token: string;

  @ApiPropertyOptional({
    description: 'Plateforme de l\'appareil',
    example: 'android',
    enum: ['ios', 'android', 'web'],
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  platform?: string;

  @ApiPropertyOptional({
    description: 'Nom ou modèle de l\'appareil',
    example: 'Samsung Galaxy S21',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  deviceName?: string;
}

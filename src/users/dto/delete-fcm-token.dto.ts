import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour supprimer un FCM token
 * Endpoint: DELETE /users/me/fcm-token
 */
export class DeleteFcmTokenDto {
  @ApiProperty({
    description: 'Firebase Cloud Messaging token à supprimer',
    example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  })
  @IsString()
  token: string;
}

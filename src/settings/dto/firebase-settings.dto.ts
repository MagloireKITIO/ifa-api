import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for Firebase configuration settings
 */
export class FirebaseSettingsDto {
  @ApiProperty({
    description: 'Firebase project ID',
    example: 'ifa-app-12345',
  })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({
    description: 'Firebase private key (from service account)',
    example: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----',
  })
  @IsString()
  @IsNotEmpty()
  privateKey: string;

  @ApiProperty({
    description: 'Firebase client email (from service account)',
    example: 'firebase-adminsdk@ifa-app.iam.gserviceaccount.com',
  })
  @IsString()
  @IsNotEmpty()
  clientEmail: string;

  @ApiPropertyOptional({
    description: 'Firebase database URL',
    example: 'https://ifa-app-12345.firebaseio.com',
  })
  @IsString()
  @IsOptional()
  databaseURL?: string;

  @ApiPropertyOptional({
    description: 'Firebase storage bucket',
    example: 'ifa-app-12345.appspot.com',
  })
  @IsString()
  @IsOptional()
  storageBucket?: string;
}

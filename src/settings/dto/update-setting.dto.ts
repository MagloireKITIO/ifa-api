import { IsString, IsNotEmpty, IsEnum, IsObject, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AppSettingsCategory } from '../../common/enums';

/**
 * Generic DTO for updating any application setting
 */
export class UpdateSettingDto {
  @ApiProperty({
    description: 'Unique key for the setting',
    example: 'firebase_config',
  })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({
    description: 'Setting value as JSON object',
    example: {
      projectId: 'ifa-app-12345',
      privateKey: '-----BEGIN PRIVATE KEY-----...',
      clientEmail: 'firebase-adminsdk@ifa-app.iam.gserviceaccount.com',
    },
  })
  @IsObject()
  @IsNotEmpty()
  value: Record<string, any>;

  @ApiProperty({
    description: 'Category of the setting',
    enum: AppSettingsCategory,
    example: AppSettingsCategory.NOTIFICATION,
  })
  @IsEnum(AppSettingsCategory)
  @IsNotEmpty()
  category: AppSettingsCategory;

  @ApiProperty({
    description: 'Whether the setting should be encrypted in database',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  isEncrypted: boolean;
}

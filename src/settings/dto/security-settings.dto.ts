import {
  IsArray,
  IsString,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for CORS configuration settings
 */
export class CorsSettingsDto {
  @ApiProperty({
    description: 'List of allowed origins for CORS',
    example: [
      'http://localhost:3001',
      'https://admin.ifa.church',
      'https://app.ifa.church',
    ],
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  origins: string[];

  @ApiProperty({
    description: 'Whether to allow credentials in CORS requests',
    example: true,
  })
  @IsBoolean()
  credentials: boolean;
}

/**
 * DTO for JWT expiration settings
 */
export class JwtExpirationSettingsDto {
  @ApiProperty({
    description: 'Admin access token expiration time',
    example: '1d',
  })
  @IsString()
  @IsNotEmpty()
  adminAccessExpiration: string;

  @ApiProperty({
    description: 'Admin refresh token expiration time',
    example: '7d',
  })
  @IsString()
  @IsNotEmpty()
  adminRefreshExpiration: string;

  @ApiProperty({
    description: 'User access token expiration time',
    example: '7d',
  })
  @IsString()
  @IsNotEmpty()
  userAccessExpiration: string;

  @ApiProperty({
    description: 'User refresh token expiration time',
    example: '30d',
  })
  @IsString()
  @IsNotEmpty()
  userRefreshExpiration: string;
}

/**
 * DTO for general security settings
 */
export class SecuritySettingsDto {
  @ApiPropertyOptional({
    description: 'CORS configuration',
    type: CorsSettingsDto,
  })
  @IsOptional()
  cors?: CorsSettingsDto;

  @ApiPropertyOptional({
    description: 'JWT expiration configuration',
    type: JwtExpirationSettingsDto,
  })
  @IsOptional()
  jwtExpiration?: JwtExpirationSettingsDto;
}

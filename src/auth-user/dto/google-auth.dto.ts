import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class GoogleAuthDto {
  @ApiProperty({
    description: 'Google ID token from Firebase/Supabase',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjI3...',
  })
  @IsString()
  @IsNotEmpty()
  idToken: string;
}

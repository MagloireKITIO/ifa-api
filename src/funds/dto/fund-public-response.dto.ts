import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FundType, FundStatus } from '../../common/enums';

/**
 * DTO for public fund response (mobile app)
 * Excludes sensitive admin data
 */
export class FundPublicResponseDto {
  @ApiProperty({
    description: 'Fund ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Fund title in French',
    example: 'Dîme',
  })
  titleFr: string;

  @ApiProperty({
    description: 'Fund title in English',
    example: 'Tithe',
  })
  titleEn: string;

  @ApiPropertyOptional({
    description: 'Fund description in French',
    example: 'Soutenez l\'œuvre de Dieu par votre dîme',
  })
  descriptionFr?: string;

  @ApiPropertyOptional({
    description: 'Fund description in English',
    example: 'Support God\'s work through your tithe',
  })
  descriptionEn?: string;

  @ApiProperty({
    description: 'Type of fund',
    enum: FundType,
    example: FundType.TITHE,
  })
  type: FundType;

  @ApiPropertyOptional({
    description: 'Target amount for campaigns (null for tithe/offering)',
    example: 50000000,
  })
  targetAmount?: number;

  @ApiProperty({
    description: 'Current amount collected',
    example: 15000000,
  })
  currentAmount: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'XAF',
  })
  currency: string;

  @ApiPropertyOptional({
    description: 'Progress percentage (for campaigns)',
    example: 30,
  })
  progressPercentage?: number;

  @ApiPropertyOptional({
    description: 'Start date for campaigns',
    example: '2025-01-01T00:00:00Z',
  })
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'End date for campaigns',
    example: '2025-12-31T23:59:59Z',
  })
  endDate?: Date;

  @ApiProperty({
    description: 'Current status of the fund',
    enum: FundStatus,
    example: FundStatus.ACTIVE,
  })
  status: FundStatus;

  @ApiPropertyOptional({
    description: 'URL of the fund cover image',
    example: 'https://storage.example.com/funds/campaign-1.jpg',
  })
  coverImage?: string;

  @ApiProperty({
    description: 'Creation date',
    example: '2024-12-01T10:00:00Z',
  })
  createdAt: Date;
}

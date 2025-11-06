import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DonationStatus } from '../../common/enums';

/**
 * DTO for user donation history response (mobile app)
 * Simplified version with fund details
 */
export class DonationUserResponseDto {
  @ApiProperty({
    description: 'Donation ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Fund ID',
    example: '456e7890-e89b-12d3-a456-426614174111',
  })
  fundId: string;

  @ApiProperty({
    description: 'Fund title in French',
    example: 'Dîme',
  })
  fundTitleFr: string;

  @ApiProperty({
    description: 'Fund title in English',
    example: 'Tithe',
  })
  fundTitleEn: string;

  @ApiProperty({
    description: 'Donation amount',
    example: 5000,
  })
  amount: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'XAF',
  })
  currency: string;

  @ApiProperty({
    description: 'Donation status',
    enum: DonationStatus,
    example: DonationStatus.COMPLETED,
  })
  status: DonationStatus;

  @ApiProperty({
    description: 'Payment method',
    example: 'notchpay',
  })
  paymentMethod: string;

  @ApiProperty({
    description: 'Whether the donation is anonymous',
    example: false,
  })
  isAnonymous: boolean;

  @ApiProperty({
    description: 'Whether the donation is recurring',
    example: false,
  })
  isRecurring: boolean;

  @ApiPropertyOptional({
    description: 'When the donation was completed',
    example: '2025-01-06T12:30:00Z',
  })
  donatedAt?: Date;

  @ApiProperty({
    description: 'When the donation was created',
    example: '2025-01-06T12:00:00Z',
  })
  createdAt: Date;
}

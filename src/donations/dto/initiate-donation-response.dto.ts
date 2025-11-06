import { ApiProperty } from '@nestjs/swagger';
import { DonationStatus } from '../../common/enums';

/**
 * DTO for donation initiation response (mobile app)
 * Returns donation details and NotchPay payment URL
 */
export class InitiateDonationResponseDto {
  @ApiProperty({
    description: 'Donation ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  donationId: string;

  @ApiProperty({
    description: 'Fund ID',
    example: '456e7890-e89b-12d3-a456-426614174111',
  })
  fundId: string;

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
    example: DonationStatus.PENDING,
  })
  status: DonationStatus;

  @ApiProperty({
    description: 'NotchPay payment URL',
    example: 'https://pay.notchpay.co/xxxxxx',
  })
  paymentUrl: string;

  @ApiProperty({
    description: 'Transaction reference',
    example: 'NOTCH-123456789',
  })
  transactionId: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-01-06T12:00:00Z',
  })
  createdAt: Date;
}

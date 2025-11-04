import { IsString, IsNotEmpty, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for NotchPay webhook payload
 * This represents the data received from NotchPay when a payment status changes
 */
export class NotchPayWebhookPayloadDto {
  @ApiProperty({
    description: 'Event type from NotchPay',
    example: 'payment.complete',
  })
  @IsString()
  @IsNotEmpty()
  event: string;

  @ApiProperty({
    description: 'Transaction data from NotchPay',
    example: {
      reference: 'txn_123456789',
      amount: 5000,
      currency: 'XAF',
      status: 'complete',
    },
  })
  @IsObject()
  @IsNotEmpty()
  data: Record<string, any>;
}

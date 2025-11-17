import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsUUID,
  Min,
  MaxLength,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a new donation (initiating payment)
 */
export class CreateDonationDto {
  @ApiProperty({
    description: 'ID of the fund to donate to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  fundId: string;

  @ApiProperty({
    description: 'Amount to donate',
    example: 5000,
    minimum: 100,
  })
  @IsNumber()
  @Min(100, { message: 'Minimum donation amount is 100 XAF' })
  @IsNotEmpty()
  amount: number;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'XAF',
    default: 'XAF',
    maxLength: 3,
  })
  @IsString()
  @IsOptional()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({
    description: 'Payment method to use',
    example: 'mobile_money',
    default: 'mobile_money',
    enum: ['mobile_money', 'card'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['mobile_money', 'card'], {
    message: 'Payment method must be either mobile_money or card',
  })
  paymentMethod?: 'mobile_money' | 'card';

  @ApiPropertyOptional({
    description: 'Whether the donor wants to remain anonymous',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;

  @ApiPropertyOptional({
    description: 'Whether this is a recurring donation',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;
}

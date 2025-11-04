import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a withdrawal
 */
export class CreateWithdrawalDto {
  @ApiProperty({
    description: 'ID of the fund to withdraw from',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  fundId: string;

  @ApiProperty({
    description: 'Amount to withdraw',
    example: 100000,
    minimum: 1,
  })
  @IsNumber()
  @Min(1, { message: 'Withdrawal amount must be greater than 0' })
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
    description: 'Reason or purpose of the withdrawal',
    example: 'Payment for church construction materials',
  })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Reference number or receipt',
    example: 'INV-2025-001',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  reference?: string;
}

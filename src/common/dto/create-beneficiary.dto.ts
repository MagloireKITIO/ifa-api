import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

/**
 * DTO for creating a new beneficiary (receiving account) in NotchPay
 */
export class CreateBeneficiaryDto {
  @IsString()
  @IsNotEmpty()
  name: string; // Name of the account (e.g., "IFA Church Treasurer")

  @IsString()
  @IsNotEmpty()
  phone: string; // Phone number (e.g., "+237xxxxxxxxx")

  @IsString()
  @IsNotEmpty()
  @IsEnum(['cm.mobile.orange', 'cm.mobile.mtn', 'cm.mobile.express'], {
    message:
      'Provider must be one of: cm.mobile.orange, cm.mobile.mtn, cm.mobile.express',
  })
  provider: string; // Payment provider

  @IsString()
  @IsOptional()
  email?: string; // Optional email

  @IsString()
  @IsOptional()
  country?: string; // Country code (default: CM)
}

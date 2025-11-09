import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

/**
 * DTO for updating a beneficiary (receiving account)
 * All fields are optional - only provided fields will be updated
 */
export class UpdateBeneficiaryDto {
  @IsString()
  @IsOptional()
  name?: string; // Name of the account

  @IsString()
  @IsOptional()
  phone?: string; // Phone number

  @IsString()
  @IsOptional()
  @IsEnum(['cm.mobile.orange', 'cm.mobile.mtn', 'cm.mobile.express'], {
    message:
      'Provider must be one of: cm.mobile.orange, cm.mobile.mtn, cm.mobile.express',
  })
  provider?: string; // Payment provider

  @IsString()
  @IsOptional()
  email?: string; // Optional email
}

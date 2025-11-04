import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateAdminDto } from './create-admin.dto';

// OmitType removes the password field from the update DTO
// PartialType makes all fields optional
export class UpdateAdminDto extends PartialType(
  OmitType(CreateAdminDto, ['password'] as const),
) {}

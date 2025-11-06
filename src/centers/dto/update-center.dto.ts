import { PartialType } from '@nestjs/swagger';
import { CreateCenterDto } from './create-center.dto';

/**
 * DTO for updating a center (Admin)
 * All fields are optional
 */
export class UpdateCenterDto extends PartialType(CreateCenterDto) {}

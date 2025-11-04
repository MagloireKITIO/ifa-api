import { PartialType } from '@nestjs/swagger';
import { CreateFundDto } from './create-fund.dto';

/**
 * DTO for updating a fund
 * All fields from CreateFundDto are optional
 */
export class UpdateFundDto extends PartialType(CreateFundDto) {}

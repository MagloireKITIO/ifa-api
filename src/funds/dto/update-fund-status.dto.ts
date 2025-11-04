import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FundStatus } from '../../common/enums';

/**
 * DTO for updating fund status
 */
export class UpdateFundStatusDto {
  @ApiProperty({
    description: 'New status for the fund',
    enum: FundStatus,
    example: FundStatus.COMPLETED,
  })
  @IsEnum(FundStatus)
  @IsNotEmpty()
  status: FundStatus;
}

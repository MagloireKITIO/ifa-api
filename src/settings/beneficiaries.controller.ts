import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { NotchPayService } from '../common/services';
import { CreateBeneficiaryDto, BeneficiaryResponseDto } from '../common/dto';
import { JwtAdminAuthGuard, PermissionsGuard } from '../auth-admin/guards';
import { RequirePermissions, CurrentAdmin } from '../auth-admin/decorators';
import { AdminPermission } from '../common/enums';
import { Admin } from '../entities/admin.entity';

@ApiTags('Beneficiaries')
@ApiBearerAuth()
@Controller('beneficiaries')
@UseGuards(JwtAdminAuthGuard, PermissionsGuard)
export class BeneficiariesController {
  constructor(private readonly notchPayService: NotchPayService) {}

  @Post()
  @RequirePermissions(AdminPermission.SETTINGS_UPDATE)
  @ApiOperation({
    summary: 'Create a new beneficiary (receiving account)',
    description:
      'Create a new beneficiary account in NotchPay for receiving funds. Only accessible by super-admin or admins with settings:update permission.',
  })
  @ApiResponse({
    status: 201,
    description: 'Beneficiary created successfully',
    type: BeneficiaryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async createBeneficiary(
    @Body() createBeneficiaryDto: CreateBeneficiaryDto,
    @CurrentAdmin() admin: Admin,
  ): Promise<BeneficiaryResponseDto> {
    return this.notchPayService.createBeneficiary(createBeneficiaryDto);
  }

  @Get()
  @RequirePermissions(AdminPermission.SETTINGS_READ)
  @ApiOperation({
    summary: 'Get all beneficiaries',
    description:
      'Retrieve all beneficiary accounts from NotchPay. Only accessible by super-admin or admins with settings:read permission.',
  })
  @ApiResponse({
    status: 200,
    description: 'Beneficiaries retrieved successfully',
    type: [BeneficiaryResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async getBeneficiaries(
    @CurrentAdmin() admin: Admin,
  ): Promise<BeneficiaryResponseDto[]> {
    return this.notchPayService.getBeneficiaries();
  }

  @Get(':id')
  @RequirePermissions(AdminPermission.SETTINGS_READ)
  @ApiOperation({
    summary: 'Get a beneficiary by ID',
    description:
      'Retrieve a single beneficiary account from NotchPay. Only accessible by super-admin or admins with settings:read permission.',
  })
  @ApiParam({
    name: 'id',
    description: 'NotchPay beneficiary ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Beneficiary retrieved successfully',
    type: BeneficiaryResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Beneficiary not found' })
  async getBeneficiary(
    @Param('id') id: string,
    @CurrentAdmin() admin: Admin,
  ): Promise<BeneficiaryResponseDto> {
    return this.notchPayService.getBeneficiary(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(AdminPermission.SETTINGS_DELETE)
  @ApiOperation({
    summary: 'Delete a beneficiary',
    description:
      'Delete a beneficiary account from NotchPay. Only accessible by super-admin or admins with settings:delete permission.',
  })
  @ApiParam({
    name: 'id',
    description: 'NotchPay beneficiary ID',
    type: String,
  })
  @ApiResponse({
    status: 204,
    description: 'Beneficiary deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Beneficiary not found' })
  async deleteBeneficiary(
    @Param('id') id: string,
    @CurrentAdmin() admin: Admin,
  ): Promise<void> {
    return this.notchPayService.deleteBeneficiary(id);
  }
}

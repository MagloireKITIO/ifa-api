import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
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
import { WithdrawalsService } from './withdrawals.service';
import { CreateWithdrawalDto, QueryWithdrawalsDto } from './dto';
import { JwtAdminAuthGuard, PermissionsGuard } from '../auth-admin/guards';
import { RequirePermissions, CurrentAdmin } from '../auth-admin/decorators';
import { AdminPermission } from '../common/enums';
import { Admin } from '../entities/admin.entity';

@ApiTags('Withdrawals')
@ApiBearerAuth()
@Controller('withdrawals')
@UseGuards(JwtAdminAuthGuard, PermissionsGuard)
export class WithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  @Post()
  @RequirePermissions(AdminPermission.FUNDS_WITHDRAW)
  @ApiOperation({
    summary: 'Create a new withdrawal',
    description:
      'Withdraw funds from a fund. Only accessible by admins with funds:withdraw permission.',
  })
  @ApiResponse({
    status: 201,
    description: 'Withdrawal created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid data or insufficient funds',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Fund not found' })
  async create(
    @Body() createWithdrawalDto: CreateWithdrawalDto,
    @CurrentAdmin() admin: Admin,
    @Req() request: Request,
  ) {
    const ipAddress = request.ip || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];

    return this.withdrawalsService.create(
      createWithdrawalDto,
      admin.id,
      ipAddress,
      userAgent,
    );
  }

  @Get()
  @RequirePermissions(AdminPermission.FUNDS_READ)
  @ApiOperation({
    summary: 'Get all withdrawals',
    description:
      'Retrieve all withdrawals with optional filters (fund, admin, date range).',
  })
  @ApiResponse({
    status: 200,
    description: 'Withdrawals retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async findAll(@Query() queryDto: QueryWithdrawalsDto) {
    return this.withdrawalsService.findAll(queryDto);
  }

  @Get('statistics')
  @RequirePermissions(AdminPermission.FUNDS_READ)
  @ApiOperation({
    summary: 'Get withdrawal statistics',
    description:
      'Get statistics about withdrawals (total, amount, recent withdrawals).',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async getStatistics(@Query('fundId') fundId?: string) {
    return this.withdrawalsService.getStatistics(fundId);
  }

  @Get('fund/:fundId')
  @RequirePermissions(AdminPermission.FUNDS_READ)
  @ApiOperation({
    summary: 'Get withdrawals for a specific fund',
    description: 'Retrieve all withdrawals for a specific fund.',
  })
  @ApiParam({
    name: 'fundId',
    description: 'Fund ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Fund withdrawals retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Fund not found' })
  async findByFund(@Param('fundId') fundId: string) {
    return this.withdrawalsService.findByFund(fundId);
  }

  @Get(':id')
  @RequirePermissions(AdminPermission.FUNDS_READ)
  @ApiOperation({
    summary: 'Get withdrawal by ID',
    description: 'Retrieve a specific withdrawal by its ID with related data.',
  })
  @ApiParam({
    name: 'id',
    description: 'Withdrawal ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Withdrawal not found' })
  async findOne(@Param('id') id: string) {
    return this.withdrawalsService.findOne(id);
  }

  @Delete(':id')
  @RequirePermissions(AdminPermission.FUNDS_WITHDRAW)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a withdrawal',
    description:
      'Delete a withdrawal record. Note: This does NOT restore funds. Use only to correct mistakes immediately after creation.',
  })
  @ApiParam({
    name: 'id',
    description: 'Withdrawal ID to delete',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 204,
    description: 'Withdrawal deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Withdrawal not found' })
  async remove(
    @Param('id') id: string,
    @CurrentAdmin() admin: Admin,
    @Req() request: Request,
  ) {
    const ipAddress = request.ip || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];

    await this.withdrawalsService.remove(id, admin.id, ipAddress, userAgent);
  }
}

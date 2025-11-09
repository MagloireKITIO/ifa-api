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
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { DonationsService } from './donations.service';
import { CreateDonationDto, QueryDonationsDto, NotchPayWebhookPayloadDto } from './dto';
import { JwtAdminAuthGuard, PermissionsGuard } from '../auth-admin/guards';
import { RequirePermissions, CurrentAdmin } from '../auth-admin/decorators';
import { AdminPermission } from '../common/enums';
import { Admin } from '../entities/admin.entity';
import { NotchPayService } from '../common/services';

@ApiTags('Donations')
@Controller('admin/donations')
export class DonationsController {
  constructor(
    private readonly donationsService: DonationsService,
    private readonly notchPayService: NotchPayService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new donation (User endpoint)',
    description:
      'Initiate a new donation. Returns a payment URL for the user to complete payment via NotchPay.',
  })
  @ApiResponse({
    status: 201,
    description: 'Donation created and payment initialized successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 404, description: 'Fund not found' })
  async create(
    @Body() createDonationDto: CreateDonationDto,
    @Req() request: Request,
  ) {
    // TODO: Extract user ID from JWT token when user auth is implemented
    // For now, we'll use a placeholder
    const userId = (request as any).user?.id || 'user-placeholder';
    const userEmail = (request as any).user?.email;
    const userPhone = (request as any).user?.phoneNumber;

    return this.donationsService.create(
      createDonationDto,
      userId,
      userEmail,
      userPhone,
    );
  }

  @Get()
  @UseGuards(JwtAdminAuthGuard, PermissionsGuard)
  @RequirePermissions(AdminPermission.DONATIONS_READ)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all donations (Admin endpoint)',
    description:
      'Retrieve all donations with optional filters. Only accessible by admins.',
  })
  @ApiResponse({
    status: 200,
    description: 'Donations retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async findAll(@Query() queryDto: QueryDonationsDto) {
    return this.donationsService.findAll(queryDto);
  }

  @Get('statistics')
  @UseGuards(JwtAdminAuthGuard, PermissionsGuard)
  @RequirePermissions(AdminPermission.DONATIONS_READ)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get donation statistics (Admin endpoint)',
    description:
      'Get statistics about donations (total, completed, amounts, etc.).',
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
    return this.donationsService.getStatistics(fundId);
  }

  @Get('my-donations')
  @ApiOperation({
    summary: 'Get user donation history (User endpoint)',
    description: 'Retrieve donation history for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'User donations retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findMyDonations(@Req() request: Request) {
    // TODO: Extract user ID from JWT token when user auth is implemented
    const userId = (request as any).user?.id || 'user-placeholder';
    return this.donationsService.findByUser(userId);
  }

  @Get('fund/:fundId')
  @ApiOperation({
    summary: 'Get donations for a specific fund',
    description:
      'Retrieve all completed donations for a specific fund (for public display).',
  })
  @ApiParam({
    name: 'fundId',
    description: 'Fund ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Fund donations retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Fund not found' })
  async findByFund(@Param('fundId') fundId: string) {
    return this.donationsService.findByFund(fundId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get donation by ID',
    description: 'Retrieve a specific donation by its ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Donation ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Donation retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Donation not found' })
  async findOne(@Param('id') id: string) {
    return this.donationsService.findOne(id);
  }

  @Post(':id/verify')
  @ApiOperation({
    summary: 'Verify payment status',
    description:
      'Manually verify payment status with NotchPay for a specific donation.',
  })
  @ApiParam({
    name: 'id',
    description: 'Donation ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment verified successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Donation not found' })
  async verifyPayment(@Param('id') id: string) {
    return this.donationsService.verifyPayment(id);
  }

  @Delete(':id')
  @UseGuards(JwtAdminAuthGuard, PermissionsGuard)
  @RequirePermissions(AdminPermission.DONATIONS_DELETE)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a donation (Admin endpoint)',
    description:
      'Delete a pending or failed donation. Completed donations cannot be deleted.',
  })
  @ApiParam({
    name: 'id',
    description: 'Donation ID to delete',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 204,
    description: 'Donation deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete completed donation',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Donation not found' })
  async remove(
    @Param('id') id: string,
    @CurrentAdmin() admin: Admin,
    @Req() request: Request,
  ) {
    const ipAddress = request.ip || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];

    await this.donationsService.remove(id, admin.id, ipAddress, userAgent);
  }

  /**
   * Webhook endpoint for NotchPay payment notifications
   * This endpoint receives payment status updates from NotchPay
   */
  @Post('webhooks/notchpay')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint() // Exclude from Swagger docs
  async handleNotchPayWebhook(
    @Body() payload: any,
    @Headers('x-notchpay-signature') signature: string,
    @Req() request: Request,
  ) {
    // Verify webhook signature
    const rawBody = (request as any).rawBody?.toString() || JSON.stringify(payload);
    const isValid = await this.notchPayService.verifyWebhookSignature(
      rawBody,
      signature,
    );

    if (!isValid) {
      return { error: 'Invalid signature' };
    }

    // Extract transaction data from payload
    const { event, data } = payload;

    if (event === 'payment.complete' || event === 'payment.completed') {
      await this.donationsService.handlePaymentWebhook(
        data.reference || data.transaction?.reference,
        'complete',
        data,
      );
    } else if (event === 'payment.failed' || event === 'payment.cancelled') {
      await this.donationsService.handlePaymentWebhook(
        data.reference || data.transaction?.reference,
        'failed',
        data,
      );
    }

    return { received: true };
  }
}

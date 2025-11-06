import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
  Req,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { DonationsService } from './donations.service';
import {
  CreateDonationDto,
  InitiateDonationResponseDto,
  DonationUserResponseDto,
  PaginatedDonationsResponseDto,
} from './dto';
import { JwtUserAuthGuard } from '../auth-user/guards';
import { CurrentUser } from '../auth-user/decorators';
import { User } from '../entities/user.entity';
import { NotchPayService } from '../common/services';
import { IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for pagination query
 */
class PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 10,
    minimum: 1,
    maximum: 50,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

/**
 * User controller for donations (mobile app)
 * Requires JWT user authentication
 */
@ApiTags('Donations - User')
@Controller('donations')
export class DonationsUserController {
  private readonly logger = new Logger(DonationsUserController.name);

  constructor(
    private readonly donationsService: DonationsService,
    private readonly notchPayService: NotchPayService,
  ) {}

  @Post()
  @UseGuards(JwtUserAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Initiate a donation (User)',
    description:
      'Create a new donation and initialize payment with NotchPay. Returns a payment URL for the user to complete the transaction. Requires user authentication.',
  })
  @ApiResponse({
    status: 201,
    description: 'Donation created and payment initialized successfully',
    type: InitiateDonationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid data or fund not active',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Fund not found' })
  async initiateDonation(
    @Body() createDonationDto: CreateDonationDto,
    @CurrentUser() user: User,
  ): Promise<InitiateDonationResponseDto> {
    // Create donation and initialize payment
    const result = await this.donationsService.create(
      createDonationDto,
      user.id,
      user.email,
      user.phoneNumber,
    );

    this.logger.log(
      `Donation initiated by user ${user.id}: ${result.donation.id}`,
    );

    // Return response with payment URL
    return {
      donationId: result.donation.id,
      fundId: result.donation.fundId,
      amount: result.donation.amount,
      currency: result.donation.currency,
      status: result.donation.status,
      paymentUrl: result.paymentUrl,
      transactionId: result.donation.transactionId,
      createdAt: result.donation.createdAt,
    };
  }

  @Get('my-donations')
  @UseGuards(JwtUserAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get my donation history (User)',
    description:
      'Retrieve the authenticated user\'s donation history with pagination. Requires user authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'User donations retrieved successfully',
    type: PaginatedDonationsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyDonations(
    @CurrentUser() user: User,
    @Query() queryDto: PaginationQueryDto,
  ): Promise<PaginatedDonationsResponseDto> {
    const result = await this.donationsService.findUserDonations(
      user.id,
      queryDto.page,
      queryDto.limit,
    );

    // Map to response DTO
    const data: DonationUserResponseDto[] = result.data.map((donation) => ({
      id: donation.id,
      fundId: donation.fundId,
      fundTitleFr: donation.fund?.titleFr || '',
      fundTitleEn: donation.fund?.titleEn || '',
      amount: donation.amount,
      currency: donation.currency,
      status: donation.status,
      paymentMethod: donation.paymentMethod,
      isAnonymous: donation.isAnonymous,
      isRecurring: donation.isRecurring,
      donatedAt: donation.donatedAt,
      createdAt: donation.createdAt,
    }));

    return {
      data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  /**
   * Webhook endpoint for NotchPay payment notifications
   * This endpoint receives payment status updates from NotchPay
   * No authentication required (verified by signature)
   */
  @Post('webhook/notchpay')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint() // Exclude from Swagger docs
  async handleNotchPayWebhook(
    @Body() payload: any,
    @Headers('x-notchpay-signature') signature: string,
    @Req() request: Request,
  ) {
    this.logger.log('Received NotchPay webhook');

    try {
      // Verify webhook signature
      const rawBody =
        (request as any).rawBody?.toString() || JSON.stringify(payload);
      const isValid = await this.notchPayService.verifyWebhookSignature(
        rawBody,
        signature,
      );

      if (!isValid) {
        this.logger.warn('Invalid webhook signature');
        return { error: 'Invalid signature' };
      }

      // Extract transaction data from payload
      const { event, data } = payload;

      this.logger.log(`Webhook event: ${event}`);

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
    } catch (error) {
      this.logger.error(`Webhook processing error: ${error.message}`, error.stack);
      return { error: 'Webhook processing failed' };
    }
  }
}

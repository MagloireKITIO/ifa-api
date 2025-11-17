import {
  Controller,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { FundsService } from './funds.service';
import {
  QueryPublicFundsDto,
  FundPublicResponseDto,
  PaginatedFundsResponseDto,
} from './dto';
import { PaymentLinkService } from '../common/services';
import { ConfigurationService } from '../settings/services/configuration.service';
import { GeneralSettingsDto } from '../settings/dto/general-settings.dto';

/**
 * Public controller for funds (mobile app)
 * No authentication required
 */
@ApiTags('Funds - Public')
@Controller('funds/public')
export class FundsPublicController {
  constructor(
    private readonly fundsService: FundsService,
    private readonly paymentLinkService: PaymentLinkService,
    private readonly configService: ConfigurationService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all active funds (Public)',
    description:
      'Retrieve all active funds with pagination and optional type filter. Returns tithe, offering, and active campaigns. No authentication required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Active funds retrieved successfully',
    type: PaginatedFundsResponseDto,
  })
  async getPublicFunds(
    @Query() queryDto: QueryPublicFundsDto,
  ): Promise<PaginatedFundsResponseDto> {
    const result = await this.fundsService.findPublicFunds(
      queryDto.type,
      queryDto.page,
      queryDto.limit,
    );

    // Map to response DTO (exclude sensitive admin data)
    const data: FundPublicResponseDto[] = result.data.map((fund) => ({
      id: fund.id,
      titleFr: fund.titleFr,
      titleEn: fund.titleEn,
      descriptionFr: fund.descriptionFr,
      descriptionEn: fund.descriptionEn,
      type: fund.type,
      targetAmount: fund.targetAmount,
      currentAmount: fund.currentAmount,
      currency: fund.currency,
      progressPercentage: fund.progressPercentage,
      startDate: fund.startDate,
      endDate: fund.endDate,
      status: fund.status,
      coverImage: fund.coverImage,
      createdAt: fund.createdAt,
    }));

    return {
      data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get('campaigns')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get active campaigns only (Public)',
    description:
      'Retrieve only active campaigns. No authentication required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Active campaigns retrieved successfully',
    type: [FundPublicResponseDto],
  })
  async getPublicCampaigns(): Promise<FundPublicResponseDto[]> {
    const campaigns = await this.fundsService.findPublicCampaigns();

    // Map to response DTO
    return campaigns.map((fund) => ({
      id: fund.id,
      titleFr: fund.titleFr,
      titleEn: fund.titleEn,
      descriptionFr: fund.descriptionFr,
      descriptionEn: fund.descriptionEn,
      type: fund.type,
      targetAmount: fund.targetAmount,
      currentAmount: fund.currentAmount,
      currency: fund.currency,
      progressPercentage: fund.progressPercentage,
      startDate: fund.startDate,
      endDate: fund.endDate,
      status: fund.status,
      coverImage: fund.coverImage,
      createdAt: fund.createdAt,
    }));
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get active fund by ID (Public)',
    description:
      'Retrieve details of a specific active fund by its ID. No authentication required.',
  })
  @ApiParam({
    name: 'id',
    description: 'Fund ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Fund retrieved successfully',
    type: FundPublicResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Active fund not found',
  })
  async getPublicFundById(
    @Param('id') id: string,
  ): Promise<FundPublicResponseDto> {
    const fund = await this.fundsService.findPublicFundById(id);

    // Map to response DTO
    return {
      id: fund.id,
      titleFr: fund.titleFr,
      titleEn: fund.titleEn,
      descriptionFr: fund.descriptionFr,
      descriptionEn: fund.descriptionEn,
      type: fund.type,
      targetAmount: fund.targetAmount,
      currentAmount: fund.currentAmount,
      currency: fund.currency,
      progressPercentage: fund.progressPercentage,
      startDate: fund.startDate,
      endDate: fund.endDate,
      status: fund.status,
      coverImage: fund.coverImage,
      createdAt: fund.createdAt,
    };
  }

  @Get(':id/payment-link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get payment link and QR code for a fund',
    description:
      'Retrieve the payment link URL and QR code (base64) for sharing and displaying. No authentication required.',
  })
  @ApiParam({
    name: 'id',
    description: 'Fund ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment link and QR code retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        fundId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
        slug: { type: 'string', example: 'school-donation-2025' },
        paymentLink: { type: 'string', example: 'https://app.ifa.church/donate/school-donation-2025' },
        qrCodeBase64: { type: 'string', example: 'data:image/png;base64,iVBORw0KGgoAAAANS...' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Fund not found',
  })
  async getPaymentLink(@Param('id') id: string): Promise<{
    fundId: string;
    slug: string;
    paymentLink: string;
    qrCodeBase64: string;
  }> {
    // Get fund
    const fund = await this.fundsService.findPublicFundById(id);

    // Get app URL from settings
    const generalSettings = await this.configService.get<GeneralSettingsDto>('general');
    const appUrl = generalSettings?.appUrl || process.env.FRONTEND_URL || 'https://app.ifa.church';

    // Generate payment link
    const paymentLink = this.paymentLinkService.generatePaymentLink(fund.slug, appUrl);

    // Generate QR code
    const qrCodeBase64 = await this.paymentLinkService.generateQRCode(paymentLink);

    return {
      fundId: fund.id,
      slug: fund.slug,
      paymentLink,
      qrCodeBase64,
    };
  }

  @Get(':id/qrcode/download')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Download QR code as PNG image',
    description:
      'Download the QR code for a fund as a high-resolution PNG image. Perfect for printing or displaying physically. No authentication required.',
  })
  @ApiParam({
    name: 'id',
    description: 'Fund ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'QR code PNG image',
    content: {
      'image/png': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Fund not found',
  })
  async downloadQRCode(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    // Get fund
    const fund = await this.fundsService.findPublicFundById(id);

    // Get app URL from settings
    const generalSettings = await this.configService.get<GeneralSettingsDto>('general');
    const appUrl = generalSettings?.appUrl || process.env.FRONTEND_URL || 'https://app.ifa.church';

    // Generate payment link
    const paymentLink = this.paymentLinkService.generatePaymentLink(fund.slug, appUrl);

    // Generate QR code buffer (high resolution for download)
    const qrCodeBuffer = await this.paymentLinkService.generateQRCodeBuffer(paymentLink);

    // Set headers for file download
    const filename = `qrcode-${fund.slug}.png`;
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', qrCodeBuffer.length);

    // Send buffer
    res.send(qrCodeBuffer);
  }
}

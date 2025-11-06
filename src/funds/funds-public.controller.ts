import {
  Controller,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { FundsService } from './funds.service';
import {
  QueryPublicFundsDto,
  FundPublicResponseDto,
  PaginatedFundsResponseDto,
} from './dto';

/**
 * Public controller for funds (mobile app)
 * No authentication required
 */
@ApiTags('Funds - Public')
@Controller('funds/public')
export class FundsPublicController {
  constructor(private readonly fundsService: FundsService) {}

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
}

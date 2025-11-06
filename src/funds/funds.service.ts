import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Fund } from '../entities/fund.entity';
import { AdminActivityLog } from '../entities/admin-activity-log.entity';
import {
  CreateFundDto,
  UpdateFundDto,
  QueryFundsDto,
  UpdateFundStatusDto,
} from './dto';
import { FundType, FundStatus } from '../common/enums';

/**
 * Service for managing funds (tithes, offerings, campaigns) with activity logging
 */
@Injectable()
export class FundsService {
  constructor(
    @InjectRepository(Fund)
    private readonly fundRepository: Repository<Fund>,
    @InjectRepository(AdminActivityLog)
    private readonly activityLogRepository: Repository<AdminActivityLog>,
  ) {}

  /**
   * Create a new fund
   * @param createFundDto - Fund data
   * @param adminId - ID of the admin creating the fund
   * @param ipAddress - IP address of the request
   * @param userAgent - User agent of the request
   */
  async create(
    createFundDto: CreateFundDto,
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Fund> {
    // Validate campaign-specific requirements
    if (createFundDto.type === FundType.CAMPAIGN) {
      if (!createFundDto.targetAmount || createFundDto.targetAmount <= 0) {
        throw new BadRequestException(
          'Target amount is required for campaigns and must be greater than 0',
        );
      }

      if (!createFundDto.startDate || !createFundDto.endDate) {
        throw new BadRequestException(
          'Start date and end date are required for campaigns',
        );
      }

      const startDate = new Date(createFundDto.startDate);
      const endDate = new Date(createFundDto.endDate);

      if (startDate >= endDate) {
        throw new BadRequestException('End date must be after start date');
      }

      if (endDate < new Date()) {
        throw new BadRequestException('End date must be in the future');
      }
    }

    // Create fund
    const fund = this.fundRepository.create({
      ...createFundDto,
      createdById: adminId,
      status: FundStatus.ACTIVE,
      currentAmount: 0,
      currency: createFundDto.currency || 'XAF',
    });

    const savedFund = await this.fundRepository.save(fund);

    // Log activity
    await this.logActivity(
      adminId,
      'created_fund',
      'funds',
      savedFund.id,
      {
        titleFr: savedFund.titleFr,
        titleEn: savedFund.titleEn,
        type: savedFund.type,
        targetAmount: savedFund.targetAmount,
      },
      ipAddress,
      userAgent,
    );

    return savedFund;
  }

  /**
   * Get all funds with optional filters
   * @param queryDto - Query filters
   */
  async findAll(queryDto: QueryFundsDto): Promise<Fund[]> {
    const query = this.fundRepository
      .createQueryBuilder('fund')
      .leftJoinAndSelect('fund.createdBy', 'createdBy');

    // Apply filters
    if (queryDto.type) {
      query.andWhere('fund.type = :type', { type: queryDto.type });
    }

    if (queryDto.status) {
      query.andWhere('fund.status = :status', { status: queryDto.status });
    }

    if (queryDto.fromDate && queryDto.toDate) {
      query.andWhere('fund.startDate BETWEEN :fromDate AND :toDate', {
        fromDate: queryDto.fromDate,
        toDate: queryDto.toDate,
      });
    } else if (queryDto.fromDate) {
      query.andWhere('fund.startDate >= :fromDate', {
        fromDate: queryDto.fromDate,
      });
    } else if (queryDto.toDate) {
      query.andWhere('fund.endDate <= :toDate', {
        toDate: queryDto.toDate,
      });
    }

    // Search in title (both languages)
    if (queryDto.search) {
      query.andWhere(
        '(LOWER(fund.titleFr) LIKE LOWER(:search) OR LOWER(fund.titleEn) LIKE LOWER(:search))',
        { search: `%${queryDto.search}%` },
      );
    }

    // Order: active first, then by creation date
    query.orderBy('fund.status', 'ASC').addOrderBy('fund.createdAt', 'DESC');

    const funds = await query.getMany();
    return funds;
  }

  /**
   * Get active funds for public display (mobile app)
   */
  async findActive(): Promise<Fund[]> {
    return this.fundRepository.find({
      where: { status: FundStatus.ACTIVE },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get active funds with pagination for public display (mobile app)
   * @param type - Optional fund type filter
   * @param page - Page number
   * @param limit - Items per page
   */
  async findPublicFunds(
    type?: FundType,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: Fund[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query = this.fundRepository
      .createQueryBuilder('fund')
      .where('fund.status = :status', { status: FundStatus.ACTIVE });

    // Filter by type if provided
    if (type) {
      query.andWhere('fund.type = :type', { type });
    }

    // Order: TITHE and OFFERING first, then CAMPAIGNS by creation date
    query.orderBy(
      `CASE
        WHEN fund.type = '${FundType.TITHE}' THEN 1
        WHEN fund.type = '${FundType.OFFERING}' THEN 2
        WHEN fund.type = '${FundType.CAMPAIGN}' THEN 3
        ELSE 4
      END`,
    );
    query.addOrderBy('fund.createdAt', 'DESC');

    // Get total count
    const total = await query.getCount();

    // Apply pagination
    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    const data = await query.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get active campaigns only for public display (mobile app)
   */
  async findPublicCampaigns(): Promise<Fund[]> {
    return this.fundRepository.find({
      where: {
        status: FundStatus.ACTIVE,
        type: FundType.CAMPAIGN,
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get a single active fund by ID for public display (mobile app)
   * @param id - Fund ID
   */
  async findPublicFundById(id: string): Promise<Fund> {
    const fund = await this.fundRepository.findOne({
      where: {
        id,
        status: FundStatus.ACTIVE,
      },
    });

    if (!fund) {
      throw new NotFoundException(
        `Active fund with ID "${id}" not found`,
      );
    }

    return fund;
  }

  /**
   * Get a single fund by ID
   * @param id - Fund ID
   */
  async findOne(id: string): Promise<Fund> {
    const fund = await this.fundRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!fund) {
      throw new NotFoundException(`Fund with ID "${id}" not found`);
    }

    return fund;
  }

  /**
   * Update a fund
   * @param id - Fund ID
   * @param updateFundDto - Updated fund data
   * @param adminId - ID of the admin updating the fund
   * @param ipAddress - IP address of the request
   * @param userAgent - User agent of the request
   */
  async update(
    id: string,
    updateFundDto: UpdateFundDto,
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Fund> {
    const fund = await this.findOne(id);

    // Validate if changing to campaign type
    if (
      updateFundDto.type === FundType.CAMPAIGN &&
      fund.type !== FundType.CAMPAIGN
    ) {
      if (!updateFundDto.targetAmount && !fund.targetAmount) {
        throw new BadRequestException(
          'Target amount is required when changing to campaign type',
        );
      }
      if (!updateFundDto.startDate && !fund.startDate) {
        throw new BadRequestException(
          'Start date is required when changing to campaign type',
        );
      }
      if (!updateFundDto.endDate && !fund.endDate) {
        throw new BadRequestException(
          'End date is required when changing to campaign type',
        );
      }
    }

    // Validate dates if updating them
    if (updateFundDto.startDate && updateFundDto.endDate) {
      const startDate = new Date(updateFundDto.startDate);
      const endDate = new Date(updateFundDto.endDate);

      if (startDate >= endDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    // Update fund
    Object.assign(fund, updateFundDto);
    const updatedFund = await this.fundRepository.save(fund);

    // Log activity
    await this.logActivity(
      adminId,
      'updated_fund',
      'funds',
      updatedFund.id,
      {
        titleFr: updatedFund.titleFr,
        titleEn: updatedFund.titleEn,
        changes: updateFundDto,
      },
      ipAddress,
      userAgent,
    );

    return updatedFund;
  }

  /**
   * Update fund status
   * @param id - Fund ID
   * @param updateStatusDto - Status data
   * @param adminId - ID of the admin updating the status
   * @param ipAddress - IP address of the request
   * @param userAgent - User agent of the request
   */
  async updateStatus(
    id: string,
    updateStatusDto: UpdateFundStatusDto,
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Fund> {
    const fund = await this.findOne(id);

    const oldStatus = fund.status;
    fund.status = updateStatusDto.status;

    const updatedFund = await this.fundRepository.save(fund);

    // Log activity
    await this.logActivity(
      adminId,
      'updated_fund_status',
      'funds',
      updatedFund.id,
      {
        titleFr: updatedFund.titleFr,
        titleEn: updatedFund.titleEn,
        oldStatus,
        newStatus: updateStatusDto.status,
      },
      ipAddress,
      userAgent,
    );

    return updatedFund;
  }

  /**
   * Delete a fund
   * @param id - Fund ID
   * @param adminId - ID of the admin deleting the fund
   * @param ipAddress - IP address of the request
   * @param userAgent - User agent of the request
   */
  async remove(
    id: string,
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const fund = await this.findOne(id);

    // Check if fund has donations
    if (fund.currentAmount > 0) {
      throw new BadRequestException(
        'Cannot delete a fund that has received donations. Please close it instead.',
      );
    }

    // Log activity before deletion
    await this.logActivity(
      adminId,
      'deleted_fund',
      'funds',
      fund.id,
      {
        titleFr: fund.titleFr,
        titleEn: fund.titleEn,
        type: fund.type,
        currentAmount: fund.currentAmount,
      },
      ipAddress,
      userAgent,
    );

    await this.fundRepository.remove(fund);
  }

  /**
   * Update fund current amount after a donation
   * @param id - Fund ID
   * @param amount - Amount to add
   */
  async updateCurrentAmount(id: string, amount: number): Promise<Fund> {
    const fund = await this.findOne(id);

    fund.currentAmount = Number(fund.currentAmount) + Number(amount);

    // Auto-complete campaign if target is reached
    if (
      fund.type === FundType.CAMPAIGN &&
      fund.targetAmount &&
      fund.currentAmount >= fund.targetAmount &&
      fund.status === FundStatus.ACTIVE
    ) {
      fund.status = FundStatus.COMPLETED;
    }

    return this.fundRepository.save(fund);
  }

  /**
   * Update fund statuses based on current date (for cron job)
   * This closes expired campaigns
   */
  async updateFundStatuses(): Promise<void> {
    const now = new Date();

    // Close expired campaigns
    await this.fundRepository
      .createQueryBuilder()
      .update(Fund)
      .set({ status: FundStatus.CLOSED })
      .where('endDate < :now', { now })
      .andWhere('status = :activeStatus', { activeStatus: FundStatus.ACTIVE })
      .andWhere('type = :campaignType', { campaignType: FundType.CAMPAIGN })
      .execute();
  }

  /**
   * Get funds that have reached their target (for admin notification)
   */
  async findCompletedCampaigns(): Promise<Fund[]> {
    return this.fundRepository.find({
      where: {
        type: FundType.CAMPAIGN,
        status: FundStatus.COMPLETED,
      },
      relations: ['createdBy'],
      order: { updatedAt: 'DESC' },
    });
  }

  /**
   * Get fund statistics
   */
  async getStatistics(): Promise<{
    totalFunds: number;
    activeFunds: number;
    totalCollected: number;
    totalCollectedByType: { type: FundType; total: number }[];
  }> {
    const totalFunds = await this.fundRepository.count();
    const activeFunds = await this.fundRepository.count({
      where: { status: FundStatus.ACTIVE },
    });

    // Total collected across all funds
    const totalResult = await this.fundRepository
      .createQueryBuilder('fund')
      .select('SUM(fund.currentAmount)', 'total')
      .getRawOne();

    // Total collected by type
    const byTypeResult = await this.fundRepository
      .createQueryBuilder('fund')
      .select('fund.type', 'type')
      .addSelect('SUM(fund.currentAmount)', 'total')
      .groupBy('fund.type')
      .getRawMany();

    return {
      totalFunds,
      activeFunds,
      totalCollected: Number(totalResult.total || 0),
      totalCollectedByType: byTypeResult.map((r) => ({
        type: r.type,
        total: Number(r.total || 0),
      })),
    };
  }

  /**
   * Helper method to log admin activity
   */
  private async logActivity(
    adminId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const log = this.activityLogRepository.create({
      adminId,
      action,
      entityType,
      entityId,
      metadata,
      ipAddress,
      userAgent,
    });

    await this.activityLogRepository.save(log);
  }
}

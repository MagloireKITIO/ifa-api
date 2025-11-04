import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Withdrawal } from '../entities/withdrawal.entity';
import { Fund } from '../entities/fund.entity';
import { AdminActivityLog } from '../entities/admin-activity-log.entity';
import { CreateWithdrawalDto, QueryWithdrawalsDto } from './dto';

/**
 * Service for managing fund withdrawals with activity logging
 */
@Injectable()
export class WithdrawalsService {
  constructor(
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepository: Repository<Withdrawal>,
    @InjectRepository(Fund)
    private readonly fundRepository: Repository<Fund>,
    @InjectRepository(AdminActivityLog)
    private readonly activityLogRepository: Repository<AdminActivityLog>,
  ) {}

  /**
   * Create a new withdrawal
   * @param createWithdrawalDto - Withdrawal data
   * @param adminId - ID of the admin making the withdrawal
   * @param ipAddress - IP address of the request
   * @param userAgent - User agent of the request
   */
  async create(
    createWithdrawalDto: CreateWithdrawalDto,
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Withdrawal> {
    // Verify fund exists
    const fund = await this.fundRepository.findOne({
      where: { id: createWithdrawalDto.fundId },
    });

    if (!fund) {
      throw new NotFoundException(
        `Fund with ID "${createWithdrawalDto.fundId}" not found`,
      );
    }

    // Check if fund has enough balance
    if (fund.currentAmount < createWithdrawalDto.amount) {
      throw new BadRequestException(
        `Insufficient funds. Available: ${fund.currentAmount} ${fund.currency}, Requested: ${createWithdrawalDto.amount} ${createWithdrawalDto.currency || 'XAF'}`,
      );
    }

    // Create withdrawal
    const withdrawal = this.withdrawalRepository.create({
      ...createWithdrawalDto,
      createdById: adminId,
      currency: createWithdrawalDto.currency || fund.currency || 'XAF',
    });

    const savedWithdrawal = await this.withdrawalRepository.save(withdrawal);

    // Update fund current amount (subtract withdrawn amount)
    fund.currentAmount = Number(fund.currentAmount) - Number(createWithdrawalDto.amount);
    await this.fundRepository.save(fund);

    // Log activity
    await this.logActivity(
      adminId,
      'created_withdrawal',
      'withdrawals',
      savedWithdrawal.id,
      {
        fundId: fund.id,
        fundTitle: fund.titleEn || fund.titleFr,
        amount: savedWithdrawal.amount,
        reason: savedWithdrawal.reason,
        reference: savedWithdrawal.reference,
        remainingBalance: fund.currentAmount,
      },
      ipAddress,
      userAgent,
    );

    return savedWithdrawal;
  }

  /**
   * Get all withdrawals with optional filters
   * @param queryDto - Query filters
   */
  async findAll(queryDto: QueryWithdrawalsDto): Promise<Withdrawal[]> {
    const query = this.withdrawalRepository
      .createQueryBuilder('withdrawal')
      .leftJoinAndSelect('withdrawal.fund', 'fund')
      .leftJoinAndSelect('withdrawal.createdBy', 'createdBy');

    // Apply filters
    if (queryDto.fundId) {
      query.andWhere('withdrawal.fundId = :fundId', {
        fundId: queryDto.fundId,
      });
    }

    if (queryDto.createdById) {
      query.andWhere('withdrawal.createdById = :createdById', {
        createdById: queryDto.createdById,
      });
    }

    if (queryDto.fromDate && queryDto.toDate) {
      query.andWhere('withdrawal.createdAt BETWEEN :fromDate AND :toDate', {
        fromDate: queryDto.fromDate,
        toDate: queryDto.toDate,
      });
    } else if (queryDto.fromDate) {
      query.andWhere('withdrawal.createdAt >= :fromDate', {
        fromDate: queryDto.fromDate,
      });
    } else if (queryDto.toDate) {
      query.andWhere('withdrawal.createdAt <= :toDate', {
        toDate: queryDto.toDate,
      });
    }

    // Order by creation date (most recent first)
    query.orderBy('withdrawal.createdAt', 'DESC');

    const withdrawals = await query.getMany();
    return withdrawals;
  }

  /**
   * Get withdrawals for a specific fund
   * @param fundId - Fund ID
   */
  async findByFund(fundId: string): Promise<Withdrawal[]> {
    return this.withdrawalRepository.find({
      where: { fundId },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get a single withdrawal by ID
   * @param id - Withdrawal ID
   */
  async findOne(id: string): Promise<Withdrawal> {
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id },
      relations: ['fund', 'createdBy'],
    });

    if (!withdrawal) {
      throw new NotFoundException(`Withdrawal with ID "${id}" not found`);
    }

    return withdrawal;
  }

  /**
   * Get withdrawal statistics
   */
  async getStatistics(fundId?: string): Promise<{
    totalWithdrawals: number;
    totalAmount: number;
    recentWithdrawals: Withdrawal[];
  }> {
    const whereClause = fundId ? { fundId } : {};

    const totalWithdrawals = await this.withdrawalRepository.count({
      where: whereClause,
    });

    // Calculate total amount withdrawn
    const totalResult = await this.withdrawalRepository
      .createQueryBuilder('withdrawal')
      .select('SUM(withdrawal.amount)', 'total')
      .where(whereClause)
      .getRawOne();

    const totalAmount = Number(totalResult.total || 0);

    // Get recent withdrawals
    const recentWithdrawals = await this.withdrawalRepository.find({
      where: whereClause,
      relations: ['fund', 'createdBy'],
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return {
      totalWithdrawals,
      totalAmount,
      recentWithdrawals,
    };
  }

  /**
   * Delete a withdrawal (admin only)
   * Note: This does NOT restore the funds to the fund balance
   * This should only be used to correct mistakes immediately after creation
   * @param id - Withdrawal ID
   * @param adminId - ID of the admin deleting the withdrawal
   * @param ipAddress - IP address of the request
   * @param userAgent - User agent of the request
   */
  async remove(
    id: string,
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const withdrawal = await this.findOne(id);

    // Log activity before deletion
    await this.logActivity(
      adminId,
      'deleted_withdrawal',
      'withdrawals',
      withdrawal.id,
      {
        fundId: withdrawal.fundId,
        amount: withdrawal.amount,
        reason: withdrawal.reason,
        reference: withdrawal.reference,
      },
      ipAddress,
      userAgent,
    );

    await this.withdrawalRepository.remove(withdrawal);
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

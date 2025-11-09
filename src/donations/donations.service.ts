import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Donation } from '../entities/donation.entity';
import { Fund } from '../entities/fund.entity';
import { AdminActivityLog } from '../entities/admin-activity-log.entity';
import { CreateDonationDto, QueryDonationsDto } from './dto';
import { DonationStatus } from '../common/enums';
import { NotchPayService } from '../common/services';
import { FundsService } from '../funds/funds.service';
import { NotificationsService } from '../notifications/services/notifications.service';
import { BeneficiariesService } from '../settings/services/beneficiaries.service';

/**
 * Service for managing donations with NotchPay integration
 */
@Injectable()
export class DonationsService {
  private readonly logger = new Logger(DonationsService.name);

  constructor(
    @InjectRepository(Donation)
    private readonly donationRepository: Repository<Donation>,
    @InjectRepository(Fund)
    private readonly fundRepository: Repository<Fund>,
    @InjectRepository(AdminActivityLog)
    private readonly activityLogRepository: Repository<AdminActivityLog>,
    private readonly notchPayService: NotchPayService,
    private readonly fundsService: FundsService,
    private readonly notificationsService: NotificationsService,
    private readonly beneficiariesService: BeneficiariesService,
  ) {}

  /**
   * Create a new donation and initialize payment
   * @param createDonationDto - Donation data
   * @param userId - ID of the user making the donation
   * @param userEmail - User email for payment
   * @param userPhone - User phone for payment
   */
  async create(
    createDonationDto: CreateDonationDto,
    userId: string,
    userEmail?: string,
    userPhone?: string,
  ): Promise<{
    donation: Donation;
    paymentUrl: string;
  }> {
    // Verify fund exists and is active
    const fund = await this.fundRepository.findOne({
      where: { id: createDonationDto.fundId },
    });

    if (!fund) {
      throw new NotFoundException(
        `Fund with ID "${createDonationDto.fundId}" not found`,
      );
    }

    if (fund.status !== 'active') {
      throw new BadRequestException(
        'This fund is no longer accepting donations',
      );
    }

    // Create donation with pending status
    const donation = this.donationRepository.create({
      ...createDonationDto,
      userId,
      status: DonationStatus.PENDING,
      currency: createDonationDto.currency || 'XAF',
      paymentMethod: 'notchpay',
    });

    const savedDonation = await this.donationRepository.save(donation);

    // Get active beneficiary to receive the payment
    const activeBeneficiary = await this.beneficiariesService.getActiveBeneficiary();

    if (!activeBeneficiary) {
      this.logger.warn('No active beneficiary configured. Payment will proceed without beneficiary assignment.');
    }

    // Initialize payment with NotchPay
    try {
      const paymentInit = await this.notchPayService.initializePayment({
        amount: savedDonation.amount,
        currency: savedDonation.currency,
        description: `Donation to ${fund.titleEn || fund.titleFr}`,
        reference: savedDonation.id,
        email: userEmail,
        phone: userPhone,
        callbackUrl: `${process.env.FRONTEND_URL || 'https://app.ifa.church'}/donations/callback`,
        beneficiaryId: activeBeneficiary?.notchpayId,
      });

      // Update donation with transaction ID
      savedDonation.transactionId = paymentInit.transactionId;
      savedDonation.paymentMetadata = {
        reference: paymentInit.reference,
        authorization_url: paymentInit.authorization_url,
        beneficiaryId: activeBeneficiary?.notchpayId,
        beneficiaryName: activeBeneficiary?.name,
      };

      await this.donationRepository.save(savedDonation);

      this.logger.log(
        `Payment initialized for donation ${savedDonation.id}: ${paymentInit.transactionId}${activeBeneficiary ? ` -> Beneficiary: ${activeBeneficiary.name} (${activeBeneficiary.notchpayId})` : ''}`,
      );

      // Validate that we have a payment URL
      if (!paymentInit.authorization_url) {
        this.logger.error(
          `Missing authorization_url in payment initialization response for donation ${savedDonation.id}`,
        );
        throw new BadRequestException(
          'Failed to get payment URL. Please try again.',
        );
      }

      this.logger.log(
        `Payment URL for donation ${savedDonation.id}: ${paymentInit.authorization_url}`,
      );

      return {
        donation: savedDonation,
        paymentUrl: paymentInit.authorization_url,
      };
    } catch (error) {
      // If payment initialization fails, mark donation as failed
      savedDonation.status = DonationStatus.FAILED;
      await this.donationRepository.save(savedDonation);

      this.logger.error(
        `Payment initialization failed for donation ${savedDonation.id}: ${error.message}`,
      );

      throw new BadRequestException(
        'Failed to initialize payment. Please try again.',
      );
    }
  }

  /**
   * Get all donations with filters (for admin)
   * @param queryDto - Query filters
   */
  async findAll(queryDto: QueryDonationsDto): Promise<Donation[]> {
    const query = this.donationRepository
      .createQueryBuilder('donation')
      .leftJoinAndSelect('donation.user', 'user')
      .leftJoinAndSelect('donation.fund', 'fund');

    // Apply filters
    if (queryDto.fundId) {
      query.andWhere('donation.fundId = :fundId', { fundId: queryDto.fundId });
    }

    if (queryDto.userId) {
      query.andWhere('donation.userId = :userId', { userId: queryDto.userId });
    }

    if (queryDto.status) {
      query.andWhere('donation.status = :status', { status: queryDto.status });
    }

    if (queryDto.isAnonymous !== undefined) {
      query.andWhere('donation.isAnonymous = :isAnonymous', {
        isAnonymous: queryDto.isAnonymous,
      });
    }

    if (queryDto.isRecurring !== undefined) {
      query.andWhere('donation.isRecurring = :isRecurring', {
        isRecurring: queryDto.isRecurring,
      });
    }

    if (queryDto.fromDate && queryDto.toDate) {
      query.andWhere('donation.donatedAt BETWEEN :fromDate AND :toDate', {
        fromDate: queryDto.fromDate,
        toDate: queryDto.toDate,
      });
    } else if (queryDto.fromDate) {
      query.andWhere('donation.donatedAt >= :fromDate', {
        fromDate: queryDto.fromDate,
      });
    } else if (queryDto.toDate) {
      query.andWhere('donation.donatedAt <= :toDate', {
        toDate: queryDto.toDate,
      });
    }

    // Order by donation date (most recent first)
    query.orderBy('donation.donatedAt', 'DESC');

    const donations = await query.getMany();
    return donations;
  }

  /**
   * Get user's donation history
   * @param userId - User ID
   */
  async findByUser(userId: string): Promise<Donation[]> {
    return this.donationRepository.find({
      where: { userId, status: DonationStatus.COMPLETED },
      relations: ['fund'],
      order: { donatedAt: 'DESC' },
    });
  }

  /**
   * Get user's donation history with pagination (mobile app)
   * @param userId - User ID
   * @param page - Page number
   * @param limit - Items per page
   */
  async findUserDonations(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: Donation[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query = this.donationRepository
      .createQueryBuilder('donation')
      .leftJoinAndSelect('donation.fund', 'fund')
      .where('donation.userId = :userId', { userId })
      .orderBy('donation.donatedAt', 'DESC')
      .addOrderBy('donation.createdAt', 'DESC');

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
   * Get donations for a specific fund
   * @param fundId - Fund ID
   */
  async findByFund(fundId: string): Promise<Donation[]> {
    return this.donationRepository.find({
      where: { fundId, status: DonationStatus.COMPLETED },
      relations: ['user'],
      order: { donatedAt: 'DESC' },
    });
  }

  /**
   * Get a single donation by ID
   * @param id - Donation ID
   */
  async findOne(id: string): Promise<Donation> {
    const donation = await this.donationRepository.findOne({
      where: { id },
      relations: ['user', 'fund'],
    });

    if (!donation) {
      throw new NotFoundException(`Donation with ID "${id}" not found`);
    }

    return donation;
  }

  /**
   * Handle webhook from NotchPay
   * This is called when payment status changes
   * @param transactionId - NotchPay transaction ID
   * @param status - Payment status
   * @param metadata - Additional data from NotchPay
   */
  async handlePaymentWebhook(
    transactionId: string,
    status: 'complete' | 'pending' | 'failed',
    metadata?: any,
  ): Promise<void> {
    // Find donation by transaction ID
    const donation = await this.donationRepository.findOne({
      where: { transactionId },
      relations: ['fund', 'user'],
    });

    if (!donation) {
      this.logger.warn(
        `Received webhook for unknown transaction: ${transactionId}`,
      );
      return;
    }

    // If donation is already completed, skip
    if (donation.status === DonationStatus.COMPLETED) {
      this.logger.log(
        `Donation ${donation.id} already completed, skipping webhook`,
      );
      return;
    }

    // Update donation status based on payment status
    if (status === 'complete') {
      donation.status = DonationStatus.COMPLETED;
      donation.donatedAt = new Date();
      donation.paymentMetadata = {
        ...donation.paymentMetadata,
        ...metadata,
        completedAt: new Date().toISOString(),
      };

      await this.donationRepository.save(donation);

      // Update fund current amount
      await this.fundsService.updateCurrentAmount(
        donation.fundId,
        donation.amount,
      );

      this.logger.log(
        `Donation ${donation.id} completed successfully. Amount: ${donation.amount} ${donation.currency}`,
      );

      // Get donation count and total amount for this user
      const donationCount = await this.donationRepository.count({
        where: { userId: donation.userId, status: DonationStatus.COMPLETED },
      });

      const donationsForTotal = await this.donationRepository.find({
        where: { userId: donation.userId, status: DonationStatus.COMPLETED },
        select: ['amount'],
      });
      const totalAmount = donationsForTotal.reduce((sum, d) => sum + d.amount, 0);

      // Send notification to user
      try {
        await this.notificationsService.createDonationConfirmedNotification(
          donation.userId,
          donation.id,
          donation.amount,
          donation.fund?.titleFr || 'Collecte',
          donation.fund?.type,
          donationCount,
          totalAmount,
          donation.user?.displayName || undefined,
        );
        this.logger.log(`Notification sent for donation ${donation.id}`);
      } catch (error) {
        this.logger.error(`Failed to send notification for donation ${donation.id}:`, error);
        // Don't fail the webhook if notification fails
      }
    } else if (status === 'failed') {
      donation.status = DonationStatus.FAILED;
      donation.paymentMetadata = {
        ...donation.paymentMetadata,
        ...metadata,
        failedAt: new Date().toISOString(),
      };

      await this.donationRepository.save(donation);

      this.logger.log(`Donation ${donation.id} failed`);

      // TODO: Send notification to user
    }
  }

  /**
   * Verify payment status manually
   * @param id - Donation ID
   */
  async verifyPayment(id: string): Promise<Donation> {
    const donation = await this.findOne(id);

    if (!donation.transactionId) {
      throw new BadRequestException('This donation has no transaction ID');
    }

    if (donation.status === DonationStatus.COMPLETED) {
      return donation;
    }

    try {
      const paymentStatus = await this.notchPayService.verifyPayment(
        donation.transactionId,
      );

      // Update donation based on verification result
      await this.handlePaymentWebhook(
        donation.transactionId,
        paymentStatus.status,
        paymentStatus.metadata,
      );

      // Fetch updated donation
      return this.findOne(id);
    } catch (error) {
      this.logger.error(
        `Failed to verify payment for donation ${id}: ${error.message}`,
      );
      throw new BadRequestException('Failed to verify payment status');
    }
  }

  /**
   * Get donation statistics
   */
  async getStatistics(fundId?: string): Promise<{
    totalDonations: number;
    completedDonations: number;
    totalAmount: number;
    averageAmount: number;
    recentDonations: Donation[];
  }> {
    const whereClause = fundId
      ? { fundId, status: DonationStatus.COMPLETED }
      : { status: DonationStatus.COMPLETED };

    const totalDonations = await this.donationRepository.count({
      where: fundId ? { fundId } : {},
    });

    const completedDonations = await this.donationRepository.count({
      where: whereClause,
    });

    // Calculate total amount
    const totalResult = await this.donationRepository
      .createQueryBuilder('donation')
      .select('SUM(donation.amount)', 'total')
      .where(whereClause)
      .getRawOne();

    const totalAmount = Number(totalResult.total || 0);
    const averageAmount =
      completedDonations > 0 ? totalAmount / completedDonations : 0;

    // Get recent donations
    const recentDonations = await this.donationRepository.find({
      where: whereClause,
      relations: ['user', 'fund'],
      order: { donatedAt: 'DESC' },
      take: 10,
    });

    return {
      totalDonations,
      completedDonations,
      totalAmount,
      averageAmount,
      recentDonations,
    };
  }

  /**
   * Delete a donation (admin only, only if pending or failed)
   * @param id - Donation ID
   * @param adminId - ID of the admin deleting the donation
   * @param ipAddress - IP address of the request
   * @param userAgent - User agent of the request
   */
  async remove(
    id: string,
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const donation = await this.findOne(id);

    // Cannot delete completed donations
    if (donation.status === DonationStatus.COMPLETED) {
      throw new BadRequestException('Cannot delete completed donations');
    }

    // Log activity before deletion
    await this.logActivity(
      adminId,
      'deleted_donation',
      'donations',
      donation.id,
      {
        amount: donation.amount,
        fundId: donation.fundId,
        status: donation.status,
      },
      ipAddress,
      userAgent,
    );

    await this.donationRepository.remove(donation);
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

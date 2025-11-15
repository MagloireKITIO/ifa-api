import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Event } from '../entities/event.entity';
import { Testimony } from '../entities/testimony.entity';
import { Prayer } from '../entities/prayer.entity';
import { Donation } from '../entities/donation.entity';
import { AdminActivityLog } from '../entities/admin-activity-log.entity';
import {
  EventStatus,
  PrayerStatus,
  DonationStatus,
} from '../common/enums';
import { GetStatsDto } from './dto';

/**
 * Service for calculating dashboard statistics
 */
@Injectable()
export class DashboardStatsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Testimony)
    private readonly testimonyRepository: Repository<Testimony>,
    @InjectRepository(Prayer)
    private readonly prayerRepository: Repository<Prayer>,
    @InjectRepository(Donation)
    private readonly donationRepository: Repository<Donation>,
    @InjectRepository(AdminActivityLog)
    private readonly activityLogRepository: Repository<AdminActivityLog>,
  ) {}

  /**
   * Get dashboard statistics
   * @param queryDto - Optional date filters for donations
   */
  async getStats(queryDto: GetStatsDto) {
    // Default to current month if no dates provided
    const now = new Date();
    const fromDate = queryDto.fromDate
      ? new Date(queryDto.fromDate)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const toDate = queryDto.toDate
      ? new Date(queryDto.toDate)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Execute all queries in parallel for better performance
    const [
      upcomingEventsCount,
      totalTestimoniesCount,
      activePrayersCount,
      totalDonationsThisMonth,
    ] = await Promise.all([
      // Count upcoming events
      this.eventRepository.count({
        where: { status: EventStatus.UPCOMING },
      }),

      // Count total testimonies (no status filter since testimonies are published directly)
      this.testimonyRepository.count(),

      // Count active prayers
      this.prayerRepository.count({
        where: { status: PrayerStatus.ACTIVE },
      }),

      // Calculate total donations for this month
      this.donationRepository
        .createQueryBuilder('donation')
        .select('SUM(donation.amount)', 'total')
        .where('donation.status = :status', {
          status: DonationStatus.COMPLETED,
        })
        .andWhere('donation.donatedAt BETWEEN :fromDate AND :toDate', {
          fromDate,
          toDate,
        })
        .getRawOne(),
    ]);

    // Parse total donations amount
    const totalAmount = Number(totalDonationsThisMonth?.total || 0);

    return {
      events: {
        upcoming: upcomingEventsCount,
      },
      testimonies: {
        total: totalTestimoniesCount,
      },
      prayers: {
        active: activePrayersCount,
      },
      donations: {
        totalAmount: totalAmount,
        currency: 'XAF',
        period: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
        },
      },
    };
  }

  /**
   * Get recent admin activities
   * @param limit - Number of activities to retrieve (default: 10)
   */
  async getRecentActivities(limit: number = 10): Promise<AdminActivityLog[]> {
    // Exclude login/logout actions - only show CRUD operations
    const excludedActions = [
      'admin_login',
      'admin_logout',
      'token_refresh',
      'password_reset_requested',
      'password_reset_completed',
    ];

    return this.activityLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.admin', 'admin')
      .where('log.action NOT IN (:...excludedActions)', { excludedActions })
      .orderBy('log.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }
}

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prayer } from '../entities/prayer.entity';
import { PrayerReaction } from '../entities/prayer-reaction.entity';
import { AdminActivityLog } from '../entities/admin-activity-log.entity';
import { QueryPrayersDto, AddTestimonyDto, ReactPrayerDto } from './dto';
import { PrayerStatus, PrayerReactionType } from '../common/enums';

/**
 * Service for managing prayers with reactions and testimonies
 */
@Injectable()
export class PrayersService {
  constructor(
    @InjectRepository(Prayer)
    private readonly prayerRepository: Repository<Prayer>,
    @InjectRepository(PrayerReaction)
    private readonly reactionRepository: Repository<PrayerReaction>,
    @InjectRepository(AdminActivityLog)
    private readonly activityLogRepository: Repository<AdminActivityLog>,
  ) {}

  /**
   * Get all prayers with optional filters (Admin view - sees all prayers)
   * @param queryDto - Query filters
   */
  async findAll(queryDto: QueryPrayersDto): Promise<Prayer[]> {
    const query = this.prayerRepository
      .createQueryBuilder('prayer')
      .leftJoinAndSelect('prayer.user', 'user');

    // Apply filters
    if (queryDto.status) {
      query.andWhere('prayer.status = :status', { status: queryDto.status });
    }

    if (queryDto.isAnonymous !== undefined) {
      query.andWhere('prayer.isAnonymous = :isAnonymous', {
        isAnonymous: queryDto.isAnonymous,
      });
    }

    if (queryDto.language) {
      query.andWhere('prayer.language = :language', {
        language: queryDto.language,
      });
    }

    if (queryDto.fromDate && queryDto.toDate) {
      query.andWhere('prayer.createdAt BETWEEN :fromDate AND :toDate', {
        fromDate: queryDto.fromDate,
        toDate: queryDto.toDate,
      });
    } else if (queryDto.fromDate) {
      query.andWhere('prayer.createdAt >= :fromDate', {
        fromDate: queryDto.fromDate,
      });
    } else if (queryDto.toDate) {
      query.andWhere('prayer.createdAt <= :toDate', {
        toDate: queryDto.toDate,
      });
    }

    // Search in content (both languages)
    if (queryDto.search) {
      query.andWhere(
        '(LOWER(prayer.contentFr) LIKE LOWER(:search) OR LOWER(prayer.contentEn) LIKE LOWER(:search))',
        { search: `%${queryDto.search}%` },
      );
    }

    // Order by creation date (most recent first)
    query.orderBy('prayer.createdAt', 'DESC');

    const prayers = await query.getMany();

    // Hide user info for anonymous prayers
    return prayers.map((prayer) => {
      if (prayer.isAnonymous) {
        (prayer as any).user = undefined;
      }
      return prayer;
    });
  }

  /**
   * Get active prayers only (Public view - for mobile app)
   */
  async findActive(): Promise<Prayer[]> {
    const prayers = await this.prayerRepository.find({
      where: { status: PrayerStatus.ACTIVE },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    // Hide user info for anonymous prayers
    return prayers.map((prayer) => {
      if (prayer.isAnonymous) {
        (prayer as any).user = undefined;
      }
      return prayer;
    });
  }

  /**
   * Get a single prayer by ID with reactions
   * @param id - Prayer ID
   */
  async findOne(id: string): Promise<Prayer> {
    const prayer = await this.prayerRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!prayer) {
      throw new NotFoundException(`Prayer with ID "${id}" not found`);
    }

    // Hide user info for anonymous prayers
    if (prayer.isAnonymous) {
      (prayer as any).user = undefined;
    }

    return prayer;
  }

  /**
   * React to a prayer (prayed or fasted)
   * @param prayerId - Prayer ID
   * @param userId - User ID
   * @param reactDto - Reaction data
   */
  async react(
    prayerId: string,
    userId: string,
    reactDto: ReactPrayerDto,
  ): Promise<{ message: string; reaction: PrayerReaction }> {
    const prayer = await this.findOne(prayerId);

    // Check if user already has a reaction for this prayer
    const existingReaction = await this.reactionRepository.findOne({
      where: { prayerId, userId },
    });

    if (existingReaction) {
      // Update existing reaction if type changed
      if (existingReaction.type !== reactDto.type) {
        const oldType = existingReaction.type;
        existingReaction.type = reactDto.type;
        const updated = await this.reactionRepository.save(existingReaction);

        // Update counters
        await this.updateReactionCounters(prayer, oldType, reactDto.type);

        return {
          message: 'Reaction updated successfully',
          reaction: updated,
        };
      } else {
        throw new BadRequestException('You already have this reaction');
      }
    }

    // Create new reaction
    const reaction = this.reactionRepository.create({
      prayerId,
      userId,
      type: reactDto.type,
    });

    const saved = await this.reactionRepository.save(reaction);

    // Update counter
    if (reactDto.type === PrayerReactionType.PRAYED) {
      prayer.prayedCount++;
    } else if (reactDto.type === PrayerReactionType.FASTED) {
      prayer.fastedCount++;
    }
    await this.prayerRepository.save(prayer);

    // TODO: Send notification to prayer author
    // This will be implemented when notification module is ready

    return {
      message: 'Reaction added successfully',
      reaction: saved,
    };
  }

  /**
   * Remove reaction from a prayer
   * @param prayerId - Prayer ID
   * @param userId - User ID
   */
  async removeReaction(
    prayerId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const prayer = await this.findOne(prayerId);

    const reaction = await this.reactionRepository.findOne({
      where: { prayerId, userId },
    });

    if (!reaction) {
      throw new NotFoundException('Reaction not found');
    }

    // Update counter
    if (reaction.type === PrayerReactionType.PRAYED) {
      prayer.prayedCount = Math.max(0, prayer.prayedCount - 1);
    } else if (reaction.type === PrayerReactionType.FASTED) {
      prayer.fastedCount = Math.max(0, prayer.fastedCount - 1);
    }
    await this.prayerRepository.save(prayer);

    await this.reactionRepository.remove(reaction);

    return { message: 'Reaction removed successfully' };
  }

  /**
   * Add testimony to an answered prayer
   * @param prayerId - Prayer ID
   * @param userId - User ID (must be prayer author)
   * @param testimonyDto - Testimony data
   */
  async addTestimony(
    prayerId: string,
    userId: string,
    testimonyDto: AddTestimonyDto,
  ): Promise<Prayer> {
    const prayer = await this.findOne(prayerId);

    // Check if user is the prayer author
    if (prayer.userId !== userId) {
      throw new ForbiddenException(
        'Only the prayer author can add a testimony',
      );
    }

    // Check if prayer already has a testimony
    if (prayer.status === PrayerStatus.ANSWERED) {
      throw new BadRequestException('Prayer already has a testimony');
    }

    // Update prayer
    prayer.testimonyContentFr = testimonyDto.testimonyContentFr;
    prayer.testimonyContentEn = testimonyDto.testimonyContentEn;
    prayer.testimoniedAt = new Date();
    prayer.status = PrayerStatus.ANSWERED;

    const updated = await this.prayerRepository.save(prayer);

    // TODO: Send notification to those who reacted
    // This will be implemented when notification module is ready

    return updated;
  }

  /**
   * Delete a prayer (by author or admin)
   * @param id - Prayer ID
   * @param userId - User ID (author) or null if admin
   * @param adminId - Admin ID if deleted by admin
   * @param ipAddress - IP address of the request
   * @param userAgent - User agent of the request
   */
  async remove(
    id: string,
    userId?: string,
    adminId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const prayer = await this.findOne(id);

    // Check if user is the prayer author or admin
    if (userId && prayer.userId !== userId && !adminId) {
      throw new ForbiddenException('You can only delete your own prayers');
    }

    // Log activity if deleted by admin
    if (adminId) {
      await this.logActivity(
        adminId,
        'deleted_prayer',
        'prayers',
        prayer.id,
        {
          userId: prayer.userId,
          isAnonymous: prayer.isAnonymous,
          status: prayer.status,
          language: prayer.language,
        },
        ipAddress,
        userAgent,
      );
    }

    await this.prayerRepository.remove(prayer);
  }

  /**
   * Get count of prayers by status
   * Useful for displaying stats in admin UI
   */
  async getCountByStatus(): Promise<{
    active: number;
    answered: number;
    closed: number;
    total: number;
  }> {
    const [active, answered, closed, total] = await Promise.all([
      this.prayerRepository.count({
        where: { status: PrayerStatus.ACTIVE },
      }),
      this.prayerRepository.count({
        where: { status: PrayerStatus.ANSWERED },
      }),
      this.prayerRepository.count({
        where: { status: PrayerStatus.CLOSED },
      }),
      this.prayerRepository.count(),
    ]);

    return { active, answered, closed, total };
  }

  /**
   * Get user's reaction for a specific prayer
   * @param prayerId - Prayer ID
   * @param userId - User ID
   */
  async getUserReaction(
    prayerId: string,
    userId: string,
  ): Promise<PrayerReaction | null> {
    return this.reactionRepository.findOne({
      where: { prayerId, userId },
    });
  }

  /**
   * Helper method to update reaction counters when reaction type changes
   */
  private async updateReactionCounters(
    prayer: Prayer,
    oldType: PrayerReactionType,
    newType: PrayerReactionType,
  ): Promise<void> {
    // Decrement old counter
    if (oldType === PrayerReactionType.PRAYED) {
      prayer.prayedCount = Math.max(0, prayer.prayedCount - 1);
    } else if (oldType === PrayerReactionType.FASTED) {
      prayer.fastedCount = Math.max(0, prayer.fastedCount - 1);
    }

    // Increment new counter
    if (newType === PrayerReactionType.PRAYED) {
      prayer.prayedCount++;
    } else if (newType === PrayerReactionType.FASTED) {
      prayer.fastedCount++;
    }

    await this.prayerRepository.save(prayer);
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

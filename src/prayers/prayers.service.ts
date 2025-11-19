import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prayer } from '../entities/prayer.entity';
import { PrayerReaction } from '../entities/prayer-reaction.entity';
import { AdminActivityLog } from '../entities/admin-activity-log.entity';
import { Testimony } from '../entities/testimony.entity';
import {
  QueryPrayersDto,
  AddTestimonyDto,
  ReactPrayerDto,
  CreatePrayerDto,
  UpdatePrayerDto,
} from './dto';
import { PrayerStatus, PrayerReactionType } from '../common/enums';
import { NotificationsService } from '../notifications/services/notifications.service';

/**
 * Service for managing prayers with reactions and testimonies
 */
@Injectable()
export class PrayersService {
  private readonly logger = new Logger(PrayersService.name);

  constructor(
    @InjectRepository(Prayer)
    private readonly prayerRepository: Repository<Prayer>,
    @InjectRepository(PrayerReaction)
    private readonly reactionRepository: Repository<PrayerReaction>,
    @InjectRepository(AdminActivityLog)
    private readonly activityLogRepository: Repository<AdminActivityLog>,
    @InjectRepository(Testimony)
    private readonly testimonyRepository: Repository<Testimony>,
    private readonly notificationsService: NotificationsService,
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

    // Search in content
    if (queryDto.search) {
      query.andWhere(
        'LOWER(prayer.content) LIKE LOWER(:search)',
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

    // Send notification to prayer author
    try {
      const reactionType = reactDto.type === PrayerReactionType.PRAYED ? 'prayed' : 'fasted';
      await this.notificationsService.createPrayerReactionNotification(
        prayer.userId,
        prayerId,
        reactionType,
      );
      this.logger.log(`Notification sent for prayer reaction: ${prayerId}`);
    } catch (error) {
      this.logger.error(`Failed to send notification for prayer ${prayerId}:`, error);
      // Don't fail the reaction if notification fails
    }

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
    prayer.testimonyContent = testimonyDto.testimonyContent;
    prayer.testimoniedAt = new Date();
    prayer.status = PrayerStatus.ANSWERED;

    const updated = await this.prayerRepository.save(prayer);

    // Send notification to all users who reacted to this prayer
    try {
      // Get all unique user IDs who reacted to this prayer
      const reactions = await this.reactionRepository.find({
        where: { prayerId },
        relations: ['user'],
      });

      // Get unique user IDs (exclude the prayer author)
      const userIds = [...new Set(
        reactions
          .map((r) => r.userId)
          .filter((id) => id !== userId), // Exclude prayer author
      )];

      if (userIds.length > 0) {
        // Determine prayer author name (respect anonymity)
        const authorName = prayer.isAnonymous ? 'Anonyme' : (prayer.user?.displayName || 'Un frère/une sœur');

        await this.notificationsService.createPrayerTestimonyNotification(
          userIds,
          prayerId,
          authorName,
        );

        this.logger.log(`Sent testimony notification to ${userIds.length} user(s) for prayer: ${prayerId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send testimony notification for prayer ${prayerId}:`, error);
      // Don't fail the testimony if notification fails
    }

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
  ): Promise<{ deletedTestimoniesCount: number }> {
    const prayer = await this.findOne(id);

    // Check if user is the prayer author or admin
    if (userId && prayer.userId !== userId && !adminId) {
      throw new ForbiddenException('You can only delete your own prayers');
    }

    // Count linked testimonies that will be deleted via CASCADE
    const linkedTestimoniesCount = await this.testimonyRepository.count({
      where: { prayerId: id },
    });

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
          linkedTestimoniesCount,
        },
        ipAddress,
        userAgent,
      );
    }

    await this.prayerRepository.remove(prayer);

    return { deletedTestimoniesCount: linkedTestimoniesCount };
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
   * Get user's reactions for multiple prayers (bulk)
   * @param prayerIds - Array of Prayer IDs
   * @param userId - User ID
   */
  async getUserReactionsBulk(
    prayerIds: string[],
    userId: string,
  ): Promise<PrayerReaction[]> {
    if (!prayerIds.length) {
      return [];
    }

    return this.reactionRepository
      .createQueryBuilder('reaction')
      .where('reaction.userId = :userId', { userId })
      .andWhere('reaction.prayerId IN (:...prayerIds)', { prayerIds })
      .getMany();
  }

  /**
   * ============================================
   * PUBLIC & USER ENDPOINTS FOR MOBILE APP
   * ============================================
   */

  /**
   * Get all public prayers with pagination (PUBLIC)
   * GET /prayers/public
   *
   * LOGIQUE :
   * - Accessible sans authentification
   * - Retourne uniquement les prières actives par défaut
   * - Cache les infos user si isAnonymous = true
   * - TRI INTELLIGENT : Score basé sur engagement, fraîcheur et boost
   *
   * ALGORITHME DE FEED :
   * Score = (Engagement × 0.4) + (Fraîcheur × 0.3) + (Boost × 0.3)
   *
   * - Engagement: (prayedCount × 2) + (fastedCount × 3)
   *   Le jeûne a plus de poids car c'est un engagement plus fort
   *
   * - Fraîcheur: Points selon l'âge de la prière
   *   < 1h: 100 pts | 1-6h: 90 pts | 6-24h: 70 pts | 1-3j: 50 pts
   *   3-7j: 30 pts | 7-30j: 15 pts | > 30j: 5 pts
   *
   * - Boost: +100 pts si prière exaucée (témoignages prioritaires)
   */
  async findAllPublic(
    page: number = 1,
    limit: number = 20,
    status?: PrayerStatus,
  ): Promise<{
    data: Prayer[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const query = this.prayerRepository
      .createQueryBuilder('prayer')
      .leftJoinAndSelect('prayer.user', 'user');

    // Filter by status (default to ACTIVE)
    if (status) {
      query.andWhere('prayer.status = :status', { status });
    } else {
      query.andWhere('prayer.status = :status', { status: PrayerStatus.ACTIVE });
    }

    // 🧠 ALGORITHME DE FEED INTELLIGENT (style Twitter/Instagram)
    // Calcul du score de pertinence pour chaque prière
    // Score = (Engagement × 0.4) + (Freshness × 0.3) + (Answered Boost × 0.3)

    // On ajoute une colonne calculée "score" via addSelect
    query.addSelect(
      `
        (
          ((prayer.prayedCount * 2) + (prayer.fastedCount * 3)) * 0.4 +
          (CASE
            WHEN EXTRACT(EPOCH FROM (NOW() - prayer.createdAt)) < 3600 THEN 100
            WHEN EXTRACT(EPOCH FROM (NOW() - prayer.createdAt)) < 21600 THEN 90
            WHEN EXTRACT(EPOCH FROM (NOW() - prayer.createdAt)) < 86400 THEN 70
            WHEN EXTRACT(EPOCH FROM (NOW() - prayer.createdAt)) < 259200 THEN 50
            WHEN EXTRACT(EPOCH FROM (NOW() - prayer.createdAt)) < 604800 THEN 30
            WHEN EXTRACT(EPOCH FROM (NOW() - prayer.createdAt)) < 2592000 THEN 15
            ELSE 5
          END) * 0.3 +
          (CASE WHEN prayer.status = 'answered' THEN 100 ELSE 0 END) * 0.3
        )
      `,
      'relevance_score'
    );

    // Tri par score décroissant (meilleurs scores en premier)
    query.orderBy('relevance_score', 'DESC');

    // Fallback : si deux prières ont le même score, la plus récente d'abord
    query.addOrderBy('prayer.createdAt', 'DESC');

    // Pagination
    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    const [data, total] = await query.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    // Hide user info for anonymous prayers
    const prayers = data.map((prayer) => {
      if (prayer.isAnonymous) {
        (prayer as any).user = undefined;
      }
      return prayer;
    });

    return {
      data: prayers,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Get a single public prayer by ID (PUBLIC)
   * GET /prayers/public/:id
   */
  async findOnePublic(id: string): Promise<Prayer> {
    return this.findOne(id); // Utilise la méthode existante
  }

  /**
   * Create a new prayer (USER AUTH)
   * POST /prayers
   *
   * LOGIQUE :
   * - L'utilisateur doit être authentifié
   * - Créé avec status ACTIVE par défaut
   * - Compteurs initialisés à 0
   */
  async create(userId: string, createPrayerDto: CreatePrayerDto): Promise<any> {
    const prayer = this.prayerRepository.create({
      userId,
      content: createPrayerDto.content,
      isAnonymous: createPrayerDto.isAnonymous,
      language: createPrayerDto.language,
      status: PrayerStatus.ACTIVE,
      prayedCount: 0,
      fastedCount: 0,
    } as any);

    return await this.prayerRepository.save(prayer);
  }

  /**
   * Get my prayers (USER AUTH)
   * GET /prayers/my-prayers
   *
   * LOGIQUE :
   * - Retourne toutes les prières de l'utilisateur connecté
   * - Triées par date de création (plus récentes d'abord)
   */
  async findMyPrayers(userId: string): Promise<Prayer[]> {
    return this.prayerRepository.find({
      where: { userId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Update a prayer (USER AUTH)
   * PATCH /user/prayers/:id
   *
   * LOGIQUE :
   * - Seul le créateur peut modifier sa prière
   * - Modification possible uniquement si la prière est ACTIVE
   * - Au moins un champ (contentFr ou contentEn) doit être fourni
   */
  async update(
    id: string,
    userId: string,
    updatePrayerDto: UpdatePrayerDto,
  ): Promise<Prayer> {
    const prayer = await this.findOne(id);

    // Check if user is the prayer author
    if (prayer.userId !== userId) {
      throw new ForbiddenException('You can only update your own prayers');
    }

    // Check if prayer is still active
    if (prayer.status !== PrayerStatus.ACTIVE) {
      throw new BadRequestException(
        'You can only update prayers that are still active',
      );
    }

    // Update content if provided
    if (updatePrayerDto.content !== undefined) {
      prayer.content = updatePrayerDto.content;
    }

    return await this.prayerRepository.save(prayer);
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

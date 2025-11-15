import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Testimony } from '../entities/testimony.entity';
import { AdminActivityLog } from '../entities/admin-activity-log.entity';
import { Prayer } from '../entities/prayer.entity';
import {
  QueryTestimoniesDto,
  CreateTestimonyDto,
} from './dto';
import { PrayerStatus } from '../common/enums';

/**
 * Service for managing testimonies
 * Testimonies are now published directly without moderation
 */
@Injectable()
export class TestimoniesService {
  private readonly logger = new Logger(TestimoniesService.name);

  constructor(
    @InjectRepository(Testimony)
    private readonly testimonyRepository: Repository<Testimony>,
    @InjectRepository(AdminActivityLog)
    private readonly activityLogRepository: Repository<AdminActivityLog>,
    @InjectRepository(Prayer)
    private readonly prayerRepository: Repository<Prayer>,
  ) {}

  /**
   * Get all testimonies with optional filters (Admin view)
   * @param queryDto - Query filters
   */
  async findAll(queryDto: QueryTestimoniesDto): Promise<Testimony[]> {
    const query = this.testimonyRepository
      .createQueryBuilder('testimony')
      .leftJoinAndSelect('testimony.user', 'user');

    // Apply filters
    if (queryDto.isAnonymous !== undefined) {
      query.andWhere('testimony.isAnonymous = :isAnonymous', {
        isAnonymous: queryDto.isAnonymous,
      });
    }

    if (queryDto.language) {
      query.andWhere('testimony.language = :language', {
        language: queryDto.language,
      });
    }

    if (queryDto.fromDate && queryDto.toDate) {
      query.andWhere('testimony.submittedAt BETWEEN :fromDate AND :toDate', {
        fromDate: queryDto.fromDate,
        toDate: queryDto.toDate,
      });
    } else if (queryDto.fromDate) {
      query.andWhere('testimony.submittedAt >= :fromDate', {
        fromDate: queryDto.fromDate,
      });
    } else if (queryDto.toDate) {
      query.andWhere('testimony.submittedAt <= :toDate', {
        toDate: queryDto.toDate,
      });
    }

    // Search in content (both languages)
    if (queryDto.search) {
      query.andWhere(
        '(LOWER(testimony.contentFr) LIKE LOWER(:search) OR LOWER(testimony.contentEn) LIKE LOWER(:search))',
        { search: `%${queryDto.search}%` },
      );
    }

    // Order by submission date (most recent first)
    query.orderBy('testimony.submittedAt', 'DESC');

    const testimonies = await query.getMany();

    // Hide user info for anonymous testimonies
    return testimonies.map((testimony) => {
      if (testimony.isAnonymous) {
        (testimony as any).user = undefined;
      }
      return testimony;
    });
  }

  /**
   * Get a single testimony by ID
   * @param id - Testimony ID
   */
  async findOne(id: string): Promise<Testimony> {
    const testimony = await this.testimonyRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!testimony) {
      throw new NotFoundException(`Testimony with ID "${id}" not found`);
    }

    // Hide user info for anonymous testimonies
    if (testimony.isAnonymous) {
      (testimony as any).user = undefined;
    }

    return testimony;
  }

  /**
   * Delete a testimony
   * @param id - Testimony ID
   * @param adminId - ID of the admin deleting
   * @param ipAddress - IP address of the request
   * @param userAgent - User agent of the request
   */
  async remove(
    id: string,
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const testimony = await this.findOne(id);

    // Log activity before deletion
    await this.logActivity(
      adminId,
      'deleted_testimony',
      'testimonies',
      testimony.id,
      {
        userId: testimony.userId,
        isAnonymous: testimony.isAnonymous,
        language: testimony.language,
      },
      ipAddress,
      userAgent,
    );

    await this.testimonyRepository.remove(testimony);
  }

  /**
   * Get count of testimonies
   * Useful for displaying stats in admin UI
   */
  async getCountByStatus(): Promise<{
    total: number;
  }> {
    const total = await this.testimonyRepository.count();

    return { total };
  }

  /**
   * ============================================
   * PUBLIC & USER ENDPOINTS FOR MOBILE APP
   * ============================================
   */

  /**
   * Get all testimonies with pagination (PUBLIC)
   * GET /testimonies/public
   *
   * LOGIQUE :
   * - Accessible sans authentification
   * - Retourne tous les témoignages publiés
   * - Cache les infos user si isAnonymous = true
   * - Triés par date de soumission (plus récents d'abord)
   */
  async findAllPublic(
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: Testimony[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const query = this.testimonyRepository
      .createQueryBuilder('testimony')
      .leftJoinAndSelect('testimony.user', 'user')
      .leftJoinAndSelect('testimony.prayer', 'prayer')
      .orderBy('testimony.submittedAt', 'DESC');

    // Pagination
    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    const [data, total] = await query.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    // Hide user info for anonymous testimonies
    const testimonies = data.map((testimony) => {
      if (testimony.isAnonymous) {
        (testimony as any).user = undefined;
      }
      return testimony;
    });

    return {
      data: testimonies,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Get a single testimony by ID (PUBLIC)
   * GET /testimonies/public/:id
   */
  async findOnePublic(id: string): Promise<Testimony> {
    const testimony = await this.testimonyRepository.findOne({
      where: { id },
      relations: ['user', 'prayer'],
    });

    if (!testimony) {
      throw new NotFoundException(`Testimony with ID "${id}" not found`);
    }

    // Hide user info for anonymous testimonies
    if (testimony.isAnonymous) {
      (testimony as any).user = undefined;
    }

    return testimony;
  }

  /**
   * Create a new testimony (USER AUTH)
   * POST /testimonies
   *
   * LOGIQUE :
   * - L'utilisateur doit être authentifié
   * - Le témoignage est publié immédiatement sans validation
   * - Si le témoignage est lié à une prière, met à jour la prière avec le témoignage
   */
  async create(
    userId: string,
    createTestimonyDto: CreateTestimonyDto,
  ): Promise<Testimony> {
    // Validate: at least one content field must be provided
    if (!createTestimonyDto.contentFr && !createTestimonyDto.contentEn) {
      throw new BadRequestException(
        'At least one content field (contentFr or contentEn) must be provided',
      );
    }

    // Si le témoignage est lié à une prière, vérifier que la prière existe et appartient à l'utilisateur
    if (createTestimonyDto.prayerId) {
      const prayer = await this.prayerRepository.findOne({
        where: { id: createTestimonyDto.prayerId },
      });

      if (!prayer) {
        throw new NotFoundException('Prayer not found');
      }

      if (prayer.userId !== userId) {
        throw new ForbiddenException('You can only add testimony to your own prayers');
      }

      // Mettre à jour la prière avec le témoignage
      if (createTestimonyDto.contentFr) {
        prayer.testimonyContentFr = createTestimonyDto.contentFr;
      }
      if (createTestimonyDto.contentEn) {
        prayer.testimonyContentEn = createTestimonyDto.contentEn;
      }
      prayer.testimoniedAt = new Date();
      prayer.status = PrayerStatus.ANSWERED;

      await this.prayerRepository.save(prayer);

      this.logger.log(
        `Prayer ${prayer.id} updated with testimony content and marked as answered`,
      );
    }

    // Create testimony entity
    const testimony = new Testimony();
    testimony.isAnonymous = createTestimonyDto.isAnonymous;
    testimony.language = createTestimonyDto.language;
    testimony.submittedAt = new Date();

    if (!createTestimonyDto.isAnonymous) {
      testimony.userId = userId;
    }

    if (createTestimonyDto.contentFr) {
      testimony.contentFr = createTestimonyDto.contentFr;
    }

    if (createTestimonyDto.contentEn) {
      testimony.contentEn = createTestimonyDto.contentEn;
    }

    if (createTestimonyDto.prayerId) {
      testimony.prayerId = createTestimonyDto.prayerId;
    }

    const savedTestimony = await this.testimonyRepository.save(testimony);

    this.logger.log(
      `Testimony created and published directly (ID: ${savedTestimony.id})`,
    );

    return savedTestimony;
  }

  /**
   * Get my testimonies (USER AUTH)
   * GET /testimonies/my-testimonies
   *
   * LOGIQUE :
   * - Retourne tous les témoignages de l'utilisateur connecté
   */
  async findMyTestimonies(userId: string): Promise<Testimony[]> {
    return this.testimonyRepository.find({
      where: { userId },
      relations: ['user', 'prayer'],
      order: { submittedAt: 'DESC' },
    });
  }

  /**
   * Delete my testimony (USER AUTH)
   * DELETE /testimonies/:id
   *
   * LOGIQUE :
   * - L'utilisateur peut supprimer uniquement ses propres témoignages
   */
  async removeByUser(id: string, userId: string): Promise<void> {
    const testimony = await this.testimonyRepository.findOne({
      where: { id },
    });

    if (!testimony) {
      throw new NotFoundException(`Testimony with ID "${id}" not found`);
    }

    // Check if user is the testimony author
    if (testimony.userId !== userId) {
      throw new ForbiddenException('You can only delete your own testimonies');
    }

    await this.testimonyRepository.remove(testimony);
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

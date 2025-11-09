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
import {
  ApproveTestimonyDto,
  RejectTestimonyDto,
  QueryTestimoniesDto,
  CreateTestimonyDto,
} from './dto';
import { TestimonyStatus } from '../common/enums';
import { NotificationsService } from '../notifications/services/notifications.service';

/**
 * Service for managing testimonies with admin moderation
 */
@Injectable()
export class TestimoniesService {
  private readonly logger = new Logger(TestimoniesService.name);

  constructor(
    @InjectRepository(Testimony)
    private readonly testimonyRepository: Repository<Testimony>,
    @InjectRepository(AdminActivityLog)
    private readonly activityLogRepository: Repository<AdminActivityLog>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Get all testimonies with optional filters (Admin view - sees all statuses)
   * @param queryDto - Query filters
   */
  async findAll(queryDto: QueryTestimoniesDto): Promise<Testimony[]> {
    const query = this.testimonyRepository
      .createQueryBuilder('testimony')
      .leftJoinAndSelect('testimony.user', 'user')
      .leftJoinAndSelect('testimony.approvedBy', 'approvedBy');

    // Apply filters
    if (queryDto.status) {
      query.andWhere('testimony.status = :status', { status: queryDto.status });
    }

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
   * Get approved testimonies only (Public view - for mobile app)
   */
  async findApproved(): Promise<Testimony[]> {
    const testimonies = await this.testimonyRepository.find({
      where: { status: TestimonyStatus.APPROVED },
      relations: ['user'],
      order: { approvedAt: 'DESC' },
    });

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
      relations: ['user', 'approvedBy'],
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
   * Approve a testimony
   * @param id - Testimony ID
   * @param approveDto - Approval data with optional note
   * @param adminId - ID of the admin approving
   * @param ipAddress - IP address of the request
   * @param userAgent - User agent of the request
   */
  async approve(
    id: string,
    approveDto: ApproveTestimonyDto,
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Testimony> {
    const testimony = await this.findOne(id);

    // Check if already approved or rejected
    if (testimony.status === TestimonyStatus.APPROVED) {
      throw new ForbiddenException('Testimony is already approved');
    }

    // Update testimony
    testimony.status = TestimonyStatus.APPROVED;
    testimony.approvedAt = new Date();
    testimony.approvedById = adminId;

    const updated = await this.testimonyRepository.save(testimony);

    // Log activity
    await this.logActivity(
      adminId,
      'approved_testimony',
      'testimonies',
      updated.id,
      {
        userId: testimony.userId,
        isAnonymous: testimony.isAnonymous,
        language: testimony.language,
        adminNote: approveDto.adminNote,
      },
      ipAddress,
      userAgent,
    );

    // Send notification to user (if not anonymous)
    if (!testimony.isAnonymous && testimony.userId) {
      try {
        await this.notificationsService.createTestimonyApprovedNotification(
          testimony.userId,
          testimony.id,
        );
        this.logger.log(`Notification sent for approved testimony: ${testimony.id}`);
      } catch (error) {
        this.logger.error(`Failed to send notification for testimony ${testimony.id}:`, error);
        // Don't fail the approval if notification fails
      }
    }

    return updated;
  }

  /**
   * Reject a testimony
   * @param id - Testimony ID
   * @param rejectDto - Rejection data with reason
   * @param adminId - ID of the admin rejecting
   * @param ipAddress - IP address of the request
   * @param userAgent - User agent of the request
   */
  async reject(
    id: string,
    rejectDto: RejectTestimonyDto,
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Testimony> {
    const testimony = await this.findOne(id);

    // Check if already approved or rejected
    if (testimony.status === TestimonyStatus.REJECTED) {
      throw new ForbiddenException('Testimony is already rejected');
    }

    // Update testimony
    testimony.status = TestimonyStatus.REJECTED;

    const updated = await this.testimonyRepository.save(testimony);

    // Log activity with rejection reason
    await this.logActivity(
      adminId,
      'rejected_testimony',
      'testimonies',
      updated.id,
      {
        userId: testimony.userId,
        isAnonymous: testimony.isAnonymous,
        language: testimony.language,
        reason: rejectDto.reason,
      },
      ipAddress,
      userAgent,
    );

    // Send notification to user (if not anonymous) about rejection
    // Note: We could create a TESTIMONY_REJECTED notification template if needed
    // For now, we'll skip this as it might be sensitive
    // Uncomment below if you want to notify users about rejections:
    /*
    if (!testimony.isAnonymous && testimony.userId) {
      try {
        await this.notificationsService.createTestimonyRejectedNotification(
          testimony.userId,
          testimony.id,
        );
        this.logger.log(`Notification sent for rejected testimony: ${testimony.id}`);
      } catch (error) {
        this.logger.error(`Failed to send notification for testimony ${testimony.id}:`, error);
      }
    }
    */

    return updated;
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
        status: testimony.status,
        language: testimony.language,
      },
      ipAddress,
      userAgent,
    );

    await this.testimonyRepository.remove(testimony);
  }

  /**
   * Get count of testimonies by status
   * Useful for displaying badges in admin UI
   */
  async getCountByStatus(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  }> {
    const [pending, approved, rejected, total] = await Promise.all([
      this.testimonyRepository.count({
        where: { status: TestimonyStatus.PENDING },
      }),
      this.testimonyRepository.count({
        where: { status: TestimonyStatus.APPROVED },
      }),
      this.testimonyRepository.count({
        where: { status: TestimonyStatus.REJECTED },
      }),
      this.testimonyRepository.count(),
    ]);

    return { pending, approved, rejected, total };
  }

  /**
   * ============================================
   * PUBLIC & USER ENDPOINTS FOR MOBILE APP
   * ============================================
   */

  /**
   * Get all approved testimonies with pagination (PUBLIC)
   * GET /testimonies/public
   *
   * LOGIQUE :
   * - Accessible sans authentification
   * - Retourne uniquement les témoignages APPROVED
   * - Cache les infos user si isAnonymous = true
   * - Triés par date d'approbation (plus récents d'abord)
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
      .where('testimony.status = :status', { status: TestimonyStatus.APPROVED })
      .orderBy('testimony.approvedAt', 'DESC');

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
   * Get a single approved testimony by ID (PUBLIC)
   * GET /testimonies/public/:id
   */
  async findOnePublic(id: string): Promise<Testimony> {
    const testimony = await this.testimonyRepository.findOne({
      where: { id, status: TestimonyStatus.APPROVED },
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
   * - Créé avec status PENDING (en attente de modération)
   * - L'admin devra l'approuver avant qu'il soit visible publiquement
   */
  async create(
    userId: string,
    createTestimonyDto: CreateTestimonyDto,
  ): Promise<any> {
    // Validate: at least one content field must be provided
    if (!createTestimonyDto.contentFr && !createTestimonyDto.contentEn) {
      throw new BadRequestException(
        'At least one content field (contentFr or contentEn) must be provided',
      );
    }

    const testimony = this.testimonyRepository.create({
      userId: createTestimonyDto.isAnonymous ? null : userId,
      contentFr: createTestimonyDto.contentFr || null,
      contentEn: createTestimonyDto.contentEn || null,
      isAnonymous: createTestimonyDto.isAnonymous,
      prayerId: createTestimonyDto.prayerId || null,
      language: createTestimonyDto.language,
      status: TestimonyStatus.PENDING,
      submittedAt: new Date(),
    } as any);

    return await this.testimonyRepository.save(testimony);
  }

  /**
   * Get my testimonies (USER AUTH)
   * GET /testimonies/my-testimonies
   *
   * LOGIQUE :
   * - Retourne tous les témoignages de l'utilisateur connecté
   * - Inclut tous les statuts (PENDING, APPROVED, REJECTED)
   * - Permet à l'utilisateur de voir l'état de ses soumissions
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
   * - Seulement si le status est PENDING ou REJECTED (pas APPROVED)
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

    // Don't allow deletion of approved testimonies
    if (testimony.status === TestimonyStatus.APPROVED) {
      throw new ForbiddenException(
        'Cannot delete an approved testimony. Please contact an admin.',
      );
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

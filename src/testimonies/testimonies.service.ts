import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Testimony } from '../entities/testimony.entity';
import { AdminActivityLog } from '../entities/admin-activity-log.entity';
import {
  ApproveTestimonyDto,
  RejectTestimonyDto,
  QueryTestimoniesDto,
} from './dto';
import { TestimonyStatus } from '../common/enums';

/**
 * Service for managing testimonies with admin moderation
 */
@Injectable()
export class TestimoniesService {
  constructor(
    @InjectRepository(Testimony)
    private readonly testimonyRepository: Repository<Testimony>,
    @InjectRepository(AdminActivityLog)
    private readonly activityLogRepository: Repository<AdminActivityLog>,
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

    // TODO: Send notification to user (if not anonymous)
    // This will be implemented when notification module is ready

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

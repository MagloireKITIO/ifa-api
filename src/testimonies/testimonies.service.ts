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
import { StorageService } from '../common/services/storage.service';

/**
 * Service for managing testimonies
 * Testimonies are now published directly without moderation
 * Supports text, audio, or both
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
    private readonly storageService: StorageService,
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

    // Search in content
    if (queryDto.search) {
      query.andWhere(
        'LOWER(testimony.content) LIKE LOWER(:search)',
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
   * Upload audio file to Supabase Storage (USER AUTH)
   * POST /user/testimonies/upload-audio
   *
   * LOGIQUE :
   * - Upload le fichier audio vers Supabase Storage
   * - Valide la durée (max 5 min) et la taille
   * - Retourne l'URL publique du fichier
   */
  async uploadAudio(
    file: Buffer,
    mimetype: string,
    duration?: number,
  ): Promise<string> {
    return this.storageService.uploadAudio(file, mimetype, duration);
  }

  /**
   * Create a new testimony (USER AUTH)
   * POST /user/testimonies
   *
   * LOGIQUE :
   * - L'utilisateur doit être authentifié
   * - Le témoignage est publié immédiatement sans validation
   * - Peut contenir texte, audio, ou les deux
   * - Au moins l'un des deux (content OU audioUrl) doit être fourni
   * - Si le témoignage est lié à une prière, met à jour la prière avec le témoignage
   */
  async create(
    userId: string,
    createTestimonyDto: CreateTestimonyDto,
  ): Promise<Testimony> {
    // Valider qu'au moins content OU audioUrl est fourni
    if (!createTestimonyDto.content && !createTestimonyDto.audioUrl) {
      throw new BadRequestException('Either content or audioUrl must be provided');
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

      // Mettre à jour la prière avec le témoignage (texte uniquement pour l'instant)
      if (createTestimonyDto.content) {
        prayer.testimonyContent = createTestimonyDto.content;
      }
      prayer.testimoniedAt = new Date();
      prayer.status = PrayerStatus.ANSWERED;

      await this.prayerRepository.save(prayer);

      this.logger.log(
        `Prayer ${prayer.id} updated with testimony and marked as answered`,
      );
    }

    // Create testimony entity
    const testimony = new Testimony();
    testimony.content = createTestimonyDto.content ?? null;
    testimony.audioUrl = createTestimonyDto.audioUrl ?? null;
    testimony.audioDuration = createTestimonyDto.audioDuration ?? null;
    testimony.isAnonymous = createTestimonyDto.isAnonymous;
    testimony.language = createTestimonyDto.language;
    testimony.submittedAt = new Date();

    if (!createTestimonyDto.isAnonymous) {
      testimony.userId = userId;
    }

    if (createTestimonyDto.prayerId) {
      testimony.prayerId = createTestimonyDto.prayerId;
    }

    const savedTestimony = await this.testimonyRepository.save(testimony);

    this.logger.log(
      `Testimony created and published directly (ID: ${savedTestimony.id}, type: ${testimony.content ? 'text' : ''}${testimony.content && testimony.audioUrl ? '+' : ''}${testimony.audioUrl ? 'audio' : ''})`,
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
   * DELETE /user/testimonies/:id
   *
   * LOGIQUE :
   * - L'utilisateur peut supprimer uniquement ses propres témoignages
   * - Si le témoignage a un audio, il est aussi supprimé de Supabase Storage
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

    // Supprimer l'audio de Supabase Storage si présent
    if (testimony.audioUrl) {
      try {
        await this.storageService.deleteAudio(testimony.audioUrl);
        this.logger.log(`Deleted audio file for testimony ${id}`);
      } catch (error) {
        this.logger.error(`Failed to delete audio file for testimony ${id}:`, error);
        // Continue avec la suppression du témoignage même si la suppression de l'audio échoue
      }
    }

    await this.testimonyRepository.remove(testimony);

    this.logger.log(`Testimony ${id} deleted by user ${userId}`);
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

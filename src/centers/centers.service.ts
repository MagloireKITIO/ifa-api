import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Center } from '../entities/center.entity';
import { AdminActivityLog } from '../entities/admin-activity-log.entity';
import {
  CreateCenterDto,
  UpdateCenterDto,
  QueryCentersDto,
  QueryPublicCentersDto,
} from './dto';

/**
 * Service for managing centers with activity logging
 */
@Injectable()
export class CentersService {
  constructor(
    @InjectRepository(Center)
    private readonly centerRepository: Repository<Center>,
    @InjectRepository(AdminActivityLog)
    private readonly activityLogRepository: Repository<AdminActivityLog>,
  ) {}

  /**
   * Create a new center (Admin)
   * @param createCenterDto - Center data
   * @param adminId - ID of the admin creating the center
   * @param ipAddress - IP address of the request
   * @param userAgent - User agent of the request
   */
  async create(
    createCenterDto: CreateCenterDto,
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Center> {
    // Create center
    const center = this.centerRepository.create({
      ...createCenterDto,
      isActive: createCenterDto.isActive !== undefined ? createCenterDto.isActive : true,
    });

    const savedCenter = await this.centerRepository.save(center);

    // Log activity
    await this.logActivity(
      adminId,
      'created_center',
      'centers',
      savedCenter.id,
      {
        nameFr: savedCenter.nameFr,
        nameEn: savedCenter.nameEn,
        city: savedCenter.city,
        country: savedCenter.country,
      },
      ipAddress,
      userAgent,
    );

    return savedCenter;
  }

  /**
   * Get all centers with filters (Admin)
   * @param queryDto - Query filters
   */
  async findAll(queryDto: QueryCentersDto): Promise<Center[]> {
    const query = this.centerRepository.createQueryBuilder('center');

    // Apply filters
    if (queryDto.isActive !== undefined) {
      query.andWhere('center.isActive = :isActive', {
        isActive: queryDto.isActive,
      });
    }

    if (queryDto.city) {
      query.andWhere('LOWER(center.city) = LOWER(:city)', {
        city: queryDto.city,
      });
    }

    if (queryDto.country) {
      query.andWhere('LOWER(center.country) = LOWER(:country)', {
        country: queryDto.country,
      });
    }

    // Search in name (both languages)
    if (queryDto.search) {
      query.andWhere(
        '(LOWER(center.nameFr) LIKE LOWER(:search) OR LOWER(center.nameEn) LIKE LOWER(:search))',
        { search: `%${queryDto.search}%` },
      );
    }

    // Order: active first, then by creation date
    query.orderBy('center.isActive', 'DESC').addOrderBy('center.createdAt', 'DESC');

    return await query.getMany();
  }

  /**
   * Get active centers for public display (mobile app)
   * @param queryDto - Query filters
   */
  async findPublicCenters(queryDto: QueryPublicCentersDto): Promise<Center[]> {
    const query = this.centerRepository
      .createQueryBuilder('center')
      .where('center.isActive = :isActive', { isActive: true });

    // Apply filters
    if (queryDto.city) {
      query.andWhere('LOWER(center.city) = LOWER(:city)', {
        city: queryDto.city,
      });
    }

    if (queryDto.country) {
      query.andWhere('LOWER(center.country) = LOWER(:country)', {
        country: queryDto.country,
      });
    }

    // Order by creation date
    query.orderBy('center.createdAt', 'DESC');

    const centers = await query.getMany();

    // If user location is provided, calculate distance and sort by proximity
    if (queryDto.latitude && queryDto.longitude) {
      return this.sortByDistance(
        centers,
        queryDto.latitude,
        queryDto.longitude,
      );
    }

    return centers;
  }

  /**
   * Get nearby centers for public display (mobile app)
   * @param latitude - User latitude
   * @param longitude - User longitude
   * @param radiusKm - Search radius in kilometers (default: 50km)
   */
  async findNearbyCenters(
    latitude: number,
    longitude: number,
    radiusKm: number = 50,
  ): Promise<Center[]> {
    // Get all active centers
    const centers = await this.centerRepository.find({
      where: { isActive: true },
    });

    // Filter by distance and sort
    const centersWithDistance = centers
      .map((center) => {
        if (!center.latitude || !center.longitude) {
          return null;
        }

        const distance = this.calculateDistance(
          latitude,
          longitude,
          center.latitude,
          center.longitude,
        );

        return {
          center,
          distance,
        };
      })
      .filter((item): item is { center: Center; distance: number } =>
        item !== null && item.distance <= radiusKm
      )
      .sort((a, b) => a.distance - b.distance);

    return centersWithDistance.map((item) => item.center);
  }

  /**
   * Get a single center by ID
   * @param id - Center ID
   */
  async findOne(id: string): Promise<Center> {
    const center = await this.centerRepository.findOne({
      where: { id },
    });

    if (!center) {
      throw new NotFoundException(`Center with ID "${id}" not found`);
    }

    return center;
  }

  /**
   * Get a single active center by ID for public display (mobile app)
   * @param id - Center ID
   */
  async findPublicCenterById(id: string): Promise<Center> {
    const center = await this.centerRepository.findOne({
      where: {
        id,
        isActive: true,
      },
    });

    if (!center) {
      throw new NotFoundException(
        `Active center with ID "${id}" not found`,
      );
    }

    return center;
  }

  /**
   * Update a center (Admin)
   * @param id - Center ID
   * @param updateCenterDto - Updated center data
   * @param adminId - ID of the admin updating the center
   * @param ipAddress - IP address of the request
   * @param userAgent - User agent of the request
   */
  async update(
    id: string,
    updateCenterDto: UpdateCenterDto,
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Center> {
    const center = await this.findOne(id);

    // Update center
    Object.assign(center, updateCenterDto);
    const updatedCenter = await this.centerRepository.save(center);

    // Log activity
    await this.logActivity(
      adminId,
      'updated_center',
      'centers',
      updatedCenter.id,
      {
        nameFr: updatedCenter.nameFr,
        nameEn: updatedCenter.nameEn,
        changes: updateCenterDto,
      },
      ipAddress,
      userAgent,
    );

    return updatedCenter;
  }

  /**
   * Delete a center (Admin)
   * @param id - Center ID
   * @param adminId - ID of the admin deleting the center
   * @param ipAddress - IP address of the request
   * @param userAgent - User agent of the request
   */
  async remove(
    id: string,
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const center = await this.findOne(id);

    // Log activity before deletion
    await this.logActivity(
      adminId,
      'deleted_center',
      'centers',
      center.id,
      {
        nameFr: center.nameFr,
        nameEn: center.nameEn,
        city: center.city,
        country: center.country,
      },
      ipAddress,
      userAgent,
    );

    await this.centerRepository.remove(center);
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * @param lat1 - Latitude of point 1
   * @param lon1 - Longitude of point 1
   * @param lat2 - Latitude of point 2
   * @param lon2 - Longitude of point 2
   * @returns Distance in kilometers
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  /**
   * Convert degrees to radians
   */
  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Sort centers by distance from a given location
   */
  private sortByDistance(
    centers: Center[],
    latitude: number,
    longitude: number,
  ): Center[] {
    return centers
      .map((center) => {
        if (!center.latitude || !center.longitude) {
          return {
            center,
            distance: Infinity,
          };
        }

        const distance = this.calculateDistance(
          latitude,
          longitude,
          center.latitude,
          center.longitude,
        );

        return {
          center,
          distance,
        };
      })
      .sort((a, b) => a.distance - b.distance)
      .map((item) => item.center);
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

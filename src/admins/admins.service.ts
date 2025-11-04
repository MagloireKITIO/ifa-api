import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from '../entities/admin.entity';
import { CreateAdminDto, UpdateAdminDto, ChangePasswordDto } from './dto';

@Injectable()
export class AdminsService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
  ) {}

  /**
   * Find an admin by email
   * @param email - Admin email
   * @param includePassword - Whether to include password in the result (for authentication)
   */
  async findByEmail(
    email: string,
    includePassword = false,
  ): Promise<Admin | null> {
    const query = this.adminRepository.createQueryBuilder('admin');

    if (includePassword) {
      query.addSelect('admin.password');
    }

    return query.where('admin.email = :email', { email }).getOne();
  }

  /**
   * Find an admin by ID
   * @param id - Admin ID
   */
  async findById(id: string): Promise<Admin> {
    const admin = await this.adminRepository.findOne({ where: { id } });

    if (!admin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    return admin;
  }

  /**
   * Find all admins
   * @param includeInactive - Whether to include inactive admins
   */
  async findAll(includeInactive = false): Promise<Admin[]> {
    const query = this.adminRepository.createQueryBuilder('admin');

    if (!includeInactive) {
      query.where('admin.isActive = :isActive', { isActive: true });
    }

    return query.orderBy('admin.createdAt', 'DESC').getMany();
  }

  /**
   * Create a new admin
   * @param createAdminDto - Data to create admin
   */
  async create(createAdminDto: CreateAdminDto): Promise<Admin> {
    // Check if admin with this email already exists
    const existingAdmin = await this.findByEmail(createAdminDto.email);

    if (existingAdmin) {
      throw new ConflictException(
        `Admin with email ${createAdminDto.email} already exists`,
      );
    }

    // Create new admin (password will be hashed automatically by @BeforeInsert hook)
    const admin = this.adminRepository.create(createAdminDto);

    return this.adminRepository.save(admin);
  }

  /**
   * Update an admin
   * @param id - Admin ID
   * @param updateAdminDto - Data to update
   */
  async update(id: string, updateAdminDto: UpdateAdminDto): Promise<Admin> {
    const admin = await this.findById(id);

    // If email is being updated, check if it's already taken
    if (updateAdminDto.email && updateAdminDto.email !== admin.email) {
      const existingAdmin = await this.findByEmail(updateAdminDto.email);

      if (existingAdmin) {
        throw new ConflictException(
          `Admin with email ${updateAdminDto.email} already exists`,
        );
      }
    }

    // Update admin
    Object.assign(admin, updateAdminDto);

    return this.adminRepository.save(admin);
  }

  /**
   * Change admin password
   * @param id - Admin ID
   * @param changePasswordDto - Current and new password
   */
  async changePassword(
    id: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    // Fetch admin with password
    const admin = await this.adminRepository
      .createQueryBuilder('admin')
      .addSelect('admin.password')
      .where('admin.id = :id', { id })
      .getOne();

    if (!admin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    // Verify current password
    const isPasswordValid = await admin.validatePassword(
      changePasswordDto.currentPassword,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Update password (will be hashed automatically by @BeforeUpdate hook)
    admin.password = changePasswordDto.newPassword;

    await this.adminRepository.save(admin);
  }

  /**
   * Soft delete an admin (set isActive to false)
   * @param id - Admin ID
   */
  async softDelete(id: string): Promise<void> {
    const admin = await this.findById(id);

    admin.isActive = false;

    await this.adminRepository.save(admin);
  }

  /**
   * Restore a soft-deleted admin
   * @param id - Admin ID
   */
  async restore(id: string): Promise<Admin> {
    const admin = await this.adminRepository.findOne({ where: { id } });

    if (!admin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    admin.isActive = true;

    return this.adminRepository.save(admin);
  }

  /**
   * Update last login timestamp
   * @param id - Admin ID
   */
  async updateLastLogin(id: string): Promise<void> {
    await this.adminRepository.update(id, { lastLoginAt: new Date() });
  }
}

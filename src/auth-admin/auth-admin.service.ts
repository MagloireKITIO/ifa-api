import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminsService } from '../admins/admins.service';
import { Admin } from '../entities/admin.entity';
import { AdminActivityLog } from '../entities/admin-activity-log.entity';
import { LoginAdminDto, AuthResponseDto } from './dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthAdminService {
  constructor(
    private readonly adminsService: AdminsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(AdminActivityLog)
    private readonly activityLogRepository: Repository<AdminActivityLog>,
  ) {}

  /**
   * Validate admin credentials and generate tokens
   * @param loginAdminDto - Email and password
   * @param ipAddress - IP address of the request
   * @param userAgent - User agent of the browser
   */
  async login(
    loginAdminDto: LoginAdminDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    const { email, password } = loginAdminDto;

    // Find admin by email (include password for validation)
    const admin = await this.adminsService.findByEmail(email, true);

    if (!admin) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if admin is active
    if (!admin.isActive) {
      throw new UnauthorizedException('Admin account is inactive');
    }

    // Validate password
    console.log('🔐 Validating password for admin:', admin.email);
    console.log('🔐 Password from DB (hashed):', admin.password?.substring(0, 20) + '...');
    console.log('🔐 Password from request:', password);

    const isPasswordValid = await admin.validatePassword(password);
    console.log('🔐 Password validation result:', isPasswordValid);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last login timestamp
    await this.adminsService.updateLastLogin(admin.id);

    // Generate tokens
    const accessToken = this.generateAccessToken(admin);
    const refreshToken = this.generateRefreshToken(admin);

    // Log login activity
    await this.logActivity({
      adminId: admin.id,
      action: 'admin_login',
      entityType: 'admin',
      entityId: admin.id,
      metadata: { email: admin.email },
      ipAddress,
      userAgent,
    });

    // Remove password from response
    const { password: _, ...adminWithoutPassword } = admin;

    return {
      admin: adminWithoutPassword,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token using refresh token
   * @param admin - Admin from JwtAdminRefreshStrategy
   */
  async refresh(admin: Admin): Promise<Omit<AuthResponseDto, 'admin'>> {
    // Generate new tokens (token rotation for security)
    const accessToken = this.generateAccessToken(admin);
    const refreshToken = this.generateRefreshToken(admin);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Logout admin (log the activity)
   * @param admin - Current admin
   * @param ipAddress - IP address of the request
   * @param userAgent - User agent of the browser
   */
  async logout(
    admin: Admin,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    // Log logout activity
    await this.logActivity({
      adminId: admin.id,
      action: 'admin_logout',
      entityType: 'admin',
      entityId: admin.id,
      metadata: { email: admin.email },
      ipAddress,
      userAgent,
    });

    return { message: 'Logout successful' };
  }

  /**
   * Get current admin profile
   * @param admin - Current admin
   */
  async getMe(admin: Admin): Promise<Admin> {
    // Fetch fresh admin data from database
    return this.adminsService.findById(admin.id);
  }

  /**
   * Generate access token (expires in 1 day)
   * @param admin - Admin entity
   */
  private generateAccessToken(admin: Admin): string {
    const payload: JwtPayload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions || [],
      type: 'access',
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ADMIN_SECRET'),
      expiresIn: '1d', // 1 day
    });
  }

  /**
   * Generate refresh token (expires in 7 days)
   * @param admin - Admin entity
   */
  private generateRefreshToken(admin: Admin): string {
    const payload: JwtPayload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions || [],
      type: 'refresh',
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ADMIN_REFRESH_SECRET'),
      expiresIn: '7d', // 7 days
    });
  }

  /**
   * Log admin activity
   * @param data - Activity log data
   */
  private async logActivity(data: {
    adminId: string;
    action: string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      const activityLog = this.activityLogRepository.create(data);
      await this.activityLogRepository.save(activityLog);
    } catch (error) {
      // Log error but don't throw (activity logging should not break the flow)
      console.error('Failed to log admin activity:', error);
    }
  }
}

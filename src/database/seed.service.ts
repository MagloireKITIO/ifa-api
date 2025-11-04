import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminsService } from '../admins/admins.service';
import { AdminRole } from '../common/enums';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly adminsService: AdminsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * This method is called when the module is initialized
   * It seeds the super admin if it doesn't exist
   */
  async onModuleInit() {
    await this.seedSuperAdmin();
  }

  /**
   * Seed the super admin account from environment variables
   */
  private async seedSuperAdmin(): Promise<void> {
    try {
      const superAdminEmail = this.configService.get<string>(
        'SUPER_ADMIN_EMAIL',
      );

      if (!superAdminEmail) {
        this.logger.warn(
          'SUPER_ADMIN_EMAIL not found in environment variables. Skipping super admin seeding.',
        );
        return;
      }

      // Check if super admin already exists
      const existingAdmin =
        await this.adminsService.findByEmail(superAdminEmail);

      if (existingAdmin) {
        this.logger.log(
          `Super admin already exists with email: ${superAdminEmail}`,
        );
        return;
      }

      // Get super admin credentials from environment
      const password = this.configService.get<string>('SUPER_ADMIN_PASSWORD');
      const firstName = this.configService.get<string>(
        'SUPER_ADMIN_FIRST_NAME',
      );
      const lastName = this.configService.get<string>('SUPER_ADMIN_LAST_NAME');

      if (!password || !firstName || !lastName) {
        this.logger.error(
          'Super admin credentials incomplete in environment variables. Required: SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, SUPER_ADMIN_FIRST_NAME, SUPER_ADMIN_LAST_NAME',
        );
        return;
      }

      // Create super admin
      const superAdmin = await this.adminsService.create({
        email: superAdminEmail,
        password,
        firstName,
        lastName,
        role: AdminRole.SUPER_ADMIN,
        permissions: ['*'], // All permissions
      });

      this.logger.log(
        `✅ Super admin created successfully with email: ${superAdmin.email}`,
      );
      this.logger.log(
        `   Name: ${superAdmin.firstName} ${superAdmin.lastName}`,
      );
      this.logger.log(`   Role: ${superAdmin.role}`);
      this.logger.log(
        `   Please change the default password after first login!`,
      );
    } catch (error) {
      this.logger.error('Failed to seed super admin:', error.message);
      // Don't throw error to prevent app from crashing during startup
    }
  }
}

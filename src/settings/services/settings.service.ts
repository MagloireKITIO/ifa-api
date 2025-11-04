import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppSettings } from '../../entities/app-settings.entity';
import { AdminActivityLog } from '../../entities/admin-activity-log.entity';
import { AppSettingsCategory } from '../../common/enums';
import { ConfigurationService } from './configuration.service';

/**
 * Service for managing application settings with activity logging
 */
@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(AppSettings)
    private readonly appSettingsRepository: Repository<AppSettings>,
    @InjectRepository(AdminActivityLog)
    private readonly activityLogRepository: Repository<AdminActivityLog>,
    private readonly configurationService: ConfigurationService,
  ) {}

  /**
   * Get all settings grouped by category
   */
  async getAllSettings(): Promise<AppSettings[]> {
    return this.configurationService.getAll();
  }

  /**
   * Get settings by category
   * @param category - Settings category
   */
  async getSettingsByCategory(
    category: AppSettingsCategory,
  ): Promise<AppSettings[]> {
    return this.configurationService.getByCategory(category);
  }

  /**
   * Get a specific setting by key
   * @param key - Setting key
   */
  async getSettingByKey(key: string): Promise<any> {
    return this.configurationService.get(key);
  }

  /**
   * Update or create a setting
   * @param key - Setting key
   * @param value - Setting value
   * @param category - Setting category
   * @param isEncrypted - Whether the setting should be encrypted
   * @param adminId - ID of admin making the change
   * @param ipAddress - IP address of the request
   * @param userAgent - User agent of the request
   */
  async updateSetting(
    key: string,
    value: Record<string, any>,
    category: AppSettingsCategory,
    isEncrypted: boolean,
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AppSettings> {
    // Get old value for logging
    const oldSetting = await this.appSettingsRepository.findOne({
      where: { key },
    });

    // Update or create setting
    const updated = await this.configurationService.set(
      key,
      value,
      category,
      isEncrypted,
      adminId,
    );

    // Log activity
    await this.logActivity(
      adminId,
      oldSetting ? 'updated_setting' : 'created_setting',
      'app_settings',
      updated.id,
      {
        key,
        category,
        oldValue: oldSetting?.value,
        newValue: value,
      },
      ipAddress,
      userAgent,
    );

    return updated;
  }

  /**
   * Delete a setting
   * @param key - Setting key
   * @param adminId - ID of admin making the change
   * @param ipAddress - IP address of the request
   * @param userAgent - User agent of the request
   */
  async deleteSetting(
    key: string,
    adminId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    // Get setting before deletion for logging
    const setting = await this.appSettingsRepository.findOne({
      where: { key },
    });

    if (!setting) {
      throw new Error(`Setting with key "${key}" not found`);
    }

    // Delete setting
    await this.configurationService.delete(key);

    // Log activity
    await this.logActivity(
      adminId,
      'deleted_setting',
      'app_settings',
      setting.id,
      {
        key,
        category: setting.category,
        value: setting.value,
      },
      ipAddress,
      userAgent,
    );
  }

  /**
   * Get activity logs for settings changes
   * @param limit - Number of logs to return
   */
  async getSettingsActivityLogs(limit = 50): Promise<AdminActivityLog[]> {
    return this.activityLogRepository.find({
      where: { entityType: 'app_settings' },
      relations: ['admin'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Reload configuration cache
   */
  async reloadCache(): Promise<void> {
    await this.configurationService.reloadCache();
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

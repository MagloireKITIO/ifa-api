import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppSettings } from '../../entities/app-settings.entity';
import { AppSettingsCategory } from '../../common/enums';
import * as crypto from 'crypto';

/**
 * Service for managing application configuration stored in database
 * Provides caching and encryption/decryption for sensitive settings
 */
@Injectable()
export class ConfigurationService implements OnModuleInit {
  private cache: Map<string, any> = new Map();
  private readonly ENCRYPTION_KEY: string;
  private readonly ENCRYPTION_ALGORITHM = 'aes-256-cbc';

  constructor(
    @InjectRepository(AppSettings)
    private readonly appSettingsRepository: Repository<AppSettings>,
  ) {
    // Get encryption key from environment variables
    this.ENCRYPTION_KEY =
      process.env.SETTINGS_ENCRYPTION_KEY ||
      'default-key-change-in-production-32-chars!!'; // Must be 32 characters
  }

  /**
   * Initialize cache on module startup
   */
  async onModuleInit() {
    await this.loadAllToCache();
  }

  /**
   * Load all settings into cache
   */
  private async loadAllToCache(): Promise<void> {
    const allSettings = await this.appSettingsRepository.find();

    for (const setting of allSettings) {
      const value = setting.isEncrypted
        ? this.decrypt(setting.value)
        : setting.value;

      this.cache.set(setting.key, value);
    }
  }

  /**
   * Get a setting value by key
   * @param key - Setting key
   * @param useCache - Whether to use cache (default: true)
   */
  async get<T = any>(key: string, useCache = true): Promise<T | null> {
    // Try cache first
    if (useCache && this.cache.has(key)) {
      return this.cache.get(key) as T;
    }

    // Fetch from database
    const setting = await this.appSettingsRepository.findOne({
      where: { key },
    });

    if (!setting) {
      return null;
    }

    const value = setting.isEncrypted
      ? this.decrypt(setting.value)
      : setting.value;

    // Update cache
    this.cache.set(key, value);

    return value as T;
  }

  /**
   * Get settings by category
   * @param category - Settings category
   */
  async getByCategory(
    category: AppSettingsCategory,
  ): Promise<AppSettings[]> {
    const settings = await this.appSettingsRepository.find({
      where: { category },
      relations: ['updatedBy'],
      order: { key: 'ASC' },
    });

    // Decrypt values if encrypted
    return settings.map((setting) => ({
      ...setting,
      value: setting.isEncrypted ? this.decrypt(setting.value) : setting.value,
    }));
  }

  /**
   * Get all settings
   */
  async getAll(): Promise<AppSettings[]> {
    const settings = await this.appSettingsRepository.find({
      relations: ['updatedBy'],
      order: { category: 'ASC', key: 'ASC' },
    });

    // Decrypt values if encrypted
    return settings.map((setting) => ({
      ...setting,
      value: setting.isEncrypted ? this.decrypt(setting.value) : setting.value,
    }));
  }

  /**
   * Create or update a setting
   * @param key - Setting key
   * @param value - Setting value (object)
   * @param category - Setting category
   * @param isEncrypted - Whether to encrypt the value
   * @param updatedById - ID of admin making the change
   */
  async set(
    key: string,
    value: Record<string, any>,
    category: AppSettingsCategory,
    isEncrypted: boolean,
    updatedById: string,
  ): Promise<AppSettings> {
    const existingSetting = await this.appSettingsRepository.findOne({
      where: { key },
    });

    const finalValue = isEncrypted ? this.encrypt(value) : value;

    if (existingSetting) {
      // Update existing setting
      existingSetting.value = finalValue;
      existingSetting.category = category;
      existingSetting.isEncrypted = isEncrypted;
      existingSetting.updatedById = updatedById;

      const updated = await this.appSettingsRepository.save(existingSetting);

      // Update cache
      this.cache.set(key, value);

      return updated;
    } else {
      // Create new setting
      const newSetting = this.appSettingsRepository.create({
        key,
        value: finalValue,
        category,
        isEncrypted,
        updatedById,
      });

      const created = await this.appSettingsRepository.save(newSetting);

      // Update cache
      this.cache.set(key, value);

      return created;
    }
  }

  /**
   * Delete a setting
   * @param key - Setting key
   */
  async delete(key: string): Promise<void> {
    const setting = await this.appSettingsRepository.findOne({
      where: { key },
    });

    if (!setting) {
      throw new NotFoundException(`Setting with key "${key}" not found`);
    }

    await this.appSettingsRepository.remove(setting);

    // Remove from cache
    this.cache.delete(key);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Reload cache from database
   */
  async reloadCache(): Promise<void> {
    this.clearCache();
    await this.loadAllToCache();
  }

  /**
   * Encrypt sensitive data
   * @param data - Data to encrypt
   */
  private encrypt(data: Record<string, any>): Record<string, any> {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      this.ENCRYPTION_ALGORITHM,
      Buffer.from(this.ENCRYPTION_KEY),
      iv,
    );

    const jsonString = JSON.stringify(data);
    let encrypted = cipher.update(jsonString, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encrypted: encrypted,
      iv: iv.toString('hex'),
    };
  }

  /**
   * Decrypt sensitive data
   * @param encryptedData - Encrypted data object
   */
  private decrypt(encryptedData: Record<string, any>): any {
    // If data is not encrypted (backward compatibility)
    if (!encryptedData.encrypted || !encryptedData.iv) {
      return encryptedData;
    }

    const decipher = crypto.createDecipheriv(
      this.ENCRYPTION_ALGORITHM,
      Buffer.from(this.ENCRYPTION_KEY),
      Buffer.from(encryptedData.iv, 'hex'),
    );

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }
}

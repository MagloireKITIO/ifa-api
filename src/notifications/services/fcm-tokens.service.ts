import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FCMToken } from '../../entities/fcm-token.entity';
import { RegisterFCMTokenDto } from '../dto';

/**
 * Service for managing FCM device tokens
 */
@Injectable()
export class FCMTokensService {
  private readonly logger = new Logger(FCMTokensService.name);

  constructor(
    @InjectRepository(FCMToken)
    private readonly fcmTokenRepository: Repository<FCMToken>,
  ) {}

  /**
   * Register a new FCM token for a user
   * @param userId - User ID
   * @param dto - Registration data
   */
  async registerToken(
    userId: string,
    dto: RegisterFCMTokenDto,
  ): Promise<FCMToken> {
    // Check if token already exists
    let existingToken = await this.fcmTokenRepository.findOne({
      where: { token: dto.token },
    });

    if (existingToken) {
      // Update existing token (in case user changed device or it was inactive)
      existingToken.userId = userId;
      existingToken.platform = dto.platform;
      existingToken.deviceName = dto.deviceName || existingToken.deviceName;
      existingToken.isActive = true;
      existingToken.lastUsedAt = new Date();

      await this.fcmTokenRepository.save(existingToken);
      this.logger.log(`Updated existing FCM token for user ${userId}`);
      return existingToken;
    }

    // Create new token
    const newToken = this.fcmTokenRepository.create({
      userId,
      token: dto.token,
      platform: dto.platform,
      deviceName: dto.deviceName,
      isActive: true,
      lastUsedAt: new Date(),
    });

    await this.fcmTokenRepository.save(newToken);
    this.logger.log(`Registered new FCM token for user ${userId}`);
    return newToken;
  }

  /**
   * Get all active tokens for a user
   * @param userId - User ID
   */
  async getUserTokens(userId: string): Promise<FCMToken[]> {
    return this.fcmTokenRepository.find({
      where: { userId, isActive: true },
      order: { lastUsedAt: 'DESC' },
    });
  }

  /**
   * Get all active tokens for multiple users
   * @param userIds - Array of user IDs
   */
  async getTokensForUsers(userIds: string[]): Promise<FCMToken[]> {
    if (userIds.length === 0) {
      return [];
    }

    return this.fcmTokenRepository
      .createQueryBuilder('token')
      .where('token.userId IN (:...userIds)', { userIds })
      .andWhere('token.isActive = :isActive', { isActive: true })
      .orderBy('token.lastUsedAt', 'DESC')
      .getMany();
  }

  /**
   * Get all active tokens (for broadcast notifications)
   */
  async getAllActiveTokens(): Promise<FCMToken[]> {
    return this.fcmTokenRepository.find({
      where: { isActive: true },
      order: { lastUsedAt: 'DESC' },
    });
  }

  /**
   * Deactivate a token (when user logs out from a device)
   * @param token - FCM token string
   */
  async deactivateToken(token: string): Promise<void> {
    const fcmToken = await this.fcmTokenRepository.findOne({
      where: { token },
    });

    if (fcmToken) {
      fcmToken.isActive = false;
      await this.fcmTokenRepository.save(fcmToken);
      this.logger.log(`Deactivated FCM token: ${token.substring(0, 20)}...`);
    }
  }

  /**
   * Deactivate all tokens for a user (when user logs out from all devices)
   * @param userId - User ID
   */
  async deactivateUserTokens(userId: string): Promise<void> {
    await this.fcmTokenRepository.update(
      { userId, isActive: true },
      { isActive: false },
    );
    this.logger.log(`Deactivated all FCM tokens for user ${userId}`);
  }

  /**
   * Remove invalid tokens (called after FCM returns invalid token errors)
   * @param tokens - Array of invalid token strings
   */
  async removeInvalidTokens(tokens: string[]): Promise<void> {
    if (tokens.length === 0) {
      return;
    }

    await this.fcmTokenRepository
      .createQueryBuilder()
      .delete()
      .where('token IN (:...tokens)', { tokens })
      .execute();

    this.logger.log(`Removed ${tokens.length} invalid FCM tokens`);
  }

  /**
   * Update last used timestamp for tokens
   * @param tokens - Array of token strings
   */
  async updateLastUsed(tokens: string[]): Promise<void> {
    if (tokens.length === 0) {
      return;
    }

    await this.fcmTokenRepository
      .createQueryBuilder()
      .update(FCMToken)
      .set({ lastUsedAt: new Date() })
      .where('token IN (:...tokens)', { tokens })
      .execute();
  }

  /**
   * Get token statistics
   */
  async getTokenStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byPlatform: { platform: string; count: number }[];
  }> {
    const total = await this.fcmTokenRepository.count();
    const active = await this.fcmTokenRepository.count({
      where: { isActive: true },
    });
    const inactive = total - active;

    const byPlatform = await this.fcmTokenRepository
      .createQueryBuilder('token')
      .select('token.platform', 'platform')
      .addSelect('COUNT(*)', 'count')
      .where('token.isActive = :isActive', { isActive: true })
      .groupBy('token.platform')
      .getRawMany();

    return {
      total,
      active,
      inactive,
      byPlatform,
    };
  }

  /**
   * Clean up old inactive tokens (older than 90 days)
   */
  async cleanupOldTokens(): Promise<number> {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const result = await this.fcmTokenRepository
      .createQueryBuilder()
      .delete()
      .where('isActive = :isActive', { isActive: false })
      .andWhere('updatedAt < :date', { date: ninetyDaysAgo })
      .execute();

    const deletedCount = result.affected || 0;
    if (deletedCount > 0) {
      this.logger.log(`Cleaned up ${deletedCount} old inactive FCM tokens`);
    }

    return deletedCount;
  }
}

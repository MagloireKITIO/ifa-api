import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../entities/notification.entity';
import { FCMService } from './fcm.service';
import { FCMTokensService } from './fcm-tokens.service';
import { SendNotificationDto, QueryNotificationsDto } from '../dto';
import { NotificationType } from '../../common/enums';
import { NotificationTemplatesService } from '../../notification-templates/notification-templates.service';
import { NotificationTemplateTrigger } from '../../entities/notification-template.entity';

/**
 * Service for managing notifications and sending push notifications
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly fcmService: FCMService,
    private readonly fcmTokensService: FCMTokensService,
    private readonly templatesService: NotificationTemplatesService,
  ) {}

  /**
   * Send notification (stores in DB and sends via FCM)
   * @param dto - Notification data
   * @param language - User's preferred language for the notification
   */
  async sendNotification(
    dto: SendNotificationDto,
    language: 'fr' | 'en' = 'fr',
  ): Promise<Notification[]> {
    const notifications: Notification[] = [];

    // Determine recipients
    let userIds: string[] = [];

    if (dto.userId) {
      // Single user
      userIds = [dto.userId];
    } else if (dto.userIds && dto.userIds.length > 0) {
      // Multiple specific users
      userIds = dto.userIds;
    } else {
      // Broadcast to all users - we'll handle this differently
      return this.sendBroadcastNotification(dto, language);
    }

    // Create notifications in database for each user
    for (const userId of userIds) {
      const notification = this.notificationRepository.create({
        userId,
        type: dto.type,
        titleFr: dto.titleFr,
        titleEn: dto.titleEn,
        bodyFr: dto.bodyFr,
        bodyEn: dto.bodyEn,
        data: dto.data,
        isRead: false,
        sentAt: new Date(),
      });

      const saved = await this.notificationRepository.save(notification);
      notifications.push(saved);
    }

    // Send push notifications via FCM
    await this.sendPushNotifications(userIds, dto, language);

    this.logger.log(`Sent notifications to ${userIds.length} user(s)`);
    return notifications;
  }

  /**
   * Send broadcast notification to all users
   * @param dto - Notification data
   * @param language - Preferred language
   */
  async sendBroadcastNotification(
    dto: SendNotificationDto,
    language: 'fr' | 'en' = 'fr',
  ): Promise<Notification[]> {
    // Create a single broadcast notification (userId = null)
    const notification = this.notificationRepository.create({
      userId: null as null, // Null means broadcast
      type: dto.type,
      titleFr: dto.titleFr,
      titleEn: dto.titleEn,
      bodyFr: dto.bodyFr,
      bodyEn: dto.bodyEn,
      data: dto.data,
      isRead: false,
      sentAt: new Date(),
    });

    const saved = await this.notificationRepository.save(notification);

    // Get all active tokens and send push notification
    const tokens = await this.fcmTokensService.getAllActiveTokens();
    const tokenStrings = tokens.map((t) => t.token);

    if (tokenStrings.length > 0) {
      const title = language === 'fr' ? dto.titleFr : dto.titleEn;
      const body = language === 'fr' ? dto.bodyFr : dto.bodyEn;
      const data = this.prepareNotificationData(dto.data);

      const invalidTokens = await this.fcmService.sendToMultipleTokens(
        tokenStrings,
        title,
        body,
        data,
      );

      // Remove invalid tokens
      if (invalidTokens.length > 0) {
        await this.fcmTokensService.removeInvalidTokens(invalidTokens);
      }

      // Update last used timestamp for valid tokens
      const validTokens = tokenStrings.filter((t) => !invalidTokens.includes(t));
      await this.fcmTokensService.updateLastUsed(validTokens);
    }

    this.logger.log(`Sent broadcast notification to ${tokenStrings.length} device(s)`);
    return [saved];
  }

  /**
   * Send push notifications to specific users via FCM
   * @param userIds - Array of user IDs
   * @param dto - Notification data
   * @param language - Preferred language
   */
  private async sendPushNotifications(
    userIds: string[],
    dto: SendNotificationDto,
    language: 'fr' | 'en',
  ): Promise<void> {
    // Get FCM tokens for these users
    const tokens = await this.fcmTokensService.getTokensForUsers(userIds);

    if (tokens.length === 0) {
      this.logger.warn(`No FCM tokens found for ${userIds.length} user(s)`);
      return;
    }

    const tokenStrings = tokens.map((t) => t.token);
    const title = language === 'fr' ? dto.titleFr : dto.titleEn;
    const body = language === 'fr' ? dto.bodyFr : dto.bodyEn;
    const data = this.prepareNotificationData(dto.data);

    // Send notifications
    const invalidTokens = await this.fcmService.sendToMultipleTokens(
      tokenStrings,
      title,
      body,
      data,
    );

    // Remove invalid tokens
    if (invalidTokens.length > 0) {
      await this.fcmTokensService.removeInvalidTokens(invalidTokens);
    }

    // Update last used timestamp for valid tokens
    const validTokens = tokenStrings.filter((t) => !invalidTokens.includes(t));
    await this.fcmTokensService.updateLastUsed(validTokens);
  }

  /**
   * Prepare notification data (convert all values to strings as required by FCM)
   * @param data - Raw data object
   */
  private prepareNotificationData(
    data?: Record<string, any>,
  ): Record<string, string> {
    if (!data) {
      return {};
    }

    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }
    return result;
  }

  /**
   * Get notifications for a user with pagination and filters
   * @param userId - User ID
   * @param query - Query filters
   */
  async getUserNotifications(
    userId: string,
    query: QueryNotificationsDto,
  ): Promise<{ notifications: Notification[]; total: number }> {
    const qb = this.notificationRepository
      .createQueryBuilder('notification')
      .where('(notification.userId = :userId OR notification.userId IS NULL)', {
        userId,
      })
      .orderBy('notification.sentAt', 'DESC');

    // Apply filters
    if (query.type) {
      qb.andWhere('notification.type = :type', { type: query.type });
    }

    if (query.isRead !== undefined) {
      qb.andWhere('notification.isRead = :isRead', { isRead: query.isRead });
    }

    // Get total count
    const total = await qb.getCount();

    // Apply pagination
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const notifications = await qb.skip(skip).take(limit).getMany();

    return { notifications, total };
  }

  /**
   * Mark notification as read
   * @param notificationId - Notification ID
   * @param userId - User ID (for authorization)
   */
  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    // Check if user is authorized (notification is for them or is broadcast)
    if (notification.userId !== null && notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    notification.isRead = true;
    notification.readAt = new Date();

    return this.notificationRepository.save(notification);
  }

  /**
   * Mark all notifications as read for a user
   * @param userId - User ID
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true, readAt: new Date() })
      .where('userId = :userId', { userId })
      .andWhere('isRead = :isRead', { isRead: false })
      .execute();

    this.logger.log(`Marked all notifications as read for user ${userId}`);
  }

  /**
   * Delete a notification
   * @param notificationId - Notification ID
   * @param userId - User ID (for authorization)
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    // Check if user is authorized
    if (notification.userId !== null && notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    await this.notificationRepository.remove(notification);
    this.logger.log(`Deleted notification ${notificationId} for user ${userId}`);
  }

  /**
   * Get unread notification count for a user
   * @param userId - User ID
   */
  async getUnreadCount(userId: string): Promise<number> {
    const qb = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.isRead = :isRead', { isRead: false })
      .andWhere('(notification.userId = :userId OR notification.userId IS NULL)', {
        userId,
      });

    return qb.getCount();
  }

  /**
   * Send notification using a template
   * @param trigger - Template trigger (donation_confirmed, event_created, etc.)
   * @param variables - Variables to inject into the template
   * @param userId - Optional single user ID
   * @param userIds - Optional multiple user IDs
   * @param language - User's preferred language
   */
  async sendTemplatedNotification(
    trigger: NotificationTemplateTrigger,
    variables: Record<string, any>,
    options: {
      userId?: string;
      userIds?: string[];
      broadcast?: boolean;
      language?: 'fr' | 'en';
      type: NotificationType;
      data?: Record<string, any>;
    },
  ): Promise<Notification[]> {
    const language = options.language || 'fr';

    // Render the template with variables
    const rendered = await this.templatesService.renderTemplate(
      trigger,
      variables,
      language,
    );

    // Create notification DTO
    const notificationDto: SendNotificationDto = {
      type: options.type,
      titleFr: rendered.title,
      titleEn: rendered.title, // Same for now, template handles language
      bodyFr: rendered.body,
      bodyEn: rendered.body,
      data: options.data,
      userId: options.userId,
      userIds: options.userIds,
    };

    // Send the notification
    if (options.broadcast) {
      return this.sendBroadcastNotification(notificationDto, language);
    } else {
      return this.sendNotification(notificationDto, language);
    }
  }

  /**
   * Helper method to create notification for specific event types
   */
  async createEventNotification(
    eventId: string,
    eventTitle: string,
    eventTitleEn: string,
  ): Promise<void> {
    await this.sendBroadcastNotification(
      {
        type: NotificationType.EVENT,
        titleFr: 'Nouvel événement',
        titleEn: 'New Event',
        bodyFr: `${eventTitle} a été ajouté`,
        bodyEn: `${eventTitleEn} has been added`,
        data: {
          eventId,
          deepLink: `/events/${eventId}`,
        },
      },
      'fr',
    );
  }

  async createPrayerReactionNotification(
    userId: string,
    prayerId: string,
    reactionType: string,
  ): Promise<void> {
    await this.sendNotification(
      {
        userId,
        type: NotificationType.PRAYER,
        titleFr: 'Nouvelle réaction',
        titleEn: 'New Reaction',
        bodyFr: `Quelqu'un a ${reactionType === 'prayed' ? 'prié' : 'jeûné'} pour votre demande`,
        bodyEn: `Someone ${reactionType === 'prayed' ? 'prayed' : 'fasted'} for your request`,
        data: {
          prayerId,
          deepLink: `/prayers/${prayerId}`,
        },
      },
      'fr',
    );
  }

  async createTestimonyApprovedNotification(
    userId: string,
    testimonyId: string,
  ): Promise<void> {
    await this.sendNotification(
      {
        userId,
        type: NotificationType.TESTIMONY,
        titleFr: 'Témoignage approuvé',
        titleEn: 'Testimony Approved',
        bodyFr: 'Votre témoignage a été approuvé et publié',
        bodyEn: 'Your testimony has been approved and published',
        data: {
          testimonyId,
          deepLink: `/testimonies/${testimonyId}`,
        },
      },
      'fr',
    );
  }

  async createDonationConfirmedNotification(
    userId: string,
    donationId: string,
    amount: number,
    fundName: string,
    fundType?: string,
    donationCount?: number,
    totalAmount?: number,
    firstName?: string,
  ): Promise<void> {
    // Determine the template trigger based on context
    let trigger = NotificationTemplateTrigger.DONATION_CONFIRMED;

    if (donationCount === 1) {
      trigger = NotificationTemplateTrigger.DONATION_FIRST;
    } else if (donationCount && [5, 10, 25, 50, 100].includes(donationCount)) {
      trigger = NotificationTemplateTrigger.DONATION_MILESTONE;
    } else if (fundType === 'tithe') {
      trigger = NotificationTemplateTrigger.DONATION_TITHE;
    } else if (fundType === 'offering') {
      trigger = NotificationTemplateTrigger.DONATION_OFFERING;
    } else if (fundType === 'campaign') {
      trigger = NotificationTemplateTrigger.DONATION_CAMPAIGN;
    }

    // Check for large amount
    if (amount >= 50000) {
      trigger = NotificationTemplateTrigger.DONATION_LARGE_AMOUNT;
    }

    await this.sendTemplatedNotification(trigger, {
      firstName: firstName || 'Frère/Sœur',
      amount,
      currency: 'XAF',
      fundName,
      donationCount: donationCount || 1,
      totalAmount: totalAmount || amount,
    }, {
      userId,
      type: NotificationType.DONATION,
      data: {
        donationId,
        deepLink: `/donations/${donationId}`,
      },
    });
  }
}

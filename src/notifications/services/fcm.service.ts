import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigurationService } from '../../settings/services/configuration.service';

/**
 * Service for Firebase Cloud Messaging integration
 */
@Injectable()
export class FCMService implements OnModuleInit {
  private readonly logger = new Logger(FCMService.name);
  private firebaseApp: admin.app.App;
  private isInitialized = false;

  constructor(private readonly configService: ConfigurationService) {}

  /**
   * Initialize Firebase Admin SDK on module startup
   */
  async onModuleInit() {
    await this.initializeFirebase();
  }

  /**
   * Initialize Firebase Admin SDK with credentials from database
   */
  private async initializeFirebase(): Promise<void> {
    try {
      // Get Firebase configuration from database
      const firebaseConfig = await this.configService.get<{
        projectId: string;
        privateKey: string;
        clientEmail: string;
      }>('firebase_config');

      if (!firebaseConfig) {
        this.logger.warn(
          'Firebase configuration not found in database. FCM notifications will not work.',
        );
        return;
      }

      // Initialize Firebase Admin SDK
      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: firebaseConfig.projectId,
          privateKey: firebaseConfig.privateKey.replace(/\\n/g, '\n'), // Fix newlines in private key
          clientEmail: firebaseConfig.clientEmail,
        }),
      });

      this.isInitialized = true;
      this.logger.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK', error);
      this.isInitialized = false;
    }
  }

  /**
   * Send notification to a single device token
   * @param token - FCM device token
   * @param title - Notification title
   * @param body - Notification body
   * @param data - Additional data payload
   */
  async sendToToken(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<boolean> {
    if (!this.isInitialized) {
      this.logger.warn('Firebase is not initialized. Cannot send notification.');
      return false;
    }

    try {
      const message: admin.messaging.Message = {
        notification: {
          title,
          body,
        },
        data: data || {},
        token,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'ifa_notifications',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      this.logger.log(`Notification sent successfully to token: ${token.substring(0, 20)}...`);
      return true;
    } catch (error) {
      // Check if token is invalid
      if (error.code === 'messaging/registration-token-not-registered' ||
          error.code === 'messaging/invalid-registration-token') {
        this.logger.warn(`Invalid or expired token: ${token.substring(0, 20)}...`);
        return false;
      }

      this.logger.error('Error sending notification to token', error);
      return false;
    }
  }

  /**
   * Send notification to multiple device tokens
   * @param tokens - Array of FCM device tokens
   * @param title - Notification title
   * @param body - Notification body
   * @param data - Additional data payload
   * @returns Array of invalid tokens that should be removed
   */
  async sendToMultipleTokens(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<string[]> {
    if (!this.isInitialized) {
      this.logger.warn('Firebase is not initialized. Cannot send notifications.');
      return [];
    }

    if (tokens.length === 0) {
      return [];
    }

    const invalidTokens: string[] = [];

    try {
      const message: admin.messaging.MulticastMessage = {
        notification: {
          title,
          body,
        },
        data: data || {},
        tokens,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'ifa_notifications',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      this.logger.log(
        `Multicast notification result: ${response.successCount} successful, ${response.failureCount} failed`,
      );

      // Collect invalid tokens
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const error = resp.error;
          if (
            error?.code === 'messaging/registration-token-not-registered' ||
            error?.code === 'messaging/invalid-registration-token'
          ) {
            invalidTokens.push(tokens[idx]);
          }
        }
      });

      if (invalidTokens.length > 0) {
        this.logger.warn(`Found ${invalidTokens.length} invalid tokens`);
      }

      return invalidTokens;
    } catch (error) {
      this.logger.error('Error sending multicast notification', error);
      return [];
    }
  }

  /**
   * Send notification to a topic
   * @param topic - FCM topic name
   * @param title - Notification title
   * @param body - Notification body
   * @param data - Additional data payload
   */
  async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<boolean> {
    if (!this.isInitialized) {
      this.logger.warn('Firebase is not initialized. Cannot send notification.');
      return false;
    }

    try {
      const message: admin.messaging.Message = {
        notification: {
          title,
          body,
        },
        data: data || {},
        topic,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'ifa_notifications',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      this.logger.log(`Notification sent successfully to topic: ${topic}`);
      return true;
    } catch (error) {
      this.logger.error('Error sending notification to topic', error);
      return false;
    }
  }

  /**
   * Subscribe tokens to a topic
   * @param tokens - Array of FCM device tokens
   * @param topic - Topic name
   */
  async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
    if (!this.isInitialized) {
      this.logger.warn('Firebase is not initialized. Cannot subscribe to topic.');
      return;
    }

    try {
      const response = await admin.messaging().subscribeToTopic(tokens, topic);
      this.logger.log(
        `Successfully subscribed ${response.successCount} tokens to topic: ${topic}`,
      );
    } catch (error) {
      this.logger.error('Error subscribing to topic', error);
    }
  }

  /**
   * Unsubscribe tokens from a topic
   * @param tokens - Array of FCM device tokens
   * @param topic - Topic name
   */
  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<void> {
    if (!this.isInitialized) {
      this.logger.warn('Firebase is not initialized. Cannot unsubscribe from topic.');
      return;
    }

    try {
      const response = await admin.messaging().unsubscribeFromTopic(tokens, topic);
      this.logger.log(
        `Successfully unsubscribed ${response.successCount} tokens from topic: ${topic}`,
      );
    } catch (error) {
      this.logger.error('Error unsubscribing from topic', error);
    }
  }

  /**
   * Check if Firebase is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Reinitialize Firebase (useful after updating configuration)
   */
  async reinitialize(): Promise<void> {
    if (this.firebaseApp) {
      await this.firebaseApp.delete();
    }
    await this.initializeFirebase();
  }
}

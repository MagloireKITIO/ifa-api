import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventRemindersService } from './event-reminders.service';
import { NotificationsService } from '../notifications/services/notifications.service';

/**
 * Service planificateur pour envoyer les rappels d'événements
 * S'exécute toutes les minutes pour vérifier les rappels à envoyer
 */
@Injectable()
export class EventRemindersSchedulerService {
  private readonly logger = new Logger(EventRemindersSchedulerService.name);

  constructor(
    private readonly eventRemindersService: EventRemindersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Cron job qui s'exécute toutes les minutes
   * Vérifie et envoie les rappels d'événements dont l'heure est arrivée
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleEventReminders() {
    this.logger.debug('🔔 [CRON] Checking for event reminders to send...');

    try {
      // Récupérer tous les rappels en attente
      const pendingReminders =
        await this.eventRemindersService.findPendingReminders();

      if (pendingReminders.length === 0) {
        this.logger.debug('✅ [CRON] No pending reminders to send');
        return;
      }

      this.logger.log(
        `📨 [CRON] Found ${pendingReminders.length} pending reminder(s)`,
      );

      const now = new Date();

      // Parcourir chaque rappel
      for (const reminder of pendingReminders) {
        try {
          // Vérifier si l'heure du rappel est passée ou dans les 5 prochaines minutes
          const scheduledTime = new Date(reminder.scheduledFor);
          const timeUntilReminder = scheduledTime.getTime() - now.getTime();

          // Envoyer si l'heure est passée ou dans les 5 prochaines minutes
          if (timeUntilReminder <= 5 * 60 * 1000) {
            this.logger.log(
              `⏰ [CRON] Sending reminder for event "${reminder.event.titleFr}" to user ${reminder.userId}`,
            );

            // Envoyer la notification
            await this.notificationsService.sendNotification(
              {
                userId: reminder.userId,
                type: 'event_reminder' as any,
                titleFr: `Rappel : ${reminder.event.titleFr}`,
                titleEn: `Reminder: ${reminder.event.titleEn}`,
                bodyFr: `L'événement commence dans 1 heure !`,
                bodyEn: `The event starts in 1 hour!`,
                data: {
                  eventId: reminder.event.id,
                },
              },
              reminder.user?.preferredLanguage || 'fr',
            );

            // Marquer le rappel comme envoyé
            await this.eventRemindersService.markAsSent(reminder.id);

            this.logger.log(
              `✅ [CRON] Reminder sent successfully for event ${reminder.event.id}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `❌ [CRON] Failed to send reminder ${reminder.id}:`,
            error.stack,
          );
          // Continuer avec les autres rappels même en cas d'erreur
        }
      }

      this.logger.log('✅ [CRON] Event reminders processing completed');
    } catch (error) {
      this.logger.error('❌ [CRON] Failed to process event reminders:', error);
    }
  }
}

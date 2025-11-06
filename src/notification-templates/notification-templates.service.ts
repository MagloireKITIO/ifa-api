import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotificationTemplate,
  NotificationTemplateTrigger,
} from '../entities/notification-template.entity';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  QueryTemplatesDto,
} from './dto';

/**
 * Service for managing notification templates with variable substitution
 */
@Injectable()
export class NotificationTemplatesService {
  private readonly logger = new Logger(NotificationTemplatesService.name);

  constructor(
    @InjectRepository(NotificationTemplate)
    private readonly templateRepository: Repository<NotificationTemplate>,
  ) {}

  /**
   * Get all templates with optional filters
   */
  async findAll(query: QueryTemplatesDto): Promise<NotificationTemplate[]> {
    const qb = this.templateRepository
      .createQueryBuilder('template')
      .orderBy('template.category', 'ASC')
      .addOrderBy('template.priority', 'DESC')
      .addOrderBy('template.name', 'ASC');

    if (query.category) {
      qb.andWhere('template.category = :category', {
        category: query.category,
      });
    }

    if (query.trigger) {
      qb.andWhere('template.trigger = :trigger', { trigger: query.trigger });
    }

    if (query.isActive !== undefined) {
      qb.andWhere('template.isActive = :isActive', {
        isActive: query.isActive,
      });
    }

    if (query.search) {
      qb.andWhere(
        '(template.name ILIKE :search OR template.description ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    return qb.getMany();
  }

  /**
   * Get a single template by ID
   */
  async findOne(id: string): Promise<NotificationTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: ['updatedBy'],
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return template;
  }

  /**
   * Get a template by trigger
   */
  async findByTrigger(
    trigger: NotificationTemplateTrigger,
    conditions?: Record<string, any>,
  ): Promise<NotificationTemplate | null> {
    const templates = await this.templateRepository.find({
      where: {
        trigger,
        isActive: true,
      },
      order: {
        priority: 'DESC',
      },
    });

    if (templates.length === 0) {
      return null;
    }

    // If conditions are provided, filter templates by matching conditions
    if (conditions) {
      for (const template of templates) {
        if (this.matchesConditions(template.conditions, conditions)) {
          return template;
        }
      }
    }

    // Return the first (highest priority) template
    return templates[0];
  }

  /**
   * Check if template conditions match the provided data
   */
  private matchesConditions(
    templateConditions: Record<string, any>,
    actualData: Record<string, any>,
  ): boolean {
    if (!templateConditions || Object.keys(templateConditions).length === 0) {
      return true; // No conditions means always match
    }

    for (const [key, condition] of Object.entries(templateConditions)) {
      const value = actualData[key];

      if (condition.min !== undefined && value < condition.min) {
        return false;
      }

      if (condition.max !== undefined && value > condition.max) {
        return false;
      }

      if (condition.equals !== undefined && value !== condition.equals) {
        return false;
      }

      if (condition.in && !condition.in.includes(value)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Create a new template
   */
  async create(
    dto: CreateTemplateDto,
    adminId: string,
  ): Promise<NotificationTemplate> {
    // Check if trigger already exists
    const existing = await this.templateRepository.findOne({
      where: { trigger: dto.trigger },
    });

    if (existing) {
      throw new BadRequestException(
        `Template with trigger "${dto.trigger}" already exists`,
      );
    }

    const template = this.templateRepository.create({
      ...dto,
      updatedById: adminId,
    });

    const saved = await this.templateRepository.save(template);
    this.logger.log(`Template created: ${saved.name} (${saved.trigger})`);
    return saved;
  }

  /**
   * Update a template
   */
  async update(
    id: string,
    dto: UpdateTemplateDto,
    adminId: string,
  ): Promise<NotificationTemplate> {
    const template = await this.findOne(id);

    // Don't allow changing trigger on system templates
    if (template.isSystem && dto.trigger && dto.trigger !== template.trigger) {
      throw new BadRequestException('Cannot change trigger on system templates');
    }

    Object.assign(template, dto);
    template.updatedById = adminId;

    const updated = await this.templateRepository.save(template);
    this.logger.log(`Template updated: ${updated.name} (${updated.trigger})`);
    return updated;
  }

  /**
   * Delete a template
   */
  async delete(id: string): Promise<void> {
    const template = await this.findOne(id);

    if (template.isSystem) {
      throw new BadRequestException('Cannot delete system templates');
    }

    await this.templateRepository.remove(template);
    this.logger.log(`Template deleted: ${template.name} (${template.trigger})`);
  }

  /**
   * Render a template with variables
   */
  async renderTemplate(
    trigger: NotificationTemplateTrigger,
    variables: Record<string, any>,
    language: 'fr' | 'en' = 'fr',
  ): Promise<{ title: string; body: string; bibleVerse?: string }> {
    const template = await this.findByTrigger(trigger, variables);

    if (!template) {
      this.logger.warn(`No template found for trigger: ${trigger}`);
      // Fallback to a generic template
      return {
        title: 'Notification',
        body: 'Vous avez une nouvelle notification.',
      };
    }

    const title = this.replaceVariables(
      language === 'fr' ? template.titleFr : template.titleEn,
      variables,
    );

    const body = this.replaceVariables(
      language === 'fr' ? template.bodyFr : template.bodyEn,
      variables,
    );

    const bibleVerse = template.bibleVerseFr || template.bibleVerseEn
      ? this.replaceVariables(
          language === 'fr' ? template.bibleVerseFr : template.bibleVerseEn,
          variables,
        )
      : undefined;

    return {
      title,
      body: bibleVerse ? `${body}\n\n${bibleVerse}` : body,
      bibleVerse,
    };
  }

  /**
   * Replace variables in a text string
   * Supports: {variable}, {{variable}}, {variable|default}
   */
  private replaceVariables(
    text: string,
    variables: Record<string, any>,
  ): string {
    if (!text) return '';

    return text.replace(/\{+(\w+)(\|([^}]+))?\}+/g, (match, key, _, defaultValue) => {
      let value = variables[key];

      // If value is undefined and default value is provided, use default
      if (value === undefined && defaultValue !== undefined) {
        value = defaultValue;
      }

      // If still undefined, keep the placeholder
      if (value === undefined) {
        return match;
      }

      // Format numbers with thousands separators
      if (typeof value === 'number') {
        return value.toLocaleString('fr-FR');
      }

      return String(value);
    });
  }

  /**
   * Preview template with example values
   */
  async preview(
    id: string,
    language: 'fr' | 'en' = 'fr',
  ): Promise<{ title: string; body: string; bibleVerse?: string }> {
    const template = await this.findOne(id);

    const title = this.replaceVariables(
      language === 'fr' ? template.titleFr : template.titleEn,
      template.exampleValues || {},
    );

    const body = this.replaceVariables(
      language === 'fr' ? template.bodyFr : template.bodyEn,
      template.exampleValues || {},
    );

    const bibleVerse = template.bibleVerseFr || template.bibleVerseEn
      ? this.replaceVariables(
          language === 'fr' ? template.bibleVerseFr : template.bibleVerseEn,
          template.exampleValues || {},
        )
      : undefined;

    return {
      title,
      body: bibleVerse ? `${body}\n\n${bibleVerse}` : body,
      bibleVerse,
    };
  }

  /**
   * Get all available triggers with their metadata
   */
  getAvailableTriggers(): {
    value: NotificationTemplateTrigger;
    labelFr: string;
    labelEn: string;
    descriptionFr: string;
    descriptionEn: string;
    category: string;
    exampleVariables: string[];
  }[] {
    return [
      // Donation triggers
      {
        value: NotificationTemplateTrigger.DONATION_CONFIRMED,
        labelFr: 'Don confirmé',
        labelEn: 'Donation confirmed',
        descriptionFr: 'Envoyé lorsqu\'un don est confirmé (notification générique)',
        descriptionEn: 'Sent when a donation is confirmed (generic notification)',
        category: 'donation',
        exampleVariables: ['firstName', 'amount', 'currency', 'fundName'],
      },
      {
        value: NotificationTemplateTrigger.DONATION_FIRST,
        labelFr: 'Premier don',
        labelEn: 'First donation',
        descriptionFr: 'Envoyé lors du tout premier don d\'un utilisateur',
        descriptionEn: 'Sent for user\'s very first donation',
        category: 'donation',
        exampleVariables: ['firstName', 'amount', 'currency', 'fundName'],
      },
      {
        value: NotificationTemplateTrigger.DONATION_MILESTONE,
        labelFr: 'Jalon de don atteint',
        labelEn: 'Donation milestone',
        descriptionFr: 'Envoyé lors d\'un jalon (5ème, 10ème, 25ème, 50ème, 100ème don)',
        descriptionEn: 'Sent on milestone donations (5th, 10th, 25th, 50th, 100th)',
        category: 'donation',
        exampleVariables: ['firstName', 'amount', 'donationCount', 'totalAmount'],
      },
      {
        value: NotificationTemplateTrigger.DONATION_TITHE,
        labelFr: 'Don de dîme',
        labelEn: 'Tithe donation',
        descriptionFr: 'Envoyé spécifiquement pour les dons de dîme',
        descriptionEn: 'Sent specifically for tithe donations',
        category: 'donation',
        exampleVariables: ['firstName', 'amount', 'currency'],
      },
      {
        value: NotificationTemplateTrigger.DONATION_OFFERING,
        labelFr: 'Don d\'offrande',
        labelEn: 'Offering donation',
        descriptionFr: 'Envoyé spécifiquement pour les offrandes',
        descriptionEn: 'Sent specifically for offering donations',
        category: 'donation',
        exampleVariables: ['firstName', 'amount', 'currency'],
      },
      {
        value: NotificationTemplateTrigger.DONATION_CAMPAIGN,
        labelFr: 'Don à une campagne',
        labelEn: 'Campaign donation',
        descriptionFr: 'Envoyé pour les dons à une campagne de financement',
        descriptionEn: 'Sent for donations to a fundraising campaign',
        category: 'donation',
        exampleVariables: ['firstName', 'amount', 'fundName', 'fundProgress'],
      },
      {
        value: NotificationTemplateTrigger.DONATION_CAMPAIGN_GOAL_REACHED,
        labelFr: 'Objectif de campagne atteint',
        labelEn: 'Campaign goal reached',
        descriptionFr: 'Envoyé lorsque l\'objectif d\'une campagne est atteint',
        descriptionEn: 'Sent when a campaign reaches its funding goal',
        category: 'donation',
        exampleVariables: ['fundName', 'totalAmount', 'fundProgress'],
      },
      {
        value: NotificationTemplateTrigger.DONATION_LARGE_AMOUNT,
        labelFr: 'Don d\'un montant important',
        labelEn: 'Large amount donation',
        descriptionFr: 'Envoyé pour les dons de montant élevé (≥ 50,000 XAF)',
        descriptionEn: 'Sent for high-value donations (≥ 50,000 XAF)',
        category: 'donation',
        exampleVariables: ['firstName', 'amount', 'currency', 'fundName'],
      },

      // Event triggers
      {
        value: NotificationTemplateTrigger.EVENT_CREATED,
        labelFr: 'Nouvel événement créé',
        labelEn: 'New event created',
        descriptionFr: 'Envoyé lorsqu\'un nouvel événement est créé',
        descriptionEn: 'Sent when a new event is created',
        category: 'event',
        exampleVariables: ['eventTitle', 'eventDate', 'eventTime', 'eventLocation'],
      },
      {
        value: NotificationTemplateTrigger.EVENT_STARTING_SOON,
        labelFr: 'Événement bientôt',
        labelEn: 'Event starting soon',
        descriptionFr: 'Envoyé 1 heure avant le début d\'un événement',
        descriptionEn: 'Sent 1 hour before an event starts',
        category: 'event',
        exampleVariables: ['eventTitle', 'eventDate', 'eventTime', 'eventLocation'],
      },
      {
        value: NotificationTemplateTrigger.EVENT_REMINDER,
        labelFr: 'Rappel d\'événement',
        labelEn: 'Event reminder',
        descriptionFr: 'Rappel pour un événement à venir',
        descriptionEn: 'Reminder for an upcoming event',
        category: 'event',
        exampleVariables: ['eventTitle', 'eventDate', 'eventTime'],
      },

      // Prayer triggers
      {
        value: NotificationTemplateTrigger.PRAYER_REACTION,
        labelFr: 'Réaction à une prière',
        labelEn: 'Prayer reaction',
        descriptionFr: 'Envoyé lorsque quelqu\'un prie ou jeûne pour une demande',
        descriptionEn: 'Sent when someone prays or fasts for a request',
        category: 'prayer',
        exampleVariables: ['firstName', 'prayerCount', 'fastedCount'],
      },

      // Testimony triggers
      {
        value: NotificationTemplateTrigger.TESTIMONY_APPROVED,
        labelFr: 'Témoignage approuvé',
        labelEn: 'Testimony approved',
        descriptionFr: 'Envoyé lorsqu\'un témoignage est approuvé par un admin',
        descriptionEn: 'Sent when a testimony is approved by an admin',
        category: 'testimony',
        exampleVariables: ['firstName'],
      },
      {
        value: NotificationTemplateTrigger.TESTIMONY_REJECTED,
        labelFr: 'Témoignage rejeté',
        labelEn: 'Testimony rejected',
        descriptionFr: 'Envoyé lorsqu\'un témoignage est rejeté',
        descriptionEn: 'Sent when a testimony is rejected',
        category: 'testimony',
        exampleVariables: ['firstName'],
      },

      // General triggers
      {
        value: NotificationTemplateTrigger.WELCOME_MESSAGE,
        labelFr: 'Message de bienvenue',
        labelEn: 'Welcome message',
        descriptionFr: 'Envoyé lors de l\'inscription d\'un nouvel utilisateur',
        descriptionEn: 'Sent when a new user signs up',
        category: 'general',
        exampleVariables: ['firstName', 'displayName'],
      },
      {
        value: NotificationTemplateTrigger.MONTHLY_REPORT,
        labelFr: 'Rapport mensuel',
        labelEn: 'Monthly report',
        descriptionFr: 'Rapport mensuel envoyé aux utilisateurs',
        descriptionEn: 'Monthly report sent to users',
        category: 'general',
        exampleVariables: ['firstName', 'totalAmount', 'donationCount'],
      },
    ];
  }

  /**
   * Get all available variables for a category
   */
  getAvailableVariables(category: string): {
    name: string;
    description: string;
    example: string;
  }[] {
    const commonVariables = [
      {
        name: 'firstName',
        description: 'Prénom de l\'utilisateur',
        example: 'Jean',
      },
      {
        name: 'lastName',
        description: 'Nom de famille de l\'utilisateur',
        example: 'Dupont',
      },
      {
        name: 'displayName',
        description: 'Nom complet de l\'utilisateur',
        example: 'Jean Dupont',
      },
    ];

    const variablesByCategory = {
      donation: [
        ...commonVariables,
        { name: 'amount', description: 'Montant du don', example: '10000' },
        { name: 'currency', description: 'Devise', example: 'XAF' },
        {
          name: 'fundName',
          description: 'Nom de la collecte',
          example: 'Construction église',
        },
        {
          name: 'donationCount',
          description: 'Nombre total de dons de l\'utilisateur',
          example: '5',
        },
        {
          name: 'totalAmount',
          description: 'Montant total donné par l\'utilisateur',
          example: '50000',
        },
        {
          name: 'fundProgress',
          description: 'Progression de la collecte (%)',
          example: '75',
        },
      ],
      event: [
        ...commonVariables,
        {
          name: 'eventTitle',
          description: 'Titre de l\'événement',
          example: 'Culte du dimanche',
        },
        {
          name: 'eventDate',
          description: 'Date de l\'événement',
          example: '15 Janvier 2025',
        },
        {
          name: 'eventTime',
          description: 'Heure de l\'événement',
          example: '10:00',
        },
        {
          name: 'eventLocation',
          description: 'Lieu de l\'événement',
          example: 'IFA Church Yaoundé',
        },
      ],
      prayer: [
        ...commonVariables,
        {
          name: 'prayerCount',
          description: 'Nombre de personnes qui ont prié',
          example: '12',
        },
        {
          name: 'fastedCount',
          description: 'Nombre de personnes qui ont jeûné',
          example: '3',
        },
      ],
      testimony: [...commonVariables],
      general: [...commonVariables],
    };

    return variablesByCategory[category] || commonVariables;
  }
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Admin } from './admin.entity';

export enum NotificationTemplateCategory {
  DONATION = 'donation',
  EVENT = 'event',
  PRAYER = 'prayer',
  TESTIMONY = 'testimony',
  GENERAL = 'general',
}

export enum NotificationTemplateTrigger {
  // Donation triggers
  DONATION_CONFIRMED = 'donation_confirmed',
  DONATION_FIRST = 'donation_first',
  DONATION_MILESTONE = 'donation_milestone',
  DONATION_TITHE = 'donation_tithe',
  DONATION_OFFERING = 'donation_offering',
  DONATION_CAMPAIGN = 'donation_campaign',
  DONATION_CAMPAIGN_GOAL_REACHED = 'donation_campaign_goal_reached',
  DONATION_LARGE_AMOUNT = 'donation_large_amount',

  // Event triggers
  EVENT_CREATED = 'event_created',
  EVENT_STARTING_SOON = 'event_starting_soon',
  EVENT_REMINDER = 'event_reminder',

  // Prayer triggers
  PRAYER_REACTION = 'prayer_reaction',

  // Testimony triggers
  TESTIMONY_APPROVED = 'testimony_approved',
  TESTIMONY_REJECTED = 'testimony_rejected',

  // General
  WELCOME_MESSAGE = 'welcome_message',
  MONTHLY_REPORT = 'monthly_report',
}

@Entity('notification_templates')
@Index(['trigger'])
@Index(['category'])
@Index(['isActive'])
export class NotificationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 100,
    unique: true,
    comment: 'Unique identifier for the template (e.g., donation_confirmed)',
  })
  trigger: NotificationTemplateTrigger;

  @Column({
    type: 'enum',
    enum: NotificationTemplateCategory,
    comment: 'Category of the notification template',
  })
  category: NotificationTemplateCategory;

  @Column({
    type: 'varchar',
    length: 200,
    comment: 'Human-readable name of the template',
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Description of when this template is used',
  })
  description: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Notification title in French (supports variables)',
  })
  titleFr: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Notification title in English (supports variables)',
  })
  titleEn: string;

  @Column({
    type: 'text',
    comment: 'Notification body in French (supports variables and emojis)',
  })
  bodyFr: string;

  @Column({
    type: 'text',
    comment: 'Notification body in English (supports variables and emojis)',
  })
  bodyEn: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'List of available variables (e.g., {firstName}, {amount})',
  })
  variables: string[];

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Example values for variables (for preview)',
  })
  exampleValues: Record<string, string>;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Conditions for this template to be used (e.g., amount > 10000)',
  })
  conditions: Record<string, any>;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Whether this template is active',
  })
  isActive: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether this is a default system template (cannot be deleted)',
  })
  isSystem: boolean;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Priority when multiple templates match (higher = more priority)',
  })
  priority: number;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Optional Bible verse to include',
  })
  bibleVerseFr: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Optional Bible verse in English',
  })
  bibleVerseEn: string;

  @Column({
    type: 'uuid',
    nullable: true,
    comment: 'ID of the admin who last updated this template',
  })
  updatedById: string;

  @ManyToOne(() => Admin, { nullable: true })
  @JoinColumn({ name: 'updatedById' })
  updatedBy: Admin;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

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
import { EventType, EventStatus } from '../common/enums';
import type { EventSchedule } from '../common/types/event-schedule.types';
import { Center } from './center.entity';
import { Admin } from './admin.entity';

@Entity('events')
@Index(['type'])
@Index(['status'])
@Index(['startDate'])
@Index(['endDate'])
@Index(['eventDate'])
@Index(['centerId'])
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Event title in French',
  })
  titleFr: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Event title in English',
  })
  titleEn: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Event description in French',
  })
  descriptionFr: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Event description in English',
  })
  descriptionEn: string;

  @Column({
    type: 'enum',
    enum: EventType,
    comment: 'Type of event',
  })
  type: EventType;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'Date and time when the event starts',
  })
  startDate: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'Date and time when the event ends',
  })
  endDate: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'Legacy field - Date and time when the event takes place (deprecated, use startDate/endDate)',
  })
  eventDate: Date;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Physical location of the event',
  })
  location: string;

  @Column({
    type: 'uuid',
    nullable: true,
    comment: 'ID of the center organizing this event',
  })
  centerId: string;

  @ManyToOne(() => Center, { nullable: true })
  @JoinColumn({ name: 'centerId' })
  center: Center;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Link to live stream (YouTube/Facebook)',
  })
  streamLink: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Link to event replay',
  })
  replayLink: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'URL of the event cover image',
  })
  coverImage: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Detailed schedule for multi-day events (crusades, conferences)',
  })
  schedule: EventSchedule;

  @Column({
    type: 'enum',
    enum: EventStatus,
    default: EventStatus.UPCOMING,
    comment: 'Current status of the event (auto-calculated based on dates)',
  })
  status: EventStatus;

  /**
   * Calcule le statut dynamiquement en fonction des dates
   * @returns Le statut actuel de l'événement
   */
  getComputedStatus(): EventStatus {
    const now = new Date();

    if (now < this.startDate) {
      return EventStatus.UPCOMING;
    }

    if (now >= this.startDate && now <= this.endDate) {
      return EventStatus.ONGOING;
    }

    return EventStatus.PAST;
  }

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether notification has been sent for this event',
  })
  notificationSent: boolean;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'When the replay link was last updated',
  })
  replayLinkUpdatedAt: Date;

  @Column({
    type: 'uuid',
    comment: 'ID of the admin who created this event',
  })
  createdById: string;

  @ManyToOne(() => Admin)
  @JoinColumn({ name: 'createdById' })
  createdBy: Admin;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

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
import { Center } from './center.entity';
import { Admin } from './admin.entity';

@Entity('events')
@Index(['type'])
@Index(['status'])
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
    comment: 'Date and time when the event takes place',
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
    type: 'enum',
    enum: EventStatus,
    default: EventStatus.UPCOMING,
    comment: 'Current status of the event',
  })
  status: EventStatus;

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

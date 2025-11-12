import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Event } from './event.entity';
import { User } from './user.entity';

@Entity('event_reminders')
@Index(['userId', 'eventId'], { unique: true })
@Index(['eventId'])
@Index(['userId'])
@Index(['scheduledFor'])
export class EventReminder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'uuid',
    comment: 'ID of the user who set the reminder',
  })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'uuid',
    comment: 'ID of the event to remind about',
  })
  eventId: string;

  @ManyToOne(() => Event)
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column({
    type: 'timestamptz',
    comment: 'When to send the reminder (1 hour before event)',
  })
  scheduledFor: Date;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether the reminder notification has been sent',
  })
  sent: boolean;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'When the reminder notification was sent',
  })
  sentAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

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
import { NotificationType } from '../common/enums';
import { User } from './user.entity';

@Entity('notifications')
@Index(['userId'])
@Index(['type'])
@Index(['isRead'])
@Index(['sentAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'uuid',
    nullable: true,
    comment: 'ID of the user who receives this notification (null for broadcast)',
  })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: NotificationType,
    comment: 'Type of notification',
  })
  type: NotificationType;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Notification title in French',
  })
  titleFr: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Notification title in English',
  })
  titleEn: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Notification body in French',
  })
  bodyFr: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Notification body in English',
  })
  bodyEn: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Additional data (deeplinks, entity IDs, etc.)',
  })
  data: Record<string, any>;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether the notification has been read',
  })
  isRead: boolean;

  @Column({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'When the notification was sent',
  })
  sentAt: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'When the notification was read',
  })
  readAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

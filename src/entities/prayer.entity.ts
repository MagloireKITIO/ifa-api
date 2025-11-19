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
import { PrayerStatus, Language } from '../common/enums';
import { User } from './user.entity';

@Entity('prayers')
@Index(['userId'])
@Index(['status'])
@Index(['isAnonymous'])
@Index(['createdAt'])
export class Prayer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'uuid',
    comment: 'ID of the user who created this prayer request',
  })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'text',
    comment: 'Prayer content (user writes in their language)',
  })
  content: string;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether this prayer request is anonymous',
  })
  isAnonymous: boolean;

  @Column({
    type: 'enum',
    enum: PrayerStatus,
    default: PrayerStatus.ACTIVE,
    comment: 'Status of the prayer request',
  })
  status: PrayerStatus;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of people who prayed',
  })
  prayedCount: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of people who fasted',
  })
  fastedCount: number;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Testimony content (when prayer is answered)',
  })
  testimonyContent: string;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'When the testimony was added',
  })
  testimoniedAt: Date;

  @Column({
    type: 'enum',
    enum: Language,
    comment: 'Language in which the prayer was submitted',
  })
  language: Language;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

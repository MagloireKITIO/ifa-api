import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { PrayerReactionType } from '../common/enums';
import { Prayer } from './prayer.entity';
import { User } from './user.entity';

@Entity('prayer_reactions')
@Unique(['prayerId', 'userId']) // Un user peut avoir UNE seule réaction par prière
@Index(['prayerId'])
@Index(['userId'])
@Index(['type'])
export class PrayerReaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'uuid',
    comment: 'ID of the prayer',
  })
  prayerId: string;

  @ManyToOne(() => Prayer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'prayerId' })
  prayer: Prayer;

  @Column({
    type: 'uuid',
    comment: 'ID of the user who reacted',
  })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: PrayerReactionType,
    comment: 'Type of reaction (prayed or fasted)',
  })
  type: PrayerReactionType;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

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
import { Language } from '../common/enums';
import { User } from './user.entity';
import { Prayer } from './prayer.entity';

@Entity('testimonies')
@Index(['isAnonymous'])
@Index(['submittedAt'])
export class Testimony {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'uuid',
    nullable: true,
    comment: 'ID of the user who submitted the testimony (null if anonymous)',
  })
  userId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether this testimony is anonymous',
  })
  isAnonymous: boolean;

  @Column({
    type: 'uuid',
    nullable: true,
    comment: 'ID of the prayer this testimony is linked to (for answered prayers)',
  })
  prayerId: string;

  @ManyToOne(() => Prayer, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'prayerId' })
  prayer: Prayer;

  @Column({
    type: 'text',
    comment: 'Testimony content (user writes in their language)',
  })
  content: string;

  @Column({
    type: 'enum',
    enum: Language,
    comment: 'Language in which the testimony was submitted',
  })
  language: Language;

  @Column({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'When the testimony was submitted',
  })
  submittedAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

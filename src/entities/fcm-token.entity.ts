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
import { User } from './user.entity';

@Entity('fcm_tokens')
@Index(['userId'])
@Index(['token'], { unique: true })
@Index(['isActive'])
export class FCMToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'uuid',
    comment: 'ID of the user who owns this token',
  })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'text',
    unique: true,
    comment: 'Firebase Cloud Messaging token',
  })
  token: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Device platform (ios, android, web)',
  })
  platform: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Device name or model',
  })
  deviceName: string;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Whether this token is still active',
  })
  isActive: boolean;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'Last time this token was used to send a notification',
  })
  lastUsedAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

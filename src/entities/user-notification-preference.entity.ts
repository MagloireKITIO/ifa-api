import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * UserNotificationPreference Entity
 *
 * Stores user preferences for different types of notifications.
 * Each user has one preference record that controls which notifications they receive.
 */
@Entity('user_notification_preferences')
export class UserNotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ==================== Relations ====================

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  // ==================== Notification Preferences ====================

  @Column({ name: 'events_enabled', type: 'boolean', default: true })
  eventsEnabled: boolean;

  @Column({ name: 'prayers_enabled', type: 'boolean', default: true })
  prayersEnabled: boolean;

  @Column({ name: 'testimonies_enabled', type: 'boolean', default: true })
  testimoniesEnabled: boolean;

  @Column({ name: 'donations_enabled', type: 'boolean', default: true })
  donationsEnabled: boolean;

  @Column({ name: 'general_enabled', type: 'boolean', default: true })
  generalEnabled: boolean;

  // ==================== Timestamps ====================

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

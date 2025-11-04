import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Admin } from './admin.entity';

@Entity('admin_activity_logs')
@Index(['adminId', 'createdAt'])
@Index(['action'])
@Index(['createdAt'])
export class AdminActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'uuid',
    comment: 'ID of the admin who performed the action',
  })
  adminId: string;

  @ManyToOne(() => Admin)
  @JoinColumn({ name: 'adminId' })
  admin: Admin;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Action performed (e.g., "created_event", "updated_fund", "deleted_testimony")',
  })
  action: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Type of entity affected (e.g., "event", "fund", "user")',
  })
  entityType: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'ID of the affected entity',
  })
  entityId: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Additional metadata about the action',
  })
  metadata: Record<string, any>;

  @Column({
    type: 'varchar',
    length: 45,
    nullable: true,
    comment: 'IP address from which the action was performed',
  })
  ipAddress: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'User agent of the browser/client',
  })
  userAgent: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

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
import { AppSettingsCategory } from '../common/enums';
import { Admin } from './admin.entity';

@Entity('app_settings')
@Index(['key'], { unique: true })
export class AppSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
    comment: 'Unique key for the setting (e.g., firebase_config, notchpay_config)',
  })
  key: string;

  @Column({
    type: 'jsonb',
    comment: 'JSON value containing all configuration data',
  })
  value: Record<string, any>;

  @Column({
    type: 'enum',
    enum: AppSettingsCategory,
    comment: 'Category of the setting',
  })
  category: AppSettingsCategory;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether sensitive data in this setting is encrypted',
  })
  isEncrypted: boolean;

  @Column({
    type: 'uuid',
    nullable: true,
    comment: 'ID of the admin who last updated this setting',
  })
  updatedById: string;

  @ManyToOne(() => Admin, { nullable: true })
  @JoinColumn({ name: 'updatedById' })
  updatedBy: Admin;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

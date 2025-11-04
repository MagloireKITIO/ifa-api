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
import { FundType, FundStatus } from '../common/enums';
import { Admin } from './admin.entity';

@Entity('funds')
@Index(['type'])
@Index(['status'])
@Index(['startDate'])
@Index(['endDate'])
export class Fund {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Fund title in French',
  })
  titleFr: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Fund title in English',
  })
  titleEn: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Fund description in French',
  })
  descriptionFr: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Fund description in English',
  })
  descriptionEn: string;

  @Column({
    type: 'enum',
    enum: FundType,
    comment: 'Type of fund',
  })
  type: FundType;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
    comment: 'Target amount for campaigns (null for tithe/offering)',
  })
  targetAmount: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    comment: 'Current amount collected (automatically calculated)',
  })
  currentAmount: number;

  @Column({
    type: 'varchar',
    length: 3,
    default: 'XAF',
    comment: 'Currency code',
  })
  currency: string;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'Start date for campaigns',
  })
  startDate: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'End date for campaigns',
  })
  endDate: Date;

  @Column({
    type: 'enum',
    enum: FundStatus,
    default: FundStatus.ACTIVE,
    comment: 'Current status of the fund',
  })
  status: FundStatus;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'URL of the fund cover image',
  })
  coverImage: string;

  @Column({
    type: 'uuid',
    comment: 'ID of the admin who created this fund',
  })
  createdById: string;

  @ManyToOne(() => Admin)
  @JoinColumn({ name: 'createdById' })
  createdBy: Admin;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // Virtual field for progress percentage
  get progressPercentage(): number {
    if (!this.targetAmount || this.targetAmount === 0) {
      return 0;
    }
    return Math.min((this.currentAmount / this.targetAmount) * 100, 100);
  }
}

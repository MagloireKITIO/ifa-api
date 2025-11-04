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
import { DonationStatus } from '../common/enums';
import { User } from './user.entity';
import { Fund } from './fund.entity';

@Entity('donations')
@Index(['userId'])
@Index(['fundId'])
@Index(['status'])
@Index(['donatedAt'])
@Index(['transactionId'])
export class Donation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'uuid',
    comment: 'ID of the user who made the donation',
  })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'uuid',
    comment: 'ID of the fund receiving this donation',
  })
  fundId: string;

  @ManyToOne(() => Fund)
  @JoinColumn({ name: 'fundId' })
  fund: Fund;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    comment: 'Amount donated',
  })
  amount: number;

  @Column({
    type: 'varchar',
    length: 3,
    default: 'XAF',
    comment: 'Currency code',
  })
  currency: string;

  @Column({
    type: 'enum',
    enum: DonationStatus,
    default: DonationStatus.PENDING,
    comment: 'Status of the donation',
  })
  status: DonationStatus;

  @Column({
    type: 'varchar',
    length: 100,
    default: 'notchpay',
    comment: 'Payment method used',
  })
  paymentMethod: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    unique: true,
    comment: 'Transaction ID from NotchPay',
  })
  transactionId: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Additional payment metadata from NotchPay',
  })
  paymentMetadata: Record<string, any>;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether this is a recurring donation',
  })
  isRecurring: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether the donor wants to remain anonymous',
  })
  isAnonymous: boolean;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'When the donation was completed',
  })
  donatedAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

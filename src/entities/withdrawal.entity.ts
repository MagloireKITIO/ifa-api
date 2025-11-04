import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Fund } from './fund.entity';
import { Admin } from './admin.entity';

@Entity('withdrawals')
@Index(['fundId'])
@Index(['createdById'])
@Index(['createdAt'])
export class Withdrawal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'uuid',
    comment: 'ID of the fund from which money was withdrawn',
  })
  fundId: string;

  @ManyToOne(() => Fund)
  @JoinColumn({ name: 'fundId' })
  fund: Fund;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    comment: 'Amount withdrawn',
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
    type: 'text',
    nullable: true,
    comment: 'Reason or purpose of the withdrawal',
  })
  reason: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Reference number or receipt',
  })
  reference: string;

  @Column({
    type: 'uuid',
    comment: 'ID of the admin who made the withdrawal',
  })
  createdById: string;

  @ManyToOne(() => Admin)
  @JoinColumn({ name: 'createdById' })
  createdBy: Admin;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

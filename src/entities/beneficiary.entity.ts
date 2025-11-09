import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Beneficiary entity - represents a receiving account configured in NotchPay
 * Only one beneficiary can be active at a time to receive donations, tithes, and campaigns
 */
@Entity('beneficiaries')
export class Beneficiary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * NotchPay beneficiary ID (from NotchPay API)
   */
  @Column({ name: 'notchpay_id', unique: true })
  notchpayId: string;

  /**
   * Beneficiary name
   */
  @Column()
  name: string;

  /**
   * Phone number
   */
  @Column()
  phone: string;

  /**
   * Email address (optional)
   */
  @Column({ nullable: true })
  email?: string;

  /**
   * Payment provider (e.g., cm.mobile.orange, cm.mobile.mtn, cm.mobile.express)
   */
  @Column()
  provider: string;

  /**
   * Country code (default: CM for Cameroon)
   */
  @Column({ default: 'CM' })
  country: string;

  /**
   * Whether this beneficiary is currently active to receive payments
   * Only one beneficiary can be active at a time
   */
  @Column({ name: 'is_active', default: false })
  isActive: boolean;

  /**
   * Status from NotchPay (active, inactive, etc.)
   */
  @Column({ default: 'active' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

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
import { Center } from './center.entity';

@Entity('users')
@Index(['email'], { unique: true, where: '"email" IS NOT NULL' })
@Index(['phoneNumber'], { unique: true, where: '"phoneNumber" IS NOT NULL' })
@Index(['createdAt'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    unique: true,
    comment: 'User email address (from Gmail OAuth)',
  })
  email: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    unique: true,
    comment: 'User phone number (from Phone OTP)',
  })
  phoneNumber: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'User display name',
  })
  displayName: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'URL of user profile photo',
  })
  photoURL: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'City where the user is located',
  })
  city: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Country where the user is located',
  })
  country: string;

  @Column({
    type: 'uuid',
    nullable: true,
    comment: 'ID of the center the user belongs to',
  })
  centerId: string;

  @ManyToOne(() => Center, { nullable: true })
  @JoinColumn({ name: 'centerId' })
  center: Center;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Whether this is the user first time visiting IFA',
  })
  isFirstTimer: boolean;

  @Column({
    type: 'enum',
    enum: Language,
    default: Language.FR,
    comment: 'User preferred language',
  })
  preferredLanguage: Language;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether the email is verified',
  })
  emailVerified: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether the phone number is verified',
  })
  phoneVerified: boolean;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Supabase Auth User ID',
  })
  supabaseUserId: string;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'Last time the user was seen active',
  })
  lastSeenAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

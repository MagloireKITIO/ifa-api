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
import { VerseSeason, VerseSource } from '../common/enums';
import { Admin } from './admin.entity';

@Entity('verses')
@Index(['season'])
@Index(['isActive'])
@Index(['startDate'])
@Index(['endDate'])
@Index(['source'])
export class Verse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: 'Bible reference (e.g., "Jean 3:16", "John 3:16")',
  })
  reference: string;

  @Column({
    type: 'text',
    comment: 'Verse text in French',
  })
  textFr: string;

  @Column({
    type: 'text',
    comment: 'Verse text in English',
  })
  textEn: string;

  @Column({
    type: 'enum',
    enum: VerseSource,
    default: VerseSource.MANUAL,
    comment: 'Source of the verse (api or manual)',
  })
  source: VerseSource;

  @Column({
    type: 'enum',
    enum: VerseSeason,
    default: VerseSeason.DEFAULT,
    comment: 'Season/theme associated with this verse',
  })
  season: VerseSeason;

  @Column({
    type: 'date',
    nullable: true,
    comment: 'Start date for seasonal verses',
  })
  startDate: Date;

  @Column({
    type: 'date',
    nullable: true,
    comment: 'End date for seasonal verses',
  })
  endDate: Date;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Whether this verse is active and can be displayed',
  })
  isActive: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Admin override for manual verse of the day',
  })
  isOverride: boolean;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Priority level (higher = more likely to be shown)',
  })
  priority: number;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'Last time this verse was displayed',
  })
  lastDisplayedAt: Date;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of times this verse has been displayed',
  })
  displayCount: number;

  @Column({
    type: 'uuid',
    nullable: true,
    comment: 'ID of the admin who created/modified this verse',
  })
  createdById: string;

  @ManyToOne(() => Admin, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: Admin;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  /**
   * Check if this verse is valid for the current date
   * @returns Whether the verse should be displayed based on date range
   */
  isValidForDate(date: Date = new Date()): boolean {
    // If no date range specified, always valid
    if (!this.startDate && !this.endDate) {
      return true;
    }

    // Check if current date is within range
    const currentDate = new Date(date);
    currentDate.setHours(0, 0, 0, 0);

    if (this.startDate) {
      const start = new Date(this.startDate);
      start.setHours(0, 0, 0, 0);
      if (currentDate < start) {
        return false;
      }
    }

    if (this.endDate) {
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);
      if (currentDate > end) {
        return false;
      }
    }

    return true;
  }
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('centers')
@Index(['isActive'])
export class Center {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Name of the center in French',
  })
  nameFr: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Name of the center in English',
  })
  nameEn: string;

  @Column({
    type: 'text',
    comment: 'Full address of the center',
  })
  address: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: 'City where the center is located',
  })
  city: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: 'Country where the center is located',
  })
  country: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
    comment: 'Latitude for map integration',
  })
  latitude: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
    comment: 'Longitude for map integration',
  })
  longitude: number;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: 'Phone number of the center',
  })
  phoneNumber: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Email address of the center',
  })
  email: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Description of the center in French',
  })
  descriptionFr: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Description of the center in English',
  })
  descriptionEn: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Service schedules in JSON format',
  })
  schedules: Record<string, any>;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'URL of the center cover image',
  })
  coverImage: string;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Whether the center is active',
  })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { AdminRole } from '../common/enums';
import * as bcrypt from 'bcrypt';

@Entity('admins')
@Index(['email'], { unique: true })
@Index(['isActive'])
export class Admin {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
    comment: 'Admin email address',
  })
  email: string;

  @Column({
    type: 'varchar',
    length: 255,
    select: false, // Never select password by default
    comment: 'Hashed password',
  })
  password: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: 'Admin first name',
  })
  firstName: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: 'Admin last name',
  })
  lastName: string;

  @Column({
    type: 'enum',
    enum: AdminRole,
    default: AdminRole.ADMIN,
    comment: 'Admin role',
  })
  role: AdminRole;

  @Column({
    type: 'simple-array',
    nullable: true,
    comment: 'Array of permission strings for granular access control',
  })
  permissions: string[];

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'Last login timestamp',
  })
  lastLoginAt: Date;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Whether the admin account is active',
  })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // Virtual field for full name
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  // Hash password before insert
  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password && !this.password.startsWith('$2')) {
      // Only hash if not already hashed
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
  }

  // Method to verify password
  async validatePassword(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this.password);
  }
}

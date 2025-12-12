import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { Admin } from '../../../admin/domain/entities/admin.entity';

export enum AdminOldPasswordType {
  CHANGE = 'change',
  FORGOT = 'forgot',
}

@Entity('admin_old_passwords')
export class AdminOldPassword {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'admin_id', type: 'uuid' })
  adminId: string;

  @ManyToOne(() => Admin, (admin) => admin.oldPasswords, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'admin_id' })
  admin: Admin;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: AdminOldPasswordType.CHANGE,
  })
  type: AdminOldPasswordType;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}


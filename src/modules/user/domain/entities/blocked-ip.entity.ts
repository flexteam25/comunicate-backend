import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { Admin } from '../../../admin/domain/entities/admin.entity';

@Entity('blocked_ips')
@Unique(['ip'])
@Index(['ip'])
@Index(['createdByAdminId'])
export class BlockedIp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ip', type: 'varchar', length: 45 })
  ip: string;

  @Column({ name: 'note', type: 'text', nullable: true })
  note?: string | null;

  @Column({ name: 'created_by_admin_id', type: 'uuid', nullable: true })
  createdByAdminId?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Admin, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_admin_id' })
  createdByAdmin?: Admin | null;
}

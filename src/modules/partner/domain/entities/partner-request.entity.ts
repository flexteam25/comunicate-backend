import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { User } from '../../../user/domain/entities/user.entity';
import { Admin } from '../../../admin/domain/entities/admin.entity';

export enum PartnerRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('partner_requests')
@Index('IDX_partner_requests_user_id', ['userId'])
@Index('IDX_partner_requests_status', ['status'])
export class PartnerRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: PartnerRequestStatus.PENDING,
  })
  status: PartnerRequestStatus;

  @Column({ name: 'admin_id', type: 'uuid', nullable: true })
  adminId?: string;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt?: Date;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => Admin, { nullable: true })
  @JoinColumn({ name: 'admin_id' })
  admin?: Admin;
}

import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../../shared/domain/base-entity';
import { User } from '../../../user/domain/entities/user.entity';
import { Admin } from '../../../admin/domain/entities/admin.entity';

export enum InquiryStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  CLOSED = 'closed',
  RESOLVED = 'resolved',
}

export enum InquiryCategory {
  INQUIRY = 'inquiry',
  FEEDBACK = 'feedback',
  BUG = 'bug',
  ADVERTISEMENT = 'advertisement',
}

@Entity('inquiries')
export class Inquiry extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'enum', enum: InquiryCategory, default: InquiryCategory.INQUIRY })
  category: InquiryCategory;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'text', array: true, nullable: true })
  images?: string[];

  @Column({ type: 'enum', enum: InquiryStatus, default: InquiryStatus.PENDING })
  status: InquiryStatus;

  @Column({ name: 'admin_id', type: 'uuid', nullable: true })
  adminId?: string;

  @ManyToOne(() => Admin, { nullable: true })
  @JoinColumn({ name: 'admin_id' })
  admin?: Admin;

  @Column({ name: 'admin_reply', type: 'text', nullable: true })
  adminReply?: string;

  @Column({ name: 'replied_at', type: 'timestamptz', nullable: true })
  repliedAt?: Date;
}

import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Site } from '../../../site/domain/entities/site.entity';
import { User } from '../../../user/domain/entities/user.entity';
import { Admin } from '../../../admin/domain/entities/admin.entity';

export enum SiteManagerApplicationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('site_manager_applications')
@Index('IDX_site_manager_applications_site_id', ['siteId'])
@Index('IDX_site_manager_applications_user_id', ['userId'])
@Index('IDX_site_manager_applications_status', ['status'])
@Index('IDX_site_manager_applications_site_status', ['siteId', 'status'])
export class SiteManagerApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'site_id', type: 'uuid' })
  siteId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'text', nullable: true })
  message?: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: SiteManagerApplicationStatus.PENDING,
  })
  status: SiteManagerApplicationStatus;

  @Column({ name: 'admin_id', type: 'uuid', nullable: true })
  adminId?: string;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt?: Date;

  @ManyToOne(() => Site, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'site_id' })
  site: Site;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Admin, { nullable: true })
  @JoinColumn({ name: 'admin_id' })
  admin?: Admin;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

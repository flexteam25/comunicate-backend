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
import { Site } from './site.entity';
import { User } from '../../../user/domain/entities/user.entity';
import { Admin } from '../../../admin/domain/entities/admin.entity';
import { Badge } from '../../../badge/domain/entities/badge.entity';

export enum SiteBadgeRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

@Entity('site_badge_requests')
@Index('IDX_site_badge_requests_site_id', ['siteId'])
@Index('IDX_site_badge_requests_badge_id', ['badgeId'])
@Index('IDX_site_badge_requests_user_id', ['userId'])
@Index('IDX_site_badge_requests_status', ['status'])
@Index('IDX_site_badge_requests_site_badge_status', ['siteId', 'badgeId', 'status'])
export class SiteBadgeRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'site_id', type: 'uuid' })
  siteId: string;

  @Column({ name: 'badge_id', type: 'uuid' })
  badgeId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'admin_id', type: 'uuid', nullable: true })
  adminId?: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: SiteBadgeRequestStatus.PENDING,
  })
  status: SiteBadgeRequestStatus;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @ManyToOne(() => Site, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'site_id' })
  site: Site;

  @ManyToOne(() => Badge, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'badge_id' })
  badge: Badge;

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

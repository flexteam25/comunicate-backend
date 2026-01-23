import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../../shared/domain/base-entity';
import { User } from '../../../user/domain/entities/user.entity';
import { SiteCategory } from '../../../site/domain/entities/site-category.entity';
import { Tier } from '../../../tier/domain/entities/tier.entity';
import { Site } from '../../../site/domain/entities/site.entity';
import { Admin } from '../../../admin/domain/entities/admin.entity';

export enum SiteRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

@Entity('site_requests')
@Index('IDX_site_requests_user_id', ['userId'])
@Index('IDX_site_requests_status', ['status'])
@Index('IDX_site_requests_site_id', ['siteId'])
@Index('IDX_site_requests_admin_id', ['adminId'])
@Index('IDX_site_requests_created_at', ['createdAt'])
export class SiteRequest extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  slug?: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @Column({ name: 'logo_url', type: 'varchar', length: 500, nullable: true })
  logoUrl?: string;

  @Column({
    name: 'main_image_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  mainImageUrl?: string;

  @Column({
    name: 'site_image_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  siteImageUrl?: string;

  @Column({ name: 'tier_id', type: 'uuid', nullable: true })
  tierId?: string;

  @Column({
    name: 'permanent_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  permanentUrl?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    name: 'first_charge',
    type: 'integer',
    nullable: true,
  })
  firstCharge?: number;

  @Column({
    type: 'integer',
    nullable: true,
  })
  recharge?: number;

  @Column({
    type: 'integer',
    default: 0,
  })
  experience: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: SiteRequestStatus.PENDING,
  })
  status: SiteRequestStatus;

  @Column({ name: 'site_id', type: 'uuid', nullable: true })
  siteId?: string;

  @Column({ name: 'admin_id', type: 'uuid', nullable: true })
  adminId?: string;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason?: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => SiteCategory, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category?: SiteCategory;

  @ManyToOne(() => Tier, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tier_id' })
  tier?: Tier;

  @ManyToOne(() => Site, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'site_id' })
  site?: Site;

  @ManyToOne(() => Admin, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'admin_id' })
  admin?: Admin;
}

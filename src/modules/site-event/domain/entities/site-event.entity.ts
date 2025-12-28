import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../../shared/domain/base-entity';
import { Site } from '../../../site/domain/entities/site.entity';
import { User } from '../../../user/domain/entities/user.entity';
import { Admin } from '../../../admin/domain/entities/admin.entity';
import { SiteEventBanner } from './site-event-banner.entity';
import { SiteEventView } from './site-event-view.entity';

@Entity('site_events')
@Index('IDX_site_events_site_id', ['siteId'])
@Index('IDX_site_events_user_id', ['userId'])
@Index('IDX_site_events_admin_id', ['adminId'])
@Index('IDX_site_events_is_active', ['isActive'])
@Index('IDX_site_events_site_active', ['siteId', 'isActive'])
export class SiteEvent extends BaseEntity {
  @Column({ name: 'site_id', type: 'uuid' })
  siteId: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string;

  @Column({ name: 'admin_id', type: 'uuid', nullable: true })
  adminId?: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'start_date', type: 'timestamptz' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamptz' })
  endDate: Date;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => Site, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'site_id' })
  site: Site;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => Admin, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'admin_id' })
  admin?: Admin;

  @OneToMany(() => SiteEventBanner, (banner) => banner.event, { cascade: true })
  banners: SiteEventBanner[];

  @OneToMany(() => SiteEventView, (view) => view.event)
  views: SiteEventView[];

  // Computed property loaded by loadRelationCountAndMap
  viewCount?: number;
}

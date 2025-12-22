import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../../../shared/domain/base-entity';
import { PocaEventBanner } from './poca-event-banner.entity';
import { PocaEventView } from './poca-event-view.entity';

export enum PocaEventStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Entity('poca_events')
@Index('IDX_poca_events_status', ['status'])
@Index('IDX_poca_events_slug', ['slug'])
@Index('IDX_poca_events_starts_at', ['startsAt'])
@Index('IDX_poca_events_ends_at', ['endsAt'])
export class PocaEvent extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  slug?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  summary?: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: PocaEventStatus,
    default: PocaEventStatus.DRAFT,
  })
  status: PocaEventStatus;

  @Column({ name: 'starts_at', type: 'timestamptz', nullable: true })
  startsAt?: Date;

  @Column({ name: 'ends_at', type: 'timestamptz', nullable: true })
  endsAt?: Date;

  @Column({ name: 'primary_banner_url', type: 'varchar', length: 500, nullable: true })
  primaryBannerUrl?: string;

  @Column({ name: 'view_count', type: 'integer', default: 0 })
  viewCount: number;

  @OneToMany(() => PocaEventBanner, (banner) => banner.event, { cascade: true })
  banners: PocaEventBanner[];

  @OneToMany(() => PocaEventView, (view) => view.event)
  views: PocaEventView[];
}

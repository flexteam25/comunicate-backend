import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { SiteEvent } from './site-event.entity';

@Entity('site_event_banners')
@Index('IDX_site_event_banners_event_id', ['eventId'])
@Index('IDX_site_event_banners_event_order', ['eventId', 'order'])
export class SiteEventBanner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @Column({ name: 'image_url', type: 'varchar', length: 500 })
  imageUrl: string;

  @Column({ name: 'link_url', type: 'varchar', length: 500, nullable: true })
  linkUrl?: string;

  @Column({ type: 'integer', default: 0 })
  order: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => SiteEvent, (event) => event.banners, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: SiteEvent;
}

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
import { User } from '../../../user/domain/entities/user.entity';

@Entity('site_event_views')
@Index('IDX_site_event_views_event_id', ['eventId'])
@Index('IDX_site_event_views_user_id', ['userId'])
export class SiteEventView {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => SiteEvent, (event) => event.views, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: SiteEvent;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}

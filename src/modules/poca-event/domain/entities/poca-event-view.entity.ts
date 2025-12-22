import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../../shared/domain/base-entity';
import { PocaEvent } from './poca-event.entity';
import { User } from '../../../user/domain/entities/user.entity';

@Entity('poca_event_views')
@Index('IDX_poca_event_views_event_id', ['eventId'])
@Index('IDX_poca_event_views_user_id', ['userId'])
export class PocaEventView extends BaseEntity {
  @Column({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 45 })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'varchar', length: 255, nullable: true })
  userAgent?: string;

  @ManyToOne(() => PocaEvent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: PocaEvent;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}

import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../../shared/domain/base-entity';
import { PocaEvent } from './poca-event.entity';

@Entity('poca_event_banners')
@Index('IDX_poca_event_banners_event_id', ['eventId'])
@Index('IDX_poca_event_banners_event_order', ['eventId', 'order'])
export class PocaEventBanner extends BaseEntity {
  @Column({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @Column({ name: 'image_url', type: 'varchar', length: 500 })
  imageUrl: string;

  @Column({ type: 'integer', default: 0 })
  order: number;

  @ManyToOne(() => PocaEvent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: PocaEvent;
}

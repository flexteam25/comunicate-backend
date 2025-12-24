import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../../shared/domain/base-entity';

export enum GifticonStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Entity('gifticons')
@Index('IDX_gifticons_status', ['status'])
@Index('IDX_gifticons_slug', ['slug'])
@Index('IDX_gifticons_starts_at', ['startsAt'])
@Index('IDX_gifticons_ends_at', ['endsAt'])
export class Gifticon extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  slug?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  summary?: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl?: string;

  @Column({
    type: 'enum',
    enum: GifticonStatus,
    default: GifticonStatus.DRAFT,
  })
  status: GifticonStatus;

  @Column({ name: 'starts_at', type: 'timestamptz', nullable: true })
  startsAt?: Date;

  @Column({ name: 'ends_at', type: 'timestamptz', nullable: true })
  endsAt?: Date;

  @Column({ type: 'integer', nullable: false, default: 0 })
  amount: number;

  @Column({ name: 'type_color', type: 'varchar', length: 50, nullable: true })
  typeColor?: string;
}

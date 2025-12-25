import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { SiteReview } from './site-review.entity';

@Entity('site_review_images')
@Index('IDX_site_review_images_site_review_id', ['siteReviewId'])
@Index('IDX_site_review_images_order', ['siteReviewId', 'order'])
export class SiteReviewImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'site_review_id', type: 'uuid' })
  siteReviewId: string;

  @Column({ name: 'image_url', type: 'varchar', length: 500 })
  imageUrl: string;

  @Column({ type: 'integer', default: 0 })
  order: number;

  @ManyToOne(() => SiteReview, (review) => review.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'site_review_id' })
  siteReview: SiteReview;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

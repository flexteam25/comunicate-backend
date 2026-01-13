import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { SiteReviewComment } from './site-review-comment.entity';

@Entity('site_review_comment_images')
@Index('IDX_site_review_comment_images_comment_id', ['commentId'])
@Index('IDX_site_review_comment_images_order', ['commentId', 'order'])
export class SiteReviewCommentImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'comment_id', type: 'uuid' })
  commentId: string;

  @Column({ name: 'image_url', type: 'varchar', length: 500 })
  imageUrl: string;

  @Column({ type: 'integer', default: 0 })
  order: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => SiteReviewComment, 'images', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'comment_id' })
  comment: SiteReviewComment;
}

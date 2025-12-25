import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../../shared/domain/base-entity';
import { SiteReview } from './site-review.entity';
import { User } from '../../../user/domain/entities/user.entity';

@Entity('site_review_comments')
@Index('IDX_site_review_comments_review_id', ['siteReviewId'])
@Index('IDX_site_review_comments_user_id', ['userId'])
@Index('IDX_site_review_comments_parent_id', ['parentCommentId'])
export class SiteReviewComment extends BaseEntity {
  @Column({ name: 'review_id', type: 'uuid' })
  siteReviewId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'parent_comment_id', type: 'uuid', nullable: true })
  parentCommentId?: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'has_child', type: 'boolean', default: false })
  hasChild: boolean;

  @ManyToOne(() => SiteReview, (review) => review.comments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'review_id' })
  siteReview: SiteReview;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => SiteReviewComment, (comment) => comment.replies, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parent_comment_id' })
  parentComment?: SiteReviewComment;

  @OneToMany(() => SiteReviewComment, (comment) => comment.parentComment)
  replies: SiteReviewComment[];
}

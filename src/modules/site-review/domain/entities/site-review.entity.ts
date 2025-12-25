import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../../shared/domain/base-entity';
import { User } from '../../../user/domain/entities/user.entity';
import { Site } from '../../../site/domain/entities/site.entity';
import { SiteReviewReaction } from './site-review-reaction.entity';
import { SiteReviewComment } from './site-review-comment.entity';
import { SiteReviewImage } from './site-review-image.entity';

@Entity('site_reviews')
@Index('IDX_site_reviews_site_id', ['siteId'])
@Index('IDX_site_reviews_user_id', ['userId'])
@Index('IDX_site_reviews_is_published', ['isPublished'])
@Index('IDX_site_reviews_rating', ['rating'])
@Index('IDX_site_reviews_site_published', ['siteId', 'isPublished'])
@Index('IDX_site_reviews_site_rating', ['siteId', 'rating'])
export class SiteReview extends BaseEntity {
  @Column({ name: 'site_id', type: 'uuid' })
  siteId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'integer' })
  rating: number;

  @Column({ type: 'integer', nullable: true, comment: '배당률 (경기 평균 배당률)' })
  odds?: number;

  @Column({ type: 'integer', nullable: true, comment: '상한선 (스포츠/라이브 한도)' })
  limit?: number;

  @Column({ type: 'integer', nullable: true, comment: '이벤트 (유저 이벤트)' })
  event?: number;

  @Column({ type: 'integer', nullable: true, comment: '신속성 (입/출 및 고센 처리속도)' })
  speed?: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'is_published', type: 'boolean', default: false })
  isPublished: boolean;

  @ManyToOne(() => Site, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'site_id' })
  site: Site;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => SiteReviewReaction, (reaction) => reaction.siteReview)
  reactions: SiteReviewReaction[];

  @OneToMany(() => SiteReviewComment, (comment) => comment.siteReview)
  comments: SiteReviewComment[];

  @OneToMany(() => SiteReviewImage, (image) => image.siteReview)
  images: SiteReviewImage[];

  // Computed properties (loaded via subquery or loadRelationCountAndMap)
  likeCount?: number;
  dislikeCount?: number;
  commentCount?: number;
}

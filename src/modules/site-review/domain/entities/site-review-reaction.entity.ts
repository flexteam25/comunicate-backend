import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SiteReview } from './site-review.entity';
import { User } from '../../../user/domain/entities/user.entity';

export enum ReactionType {
  LIKE = 'like',
  DISLIKE = 'dislike',
}

@Entity('site_review_reactions')
@Unique('unique_site_review_user_reaction', ['siteReviewId', 'userId'])
@Index('IDX_site_review_reactions_review_id', ['siteReviewId'])
@Index('IDX_site_review_reactions_user_id', ['userId'])
export class SiteReviewReaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'review_id', type: 'uuid' })
  siteReviewId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    name: 'reaction_type',
    type: 'varchar',
    length: 10,
  })
  reactionType: ReactionType;

  @ManyToOne(() => SiteReview, (review) => review.reactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'review_id' })
  siteReview: SiteReview;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

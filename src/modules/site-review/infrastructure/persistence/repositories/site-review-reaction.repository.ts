import {
  SiteReviewReaction,
  ReactionType,
} from '../../../domain/entities/site-review-reaction.entity';

export interface ISiteReviewReactionRepository {
  findByReviewIdAndUserId(
    reviewId: string,
    userId: string,
  ): Promise<SiteReviewReaction | null>;
  create(reaction: Partial<SiteReviewReaction>): Promise<SiteReviewReaction>;
  update(id: string, data: Partial<SiteReviewReaction>): Promise<SiteReviewReaction>;
  delete(id: string): Promise<void>;
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ISiteReviewRepository } from '../../infrastructure/persistence/repositories/site-review.repository';
import { ISiteReviewReactionRepository } from '../../infrastructure/persistence/repositories/site-review-reaction.repository';
import { SiteReviewReaction, ReactionType } from '../../domain/entities/site-review-reaction.entity';

export interface ReactToSiteReviewCommand {
  reviewId: string;
  userId: string;
  reactionType: ReactionType;
}

@Injectable()
export class ReactToSiteReviewUseCase {
  constructor(
    @Inject('ISiteReviewRepository')
    private readonly siteReviewRepository: ISiteReviewRepository,
    @Inject('ISiteReviewReactionRepository')
    private readonly reactionRepository: ISiteReviewReactionRepository,
  ) {}

  async execute(command: ReactToSiteReviewCommand): Promise<SiteReviewReaction> {
    const review = await this.siteReviewRepository.findById(command.reviewId);

    if (!review) {
      throw new NotFoundException('Site review not found');
    }

    const existingReaction = await this.reactionRepository.findByReviewIdAndUserId(
      command.reviewId,
      command.userId,
    );

    if (existingReaction) {
      if (existingReaction.reactionType === command.reactionType) {
        // Same reaction type - remove (toggle off)
        await this.reactionRepository.delete(existingReaction.id);
        return existingReaction;
      } else {
        // Different reaction type - update (switch like/dislike)
        return this.reactionRepository.update(existingReaction.id, {
          reactionType: command.reactionType,
        });
      }
    } else {
      // Create new reaction
      return this.reactionRepository.create({
        siteReviewId: command.reviewId,
        userId: command.userId,
        reactionType: command.reactionType,
      });
    }
  }
}
